"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText, Brain, Calendar, Tag, Lock } from 'lucide-react'

interface Session {
  id: string
  type: string
  difficulty: string
  tags?: string
  createdAt: string
  flashcards?: Array<{ id: string; question: string; answer: string }>
  quizzes?: Array<{ id: string; question: string; options: string[]; correct: number }>
}

export default function HistoryPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "loading") return // Still loading session
    
    if (!session) {
      setLoading(false)
      return // Not authenticated
    }
    
    fetchSessions()
  }, [session, status])

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions')
      if (response.status === 401) {
        setError("Please sign in to view your study history")
        setLoading(false)
        return
      }
      
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      } else {
        setError("Failed to load sessions")
      }
    } catch (err) {
      setError("Failed to load sessions")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getItemCount = (session: Session) => {
    if (session.type === 'flashcards') {
      return session.flashcards?.length || 0
    } else {
      return session.quizzes?.length || 0
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold">Study History</h1>
              <p className="text-muted-foreground">
                Access your previous flashcards and quizzes
              </p>
            </div>
            <div className="w-24" /> {/* Spacer */}
          </div>

          {/* Authentication Required State */}
          {!session && status !== "loading" && (
            <div className="text-center py-12">
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                Please sign in to view your study history and saved sessions
              </p>
              <Button onClick={() => router.push('/auth/signin')}>
                Sign In
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && session && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchSessions}>Try Again</Button>
            </div>
          )}

          {/* Empty State */}
          {!error && session && sessions.length === 0 && (
            <div className="text-center py-12">
              <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">No Study Sessions Yet</h2>
              <p className="text-muted-foreground mb-6">
                Create your first flashcards or quiz to see them here
              </p>
              <Button onClick={() => router.push('/')}>
                Create Study Material
              </Button>
            </div>
          )}

          {/* Sessions Grid */}
          {session && sessions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <Card 
                  key={session.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/results/${session.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {session.type === 'flashcards' ? (
                          <FileText className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Brain className="h-5 w-5 text-green-500" />
                        )}
                        <CardTitle className="text-lg capitalize">
                          {session.type}
                        </CardTitle>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        session.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {session.difficulty}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(session.createdAt)}
                      </div>
                      
                      <div className="text-sm">
                        <span className="font-medium">{getItemCount(session)}</span>
                        <span className="text-muted-foreground">
                          {' '}{session.type === 'flashcards' ? 'cards' : 'questions'}
                        </span>
                      </div>

                      {session.tags && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Tag className="h-4 w-4" />
                          <span className="truncate">{session.tags}</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Open {session.type === 'flashcards' ? 'Flashcards' : 'Quiz'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}