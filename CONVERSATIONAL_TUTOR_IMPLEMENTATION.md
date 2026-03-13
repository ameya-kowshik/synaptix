# Conversational Tutor Implementation Guide

## Overview
Instead of static feedback after quizzes, implement a conversational AI tutor that can:
- Answer questions about study material in real-time
- Explain concepts interactively
- Provide personalized guidance
- Use Socratic method to deepen understanding
- Maintain conversation context and memory

---

## Architecture

### Technology Stack
- **LangChain.js**: For conversation chains, memory, and prompt management
- **LangGraph**: For complex multi-turn conversation flows with state management
- **Groq API**: Fast LLM inference (already integrated)
- **Prisma**: Store conversation history
- **Next.js API Routes**: Backend endpoints
- **React**: Frontend chat interface

### Key Components
1. **Chat Interface** - Real-time messaging UI
2. **Conversation Engine** - LangChain/LangGraph powered AI
3. **Context Manager** - RAG system for study material
4. **Memory System** - Conversation history and user context
5. **Message Streaming** - Real-time response streaming

---

## Database Schema Changes

### Add Conversation Models

```prisma
model Conversation {
  id          String    @id @default(cuid())
  userId      String
  studySessionId String?
  title       String    @default("New Conversation")
  topic       String?
  status      String    @default("active") // "active", "archived"
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  studySession StudySession? @relation(fields: [studySessionId], references: [id], onDelete: SetNull)
  messages     Message[]

  @@map("conversations")
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // "user", "assistant", "system"
  content        String   @db.Text
  metadata       Json?    // Store tool calls, sources, etc.
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("messages")
}

model ConversationContext {
  id             String   @id @default(cuid())
  conversationId String   @unique
  studyMaterial  String   @db.Text // The content being discussed
  extractedTopics String[] // Topics extracted from material
  keyPoints      String[] // Important points for reference
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("conversation_contexts")
}
```

---

## Implementation Workflow

### Phase 1: Setup Dependencies

#### 1.1 Install Required Packages
```bash
npm install langchain @langchain/groq @langchain/community
npm install ai # Vercel AI SDK for streaming
npm install uuid
```

#### 1.2 Update Environment Variables
```env
# Already have GROQ_API_KEY
GROQ_API_KEY="your_groq_api_key"
```

---

### Phase 2: Backend Implementation

#### 2.1 Create LangChain Configuration

**File: `lib/langchain.ts`**
```typescript
import { ChatGroq } from "@langchain/groq"
import { BufferMemory } from "langchain/memory"
import { ConversationChain } from "langchain/chains"
import { PromptTemplate } from "@langchain/core/prompts"

// Initialize Groq LLM
export const createChatModel = () => {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-70b-versatile", // Better for conversations
    temperature: 0.7,
    streaming: true,
  })
}

// Create conversation chain with memory
export const createConversationChain = (memory: BufferMemory) => {
  const model = createChatModel()
  
  const prompt = PromptTemplate.fromTemplate(`
You are an expert AI tutor helping a student understand their study material. Your role is to:
- Answer questions clearly and concisely
- Use the Socratic method to guide learning
- Provide examples and analogies
- Break down complex concepts
- Encourage critical thinking
- Be patient and supportive

Study Material Context:
{context}

Conversation History:
{history}

Student: {input}
Tutor:`)

  return new ConversationChain({
    llm: model,
    memory,
    prompt,
  })
}
```

#### 2.2 Create RAG System for Study Material

**File: `lib/rag.ts`**
```typescript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { OpenAIEmbeddings } from "@langchain/openai"

// Split study material into chunks
export async function createVectorStore(studyMaterial: string) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  })

  const docs = await textSplitter.createDocuments([studyMaterial])

  // Use Groq embeddings or OpenAI embeddings
  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY, // Optional: for better embeddings
  })

  const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    embeddings
  )

  return vectorStore
}

// Retrieve relevant context for a question
export async function retrieveContext(
  vectorStore: MemoryVectorStore,
  question: string,
  k: number = 3
) {
  const results = await vectorStore.similaritySearch(question, k)
  return results.map(doc => doc.pageContent).join("\n\n")
}
```

#### 2.3 Create Chat API Endpoint

**File: `app/api/chat/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createChatModel } from "@/lib/langchain"
import { StreamingTextResponse, LangChainStream } from "ai"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { conversationId, message, studyMaterial } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Get or create conversation
    let conversation = conversationId
      ? await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        })
      : await prisma.conversation.create({
          data: {
            userId: session.user.id,
            title: message.substring(0, 50) + "...",
          },
          include: { messages: true },
        })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    })

    // Build conversation history
    const history = conversation.messages
      .map(msg => `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.content}`)
      .join("\n")

    // Create streaming response
    const { stream, handlers } = LangChainStream()

    const model = createChatModel()

    // Build prompt with context
    const prompt = `You are an expert AI tutor helping a student understand their study material.

