import * as state from '../config/state.js';
import { createEmbedding } from './aiService.js';

export async function queryDocuments(query, category = null, clientWs = null) {
  try {
    if (!state.qdrantClient) throw new Error('Qdrant not initialized');
    const queryEmbedding = await createEmbedding(query);
    
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

    console.log(`\n🔍 Gemini analyze vector DB for: "${query}"`);
    const results = await state.qdrantClient.search(state.COLLECTION_NAME, searchParams);
    
    if (clientWs) clientWs.isQdrantResponse = true;

    if (results.length === 0) return "No relevant information found.";
    return results.map(r => `[From ${r.payload.filename}]: ${r.payload.text}`).join('\n---\n');
  } catch (error) {
    console.error('❌ Qdrant search error:', error);
    return "Error searching knowledge base: " + error.message;
  }
}
