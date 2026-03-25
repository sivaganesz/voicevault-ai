import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  qdrant: {
    endpoint: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    collection: { type: String, default: 'documents' },
    vectorSize: { type: Number, default: 768 }
  },
  cloudinary: {
    cloudName: { type: String, default: '' },
    apiKey: { type: String, default: '' },
    apiSecret: { type: String, default: '' }
  },
  firecrawl: {
    apiKey: { type: String, default: '' },
    maxDepth: { type: Number, default: 3 },
    maxPages: { type: Number, default: 100 }
  },
  gemini: {
    apiKey: { type: String, default: '' },
    model: { type: String, default: 'gemini-2.5-flash-native-audio-latest' },
    temperature: { type: Number, default: 0.1 }
  }
}, { timestamps: true });

// We only need one document for global settings
export default mongoose.model('Settings', settingsSchema);
