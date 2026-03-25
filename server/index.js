import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import Settings from './models/Settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');
const pdf = pdfLib.default || pdfLib;
const mammoth = require('mammoth');
const officeParser = require('officeparser');

const app = express();
app.use(cors());
app.use(express.json());

let qdrantClient = null;
let ai = null;
let embeddingModel = null;
let globalSettings = null;
let COLLECTION_NAME = 'documents';
const MODEL = 'gemini-2.5-flash-native-audio-latest';

async function loadAndApplySettings() {
  try {
    const mongodbUri = process.env.MONGODB_URI;
    if (!mongodbUri) {
      console.warn('⚠️ MONGODB_URI not found. Please set it in .env');
      return;
    }
    await mongoose.connect(mongodbUri);
    console.log('✅ Connected to MongoDB');

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

async function applyConfig(config) {
  globalSettings = config;
  COLLECTION_NAME = config.qdrant.collection || 'documents';

  if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
    console.log('✅ Cloudinary configured');
  }

  if (config.qdrant.endpoint) {
    qdrantClient = new QdrantClient({
      url: config.qdrant.endpoint,
      apiKey: config.qdrant.apiKey || undefined
    });
    try {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
      if (!exists) {
        console.log(`🚀 Creating Qdrant collection: ${COLLECTION_NAME}`);
        await qdrantClient.createCollection(COLLECTION_NAME, {
          vectors: { size: config.qdrant.vectorSize || 768, distance: 'Cosine' },
        });
      } else {
        console.log(`✅ Qdrant collection '${COLLECTION_NAME}' already exists.`);
      }
    } catch (err) {
      console.error('❌ Error initializing Qdrant:', err.message);
    }
  }

  if (config.gemini.apiKey) {
    ai = new GoogleGenAI({ 
      apiKey: config.gemini.apiKey,
      httpOptions: { apiVersion: 'v1alpha' }
    });
    
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    console.log('✅ Gemini AI configured');
  }
}

loadAndApplySettings();

// Helper to create embeddings
async function createEmbedding(text) {
  if (!embeddingModel) {
    throw new Error('Embedding model not initialized. Check your Gemini API key in Settings.');
  }
  try {
    const start = Date.now();
    const result = await embeddingModel.embedContent({
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

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
    }
  },
});

const uploadJobs = new Map();

// --- API Endpoints for Settings ---
app.get('/api/settings', async (req, res) => {
  try {
    const config = await Settings.findOne();
    res.json(config || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
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
});

// Progress Tracking Endpoint (Polling)
app.get('/api/upload-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  if (uploadJobs.has(jobId)) {
    const job = uploadJobs.get(jobId);
    res.json(job);
    
    if (job.progress === 100 || job.status === 'error') {
      setTimeout(() => {
        uploadJobs.delete(jobId);
      }, 10000);
    }
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

// Helper to parse different file types
async function parseFile(filePath, mimeType, extension) {
  const ext = extension.toLowerCase();

  if (ext === '.pdf') {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (err) {
      console.warn('⚠️ pdf-parse failed, trying fallback...');
      return 'PDF parsing failed. Possibly scanned or unsupported format.';
    }
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === '.doc') {
    return new Promise((resolve, reject) => {
      officeParser.parseOffice(filePath, (data, err) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  } else if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    throw new Error('Unsupported file type for parsing');
  }
}

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  let filePath = null;
  const jobId = req.body.jobId;

  const updateProgress = (status, progress) => {
    if (jobId) {
      uploadJobs.set(jobId, { status, progress, filename: req.file?.originalname });
    }
  };

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    filePath = req.file.path;
    const extension = path.extname(req.file.originalname);
    const category = req.body.category || 'general';

    updateProgress('Uploading to Cloudinary', 10);
    
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        resource_type: 'auto',
        folder: 'voice-vault-documents',
        public_id: `${Date.now()}-${req.file.originalname.replace(/\.[^/.]+$/, "")}`
      });
    } catch (err) {
      console.error('❌ Cloudinary Upload Failed:', err);
      updateProgress('Cloudinary error', 0);
      throw new Error(`Cloudinary error: ${err.message}`);
    }

    updateProgress('Parsing file content', 30);
    let parsedText;
    try {
      parsedText = await parseFile(filePath, req.file.mimetype, extension);
    } catch (err) {
      console.error('❌ Parsing Failed:', err);
      updateProgress('Parsing error', 0);
      throw new Error(`Parsing error: ${err.message}`);
    }

    if (!parsedText || parsedText.trim().length === 0) {
      updateProgress('Empty content error', 0);
      throw new Error('File content is empty or could not be extracted');
    }

    updateProgress('Generating embeddings', 60);
    const chunks = parsedText.split(/\n\s*\n/).filter(c => c.trim().length > 50);
    const finalChunks = chunks.length > 0 ? chunks : [parsedText.substring(0, 2000)];

    const points = [];
    for (let i = 0; i < finalChunks.length; i++) {
      const chunk = finalChunks[i];
      try {
        const embedding = await createEmbedding(chunk);
        
        points.push({
          id: crypto.randomUUID(),
          vector: embedding,
          payload: {
            text: chunk,
            filename: req.file.originalname,
            category: category,
            timestamp: new Date().toISOString(),
            cloudinary_url: cloudinaryResult.secure_url,
            cloudinary_id: cloudinaryResult.public_id
          }
        });
      } catch (err) {
        console.error(`❌ Embedding failed for chunk ${i}:`, err);
        updateProgress('Embedding error', 0);
        throw new Error(`AI Embedding error: ${err.message}`);
      }
    }

    updateProgress('Storing in Vector Database', 90);
    try {
      await qdrantClient.upsert(COLLECTION_NAME, {
        wait: true,
        points: points
      });
    } catch (err) {
      console.error('❌ Qdrant Upsert Failed:', err);
      updateProgress('Database error', 0);
      throw new Error(`Qdrant database error: ${err.message}`);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    updateProgress('Completed', 100);

    res.json({
      success: true,
      message: 'File uploaded to Cloudinary and indexed in Qdrant',
      filename: req.file.originalname,
      category: category,
      chunksCount: finalChunks.length,
      url: cloudinaryResult.secure_url
    });
  } catch (error) {
    console.error('❌ ERROR IN UPLOAD WORKFLOW:', error.message);
    if (jobId) uploadJobs.set(jobId, { status: 'error', progress: 0, error: error.message });
    
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    
    res.status(500).json({ 
      error: error.message || 'An unexpected error occurred during processing'
    });
  }
});

// Documents Endpoint
app.get('/api/documents', async (req, res) => {
  try {
    const rawResources = await cloudinary.api.resources({
      type: 'upload', prefix: 'voice-vault-documents/', resource_type: 'raw', max_results: 50
    });
    const imageResources = await cloudinary.api.resources({
      type: 'upload', prefix: 'voice-vault-documents/', resource_type: 'image', max_results: 50
    });

    const combinedResources = [...rawResources.resources, ...imageResources.resources];
    const documents = combinedResources.map(file => {
      const name = file.public_id.replace('voice-vault-documents/', '');
      return {
        name: name, size: file.bytes, date: file.created_at,
        type: path.extname(name) || (file.format ? `.${file.format}` : '.unknown'),
        url: file.secure_url
      };
    });
    documents.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/health', async (req, res) => {
  let qdrantStatus = false;
  try {
    if (qdrantClient) {
      await qdrantClient.getCollections();
      qdrantStatus = true;
    }
  } catch (e) {
    qdrantStatus = false;
  }
  res.json({ 
    status: 'ok', 
    qdrantConnected: qdrantStatus,
    timestamp: new Date().toISOString() 
  });
});

// Helper to query Qdrant
async function queryDocuments(query, category = null, clientWs = null) {
  try {
    if (!qdrantClient) throw new Error('Qdrant not initialized');
    const queryEmbedding = await createEmbedding(query);
    
    const searchParams = {
      vector: queryEmbedding, limit: 3, with_payload: true,
    };

    if (category && category !== 'general' && category !== 'All') {
      searchParams.filter = {
        must: [{ key: 'category', match: { value: category } }],
      };
    }

    console.log(`\n🔍 Gemini analyze vector DB for: "${query}"`);
    const results = await qdrantClient.search(COLLECTION_NAME, searchParams);
    
    // Analyze and log Vector DB results
    const kCount = results.length;
    console.log(`📚 top ${kCount} chunk(s) retrieved`);
    results.forEach((r, i) => {
      console.log(`   [${i+1}] File: ${r.payload.filename} | Chars: ${r.payload.text?.length}`);
    });

    if (clientWs) clientWs.isQdrantResponse = true;

    if (results.length === 0) return "No relevant information found.";
    return results.map(r => `[From ${r.payload.filename}]: ${r.payload.text}`).join('\n---\n');
  } catch (error) {
    console.error('❌ Qdrant search error:', error);
    return "Error searching knowledge base: " + error.message;
  }
}

wss.on('connection', async (clientWs) => {
  console.log('🔌 Client connected');

  let geminiSession = null;
  let isSessionActive = false;
  let selectedCategory = 'general';
  clientWs.isQdrantResponse = false;

  const sendToClient = (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(message));
    }
  };

  const startGeminiSession = async () => {
    try {
      if (!ai) {
        sendToClient({ type: 'status', status: 'error', message: 'Gemini AI is not configured. Please add your API key in Settings.' });
        return;
      }
      sendToClient({ type: 'status', status: 'connecting' });

      geminiSession = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: ["AUDIO"],
          temperature: globalSettings?.gemini?.temperature || 0.1,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'query_knowledge_base',
                  description: 'Search uploaded documents for information.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      query: { type: 'STRING', description: 'Search query' }
                    },
                    required: ['query']
                  }
                }
              ]
            }
          ],
          inputAudioTranscription: { enabled: true },
          outputAudioTranscription: { enabled: true },
          systemInstruction: {
            parts: [{
              text: `You are an expert AI Voice Assistant with access to a knowledge base (Qdrant).
              
              RULES:
              1. If the user's question can be answered from your general knowledge (like "Who are you?", "What is SIP?"), answer IMMEDIATELY and concisely.
              2. If the user asks about SPECIFIC information likely in their uploaded documents (like "What is MCAAP?", "Check my policy"), use the 'query_knowledge_base' tool.
              3. When you receive results from the tool, synthesize a natural, 1-2 sentence response.
              4. Always be extremely concise (max 2 sentences).
              5. Use a friendly, professional voice.`
            }]
          }
        },
        callbacks: {
          onopen: () => {
            isSessionActive = true;
            sendToClient({ type: 'status', status: 'connected' });
          },
          onmessage: async (message) => { await handleGeminiMessage(message); },
          onerror: (error) => {
            sendToClient({ type: 'status', status: 'error', message: error.message || 'Gemini error' });
          },
          onclose: () => {
            isSessionActive = false;
            sendToClient({ type: 'status', status: 'disconnected' });
          },
        },
      });
    } catch (error) {
      sendToClient({ type: 'status', status: 'error', message: error.message });
    }
  };

  const handleGeminiMessage = async (message) => {
    if (message.toolCall) {
      const toolCall = message.toolCall;
      const functionResponses = [];
      
      for (const fc of toolCall.functionCalls) {
        if (fc.name === 'query_knowledge_base') {
          const { query } = fc.args;
          const result = await queryDocuments(query, selectedCategory, clientWs);
          const optimizedResult = result.length > 1000 ? result.substring(0, 1000) + "..." : result;
          
          functionResponses.push({
            name: 'query_knowledge_base',
            id: fc.id,
            response: { result: optimizedResult }
          });
        }
      }

      if (functionResponses.length > 0) {
        console.log(`📤 Sending tool response back to Gemini (${functionResponses.length} calls)`);
        geminiSession.sendToolResponse({ functionResponses });
      }
      return;
    }

    if (message.serverContent) {
      const content = message.serverContent;
      if (content.modelTurn && content.modelTurn.parts) {
        content.modelTurn.parts.forEach((part) => {
          if (part.thought === true) {
            console.log(`💭 AI Thought: ${part.text?.substring(0, 50)}...`);
            return;
          }
          if (part.text) {
            sendToClient({ type: 'transcript', role: 'ai', text: part.text });
          }
          if (part.inlineData) sendToClient({ type: 'audio', data: part.inlineData.data });
        });
      }

      const transcript = content.inputTranscription?.text || content.inputTranscript?.text;
      if (transcript) {
        console.log(`👤 User: ${transcript}`);
        sendToClient({ type: 'transcript', role: 'user', text: transcript });
      }
      
      const aiTranscript = content.outputTranscription?.text || content.outputTranscript?.text;
      if (aiTranscript) {
        if (clientWs.isQdrantResponse) {
          console.log(`🤖 Gemini-Qdrant-response: ${aiTranscript}`);
          // We don't reset immediately because one turn might have multiple content messages
        } else {
          console.log(`🤖 Gemini-general-response: ${aiTranscript}`);
        }
        sendToClient({ type: 'transcript', role: 'ai', text: aiTranscript });
      }

      if (content.turnComplete) {
        clientWs.isQdrantResponse = false;
      }
    }
  };

  await startGeminiSession();

  clientWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'audio' && isSessionActive && geminiSession) {
        geminiSession.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: message.data } });
      } else if (message.type === 'category_select') {
        selectedCategory = message.category;
      } else if (message.type === 'end_turn' && isSessionActive && geminiSession) {
        geminiSession.sendRealtimeInput({ audioStreamEnd: true });
      }
    } catch (error) {}
  });

  clientWs.on('close', () => {
    if (geminiSession) geminiSession.close();
    isSessionActive = false;
  });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

server.listen(PORT, () => {
  console.log(`🚀 Voice AI Server running on http://localhost:${PORT}`);
});
