"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RotateCcw, Check, X, FileText, MessageSquare } from 'lucide-react'

interface Flashcard {
  id: string
  question: string
  answer: string
}

interface Quiz {
  id: string
  question: string
  options: string[]
  correct: number
}

interface Session {
  id: string
  type: string
  difficulty: string
  tags?: string
  createdAt: string
  flashcards?: Flashcard[]
  quizzes?: Quiz[]
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: number }>({})
  const [showResults, setShowResults] = useState(false)
  const [feedback, setFeedback] = useState<string>('')
  const [attemptId, setAttemptId] = useState<string>('')
  const [attemptAnswers, setAttemptAnswers] = useState<any[]>([])


  useEffect(() => {
    fetchSession()
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/session/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSession(data)
      }
    } catch (error) {
      console.error('Error fetching session:', error)
    } finally {
      setLoading(false)
    }
  }

  const flipCard = (cardId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  const selectAnswer = (questionId: string, answerIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }))
  }

  const submitQuiz = async () => {
    if (!session?.quizzes) return

    // Submit attempt to DB and get breakdown
    try {
      const submitResponse = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questions: session.quizzes,
          userAnswers: quizAnswers,
        }),
      })

      if (submitResponse.ok) {
        const submitData = await submitResponse.json()
        setAttemptId(submitData.attemptId)
        setAttemptAnswers(submitData.answers)
      }
    } catch (error) {
      console.error('Error submitting attempt:', error)
    }

    // Get AI feedback in parallel — non-fatal if it fails
    try {
      const feedbackResponse = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: session.quizzes,
          userAnswers: session.quizzes.map(q => quizAnswers[q.id] ?? -1),
        }),
      })

      if (feedbackResponse.ok) {
        const data = await feedbackResponse.json()
        setFeedback(data.feedback)
      }
    } catch (error) {
      console.error('Error getting feedback:', error)
    }

    // Show results regardless — attempt is recorded, feedback is a bonus
    setShowResults(true)
  }


  const getScore = () => {
    if (!session?.quizzes) return { correct: 0, total: 0 }
    
    const correct = session.quizzes.filter(q => 
      quizAnswers[q.id] === q.correct
    ).length
    
    return { correct, total: session.quizzes.length }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session not found</h1>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
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
              <h1 className="text-2xl font-bold">
                {session.type === 'flashcards' ? 'Flashcards' : 'Quiz'} Results
              </h1>
              <p className="text-muted-foreground">
                Difficulty: {session.difficulty} • {session.tags && `Tags: ${session.tags} • `}
                Created: {new Date(session.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/history')}>
              <FileText className="h-4 w-4 mr-2" />
              All Sessions
            </Button>
            <Button onClick={() => router.push(`/chat?sessionId=${sessionId}`)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask AI Tutor
            </Button>
          </div>

          {/* Flashcards */}
          {session.type === 'flashcards' && session.flashcards && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {session.flashcards.map((card) => (
                <div
                  key={card.id}
                  className="relative h-64 cursor-pointer group"
                  onClick={() => flipCard(card.id)}
                >
                  <div className={`absolute inset-0 w-full h-full transition-transform duration-500 transform-style-preserve-3d ${
                    flippedCards.has(card.id) ? 'rotate-y-180' : ''
                  }`}>
                    {/* Front */}
                    <div className="absolute inset-0 w-full h-full backface-hidden bg-card border border-border rounded-lg p-6 flex flex-col justify-center text-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-lg font-medium leading-relaxed">{card.question}</p>
                      </div>
                      <div className="text-xs text-muted-foreground mt-4 opacity-70">
                        Click to reveal answer
                      </div>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 w-full h-full backface-hidden bg-primary text-primary-foreground border border-border rounded-lg p-6 flex flex-col text-center rotate-y-180 shadow-lg">
                      <div className="flex-1 overflow-y-auto flashcard-answer pr-2">
                        <div className="min-h-full flex items-center justify-center">
                          <p className="text-base leading-relaxed text-left">{card.answer}</p>
                        </div>
                      </div>
                      <div className="text-xs opacity-70 mt-4 flex-shrink-0">
                        Click to see question
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quiz */}
          {session.type === 'quiz' && session.quizzes && (
            <div className="space-y-8">
              {session.quizzes.map((question, index) => (
                <div key={question.id} className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-medium mb-4">
                    {index + 1}. {question.question}
                  </h3>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = quizAnswers[question.id] === optionIndex
                      const isCorrect = question.correct === optionIndex
                      const showAnswer = showResults
                      
                      return (
                        <button
                          key={optionIndex}
                          onClick={() => !showResults && selectAnswer(question.id, optionIndex)}
                          disabled={showResults}
                          className={`w-full text-left p-3 rounded-md border transition-colors ${
                            showAnswer
                              ? isCorrect
                                ? 'bg-green-100 border-green-300 text-green-800'
                                : isSelected
                                ? 'bg-red-100 border-red-300 text-red-800'
                                : 'bg-muted border-border'
                              : isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted border-border hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{String.fromCharCode(65 + optionIndex)}. {option}</span>
                            {showAnswer && (
                              <span>
                                {isCorrect && <Check className="h-4 w-4 text-green-600" />}
                                {!isCorrect && isSelected && <X className="h-4 w-4 text-red-600" />}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {!showResults && (
                <div className="text-center">
                  <Button 
                    onClick={submitQuiz}
                    size="lg"
                    disabled={Object.keys(quizAnswers).length !== session.quizzes.length}
                  >
                    Submit Quiz
                  </Button>
                </div>
              )}

              {showResults && (
                <div className="bg-card border border-border rounded-lg p-6 text-center">
                  <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
                  <p className="text-lg mb-4">
                    Score: {getScore().correct} / {getScore().total} ({Math.round((getScore().correct / getScore().total) * 100)}%)
                  </p>
                  {feedback && (
                    <p className="text-muted-foreground mb-4">{feedback}</p>
                  )}
                  <Button onClick={() => router.push('/')}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Create New Study Material
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}