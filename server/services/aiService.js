import { GoogleGenerativeAI } from '@google/generative-ai';
import * as state from '../config/state.js';
 
// ── Retry helper for free-tier 429 rate-limit errors ─────────────────────────
async function withRetry(fn, retries = 2, baseDelayMs = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota');
      if (is429 && attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt); // exponential back-off
        console.warn(`⚠️ Gemini rate limit hit — retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}
 
export async function createEmbedding(text) {
  if (!state.embeddingModel) {
    throw new Error('Embedding model not initialized. Check your Gemini API key in Settings.');
  }
  const start = Date.now();
  try {
    const result = await withRetry(() =>
      state.embeddingModel.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 768
      })
    );
    console.log(`⏱️ Embedding created in ${Date.now() - start}ms`);
    return result.embedding.values;
  } catch (error) {
    console.error('❌ Embedding error:', error.message);
    throw error;
  }
}
 