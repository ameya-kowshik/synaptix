#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test table creation
    const sessionCount = await prisma.session.count();
    console.log(`✅ Database tables accessible (${sessionCount} sessions found)`);
    
    console.log('🎉 Database setup is working correctly!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your DATABASE_URL in .env and .env.local');
    console.log('2. Ensure your database is running');
    console.log('3. Run: npx prisma db push');
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();