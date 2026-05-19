import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

/**
 * Strips markdown code fences that LLMs sometimes wrap JSON in,
 * then parses. Throws if the result is not valid JSON.
 */
function parseJsonResponse(raw: string): unknown {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
  return JSON.parse(stripped)
}

// PDF extraction is now handled in the /api/upload route

export async function generateFlashcards(
  content: string,
  difficulty: string,
  count: number,
  tags?: string
): Promise<Array<{ question: string; answer: string }>> {
  const prompt = `
You are an expert educational content creator. Generate ${count} flashcards from the following content.

Content: ${content}

Requirements:
- Difficulty level: ${difficulty}
- Create exactly ${count} flashcards
- Each flashcard should have a clear, concise question and a comprehensive answer
- Focus on key concepts, definitions, and important facts
- Questions should test understanding, not just memorization
${tags ? `- Focus on these topics: ${tags}` : ''}

For ${difficulty} difficulty:
- Easy: Focus on basic facts and definitions
- Medium: Include some application and analysis questions
- Hard: Include complex analysis, synthesis, and evaluation questions

Return the response as a JSON array with this exact format:
[
  {
    "question": "What is...",
    "answer": "The answer is..."
  }
]

Only return the JSON array, no other text.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from AI")
    }

    return parseJsonResponse(response) as Array<{ question: string; answer: string }>
  } catch (error) {
    console.error("Error generating flashcards:", error)
    throw new Error("Failed to generate flashcards")
  }
}

export async function generateQuiz(
  content: string,
  difficulty: string,
  count: number,
  tags?: string
): Promise<Array<{ question: string; options: string[]; correct: number }>> {
  const prompt = `
You are an expert educational content creator. Generate ${count} multiple-choice quiz questions from the following content.

Content: ${content}

Requirements:
- Difficulty level: ${difficulty}
- Create exactly ${count} questions
- Each question should have exactly 4 options (A, B, C, D)
- Only one option should be correct
- Make incorrect options plausible but clearly wrong
- Questions should test understanding and application
${tags ? `- Focus on these topics: ${tags}` : ''}

For ${difficulty} difficulty:
- Easy: Straightforward recall and basic understanding
- Medium: Application and analysis of concepts
- Hard: Complex analysis, synthesis, and critical thinking

Return the response as a JSON array with this exact format:
[
  {
    "question": "What is the primary function of...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 2
  }
]

The "correct" field should be the index (0-3) of the correct answer.
Only return the JSON array, no other text.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from AI")
    }

    return parseJsonResponse(response) as Array<{ question: string; options: string[]; correct: number }>
  } catch (error) {
    console.error("Error generating quiz:", error)
    throw new Error("Failed to generate quiz")
  }
}

export async function generateFeedback(
  questions: Array<{ question: string; options: string[]; correct: number }>,
  userAnswers: number[]
): Promise<string> {
  const correctCount = userAnswers.filter((answer, index) => answer === questions[index].correct).length
  const totalQuestions = questions.length
  const percentage = Math.round((correctCount / totalQuestions) * 100)

  const prompt = `
You are an educational AI providing personalized feedback on a quiz performance.

Quiz Results:
- Total Questions: ${totalQuestions}
- Correct Answers: ${correctCount}
- Score: ${percentage}%

Provide encouraging, constructive feedback that:
1. Acknowledges their performance
2. Highlights strengths if any
3. Suggests areas for improvement
4. Motivates continued learning
5. Keeps the tone positive and supportive

Keep the feedback concise (2-3 sentences) and personalized based on their score.`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
      max_tokens: 200,
    })

    return completion.choices[0]?.message?.content || "Great job on completing the quiz!"
  } catch (error) {
    console.error("Error generating feedback:", error)
    return "Great job on completing the quiz! Keep up the good work with your studies."
  }
}