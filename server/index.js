import 'dotenv/config';
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

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');
const pdf = pdfLib.default || pdfLib;
console.log('PDF LIB:', pdfLib);
const mammoth = require('mammoth');
const officeParser = require('officeparser');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required. Copy server/.env.example to server/.env and set your key.');
  process.exit(1);
}

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

      // Fallback: return raw placeholder or use another lib
      return 'PDF parsing failed. Possibly scanned or unsupported format.';
    }
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === '.doc') {
    // officeParser.parseOffice returns a promise or uses a callback? 
    // Usually it returns a promise in newer versions or can be promisified.
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
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const extension = path.extname(req.file.originalname);

    console.log(`📄 Processing file: ${req.file.originalname} (${req.file.mimetype})`);

    const parsedText = await parseFile(filePath, req.file.mimetype, extension);

    console.log(`✅ File parsed successfully. Length: ${parsedText.length} characters.`);

    res.json({
      success: true,
      message: 'File uploaded and parsed successfully',
      filename: req.file.originalname,
      parsedText: parsedText.substring(0, 500) + '...', // Return snippet for confirmation
      fullTextLength: parsedText.length
    });
  } catch (error) {
    console.error('❌ Upload/Parsing error:', error);
    res.status(500).json({ error: error.message || 'Failed to process file' });
  }
});

// Documents Endpoint
app.get('/api/documents', (req, res) => {
  try {
    const documents = fs.readdirSync('uploads').map(file => {
      const filePath = path.join('uploads', file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        date: stats.mtime,
        type: path.extname(file).toLowerCase(),
      };
    });
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

wss.on('connection', async (clientWs) => {
  console.log('🔌 Client connected');

  let geminiSession = null;
  let isSessionActive = false;

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
          generationConfig: {
            temperature: 0.1,
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Aoede',
              },
            },
          },
          inputAudioTranscription: {
            enabled: true,
          },
          outputAudioTranscription: {
            enabled: true,
          },
          systemInstruction: {
            parts: [{
              text: 'You are a helpful voice assistant. Keep responses extremely concise (1-2 sentences max) and conversational. Do not include internal reasoning or monologues.'
            }]
          }
        },
        callbacks: {
          onopen: () => {
            console.log('✅ Gemini Live session opened');
            isSessionActive = true;
            sendToClient({ type: 'status', status: 'connected' });
          },
          onmessage: (message) => {
            handleGeminiMessage(message);
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

  const handleGeminiMessage = (message) => {
    // Detail log for debugging missing captions
    if (message.serverContent) {
      const content = message.serverContent;
      console.log('🤖 Received serverContent:', JSON.stringify({
        hasModelTurn: !!content.modelTurn,
        partsCount: content.modelTurn?.parts?.length,
        inputTranscript: !!(content.inputTranscription || content.inputTranscript),
      }));

      if (content.modelTurn && content.modelTurn.parts) {
        content.modelTurn.parts.forEach((part, i) => {
          console.log(`  Part ${i}: text=${!!part.text}, thought=${part.thought}, inlineData=${!!part.inlineData}`);

          // SKIP internal "thought" parts - these are not meant for the user
          if (part.thought === true) return;

          if (part.text) {
            console.log(`  -> Sending AI transcript: ${part.text.substring(0, 30)}...`);
            sendToClient({
              type: 'transcript',
              role: 'ai',
              text: part.text,
            });
          }
          if (part.inlineData) {
            sendToClient({
              type: 'audio',
              data: part.inlineData.data,
            });
          }
        });
      }

      // Handle transcription of user's speech
      const transcript = content.inputTranscription?.text ||
        content.inputTranscript?.text ||
        (typeof content.inputTranscript === 'string' ? content.inputTranscript : null);

      if (transcript) {
        console.log(`  -> Sending User transcript: ${transcript.substring(0, 30)}...`);
        sendToClient({
          type: 'transcript',
          role: 'user',
          text: transcript,
        });
      }

      // Handle transcription of model output (AI)
      const aiTranscript = content.outputTranscription?.text ||
        content.outputTranscript?.text ||
        (typeof content.outputTranscript === 'string' ? content.outputTranscript : null);
      if (aiTranscript) {
        console.log(`  -> Sending AI transcript (from outputTranscription): ${aiTranscript.substring(0, 30)}...`);
        sendToClient({
          type: 'transcript',
          role: 'ai',
          text: aiTranscript,
        });
      }
    }
  };

  // Start the Gemini session when client connects
  await startGeminiSession();

  clientWs.on('message', async (data) => {
    try {
      const rawString = data.toString();

      const message = JSON.parse(rawString);

      if (message.type === 'audio') {
        if (!isSessionActive || !geminiSession) {
          console.log('⚠️ Audio chunk received but Gemini session not active');
          return;
        }

        // Forward audio chunk to Gemini
        try {
          geminiSession.sendRealtimeInput({
            audio: {
              mimeType: 'audio/pcm;rate=16000',
              data: message.data
            }
          });
        } catch (e) {
          console.error('❌ sendRealtimeInput error:', e);
        }
      } else if (message.type === 'end_turn') {
        if (isSessionActive && geminiSession) {
          console.log('🗣️ User turned off mic, sending audioStreamEnd');
          try {
            geminiSession.sendRealtimeInput({
              audioStreamEnd: true
            });
          } catch (e) {
            console.error('❌ end_turn error:', e);
          }
        }
      } else {
        console.log(`📥 Received WS message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error processing client message:', error);
    }
  });

  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
    if (geminiSession) {
      try {
        geminiSession.close();
      } catch (e) {
        // Session may already be closed
      }
    }
    isSessionActive = false;
  });

  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Voice AI Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
});
