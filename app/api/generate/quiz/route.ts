import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateQuiz } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
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

    // Create session in database
    const session = await prisma.session.create({
      data: {
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
      sessionId: session.id,
      quiz: session.quizzes
    })

  } catch (error) {
    console.error('Error generating quiz:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}