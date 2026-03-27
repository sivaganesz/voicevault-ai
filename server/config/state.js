// Global state management for dynamic services
export let qdrantClient = null;
export let ai = null;
export let embeddingModel = null;
export let globalSettings = null;
export let COLLECTION_NAME = 'documents';
export const MODEL = 'gemini-2.5-flash-native-audio-latest';

export const setQdrantClient = (client) => { qdrantClient = client; };
export const setAi = (aiInstance) => { ai = aiInstance; };
export const setEmbeddingModel = (model) => { embeddingModel = model; };
export const setGlobalSettings = (settings) => { globalSettings = settings; };
export const setCollectionName = (name) => { COLLECTION_NAME = name; };
