import Settings from '../models/Settings.js';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as state from '../config/state.js';
 
export async function applyConfig(config) {
  state.setGlobalSettings(config);
  state.setCollectionName(config.qdrant.collection || 'documents');
 
  if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
    console.log('✅ Cloudinary configured');
  }
 
  if (config.qdrant.endpoint) {
    // ── Optimization: explicit timeout on the Qdrant REST client ─────────────
    // The default is no timeout — a transient network hiccup would stall the
    // request indefinitely. 8 s is generous enough for cold starts yet tight
    // enough to surface issues quickly.
    const client = new QdrantClient({
      url: config.qdrant.endpoint,
      apiKey: config.qdrant.apiKey || undefined,
      timeout: 8000, // ms
    });
    state.setQdrantClient(client);
 
    try {
      const collections = await client.getCollections();
      const exists = collections.collections.some(c => c.name === state.COLLECTION_NAME);
      if (!exists) {
        console.log(`🚀 Creating Qdrant collection: ${state.COLLECTION_NAME}`);
        await client.createCollection(state.COLLECTION_NAME, {
          vectors: { size: config.qdrant.vectorSize || 768, distance: 'Cosine' },
        });
      } else {
        console.log(`✅ Qdrant collection '${state.COLLECTION_NAME}' already exists.`);
      }
    } catch (err) {
      console.error('❌ Error initializing Qdrant:', err.message);
    }
  }
 
  if (config.gemini.apiKey) {
    const aiInstance = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });
    state.setAi(aiInstance);
 
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    state.setEmbeddingModel(genAI.getGenerativeModel({ model: 'gemini-embedding-001' }));
    console.log('✅ Gemini AI configured');
  }
}
 
export async function loadAndApplySettings() {
  try {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
      console.warn('⚠️ MONGODB_URI not found. Please set it in .env');
      return;
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongodbUri);
      console.log('✅ Connected to MongoDB');
    }
 
    let config = await Settings.findOne();
    if (!config) {
      config = await Settings.create({
        qdrant: {
          endpoint: process.env.QDRANT_URL || 'http://localhost:6333',
          apiKey: process.env.QDRANT_API_KEY || '',
          collection: 'documents',
          vectorSize: 768
        },
        cloudinary: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
          apiKey: process.env.CLOUDINARY_API_KEY || '',
          apiSecret: process.env.CLOUDINARY_API_SECRET || ''
        },
        gemini: {
          apiKey: process.env.GEMINI_API_KEY || '',
          model: 'gemini-2.5-flash-native-audio-latest',
          temperature: 0.1
        }
      });
      console.log('✅ Created default settings from .env');
    }
    await applyConfig(config);
  } catch (err) {
    console.error('❌ Failed to load settings:', err);
  }
}
 
export const getSettings = async (req, res) => {
  try {
    const config = await Settings.findOne();
    res.json(config || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};
 
export const updateSettings = async (req, res) => {
  try {
    let config = await Settings.findOne();
    if (!config) {
      config = new Settings(req.body);
    } else {
      Object.assign(config, req.body);
    }
    await config.save();
    await applyConfig(config);
    res.json({ success: true, message: 'Settings saved and applied successfully' });
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
};
 