import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;
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
