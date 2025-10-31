#!/usr/bin/env node

// Simple test script to verify history/sessions API is working
async function testHistory() {
  console.log('📚 Testing study history functionality...\n');

  try {
    console.log('📋 Testing sessions API...');
    const response = await fetch('http://localhost:3000/api/sessions');

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sessions API working!');
      console.log(`   Found ${data.sessions.length} study sessions`);
      
      if (data.sessions.length > 0) {
        const session = data.sessions[0];
        console.log(`   Latest session: ${session.type} (${session.difficulty})`);
        console.log(`   Created: ${new Date(session.createdAt).toLocaleDateString()}`);
        
        if (session.type === 'flashcards') {
          console.log(`   Contains ${session.flashcards?.length || 0} flashcards`);
        } else {
          console.log(`   Contains ${session.quizzes?.length || 0} quiz questions`);
        }
      } else {
        console.log('   No sessions found - create some flashcards or quizzes first!');
      }
    } else {
      const error = await response.json();
      console.log('❌ Sessions API failed:', error.error);
    }

    console.log('\n🎉 History testing complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the development server is running: npm run dev');
  }
}

testHistory();