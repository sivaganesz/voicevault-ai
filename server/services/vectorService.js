import * as state from '../config/state.js';
import { createEmbedding } from './aiService.js';
 
// ─── Embedding Cache ──────────────────────────────────────────────────────────
// Avoids re-embedding the same query text on repeated calls.
// Cache is keyed by normalized query string; evicted when it exceeds MAX_SIZE.
const embeddingCache = new Map();
const CACHE_MAX_SIZE = 200;
 
function getCachedEmbedding(query) {
  const key = query.trim().toLowerCase();
  return embeddingCache.has(key) ? embeddingCache.get(key) : null;
}
 
function setCachedEmbedding(query, vector) {
  const key = query.trim().toLowerCase();
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
    console.log(`🗑️ Embedding cache evicted oldest entry (size was ${CACHE_MAX_SIZE})`);
  }
  embeddingCache.set(key, vector);
}
 
// ─── Qdrant Search with Timeout ───────────────────────────────────────────────
async function searchWithTimeout(searchParams, timeoutMs = 5000) {
  const searchPromise = state.qdrantClient.search(state.COLLECTION_NAME, searchParams);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Qdrant search timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([searchPromise, timeoutPromise]);
}
 
// ─── Main Query Function ──────────────────────────────────────────────────────
export async function queryDocuments(query, category = null, clientWs = null) {
  const t0 = Date.now();
  try {
    if (!state.qdrantClient) throw new Error('Qdrant not initialized');
 
    // 1. Try embedding cache first
    let queryEmbedding = getCachedEmbedding(query);
    if (queryEmbedding) {
      console.log(`⚡ Embedding cache HIT for: "${query}" (0ms)`);
    } else {
      console.log(`\n🔍 Gemini analyze vector DB for: "${query}"`);
      queryEmbedding = await createEmbedding(query);
      setCachedEmbedding(query, queryEmbedding);
    }
 
    // 2. Build search params — keep limit tight (3 is enough for 1-2 sentence answers)
    const searchParams = {
      vector: queryEmbedding,
      limit: 3,
      with_payload: true,
    };
 
    if (category && category !== 'general' && category !== 'All') {
      searchParams.filter = {
        must: [{ key: 'category', match: { value: category } }],
      };
    }
 
    // 3. Run search with timeout guard
    const results = await searchWithTimeout(searchParams, 5000);
    console.log(`⏱️ Qdrant search completed in ${Date.now() - t0}ms (${results.length} results)`);
 
    if (clientWs) clientWs.isQdrantResponse = true;
 
    if (results.length === 0) return 'No relevant information found.';
 
    // 4. Return only the top result if it's clearly dominant (score gap > 0.15).
    //    Keeps Gemini context small → faster synthesis.
    const topScore = results[0].score ?? 1;
    const filtered =
      results.length > 1 && topScore - (results[1].score ?? 0) > 0.15
        ? [results[0]]
        : results;
 
    return filtered
      .map(r => `[From ${r.payload.filename}]: ${r.payload.text}`)
      .join('\n---\n');
 
  } catch (error) {
    console.error('❌ Qdrant search error:', error.message);
    return 'Error searching knowledge base: ' + error.message;
  }
}