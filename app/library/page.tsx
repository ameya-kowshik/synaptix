"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Brain, Calendar, Tag, MessageSquare } from "lucide-react"

interface StudySession {
  id: string
  type: string
  difficulty: string
  tags?: string
  createdAt: string
  flashcards?: { id: string }[]
  quizzes?: { id: string }[]
}

export default function LibraryPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "flashcards" | "quiz">("all")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin")
    if (status === "authenticated") fetchSessions()
  }, [status])

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === "all" ? sessions : sessions.filter(s => s.type === filter)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

  const itemCount = (s: StudySession) =>
    s.type === "flashcards" ? s.flashcards?.length ?? 0 : s.quizzes?.length ?? 0

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Library</h1>
            <p className="text-muted-foreground mt-1">All your saved flashcards and quizzes</p>
          </div>
          <Button onClick={() => router.push("/")}>+ Create New</Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "flashcards", "quiz"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f === "all" ? "All" : f === "flashcards" ? "Flashcards" : "Quizzes"}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Brain className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Nothing here yet</h2>
            <p className="text-muted-foreground mb-6">Generate some flashcards or a quiz to get started</p>
            <Button onClick={() => router.push("/")}>Create Study Material</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(s => (
              <Card key={s.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {s.type === "flashcards" ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Brain className="h-4 w-4 text-green-500" />
                      )}
                      <CardTitle className="text-base capitalize">{s.type}</CardTitle>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.difficulty === "easy" ? "bg-green-100 text-green-800" :
                      s.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {s.difficulty}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(s.createdAt)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{itemCount(s)}</span>
                    <span className="text-muted-foreground"> {s.type === "flashcards" ? "cards" : "questions"}</span>
                  </div>
                  {s.tags && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      <span className="truncate">{s.tags}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/results/${s.id}`)}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1"
                      onClick={() => router.push(`/chat?sessionId=${s.id}`)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
