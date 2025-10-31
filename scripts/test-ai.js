#!/usr/bin/env node

// Simple test script to verify AI generation is working
async function testAI() {
  console.log('🧠 Testing AI generation...\n');

  const testContent = `
Photosynthesis is the process by which plants convert light energy into chemical energy. 
It occurs in chloroplasts and involves two main stages: light-dependent reactions and the Calvin cycle.
The overall equation is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂
  `.trim();

  try {
    console.log('📝 Testing flashcard generation...');
    const flashcardResponse = await fetch('http://localhost:3000/api/generate/flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testContent,
        difficulty: 'medium',
        count: 3,
        tags: 'biology, photosynthesis'
      })
    });

    if (flashcardResponse.ok) {
      const flashcardData = await flashcardResponse.json();
      console.log('✅ Flashcard generation successful!');
      console.log(`   Generated ${flashcardData.flashcards.length} flashcards`);
      console.log(`   Session ID: ${flashcardData.sessionId}`);
    } else {
      const error = await flashcardResponse.json();
      console.log('❌ Flashcard generation failed:', error.error);
    }

    console.log('\n🧩 Testing quiz generation...');
    const quizResponse = await fetch('http://localhost:3000/api/generate/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testContent,
        difficulty: 'medium',
        count: 2,
        tags: 'biology, photosynthesis'
      })
    });

    if (quizResponse.ok) {
      const quizData = await quizResponse.json();
      console.log('✅ Quiz generation successful!');
      console.log(`   Generated ${quizData.quiz.length} questions`);
      console.log(`   Session ID: ${quizData.sessionId}`);
    } else {
      const error = await quizResponse.json();
      console.log('❌ Quiz generation failed:', error.error);
    }

    console.log('\n🎉 AI testing complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

testAI();