${studyMaterial ? `Study Material:\n${studyMaterial}\n` : ""}

Conversation History:
${history}

Student: ${message}
Tutor:`

    // Stream the response
    model.call(prompt, {}, [handlers]).then(async (response) => {
      // Save assistant message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: response.content as string,
        },
      })
    })

    return new StreamingTextResponse(stream, {
      headers: {
        "X-Conversation-Id": conversation.id,
      },
    })

  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    )
  }
}
```

#### 2.4 Create Conversation Management Endpoints

**File: `app/api/conversations/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get all conversations for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: session.user.id,
        status: "active",
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ conversations })

  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

// Create new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { title, studySessionId } = await request.json()

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title: title || "New Conversation",
        studySessionId,
      },
    })

    return NextResponse.json({ conversation }, { status: 201 })

  } catch (error) {
    console.error("Error creating conversation:", error)
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    )
  }
}
```

**File: `app/api/conversations/[conversationId]/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth()
    const { conversationId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        studySession: {
          select: {
            id: true,
            type: true,
            difficulty: true,
            tags: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ conversation })

  } catch (error) {
    console.error("Error fetching conversation:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}

// Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth()
    const { conversationId } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    await prisma.conversation.update({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
      data: {
        status: "archived",
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error deleting conversation:", error)
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    )
  }
}
```

---

### Phase 3: Frontend Implementation

#### 3.1 Create Chat Interface Component

**File: `components/chat/chat-interface.tsx`**
```typescript
"use client"

import * as React from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"

interface ChatInterfaceProps {
  conversationId?: string
  studyMaterial?: string
  onConversationCreated?: (id: string) => void
}

export function ChatInterface({
  conversationId,
  studyMaterial,
  onConversationCreated,
}: ChatInterfaceProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      conversationId,
      studyMaterial,
    },
    onResponse: (response) => {
      const newConversationId = response.headers.get("X-Conversation-Id")
      if (newConversationId && !conversationId) {
        onConversationCreated?.(newConversationId)
      }
    },
  })

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg font-medium mb-2">Ask me anything!</p>
            <p className="text-sm">
              I'm here to help you understand your study material.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-white"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
```

#### 3.2 Create Chat Page

**File: `app/chat/page.tsx`**
```typescript
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navigation } from "@/components/navigation"
import { ChatInterface } from "@/components/chat/chat-interface"
import { Button } from "@/components/ui/button"
import { MessageSquare, Plus } from "lucide-react"

export default function ChatPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [conversations, setConversations] = React.useState<any[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string>()
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (status === "authenticated") {
      fetchConversations()
    }
  }, [status])

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  const createNewConversation = () => {
    setActiveConversationId(undefined)
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!session) {
    router.push("/auth/signin")
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Button
              onClick={createNewConversation}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground px-2">
                Recent Conversations
              </h3>
              
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-4">
                  No conversations yet
                </p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeConversationId === conv.id
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conv._count.messages} messages
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 border border-zinc-800 rounded-lg overflow-hidden">
            <ChatInterface
              conversationId={activeConversationId}
              onConversationCreated={(id) => {
                setActiveConversationId(id)
                fetchConversations()
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### 3.3 Add Chat Button to Study Sessions

**File: `app/results/[sessionId]/page.tsx` (Update)**
```typescript
// Add this button to the results page
<Button
  onClick={() => router.push(`/chat?sessionId=${sessionId}`)}
  variant="outline"
>
  <MessageSquare className="w-4 h-4 mr-2" />
  Ask Questions
</Button>
```

---

### Phase 4: Advanced Features

#### 4.1 Implement RAG for Better Context

**Update: `app/api/chat/route.ts`**
```typescript
// Add vector store retrieval
import { createVectorStore, retrieveContext } from "@/lib/rag"

// In the POST handler:
if (studyMaterial) {
  const vectorStore = await createVectorStore(studyMaterial)
  const relevantContext = await retrieveContext(vectorStore, message)
  
  // Include in prompt
  const prompt = `Study Material Context:\n${relevantContext}\n\n...`
}
```

#### 4.2 Add Conversation Suggestions

**File: `components/chat/suggested-questions.tsx`**
```typescript
"use client"

import { Button } from "@/components/ui/button"

interface SuggestedQuestionsProps {
  questions: string[]
  onSelect: (question: string) => void
}

export function SuggestedQuestions({
  questions,
  onSelect,
}: SuggestedQuestionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Suggested questions:</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onSelect(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  )
}
```

#### 4.3 Add Voice Input (Optional)

**File: `components/chat/voice-input.tsx`**
```typescript
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"

interface VoiceInputProps {
  onTranscript: (text: string) => void
}

