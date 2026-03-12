const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Generate a secure random secret
const generateSecret = () => {
  return crypto.randomBytes(32).toString('base64')
}

const envPath = path.join(__dirname, '..', '.env')
const envLocalPath = path.join(__dirname, '..', '.env.local')

// Read current .env file
let envContent = ''
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8')
}

// Check if NEXTAUTH_SECRET already exists
if (!envContent.includes('NEXTAUTH_SECRET=')) {
  console.log('Setting up authentication environment variables...')
  
  const secret = generateSecret()
  
  // Update .env file
  const authConfig = `
# NextAuth.js Configuration (Generated)
NEXTAUTH_SECRET="${secret}"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (Optional - configure these if you want OAuth)
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"
# GITHUB_CLIENT_ID="your-github-client-id"
# GITHUB_CLIENT_SECRET="your-github-client-secret"
`

  // Remove the old auth config if it exists
  envContent = envContent.replace(/# NextAuth\.js Configuration[\s\S]*?# GITHUB_CLIENT_SECRET="your-github-client-secret"/g, '')
  
  // Add new auth config
  envContent += authConfig
  
  fs.writeFileSync(envPath, envContent)
  
  // Also create .env.local for Next.js runtime
  fs.writeFileSync(envLocalPath, `NEXTAUTH_SECRET="${secret}"
NEXTAUTH_URL="http://localhost:3000"
`)

  console.log('✅ Authentication environment variables configured!')
  console.log('📝 Generated secure NEXTAUTH_SECRET')
  console.log('🔧 To enable OAuth providers:')
  console.log('   1. Uncomment the OAuth lines in .env')
  console.log('   2. Add your OAuth client IDs and secrets')
  console.log('   3. Configure OAuth apps in Google/GitHub consoles')
} else {
  console.log('✅ Authentication already configured!')
}