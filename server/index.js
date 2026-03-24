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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');
const pdf = pdfLib.default || pdfLib;
const mammoth = require('mammoth');
const officeParser = require('officeparser');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Qdrant Client
const qdrantClient = new QdrantClient({ 
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY
});
const COLLECTION_NAME = 'documents';

// Initialize Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required. Copy server/.env.example to server/.env and set your key.');
  process.exit(1);
}

const ai = new GoogleGenAI({ 
  apiKey: GEMINI_API_KEY,
  httpOptions: { apiVersion: 'v1alpha' }
});
const MODEL = 'gemini-2.5-flash-native-audio-latest';

// Embedding Model for Vector DB
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Ensure Qdrant collection exists
async function initQdrant() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);
    if (!exists) {
      console.log(`🚀 Creating Qdrant collection: ${COLLECTION_NAME}`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768, // size for gemini-embedding-001 with outputDimensionality
          distance: 'Cosine',
        },
      });
    } else {
      console.log(`✅ Qdrant collection '${COLLECTION_NAME}' already exists.`);
    }
  } catch (error) {
    console.error('❌ Error initializing Qdrant:', error);
  }
}
initQdrant();

// Helper to create embeddings
async function createEmbedding(text) {
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

// Progress Tracking Endpoint (Polling)
app.get('/api/upload-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  if (uploadJobs.has(jobId)) {
    const job = uploadJobs.get(jobId);
    res.json(job);
    
    // If completed or error, the client will stop polling, 
    // so we can schedule a cleanup of the job data
    if (job.progress === 100 || job.status === 'error') {
      setTimeout(() => {
        uploadJobs.delete(jobId);
      }, 10000); // Keep for 10 seconds to allow for late pollers
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
    console.log(`☁️ Uploading to Cloudinary: ${req.file.originalname}`);
    
    // 1. Upload to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        resource_type: 'auto',
        folder: 'voice-vault-documents',
        public_id: `${Date.now()}-${req.file.originalname.replace(/\.[^/.]+$/, "")}`
      });
      console.log(`✅ Cloudinary Upload Success: ${cloudinaryResult.secure_url}`);
    } catch (err) {
      console.error('❌ Cloudinary Upload Failed:', err);
      updateProgress('Cloudinary error', 0);
      throw new Error(`Cloudinary error: ${err.message}`);
    }

    updateProgress('Parsing file content', 30);
    // 2. Parse local file
    console.log(`📄 Processing file content: ${req.file.originalname} (${req.file.mimetype}) in category: ${category}`);
    let parsedText;
    try {
      parsedText = await parseFile(filePath, req.file.mimetype, extension);
      console.log(`✅ File parsed successfully. Length: ${parsedText.length} characters.`);
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
    // 3. Chunking
    const chunks = parsedText.split(/\n\s*\n/).filter(c => c.trim().length > 50);
    const finalChunks = chunks.length > 0 ? chunks : [parsedText.substring(0, 2000)];

    console.log(`🧩 Splitting into ${finalChunks.length} chunks for embedding...`);

    // 4. Embedding & Qdrant
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
      console.log(`✨ Successfully stored ${points.length} vectors in Qdrant`);
    } catch (err) {
      console.error('❌ Qdrant Upsert Failed:', err);
      updateProgress('Database error', 0);
      throw new Error(`Qdrant database error: ${err.message}`);
    }

    // 5. Clean up local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Local file deleted: ${filePath}`);
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
    
    // Clean up local file on failure
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up temporary file: ${filePath}`);
      } catch (unlinkErr) {
        console.error('⚠️ Could not delete temporary file:', unlinkErr.message);
      }
    }
    
    res.status(500).json({ 
      error: error.message || 'An unexpected error occurred during processing',
      step: error.message.split(':')[0] // Simple hint about where it failed
    });
  }
});

// Documents Endpoint
app.get('/api/documents', async (req, res) => {
  try {
    console.log('📂 Fetching documents from Cloudinary (Merging raw and image types)...');
    
    // Fetch raw files (TXT, DOCX, etc.)
    const rawResources = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'voice-vault-documents/',
      resource_type: 'raw',
      max_results: 50
    });

    // Fetch image files (Cloudinary often treats PDFs as images)
    const imageResources = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'voice-vault-documents/',
      resource_type: 'image',
      max_results: 50
    });

    const combinedResources = [...rawResources.resources, ...imageResources.resources];

    const documents = combinedResources.map(file => {
      const name = file.public_id.replace('voice-vault-documents/', '');
      return {
        name: name,
        size: file.bytes,
        date: file.created_at,
        type: path.extname(name) || (file.format ? `.${file.format}` : '.unknown'),
        url: file.secure_url
      };
    });

    // Sort by date descending
    documents.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents from Cloudinary:', error);
    res.status(500).json({ error: 'Failed to fetch documents from Cloudinary' });
  }
});

app.get('/health', async (req, res) => {
  let qdrantStatus = false;
  try {
    await qdrantClient.getCollections();
    qdrantStatus = true;
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
async function queryDocuments(query, category = null) {
  try {
    console.log(`[queryDocuments] Starting search for: "${query}"`);
    const start = Date.now();
    
    console.log(`[queryDocuments] Generating embedding for query...`);
    const queryEmbedding = await createEmbedding(query);
    
    const searchParams = {
      vector: queryEmbedding,
      limit: 3,
      with_payload: true,
    };

    if (category && category !== 'general' && category !== 'All') {
      console.log(`[queryDocuments] Applying category filter: ${category}`);
      searchParams.filter = {
        must: [{ key: 'category', match: { value: category } }],
      };
    }

    console.log(`[queryDocuments] Executing Qdrant search...`);
    const results = await qdrantClient.search(COLLECTION_NAME, searchParams);
    console.log(`⏱️ Qdrant search took ${Date.now() - start}ms. Found ${results.length} results.`);
    
    if (results.length === 0) {
      console.log(`[queryDocuments] No results found.`);
      return "No relevant information found in the knowledge base.";
    }
    
    const context = results.map(r => `[From ${r.payload.filename}]: ${r.payload.text}`).join('\n---\n');
    console.log(`[queryDocuments] Found relevant info (length: ${context.length}).`);
    return context;
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

  const sendToClient = (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(message));
    }
  };

  const startGeminiSession = async () => {
    try {
      sendToClient({ type: 'status', status: 'connecting' });

      geminiSession = await ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: ["AUDIO"],
          temperature: 0.1,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede',
              },
            },
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'query_knowledge_base',
                  description: 'Search the uploaded documents (PDFs, text files) for information to help answer the user question. Use this whenever the user asks about specific topics covered in their documents.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      query: {
                        type: 'STRING',
                        description: 'The search query or topic to look up in the knowledge base.'
                      }
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
              text: 'You are a helpful voice assistant. You have access to a knowledge base of uploaded documents. When you need specific information, use the query_knowledge_base tool. Keep responses extremely concise (1-2 sentences max) and conversational.'
            }]
          }
        },
        callbacks: {
          onopen: () => {
            console.log('✅ Gemini Live session opened');
            isSessionActive = true;
            sendToClient({ type: 'status', status: 'connected' });
          },
          onmessage: async (message) => {
            await handleGeminiMessage(message);
          },
          onerror: (error) => {
            console.error('❌ Gemini error:', error);
            sendToClient({ type: 'status', status: 'error', message: error.message || 'Gemini session error' });
          },
          onclose: (event) => {
            console.log('🔒 Gemini session closed', event ? `(Code: ${event.code}, Reason: ${event.reason})` : '');
            isSessionActive = false;
            sendToClient({ type: 'status', status: 'disconnected' });
          },
        },
      });
    } catch (error) {
      console.error('❌ Failed to connect to Gemini:', error);
      sendToClient({ type: 'status', status: 'error', message: error.message || 'Failed to connect to Gemini' });
    }
  };

  const handleGeminiMessage = async (message) => {
    if (message.toolCall) {
      const toolCall = message.toolCall;
      for (const fc of toolCall.functionCalls) {
        if (fc.name === 'query_knowledge_base') {
          const { query } = fc.args;
          const callId = fc.id;
          console.log(`🔍 Tool Call: query_knowledge_base("${query}")`);
          
          try {
            const result = await queryDocuments(query, selectedCategory);
            
            // Limit to 1000 characters for voice API speed
            const optimizedResult = result.length > 1000 ? 
              result.substring(0, 1000) + "... [truncated]" : result;

            console.log(`📤 Sending optimized result (${optimizedResult.length} chars)`);
            
            geminiSession.sendRealtimeInput({
              toolResponse: {
                functionResponses: [{
                  name: 'query_knowledge_base',
                  id: callId,
                  response: { result: optimizedResult }
                }]
              }
            });
          } catch (err) {
            console.error(`❌ Tool execution failed:`, err.message);
            geminiSession.sendRealtimeInput({
              toolResponse: {
                functionResponses: [{
                  name: 'query_knowledge_base',
                  id: callId,
                  response: { result: "Error: " + err.message }
                }]
              }
            });
          }
        }
      }
      return;
    }

    if (message.serverContent) {
      const content = message.serverContent;
      if (content.modelTurn && content.modelTurn.parts) {
        content.modelTurn.parts.forEach((part, i) => {
          if (part.thought === true) {
            console.log(`💭 AI Thought: ${part.text?.substring(0, 100)}...`);
            return; 
          }
          if (part.text) {
            sendToClient({ type: 'transcript', role: 'ai', text: part.text });
          }
          if (part.inlineData) {
            sendToClient({ type: 'audio', data: part.inlineData.data });
          }
        });
      }

      const transcript = content.inputTranscription?.text || content.inputTranscript?.text || (typeof content.inputTranscript === 'string' ? content.inputTranscript : null);
      if (transcript) {
        console.log(`👤 User: ${transcript}`); // LOG USER QUESTION
        sendToClient({ type: 'transcript', role: 'user', text: transcript });
      }

      const aiTranscript = content.outputTranscription?.text || content.outputTranscript?.text || (typeof content.outputTranscript === 'string' ? content.outputTranscript : null);
      if (aiTranscript) {
        console.log(`🤖 AI: ${aiTranscript}`); // LOG AI RESPONSE
        sendToClient({ type: 'transcript', role: 'ai', text: aiTranscript });
      }
    }
  };

  await startGeminiSession();

  clientWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'audio') {
        if (isSessionActive && geminiSession) {
          geminiSession.sendRealtimeInput({ audio: { mimeType: 'audio/pcm;rate=16000', data: message.data } });
        }
      } else if (message.type === 'category_select') {
        selectedCategory = message.category;
        console.log(`📂 Client selected category: ${selectedCategory}`);
      } else if (message.type === 'end_turn') {
        if (isSessionActive && geminiSession) {
          geminiSession.sendRealtimeInput({ audioStreamEnd: true });
        }
      }
    } catch (error) {
      console.error('❌ Error processing client message:', error);
    }
  });

  clientWs.on('close', () => {
    if (geminiSession) geminiSession.close();
    isSessionActive = false;
  });
});

// Error Handling Middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Final Error Catch:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    type: err.name || 'Error'
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Voice AI Server running on http://localhost:${PORT}`);
});
