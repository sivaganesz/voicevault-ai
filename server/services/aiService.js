import { GoogleGenerativeAI } from '@google/generative-ai';
import * as state from '../config/state.js';

export async function createEmbedding(text) {
  if (!state.embeddingModel) {
    throw new Error('Embedding model not initialized. Check your Gemini API key in Settings.');
  }
  try {
    const start = Date.now();
    const result = await state.embeddingModel.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768
    });
    console.log(`⏱️ Embedding created in ${Date.now() - start}ms`);
    return result.embedding.values;
  } catch (error) {
    console.error('❌ Embedding error:', error);
    throw error;
  }
}
