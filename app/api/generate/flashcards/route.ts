import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateFlashcards } from '@/lib/ai'
import { ingestDocument } from '@/lib/rag'

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

    // Generate flashcards using AI
    const flashcardsData = await generateFlashcards(
      content,
      difficulty,
      parseInt(count),
      tags
    )

    // Create study session in database
    const studySession = await prisma.studySession.create({
      data: {
        ...(userId && { userId }),
        type: 'flashcards',
        difficulty,
        tags: tags || null,
        sourceContent: content,
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

    // Ingest document chunks for vector RAG — runs once per session
    // Errors here are non-fatal; chat will still work, just without RAG context
    ingestDocument(studySession.id, content).catch((err) =>
      console.error("RAG ingestion failed:", err)
    )

    return NextResponse.json({
      sessionId: studySession.id,
      flashcards: studySession.flashcards
    })

  } catch (error) {
    console.error('Error generating flashcards:', error)
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}