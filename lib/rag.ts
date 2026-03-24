/**
 * RAG (Retrieval-Augmented Generation) — vector-based implementation
 *
 * Flow:
 *   INGESTION (once per study session):
 *     sourceContent → split into chunks → embed each chunk via HuggingFace
 *     → store chunk text + vector in document_chunks table
 *
 *   RETRIEVAL (per chat message):
 *     user query → embed query → pgvector cosine similarity search
 *     → return top-k most semantically relevant chunks
 *     → inject into AI system prompt as context
 */

import { HfInference } from "@huggingface/inference"
import { prisma } from "@/lib/prisma"

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

// Model: all-MiniLM-L6-v2 produces 384-dimensional vectors.
// It's fast, free, and well-suited for semantic similarity tasks.
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

// ─── Chunking ────────────────────────────────────────────────────────────────

interface Chunk {
  content: string
  index: number
}

/**
 * Splits raw text into overlapping chunks.
 * Overlap ensures that sentences spanning a chunk boundary aren't lost.
 *
 * chunkSize: ~800 chars ≈ ~150 tokens, fits well within the model's 256-token limit
 * overlap:   150 chars of shared context between adjacent chunks
 */
export function chunkText(text: string, chunkSize = 800, overlap = 150): Chunk[] {
  const chunks: Chunk[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push({ content: text.slice(start, end).trim(), index: chunks.length })
    if (end === text.length) break
    start += chunkSize - overlap
  }

  // Drop chunks that are too short to be meaningful
  return chunks.filter((c) => c.content.length > 30)
}

// ─── Embedding ───────────────────────────────────────────────────────────────

/**
 * Sends a batch of strings to HuggingFace and returns one float[] per string.
 * We use feature-extraction (mean-pooled sentence embeddings).
 *
 * HuggingFace free tier rate-limits to ~1000 requests/day, which is fine
 * for ingestion since we only embed once per session.
 */
async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []

  for (const text of texts) {
    const result = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: text,
    })

    // featureExtraction can return nested arrays (per-token) or a flat array
    // (sentence-level). We always want the sentence-level flat array.
    const flat = Array.isArray(result[0]) ? (result as number[][])[0] : (result as number[])
    embeddings.push(flat)
  }

  return embeddings
}

// ─── Ingestion ───────────────────────────────────────────────────────────────

/**
 * Call this once when a study session is created (in the generate routes).
 *
 * It chunks the source content, embeds every chunk, then bulk-inserts
 * into document_chunks using a raw pgvector INSERT so Prisma doesn't
 * need to understand the vector type.
 *
 * If chunks already exist for this session (e.g. a retry), we skip ingestion
 * to avoid duplicates.
 */
export async function ingestDocument(sessionId: string, text: string): Promise<void> {
  // Idempotency check — don't re-embed if already done
  const existing = await prisma.documentChunk.findFirst({ where: { sessionId } })
  if (existing) return

  const chunks = chunkText(text)
  if (chunks.length === 0) return

  console.log(`[RAG] Ingesting ${chunks.length} chunks for session ${sessionId}`)
  const embeddings = await embedTexts(chunks.map((c) => c.content))
  console.log(`[RAG] Embeddings received, inserting into DB...`)

  for (let i = 0; i < chunks.length; i++) {
    // The vector literal must be injected as raw SQL — Prisma's parameterized
    // placeholders send it as a typed string value which pgvector can't cast
    // reliably. $executeRawUnsafe lets us inline it directly.
    const vectorLiteral = `[${embeddings[i].join(",")}]`
    await prisma.$executeRawUnsafe(
      `INSERT INTO document_chunks (id, "sessionId", content, embedding, index, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, now())`,
      sessionId,
      chunks[i].content,
      vectorLiteral,
      chunks[i].index
    )
  }

  console.log(`[RAG] Ingestion complete for session ${sessionId}`)
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

/**
 * Given a sessionId and the user's query, returns the top-k chunks
 * whose embeddings are closest to the query embedding.
 *
 * <=> is pgvector's cosine distance operator (lower = more similar).
 * We ORDER BY distance ASC and take the first k rows.
 */
export async function retrieveRelevantChunks(
  sessionId: string,
  query: string,
  k = 4
): Promise<string[]> {
  const [queryEmbedding] = await embedTexts([query])
  const vectorLiteral = `[${queryEmbedding.join(",")}]`

  // $queryRawUnsafe used here for the same reason as ingestion —
  // the vector literal must be inlined as raw SQL, not a parameter.
  const results = await prisma.$queryRawUnsafe<{ content: string }[]>(
    `SELECT content
     FROM document_chunks
     WHERE "sessionId" = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    sessionId,
    vectorLiteral,
    k
  )

  return results.map((r) => r.content)
}

// ─── Context builder ─────────────────────────────────────────────────────────

/**
 * Joins retrieved chunks into a single context string for the AI prompt.
 * The --- separator helps the model distinguish between chunks.
 */
export function buildContext(chunks: string[]): string {
  return chunks.join("\n\n---\n\n")
}
