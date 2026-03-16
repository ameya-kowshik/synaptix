import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createChatModel } from "@/lib/langchain"
import { chunkText, retrieveRelevantChunks, buildContext } from "@/lib/rag"

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
    const { conversationId, message, studyMaterial } = await request.json()

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
      // Create new conversation, storing studyMaterial as context if provided
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: message.length > 50 ? message.substring(0, 50) + "..." : message,
          ...(studyMaterial && { topic: studyMaterial.substring(0, 5000) }),
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

    // Use studyMaterial from request (new chat) or from stored topic (existing chat)
    const materialForRAG = studyMaterial || conversation.topic || ""

    // Build RAG context if study material is available
    let ragContext = ""
    if (materialForRAG.trim().length > 0) {
      const chunks = chunkText(materialForRAG)
      const relevant = retrieveRelevantChunks(chunks, message)
      ragContext = buildContext(relevant)
    }

    const systemPrompt = ragContext
      ? `You are an expert AI tutor helping a student understand their study material. Use the provided context to answer accurately. Be encouraging, clear, and use the Socratic method when appropriate.

Relevant Study Material:
${ragContext}`
      : `You are an expert AI tutor helping a student learn. Be encouraging, clear, and use the Socratic method when appropriate.`

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
