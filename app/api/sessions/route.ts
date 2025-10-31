import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        flashcards: {
          select: {
            id: true,
            question: true,
            answer: true
          }
        },
        quizzes: {
          select: {
            id: true,
            question: true,
            options: true,
            correct: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      sessions: sessions
    })

  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}