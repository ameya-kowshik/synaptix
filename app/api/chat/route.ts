import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createChatModel } from "@/lib/langchain"

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
    const { conversationId, message } = await request.json()

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
          userId: session.user.id // Security: ensure user owns this conversation
        },
        include: { 
          messages: { 
            orderBy: { createdAt: "asc" },
            take: 10 // Last 10 messages for context
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
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: message.substring(0, 50) + "...", // Use first part of message as title
        },
        include: { messages: true },
      })
    }

    // 4. Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    })

    // 5. Build conversation history for context
    const history = conversation.messages
      .map(msg => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`)
      .join("\n")

    // 6. Create AI prompt
    const groq = createChatModel()

    const systemPrompt = `You are an expert AI tutor helping a student learn. Be encouraging, clear, and use the Socratic method when appropriate.`

    // Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ]

    // Add history if exists
    if (history) {
      messages.push({ role: "assistant", content: `Previous conversation:\n${history}` })
    }

    // Add current user message
    messages.push({ role: "user", content: message })

    // 7. Get AI response using Groq SDK directly
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",
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
