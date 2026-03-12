const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testRegistration() {
  try {
    console.log('Testing registration flow...\n')

    // Test 1: Check if User model exists
    console.log('1. Checking User model...')
    const userCount = await prisma.user.count()
    console.log(`   ✅ User model accessible (${userCount} users in database)\n`)

    // Test 2: Check if UserPreferences model exists
    console.log('2. Checking UserPreferences model...')
    const prefsCount = await prisma.userPreferences.count()
    console.log(`   ✅ UserPreferences model accessible (${prefsCount} preferences in database)\n`)

    // Test 3: Test creating a user (dry run)
    console.log('3. Testing user creation (dry run)...')
    const testEmail = `test-${Date.now()}@example.com`
    const hashedPassword = await bcrypt.hash('testpassword123', 10)
    
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: testEmail,
        password: hashedPassword,
      },
    })
    console.log(`   ✅ User created: ${user.email}\n`)

    // Test 4: Create preferences for the user
    console.log('4. Testing preferences creation...')
    const prefs = await prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    })
    console.log(`   ✅ Preferences created for user\n`)

    // Cleanup
    console.log('5. Cleaning up test data...')
    await prisma.userPreferences.delete({ where: { id: prefs.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log('   ✅ Test data cleaned up\n')

    console.log('✅ All registration tests passed!')
    console.log('\nThe registration endpoint should now work correctly.')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testRegistration()
