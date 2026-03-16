/**
 * RAG (Retrieval-Augmented Generation) utilities
 * Uses BM25-style keyword retrieval — no external embedding API needed.
 */

interface Chunk {
  content: string
  index: number
}

/**
 * Split text into overlapping chunks
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

  return chunks.filter((c) => c.content.length > 50)
}

/**
 * Tokenize text into lowercase words, removing stopwords
 */
function tokenize(text: string): string[] {
  const stopwords = new Set([
    "a","an","the","is","it","in","on","at","to","for","of","and","or","but",
    "with","this","that","are","was","were","be","been","being","have","has",
    "had","do","does","did","will","would","could","should","may","might","can",
    "not","no","so","if","as","by","from","up","about","into","through","during",
    "i","you","he","she","we","they","what","which","who","how","when","where",
  ])
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w))
}

/**
 * BM25-style scoring for a chunk against a query
 */
function scoreChunk(chunk: Chunk, queryTokens: string[]): number {
  const chunkTokens = tokenize(chunk.content)
  const termFreq: Record<string, number> = {}
  for (const t of chunkTokens) termFreq[t] = (termFreq[t] || 0) + 1

  let score = 0
  const k1 = 1.5
  const b = 0.75
  const avgLen = 600 // approximate average chunk length in tokens

  for (const qt of queryTokens) {
    const tf = termFreq[qt] || 0
    if (tf === 0) continue
    const idf = Math.log(1 + 1 / (0.5 + tf)) // simplified IDF
    const norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (
chunkTokens.length / avgLen)))
    score += idf * norm
  }

  return score
}

/**
 * Retrieve the top-k most relevant chunks for a query
 */
export function retrieveRelevantChunks(
  chunks: Chunk[],
  query: string,
  k = 3
): string[] {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return chunks.slice(0, k).map((c) => c.content)

  const scored = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, queryTokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)

  return scored.map((s) => s.chunk.content)
}

/**
 * Build a context string from retrieved chunks
 */
export function buildContext(relevantChunks: string[]): string {
  return relevantChunks.join("\n\n---\n\n")
}
