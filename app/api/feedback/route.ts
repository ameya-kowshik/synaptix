import { NextRequest, NextResponse } from 'next/server'
import { generateFeedback } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { questions, userAnswers } = body

    if (!questions || !userAnswers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const feedback = await generateFeedback(questions, userAnswers)

    return NextResponse.json({ feedback })

  } catch (error) {
    console.error('Error generating feedback:', error)
    return NextResponse.json(
      { error: 'Failed to generate feedback' },
      { status: 500 }
    )
  }
}