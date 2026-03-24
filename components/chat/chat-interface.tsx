"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, BookOpen, X, ChevronDown } from "lucide-react"

interface StudySessionOption {
  id: string
  type: string
  difficulty: string
  tags?: string
  createdAt: string
}

interface ChatInterfaceProps {
  conversationId?: string
  studyMaterial?: string
  studySessionId?: string
  availableSessions?: StudySessionOption[]
  onConversationCreated?: (id: string) => void
}

export function ChatInterface({
  conversationId,
  studyMaterial: initialStudyMaterial,
  studySessionId: initialSessionId,
  availableSessions = [],
  onConversationCreated,
}: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<Array<{
    role: "user" | "assistant"
    content: string
  }>>([])
  const [input, setInput] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = React.useState(false)
  const [currentConversationId, setCurrentConversationId] = React.useState(conversationId)

  // Context state — can be set via prop or picked in-chat
  const [studyMaterial, setStudyMaterial] = React.useState(initialStudyMaterial)
  const [studySessionId, setStudySessionId] = React.useState(initialSessionId)
  const [contextLabel, setContextLabel] = React.useState<string | undefined>(
    initialSessionId ? labelForSession(availableSessions, initialSessionId) : undefined
  )
  const [showSessionPicker, setShowSessionPicker] = React.useState(false)
  const [loadingContext, setLoadingContext] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const pickerRef = React.useRef<HTMLDivElement>(null)

  // Close picker on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowSessionPicker(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Load existing messages when opening a conversation
  React.useEffect(() => {
    if (!conversationId) return
    setIsFetchingHistory(true)
    fetch(`/api/conversations/${conversationId}`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setMessages(
          data.messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        )
      })
      .catch(() => {})
      .finally(() => setIsFetchingHistory(false))
  }, [conversationId])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const attachSession = async (s: StudySessionOption) => {
    setShowSessionPicker(false)
    setLoadingContext(true)
    try {
      const res = await fetch(`/api/session/${s.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.sourceContent) setStudyMaterial(data.sourceContent)
      }
    } catch {}
    setStudySessionId(s.id)
    setContextLabel(labelForSession(availableSessions, s.id, s))
    setLoadingContext(false)
  }

  const clearContext = () => {
    setStudyMaterial(undefined)
    setStudySessionId(undefined)
    setContextLabel(undefined)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversationId,
          // studyMaterial only needed on first message (server stores sessionId after that)
          studyMaterial: currentConversationId ? undefined : studyMaterial,
          // studySessionId sent on every message so server can always resolve RAG context
          studySessionId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }])
        if (!currentConversationId && data.conversationId) {
          setCurrentConversationId(data.conversationId)
          onConversationCreated?.(data.conversationId)
        }
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Error: ${data.error || "Failed to get response"}`,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error: Failed to connect to the server",
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
        {isFetchingHistory && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        )}

        {!isFetchingHistory && messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg font-medium mb-2">👋 Hi! I'm your AI tutor</p>
            <p className="text-sm">
              {studyMaterial
                ? "Study material loaded. Ask me anything about it!"
                : "Attach a study session below, or just start chatting."}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.role === "user" ? "bg-blue-600 text-white" : "bg-zinc-800 text-white"
            }`}>
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

      {/* Context bar */}
      {contextLabel && (
        <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-2 text-xs text-blue-400 bg-blue-600/10">
          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 truncate">Context: {contextLabel}</span>
          <button onClick={clearContext} className="hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2 items-center">
          {/* Session context picker */}
          {availableSessions.length > 0 && (
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowSessionPicker(v => !v)}
                disabled={loadingContext}
                title="Attach study session"
                className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loadingContext
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <BookOpen className="w-4 h-4" />
                }
              </button>

              {showSessionPicker && (
                <div className="absolute bottom-10 left-0 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-700">
                    Attach a study session as context
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {availableSessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => attachSession(s)}
                        className={`w-full text-left px-3 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-2 ${
                          studySessionId === s.id ? "bg-zinc-800" : ""
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          s.type === "flashcards" ? "bg-blue-400" : "bg-green-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white capitalize truncate">
                            {s.type} · {s.difficulty}
                            {s.tags ? ` · ${s.tags}` : ""}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {studySessionId === s.id && (
                          <span className="text-xs text-blue-400 flex-shrink-0">active</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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

function labelForSession(
  sessions: StudySessionOption[],
  id: string,
  fallback?: StudySessionOption
): string {
  const s = sessions.find(s => s.id === id) ?? fallback
  if (!s) return id
  return `${s.type} · ${s.difficulty}${s.tags ? ` · ${s.tags}` : ""} (${new Date(s.createdAt).toLocaleDateString()})`
}
