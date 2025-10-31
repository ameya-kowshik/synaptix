import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateFlashcards } from '@/lib/ai'

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

    // Generate flashcards using AI
    const flashcardsData = await generateFlashcards(
      content,
      difficulty,
      parseInt(count),
      tags
    )

    // Create session in database
    const session = await prisma.session.create({
      data: {
        type: 'flashcards',
        difficulty,
        tags: tags || null,
        flashcards: {
          create: flashcardsData.map(card => ({
            question: card.question,
            answer: card.answer,
          }))
        }
      },
      include: {
        flashcards: true
      }
    })

    return NextResponse.json({
      sessionId: session.id,
      flashcards: session.flashcards
    })

  } catch (error) {
    console.error('Error generating flashcards:', error)
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}