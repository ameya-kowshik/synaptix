import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createChatModel } from "@/lib/langchain"
import { retrieveRelevantChunks, buildContext } from "@/lib/rag"

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // 2. Get request data
    const { conversationId, message, studyMaterial, studySessionId } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // 3. Get or create conversation
    let conversation
    
    if (conversationId) {
      // Fetch existing conversation
      conversation = await prisma.conversation.findUnique({
        where: { 
          id: conversationId,
          userId: session.user.id
        },
        include: { 
          messages: { 
            orderBy: { createdAt: "asc" },
            // take last 20 messages for context window
            take: -20,
          } 
        },
      })
      
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        )
      }
    } else {
      // Create new conversation, storing studySessionId for RAG on future messages
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: message.length > 50 ? message.substring(0, 50) + "..." : message,
          ...(studySessionId && { studySessionId }),
        },
        include: { messages: true },
      })
    }

    // 4. Save user message
    const newUserMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    })

    // 5. Build conversation history for context
    const allMessages = [...conversation.messages, newUserMessage]

    // 6. Create AI prompt
    const groq = createChatModel()

    // Resolve which session to use for RAG — prefer the one linked to this
    // conversation, fall back to the sessionId sent with the current request
    const ragSessionId = conversation.studySessionId || studySessionId

    // Build RAG context via pgvector similarity search.
    // If no session is linked we skip RAG and the tutor answers generically.
    let ragContext = ""
    if (ragSessionId) {
      try {
        const chunks = await retrieveRelevantChunks(ragSessionId, message)
        ragContext = buildContext(chunks)
      } catch (err) {
        // Non-fatal — degrade gracefully if embeddings fail
        console.error("RAG retrieval failed:", err)
      }
    }

    // Fetch latest quiz attempt for analytics context
    let analyticsContext = ""
    if (studySessionId && session.user.id) {
      const latestAttempt = await prisma.quizAttempt.findFirst({
        where: { sessionId: studySessionId, userId: session.user.id },
        orderBy: { createdAt: "desc" },
      })

      if (latestAttempt) {
        const answers = latestAttempt.answers as Array<{
          question: string
          isCorrect: boolean
          selectedOption: string
          correctOption: string
        }>
        const wrongAnswers = answers.filter(a => !a.isCorrect)
        analyticsContext = `Student's Quiz Performance (most recent attempt):
- Score: ${latestAttempt.score}/${latestAttempt.total} (${Math.round((latestAttempt.score / latestAttempt.total) * 100)}%)
${wrongAnswers.length > 0
  ? `- Questions answered incorrectly:\n${wrongAnswers.map(a => `  • "${a.question}" — student answered "${a.selectedOption}", correct was "${a.correctOption}"`).join("\n")}`
  : "- All questions answered correctly"}

Use this to proactively address weak areas in your tutoring.`
      }
    }

    const systemPrompt = [
      ragContext
        ? `You are an expert AI tutor helping a student understand their study material. Use the provided context to answer accurately. Be encouraging, clear, and use the Socratic method when appropriate.\n\nRelevant Study Material:\n${ragContext}`
        : `You are an expert AI tutor helping a student learn. Be encouraging, clear, and use the Socratic method when appropriate.`,
      analyticsContext,
    ].filter(Boolean).join("\n\n")

    // Build messages array with proper format
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ]

    // Add conversation history in proper format
    for (const msg of allMessages) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })
    }

    // 7. Get AI response using Groq SDK directly
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    })

    const aiMessage = completion.choices[0]?.message?.content || "I apologize, I couldn't generate a response."

    // 8. Save AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: aiMessage,
      },
    })


    // 9. Return response
    return NextResponse.json({
      conversationId: conversation.id,
      message: aiMessage,
    })

  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    )
  }
}
