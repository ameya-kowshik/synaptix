"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { ChatInterface } from "@/components/chat/chat-interface"
import { Button } from "@/components/ui/button"
import { MessageSquare, Plus, Menu, X, Trash2 } from "lucide-react"

interface Conversation {
  id: string
  title: string
  updatedAt: string
  _count: {
    messages: number
  }
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string>()
  const [chatKey, setChatKey] = React.useState(0)
  const [studyMaterial, setStudyMaterial] = React.useState<string>()
  const [loading, setLoading] = React.useState(true)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  React.useEffect(() => {
    if (status === "authenticated") {
      fetchConversations()
      // Load study material from session if sessionId is in URL
      const sessionId = searchParams.get("sessionId")
      if (sessionId) fetchStudyMaterial(sessionId)
    } else if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router, searchParams])

  const fetchStudyMaterial = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/session/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.sourceContent) setStudyMaterial(data.sourceContent)
      }
    } catch (error) {
      console.error("Error fetching study material:", error)
    }
  }

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

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const response = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
        if (activeConversationId === id) setActiveConversationId(undefined)
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const createNewConversation = () => {
    setActiveConversationId(undefined)
    setChatKey(k => k + 1) // only remount when user explicitly starts a new chat
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return "Today"
    } else if (diffInHours < 48) {
      return "Yesterday"
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-800">
          <Button
            onClick={createNewConversation}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-8">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div key={conv.id} className="relative group">
                  <button
                    onClick={() => {
                      setActiveConversationId(conv.id)
                      setChatKey(k => k + 1)
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors pr-9 ${
                      activeConversationId === conv.id
                        ? "bg-zinc-800"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-zinc-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(conv.updatedAt)} · {conv._count.messages} messages
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => deleteConversation(e, conv.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800">
          <div className="text-xs text-zinc-500">
            <p className="font-medium">{session.user?.name || session.user?.email}</p>
            <p className="truncate">{session.user?.email}</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-zinc-800 flex items-center px-4 gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
          <h1 className="text-lg font-semibold">
            {activeConversationId
              ? conversations.find((c) => c.id === activeConversationId)?.title || "Chat"
              : "New Chat"}
          </h1>
          {studyMaterial && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30">
              Study material loaded
            </span>
          )}
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            key={chatKey}
            conversationId={activeConversationId}
            studyMaterial={studyMaterial}
            onConversationCreated={(id) => {
              setActiveConversationId(id)
              fetchConversations()
            }}
          />
        </div>
      </div>
    </div>
  )
}