export function VoiceInput({ onTranscript }: VoiceInputProps) {
  const [isListening, setIsListening] = React.useState(false)

  const startListening = () => {
    // Implement Web Speech API
    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
    }

    recognition.start()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={startListening}
      disabled={isListening}
    >
      {isListening ? (
        <MicOff className="w-4 h-4 text-red-500" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  )
}
```

---

## User Flow

### 1. Starting a Conversation
```
User uploads study material → Generates flashcards/quiz
→ Clicks "Ask Questions" button
→ Opens chat interface with material context loaded
→ Can ask questions about the material
```

### 2. Conversation Flow
```
User: "What is photosynthesis?"
↓
AI Tutor: "Great question! Photosynthesis is the process plants use to convert light energy into chemical energy. Can you tell me what you already know about it?"
↓
User: "Plants use sunlight to make food"
↓
AI Tutor: "Exactly! Let me break it down further. There are two main stages..."
```

### 3. Socratic Method Example
```
User: "I don't understand why plants need chlorophyll"
↓
AI Tutor: "Good question! Let me guide you. What do you think happens when light hits a plant leaf?"
↓
User: "The light is absorbed?"
↓
AI Tutor: "Correct! And what do you think chlorophyll's role might be in that absorption?"
```

---

## Key Features

### 1. Context-Aware Responses
- AI has access to uploaded study material
- Retrieves relevant sections using RAG
- Maintains conversation history

### 2. Personalized Learning
- Adapts explanations to user's level
- Remembers previous conversations
- Tracks topics discussed

### 3. Interactive Teaching
- Asks follow-up questions
- Provides examples and analogies
- Encourages critical thinking

### 4. Multi-Modal Support
- Text-based chat
- Voice input (optional)
- Code examples for technical topics
- Diagrams and visualizations (future)

---

## Performance Optimizations

### 1. Streaming Responses
- Use Vercel AI SDK for real-time streaming
- Show typing indicators
- Progressive message rendering

### 2. Caching
- Cache vector embeddings for study material
- Store conversation context in Redis (optional)
- Implement response caching for common questions

### 3. Rate Limiting
- Limit messages per minute per user
- Implement token usage tracking
- Add cooldown periods

---

## Testing Strategy

### 1. Unit Tests
```typescript
// Test conversation creation
test("creates new conversation", async () => {
  const conversation = await createConversation(userId, "Test")
  expect(conversation).toBeDefined()
  expect(conversation.userId).toBe(userId)
})

// Test message streaming
test("streams AI response", async () => {
  const stream = await sendMessage(conversationId, "Hello")
  expect(stream).toBeInstanceOf(ReadableStream)
})
```

### 2. Integration Tests
- Test full conversation flow
- Verify context retrieval
- Check message persistence

### 3. User Testing
- Test with real study material
- Gather feedback on response quality
- Measure conversation engagement

---

## Deployment Checklist

- [ ] Install LangChain dependencies
- [ ] Update Prisma schema
- [ ] Run database migrations
- [ ] Create API endpoints
- [ ] Build chat interface
- [ ] Test streaming responses
- [ ] Add error handling
- [ ] Implement rate limiting
- [ ] Add conversation management
- [ ] Test with real users
- [ ] Monitor API usage
- [ ] Optimize performance

---

## Future Enhancements

### 1. Advanced AI Features
- Multi-agent conversations (multiple AI tutors)
- Specialized tutors for different subjects
- Peer learning (connect students)

### 2. Enhanced Context
- Image understanding (diagrams, charts)
- PDF annotation integration
- Video content analysis

### 3. Gamification
- Achievement badges for conversations
- Learning streaks
- Knowledge points

### 4. Analytics
- Track conversation topics
- Measure learning progress
- Identify knowledge gaps

---

## Cost Considerations

### API Usage
- Groq API: ~$0.10 per 1M tokens (very affordable)
- Streaming reduces perceived latency
- Cache responses to reduce API calls

### Database
- Store only essential conversation data
- Archive old conversations
- Implement data retention policies

### Optimization Tips
- Use smaller models for simple questions
- Implement smart context retrieval
- Batch similar questions

---

## Comparison: Conversational vs. Static Feedback

| Feature | Static Feedback | Conversational Tutor |
|---------|----------------|---------------------|
| Interaction | One-time | Continuous |
| Personalization | Generic | Highly personalized |
| Engagement | Low | High |
| Learning Depth | Surface | Deep understanding |
| User Control | None | Full control |
| Cost | Low | Moderate |
| Implementation | Simple | Complex |

---

## Conclusion

The conversational tutor provides a much more engaging and effective learning experience compared to static feedback. It allows students to:

1. **Ask follow-up questions** - Clarify doubts immediately
2. **Learn at their own pace** - No rush, explore topics deeply
3. **Get personalized explanations** - Adapted to their level
4. **Practice critical thinking** - Socratic method guidance
5. **Build confidence** - Interactive, supportive environment

This approach transforms AutoLearn from a quiz generator into a comprehensive AI-powered learning companion.

---

**Next Steps:**
1. Review this implementation plan
2. Decide on priority features
3. Start with Phase 1 (Setup)
4. Build incrementally
5. Test with real users
6. Iterate based on feedback
