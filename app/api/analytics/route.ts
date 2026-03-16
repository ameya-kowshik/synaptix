import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Fetch all attempts for this user, newest first
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: {
        session: {
          select: { id: true, tags: true, difficulty: true, createdAt: true }
        }
      }
    })

    if (attempts.length === 0) {
      return NextResponse.json({ attempts: [], weakAreas: [], scoreTrend: [] })
    }

    // Score trend — one data point per attempt
    const scoreTrend = attempts.map((a) => ({
      date: a.createdAt,
      score: a.score,
      total: a.total,
      percentage: Math.round((a.score / a.total) * 100),
      tags: a.session.tags,
      difficulty: a.session.difficulty,
    }))

    // Weak areas — aggregate wrong answers across all attempts
    const wrongCounts: Record<string, { question: string; wrong: number; total: number }> = {}

    for (const attempt of attempts) {
      const answers = attempt.answers as Array<{
        questionId: string
        question: string
        isCorrect: boolean
      }>

      for (const answer of answers) {
        if (!wrongCounts[answer.questionId]) {
          wrongCounts[answer.questionId] = {
            question: answer.question,
            wrong: 0,
            total: 0,
          }
        }
        wrongCounts[answer.questionId].total++
        if (!answer.isCorrect) {
          wrongCounts[answer.questionId].wrong++
        }
      }
    }

    // Sort by wrong count descending, take top 10
    const weakAreas = Object.values(wrongCounts)
      .filter((q) => q.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 10)
      .map((q) => ({
        question: q.question,
        wrongCount: q.wrong,
        attempts: q.total,
        errorRate: Math.round((q.wrong / q.total) * 100),
      }))

    return NextResponse.json({
      totalAttempts: attempts.length,
      averageScore: Math.round(
        scoreTrend.reduce((sum, a) => sum + a.percentage, 0) / scoreTrend.length
      ),
      scoreTrend,
      weakAreas,
    })

  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
