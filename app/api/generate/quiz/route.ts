import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateQuiz } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Allow anonymous users but track them if authenticated
    const userId = session?.user?.id

    const body = await request.json()
    const { content, difficulty, count, tags } = body

    if (!content || !difficulty || !count) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate quiz using AI
    const quizData = await generateQuiz(
      content,
      difficulty,
      parseInt(count),
      tags
    )

    // Create study session in database
    const studySession = await prisma.studySession.create({
      data: {
        ...(userId && { userId }),
        type: 'quiz',
        difficulty,
        tags: tags || null,
        quizzes: {
          create: quizData.map(question => ({
            question: question.question,
            options: question.options,
            correct: question.correct,
          }))
        }
      },
      include: {
        quizzes: true
      }
    })

    return NextResponse.json({
      sessionId: studySession.id,
      quiz: studySession.quizzes
    })

  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}