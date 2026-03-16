import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { sessionId, questions, userAnswers } = await request.json()
    // userAnswers is an object: { [questionId]: selectedIndex }

    if (!sessionId || !questions || !userAnswers) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Build per-question answer breakdown
    const answers = (questions as QuizQuestion[]).map((q) => ({
      questionId: q.id,
      question: q.question,
      selected: userAnswers[q.id] ?? -1,
      correct: q.correct,
      selectedOption: q.options[userAnswers[q.id]] ?? "No answer",
      correctOption: q.options[q.correct],
      isCorrect: userAnswers[q.id] === q.correct,
    }))

    const score = answers.filter((a) => a.isCorrect).length
    const total = answers.length

    // Persist the attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        sessionId,
        score,
        total,
        answers,
      },
    })

    return NextResponse.json({ attemptId: attempt.id, score, total, answers })

  } catch (error) {
    console.error("Error submitting quiz:", error)
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 })
  }
}
