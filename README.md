# AutoLearn - AI-Powered Study Tools

AutoLearn is a minimalistic web application that uses Generative AI to transform study material into interactive learning tools. Upload PDFs or paste text to generate flashcards and quizzes instantly.

## Features

- **Flashcard Generation**: Create interactive Q&A flashcards from your study material
- **Quiz Generation**: Generate multiple-choice quizzes with AI-powered feedback
- **Difficulty Levels**: Choose from Easy, Medium, or Hard difficulty levels
- **Dark Theme**: Clean, distraction-free dark interface
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI Components**: Radix UI primitives with ShadCN styling
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Groq API for content generation
- **Styling**: Tailwind CSS with dark theme

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Groq API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd autolearn
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
npm run setup
```

Edit both `.env.local` and `.env` with your configuration:
```env
# .env.local (for Next.js runtime)
DATABASE_URL="postgresql://username:password@localhost:5432/autolearn"
GROQ_API_KEY="your_groq_api_key_here"
GEMINI_API_KEY="your_gemini_api_key_here"

# .env (for Prisma CLI)
DATABASE_URL="postgresql://username:password@localhost:5432/autolearn"
```

**Note**: You need both files because Next.js reads `.env.local` at runtime, but Prisma CLI reads `.env`.

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

**Note**: If port 3000 is in use, Next.js will automatically use the next available port (e.g., 3001).

## Usage

1. **Choose Mode**: Select either "Flashcards" or "Quiz" tab
2. **Input Content**: Upload a PDF or paste your study material
3. **Set Parameters**: Choose difficulty level, number of items, and optional tags
4. **Generate**: Click generate and wait for AI processing
5. **Study**: Review your generated flashcards or take the quiz
6. **Get Feedback**: Receive AI-generated performance feedback for quizzes

## API Endpoints

- `POST /api/generate/flashcards` - Generate flashcards from content
- `POST /api/generate/quiz` - Generate quiz questions from content
- `GET /api/session/[sessionId]` - Retrieve session data
- `POST /api/feedback` - Generate quiz performance feedback

## Database Schema

The application uses three main models:
- **Session**: Stores generation sessions with metadata
- **Flashcard**: Stores individual flashcard Q&A pairs
- **Quiz**: Stores quiz questions with multiple choice options

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
