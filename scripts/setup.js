#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up AutoLearn...\n');

// Check if .env.local exists
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

const envTemplate = `# Database
DATABASE_URL="postgresql://username:password@localhost:5432/autolearn?schema=public"

# AI APIs
GROQ_API_KEY="your_groq_api_key_here"
GEMINI_API_KEY="your_gemini_api_key_here"

# Next.js
NEXTAUTH_SECRET="your_nextauth_secret_here"
NEXTAUTH_URL="http://localhost:3000"
`;

const envPrismaTemplate = `# Database (for Prisma CLI)
DATABASE_URL="postgresql://username:password@localhost:5432/autolearn?schema=public"
`;

if (!fs.existsSync(envLocalPath)) {
  console.log('📝 Creating .env.local file...');
  fs.writeFileSync(envLocalPath, envTemplate);
  console.log('✅ .env.local created');
} else {
  console.log('✅ .env.local already exists');
}

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file...');
  fs.writeFileSync(envPath, envPrismaTemplate);
  console.log('✅ .env created');
} else {
  console.log('✅ .env already exists');
}

console.log('\n📋 Next steps:');
console.log('1. Update .env.local with your database URL and API keys');
console.log('2. Set up your PostgreSQL database');
console.log('3. Run: npx prisma generate');
console.log('4. Run: npx prisma db push');
console.log('5. Run: npm run dev');
console.log('\n🎉 Happy learning!');