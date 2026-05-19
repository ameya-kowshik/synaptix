#!/usr/bin/env node
/**
 * seed-demo-data.js
 * Populates realistic study history for a user so the app looks actively used.
 * Usage: node scripts/seed-demo-data.js <email>
 *
 * Creates (spread across the past 7 days):
 *   - 5 flashcard study sessions  (25 flashcards total)
 *   - 4 quiz study sessions       (20 quiz questions + 4 attempts with varied scores)
 *   - 3 AI tutor conversations    (multi-turn messages each)
 *   - User preferences
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

/** Return a Date that is `daysAgo` days before now, with optional hour offset */
function daysBack(daysAgo, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── seed data ───────────────────────────────────────────────────────────────

const FLASHCARD_SESSIONS = [
  {
    daysAgo: 7,
    hour: 9,
    difficulty: 'easy',
    tags: 'javascript,basics',
    title: 'JavaScript Fundamentals',
    cards: [
      { question: 'What is a closure in JavaScript?', answer: 'A closure is a function that retains access to its outer scope even after the outer function has returned.' },
      { question: 'What does the `typeof` operator return for null?', answer: '"object" — this is a well-known JavaScript quirk.' },
      { question: 'What is event delegation?', answer: 'Attaching a single event listener to a parent element to handle events from its children via bubbling.' },
      { question: 'Difference between `==` and `===`?', answer: '`==` coerces types before comparing; `===` checks value AND type without coercion.' },
      { question: 'What is the event loop?', answer: 'A mechanism that picks tasks from the callback queue and pushes them onto the call stack when it is empty.' },
    ],
  },
  {
    daysAgo: 6,
    hour: 14,
    difficulty: 'medium',
    tags: 'react,hooks',
    title: 'React Hooks Deep Dive',
    cards: [
      { question: 'What problem does `useCallback` solve?', answer: 'It memoizes a function reference so child components that receive it as a prop do not re-render unnecessarily.' },
      { question: 'When should you use `useReducer` over `useState`?', answer: 'When state logic is complex, involves multiple sub-values, or the next state depends on the previous one.' },
      { question: 'What is the dependency array in `useEffect`?', answer: 'A list of values the effect depends on; the effect re-runs only when one of those values changes.' },
      { question: 'What does `useRef` return?', answer: 'A mutable ref object whose `.current` property persists across renders without causing re-renders.' },
      { question: 'What is a custom hook?', answer: 'A JavaScript function whose name starts with "use" and that can call other hooks to encapsulate reusable stateful logic.' },
    ],
  },
  {
    daysAgo: 4,
    hour: 11,
    difficulty: 'hard',
    tags: 'algorithms,sorting',
    title: 'Sorting Algorithms',
    cards: [
      { question: 'What is the average time complexity of QuickSort?', answer: 'O(n log n), though worst case is O(n²) when the pivot is always the smallest or largest element.' },
      { question: 'How does Merge Sort achieve stability?', answer: 'By always taking the left element first when two elements are equal during the merge step.' },
      { question: 'What is a heap and how is it used in HeapSort?', answer: 'A complete binary tree satisfying the heap property; HeapSort builds a max-heap then repeatedly extracts the max.' },
      { question: 'When is Insertion Sort preferred over QuickSort?', answer: 'For small arrays (n < ~20) or nearly-sorted data, where its O(n) best case outperforms QuickSort\'s overhead.' },
      { question: 'What is the space complexity of Merge Sort?', answer: 'O(n) auxiliary space for the temporary arrays used during merging.' },
    ],
  },
  {
    daysAgo: 2,
    hour: 16,
    difficulty: 'medium',
    tags: 'databases,sql',
    title: 'SQL & Databases',
    cards: [
      { question: 'What is a database index?', answer: 'A data structure (often a B-tree) that speeds up data retrieval at the cost of additional storage and slower writes.' },
      { question: 'Difference between INNER JOIN and LEFT JOIN?', answer: 'INNER JOIN returns only matching rows; LEFT JOIN returns all rows from the left table plus matches from the right.' },
      { question: 'What is database normalization?', answer: 'Organizing a database to reduce redundancy and improve data integrity, typically through normal forms (1NF–3NF).' },
      { question: 'What is a transaction?', answer: 'A sequence of operations treated as a single unit that either fully commits or fully rolls back (ACID properties).' },
      { question: 'What does EXPLAIN do in SQL?', answer: 'Shows the query execution plan so you can identify bottlenecks like full table scans or missing indexes.' },
    ],
  },
  {
    daysAgo: 1,
    hour: 10,
    difficulty: 'medium',
    tags: 'system-design,architecture',
    title: 'System Design Basics',
    cards: [
      { question: 'What is horizontal vs vertical scaling?', answer: 'Vertical scaling adds resources to one machine; horizontal scaling adds more machines to distribute load.' },
      { question: 'What is a CDN?', answer: 'A Content Delivery Network caches static assets at edge servers geographically close to users to reduce latency.' },
      { question: 'What is the CAP theorem?', answer: 'A distributed system can guarantee at most two of: Consistency, Availability, and Partition tolerance.' },
      { question: 'What is a message queue?', answer: 'A buffer that decouples producers and consumers, enabling async processing and load leveling (e.g., RabbitMQ, Kafka).' },
      { question: 'What is database sharding?', answer: 'Splitting a database horizontally across multiple servers, each holding a subset of rows, to scale writes.' },
    ],
  },
];

const QUIZ_SESSIONS = [
  {
    daysAgo: 6,
    hour: 15,
    difficulty: 'easy',
    tags: 'javascript,basics',
    title: 'JavaScript Quiz',
    score: 4,
    questions: [
      { question: 'Which keyword declares a block-scoped variable?', options: ['var', 'let', 'function', 'const'], correct: 1 },
      { question: 'What does `Array.prototype.map()` return?', options: ['The original array', 'A new array', 'undefined', 'A boolean'], correct: 1 },
      { question: 'Which method removes the last element of an array?', options: ['shift()', 'unshift()', 'pop()', 'push()'], correct: 2 },
      { question: 'What is `NaN === NaN`?', options: ['true', 'false', 'undefined', 'TypeError'], correct: 1 },
      { question: 'Which of these is NOT a JavaScript primitive?', options: ['string', 'boolean', 'object', 'symbol'], correct: 2 },
    ],
  },
  {
    daysAgo: 5,
    hour: 13,
    difficulty: 'medium',
    tags: 'react,components',
    title: 'React Concepts Quiz',
    score: 3,
    questions: [
      { question: 'What triggers a React component to re-render?', options: ['Only prop changes', 'Only state changes', 'State or prop changes', 'Only context changes'], correct: 2 },
      { question: 'What is the virtual DOM?', options: ['A browser API', 'A lightweight JS representation of the real DOM', 'A CSS framework', 'A database'], correct: 1 },
      { question: 'Which hook runs after every render by default?', options: ['useState', 'useEffect', 'useRef', 'useMemo'], correct: 1 },
      { question: 'What does React.memo do?', options: ['Memoizes a value', 'Prevents re-render if props are unchanged', 'Creates a ref', 'Manages side effects'], correct: 1 },
      { question: 'What is prop drilling?', options: ['A performance optimization', 'Passing props through many layers of components', 'A React hook', 'A build tool feature'], correct: 1 },
    ],
  },
  {
    daysAgo: 3,
    hour: 17,
    difficulty: 'hard',
    tags: 'algorithms,complexity',
    title: 'Big-O Complexity Quiz',
    score: 3,
    questions: [
      { question: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], correct: 1 },
      { question: 'What is the worst-case complexity of QuickSort?', options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], correct: 2 },
      { question: 'Accessing an element in a hash map is typically:', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], correct: 2 },
      { question: 'What is the space complexity of a recursive DFS on a graph with V vertices?', options: ['O(1)', 'O(V)', 'O(V²)', 'O(E)'], correct: 1 },
      { question: 'Which sorting algorithm has O(n) best-case time complexity?', options: ['Merge Sort', 'Heap Sort', 'Insertion Sort', 'Selection Sort'], correct: 2 },
    ],
  },
  {
    daysAgo: 1,
    hour: 14,
    difficulty: 'medium',
    tags: 'system-design,networking',
    title: 'Networking & APIs Quiz',
    score: 4,
    questions: [
      { question: 'What does REST stand for?', options: ['Remote Execution State Transfer', 'Representational State Transfer', 'Resource Endpoint Standard Transfer', 'Reliable Event Stream Transfer'], correct: 1 },
      { question: 'Which HTTP method is idempotent but NOT safe?', options: ['GET', 'POST', 'PUT', 'PATCH'], correct: 2 },
      { question: 'What is the purpose of a 401 status code?', options: ['Not Found', 'Server Error', 'Unauthorized', 'Forbidden'], correct: 2 },
      { question: 'What does CORS stand for?', options: ['Cross-Origin Resource Sharing', 'Client-Origin Request System', 'Cross-Object Routing Service', 'Content Origin Resolution Standard'], correct: 0 },
      { question: 'Which protocol does WebSocket upgrade from?', options: ['FTP', 'SMTP', 'HTTP', 'TCP directly'], correct: 2 },
    ],
  },
];

