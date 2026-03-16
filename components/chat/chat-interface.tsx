"use client"

import * as React from "react"
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
  const [messages, setMessages] = React.useState<Array<{
    role: "user" | "assistant"
    content: string
  }>>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentConversationId, setCurrentConversationId] = React.useState(conversationId)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversationId,
          // Only send studyMaterial on the first message — server stores it after that
          studyMaterial: currentConversationId ? undefined : studyMaterial,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Add AI response to UI
        setMessages(prev => [...prev, { role: "assistant", content: data.message }])
        
        // Update conversation ID if this was a new conversation
        if (!currentConversationId && data.conversationId) {
          setCurrentConversationId(data.conversationId)
          onConversationCreated?.(data.conversationId)
        }
      } else {
        // Show error message
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Error: ${data.error || "Failed to get response"}` 
        }])
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Error: Failed to connect to the server" 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg font-medium mb-2">👋 Hi! I'm your AI tutor</p>
            <p className="text-sm">
              {studyMaterial
                ? "I've loaded your study material. Ask me anything about it!"
                : "Ask me anything about your study material!"}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
