#!/usr/bin/env node
/**
 * reset-account.js
 * Wipes all study data for a given user, leaving the account itself intact.
 * Usage: node scripts/reset-account.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/reset-account.js <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`\nResetting account for: ${email} (id: ${user.id})\n`);

  // Delete in dependency order to respect FK constraints
  const [messages, chunks, attempts] = await Promise.all([
    prisma.message.deleteMany({
      where: { conversation: { userId: user.id } },
    }),
    prisma.documentChunk.deleteMany({
      where: { session: { userId: user.id } },
    }),
    prisma.quizAttempt.deleteMany({ where: { userId: user.id } }),
  ]);

  const [conversations, flashcards, quizzes] = await Promise.all([
    prisma.conversation.deleteMany({ where: { userId: user.id } }),
    prisma.flashcard.deleteMany({
      where: { session: { userId: user.id } },
    }),
    prisma.quiz.deleteMany({
      where: { session: { userId: user.id } },
    }),
  ]);

  const sessions = await prisma.studySession.deleteMany({
    where: { userId: user.id },
  });

  await prisma.userPreferences.deleteMany({ where: { userId: user.id } });

  console.log('Deleted:');
  console.log(`  Study sessions  : ${sessions.count}`);
  console.log(`  Flashcards      : ${flashcards.count}`);
  console.log(`  Quizzes         : ${quizzes.count}`);
  console.log(`  Quiz attempts   : ${attempts.count}`);
  console.log(`  Conversations   : ${conversations.count}`);
  console.log(`  Messages        : ${messages.count}`);
  console.log(`  Document chunks : ${chunks.count}`);
  console.log('\nAccount reset complete. User credentials are untouched.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
