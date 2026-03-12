import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const studySessions = await prisma.studySession.findMany({
      where: {
        userId: session.user.id
      },
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
      sessions: studySessions
    })

  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}