const CONVERSATIONS = [
  {
    daysAgo: 5,
    hour: 12,
    title: 'Understanding Async/Await',
    topic: 'javascript',
    messages: [
      { role: 'user', content: 'Can you explain how async/await works under the hood in JavaScript?' },
      { role: 'assistant', content: 'Sure! `async/await` is syntactic sugar over Promises. When you mark a function `async`, it always returns a Promise. The `await` keyword pauses execution of that async function until the awaited Promise resolves, but it does NOT block the main thread — the event loop continues processing other tasks in the meantime.\n\nUnder the hood, the JS engine transforms your `async` function into a state machine, similar to what a generator function does. Each `await` point is a "yield" that suspends the function and resumes it when the Promise settles.' },
      { role: 'user', content: 'What happens if the awaited promise rejects?' },
      { role: 'assistant', content: 'If the Promise rejects and you don\'t handle it, the rejection propagates as a thrown error inside the async function. You can catch it with a standard `try/catch` block:\n\n```js\nasync function fetchData() {\n  try {\n    const data = await fetch(\'/api/data\');\n    return await data.json();\n  } catch (err) {\n    console.error(\'Fetch failed:\', err);\n  }\n}\n```\n\nWithout `try/catch`, the async function returns a rejected Promise, which you\'d need to handle with `.catch()` at the call site.' },
      { role: 'user', content: 'How is this different from using .then() chains?' },
      { role: 'assistant', content: 'Functionally they\'re equivalent — both use the Promise machinery. The differences are ergonomic:\n\n- `async/await` reads like synchronous code, making control flow (loops, conditionals) much easier to follow.\n- `.then()` chains can get deeply nested ("callback hell lite") for complex flows.\n- Error handling with `try/catch` is more natural than `.catch()` at the end of a chain.\n- Debugging is easier with `async/await` because stack traces are cleaner.\n\nThat said, `.then()` is still useful when you want to fire multiple Promises in parallel with `Promise.all()` without awaiting each one sequentially.' },
    ],
  },
  {
    daysAgo: 3,
    hour: 10,
    title: 'React Performance Optimization',
    topic: 'react',
    messages: [
      { role: 'user', content: 'My React app is slow. What are the main things I should look at?' },
      { role: 'assistant', content: 'Good question. Here\'s a prioritized checklist:\n\n1. **Unnecessary re-renders** — Use React DevTools Profiler to find components re-rendering too often. Fix with `React.memo`, `useCallback`, and `useMemo`.\n2. **Large bundle size** — Use code splitting (`React.lazy` + `Suspense`) and dynamic imports so users only load what they need.\n3. **Expensive computations in render** — Move them into `useMemo` so they only recompute when dependencies change.\n4. **Long lists** — Virtualize with `react-window` or `react-virtual` instead of rendering thousands of DOM nodes.\n5. **Images** — Use Next.js `<Image>` or lazy-load images with `loading="lazy"`.' },
      { role: 'user', content: 'Can you show me a quick example of useMemo vs useCallback?' },
      { role: 'assistant', content: '```jsx\n// useMemo — memoizes a COMPUTED VALUE\nconst sortedList = useMemo(() => {\n  return items.sort((a, b) => a.name.localeCompare(b.name));\n}, [items]); // only re-sorts when `items` changes\n\n// useCallback — memoizes a FUNCTION REFERENCE\nconst handleClick = useCallback((id) => {\n  dispatch({ type: \'SELECT\', id });\n}, [dispatch]); // stable reference unless `dispatch` changes\n```\n\nRule of thumb: `useMemo` for expensive calculations, `useCallback` for functions passed as props to memoized children.' },
      { role: 'user', content: 'When should I NOT use these hooks?' },
      { role: 'assistant', content: 'Great question — premature optimization is a real trap here.\n\nSkip `useMemo`/`useCallback` when:\n- The computation is cheap (simple arithmetic, short array operations).\n- The component rarely re-renders anyway.\n- The memoized value/function isn\'t passed to a `React.memo` child or used as a `useEffect` dependency.\n\nEvery `useMemo`/`useCallback` call has its own overhead (memory for the cache, comparison on each render). If the savings don\'t outweigh that cost, you\'ve made things slower, not faster. Profile first, optimize second.' },
    ],
  },
  {
    daysAgo: 1,
    hour: 9,
    title: 'System Design: URL Shortener',
    topic: 'system-design',
    messages: [
      { role: 'user', content: 'Walk me through designing a URL shortener like bit.ly.' },
      { role: 'assistant', content: 'Classic system design question. Let\'s break it down:\n\n**Requirements**\n- Shorten a long URL to a ~7-char alias\n- Redirect alias → original URL with low latency\n- Handle ~100M URLs, ~10B redirects/day\n\n**Core components**\n1. **API layer** — POST /shorten, GET /:alias\n2. **ID generation** — Base62 encode a counter (or use a distributed ID like Snowflake) to get a short unique key\n3. **Database** — Store `{ alias, originalUrl, userId, createdAt, expiresAt }`. A simple KV store (Redis) works great for lookups.\n4. **Cache** — Put Redis in front of the DB for redirects; 80% of traffic hits 20% of URLs\n5. **CDN** — Edge-cache popular redirects globally' },
      { role: 'user', content: 'How would you handle custom aliases and collision detection?' },
      { role: 'assistant', content: 'For custom aliases:\n- Accept an optional `customAlias` field in the POST body\n- Check the DB/cache for existence before inserting\n- Return a 409 Conflict if already taken\n\nFor auto-generated aliases, collision is rare with Base62(7) = 3.5 trillion combinations, but you still need to handle it:\n\n**Approach 1 — Counter-based (no collisions)**\nUse an atomic counter (Redis INCR or a dedicated sequence DB). Encode the integer to Base62. Guaranteed unique, but sequential aliases are guessable.\n\n**Approach 2 — Hash-based**\nMD5/SHA256 the URL, take the first 7 chars. On collision, append a salt and retry. Simple but requires a read-before-write.\n\n**Approach 3 — Pre-generated key pool**\nA background worker pre-generates millions of unused keys and stores them in a "keys" table. The API just pops one atomically. Zero collision risk at request time.' },
      { role: 'user', content: 'What database would you choose and why?' },
      { role: 'assistant', content: 'For the redirect lookup (hot path), **Redis** is the clear winner — sub-millisecond reads, built-in TTL for expiring links, and it handles the read-heavy workload (10B/day ≈ 115K req/s) without breaking a sweat.\n\nFor persistent storage of URL metadata, I\'d use **PostgreSQL**:\n- ACID guarantees for writes\n- Easy to query analytics (clicks by day, top URLs)\n- Scales to 100M rows comfortably with proper indexing on `alias`\n\nArchitecture: write to Postgres first, then populate Redis cache on first read (cache-aside pattern). For very high write throughput, add a write-through cache or use async replication to Redis.' },
    ],
  },
];

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/seed-demo-data.js <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`\nSeeding demo data for: ${email}\n`);

  // User preferences
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      defaultDifficulty: 'medium',
      studyGoal: 'Ace my technical interviews',
      notificationsEnabled: true,
      theme: 'dark',
    },
  });
  console.log('✓ User preferences set');

  // Flashcard sessions
  for (const s of FLASHCARD_SESSIONS) {
    const createdAt = daysBack(s.daysAgo, s.hour);
    const session = await prisma.studySession.create({
      data: {
        userId: user.id,
        type: 'flashcards',
        difficulty: s.difficulty,
        tags: s.tags,
        sourceContent: `Study material for: ${s.title}`,
        createdAt,
        updatedAt: createdAt,
        flashcards: {
          create: s.cards.map((c) => ({
            question: c.question,
            answer: c.answer,
            createdAt,
          })),
        },
      },
    });
    console.log(`✓ Flashcard session: "${s.title}" (${s.cards.length} cards)`);
  }

  // Quiz sessions + attempts
  for (const s of QUIZ_SESSIONS) {
    const createdAt = daysBack(s.daysAgo, s.hour);
    const session = await prisma.studySession.create({
      data: {
        userId: user.id,
        type: 'quiz',
        difficulty: s.difficulty,
        tags: s.tags,
        sourceContent: `Study material for: ${s.title}`,
        createdAt,
        updatedAt: createdAt,
        quizzes: {
          create: s.questions.map((q) => ({
            question: q.question,
            options: q.options,
            correct: q.correct,
            createdAt,
          })),
        },
      },
      include: { quizzes: true },
    });

    // Build a realistic answers array
    const answers = session.quizzes.map((q, i) => {
      const isCorrect = i < s.score;
      const selected = isCorrect ? q.correct : (q.correct + 1) % 4;
      return { questionId: q.id, selected, correct: q.correct, isCorrect };
    });

    await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        score: s.score,
        total: s.questions.length,
        answers,
        createdAt,
      },
    });

    console.log(`✓ Quiz session: "${s.title}" (score ${s.score}/${s.questions.length})`);
  }

  // Conversations
  for (const c of CONVERSATIONS) {
    const createdAt = daysBack(c.daysAgo, c.hour);
    const conv = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: c.title,
        topic: c.topic,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      },
    });

    let msgTime = new Date(createdAt);
    for (const m of c.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: m.role,
          content: m.content,
          createdAt: new Date(msgTime),
        },
      });
      msgTime = new Date(msgTime.getTime() + 2 * 60 * 1000); // 2 min apart
    }

    console.log(`✓ Conversation: "${c.title}" (${c.messages.length} messages)`);
  }

  console.log('\nDemo data seeded successfully.');
  console.log(`  Flashcard sessions : ${FLASHCARD_SESSIONS.length}`);
  console.log(`  Quiz sessions      : ${QUIZ_SESSIONS.length}`);
  console.log(`  Conversations      : ${CONVERSATIONS.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
