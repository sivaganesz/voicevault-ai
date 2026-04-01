import { WebSocket } from 'ws';
import * as state from '../config/state.js';
import { queryDocuments } from '../services/vectorService.js';

export const handleConnection = async (clientWs) => {
  console.log('🔌 Client connected');

  let geminiSession = null;
  let isSessionActive = false;
  let selectedCategory = 'general';
  clientWs.isQdrantResponse = false;

  let turnStartTime = null;

  const sendToClient = (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(message));
    }
  };

  const startGeminiSession = async () => {
    try {
      if (!state.ai) {
        sendToClient({ type: 'status', status: 'error', message: 'Gemini AI is not configured. Please add your API key in Settings.' });
        return;
      }
      sendToClient({ type: 'status', status: 'connecting' });
      console.log('🔄 Starting Gemini Live session...');
      const sessionStart = Date.now();

      geminiSession = await state.ai.live.connect({
        model: state.MODEL,
        config: {
          responseModalities: ['AUDIO'],
          temperature: state.globalSettings?.gemini?.temperature ?? 0.1,

          // ── Fix 1: disable thinking mode ──────────────────────────────────
          // gemini-2.5-flash thinks before every reply — costs 10–40s even
          // for "what is React". thinkingBudget: 0 skips it entirely.
          thinkingConfig: {
            thinkingBudget: 0,
          },

          // ── Fix 2: tune VAD (Voice Activity Detection) ────────────────────
          // By default Gemini uses conservative VAD — it waits a long time
          // after you stop speaking before it decides you're done (to avoid
          // cutting you off mid-sentence). This waiting period is the hidden
          // 3–8 second delay BEFORE Gemini even starts processing.
          //
          // realtimeInputConfig lets us tune two things:
          //   automaticActivityDetection: controls the VAD sensitivity
          //   activityHandling: what to do when speech ends
          //
          // HIGH end-of-speech sensitivity = Gemini reacts faster when you
          // go silent instead of waiting for the conservative default timeout.
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,           // keep VAD on (server-side)
              startOfSpeechSensitivity: 'START_SENSITIVITY_HIGH',  // detect speech start quickly
              endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',      // react to silence quickly
              prefixPaddingMs: 100,      // audio before speech starts to include (ms)
              silenceDurationMs: 500,    // how long silence before considering turn done (default ~2000ms)
            },
          },

          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'query_knowledge_base',
                  description: 'Search uploaded documents for specific information not available in general knowledge.',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      query: { type: 'STRING', description: 'Concise search query (max 10 words)' }
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
              text: `You are a concise voice assistant.
RULES (follow strictly):
1. General knowledge (greetings, definitions, concepts) → answer immediately in 1 sentence. Do NOT call tools.
2. Specific document info (policy numbers, MCAAP, uploaded data) → call query_knowledge_base once.
3. After receiving tool results → respond in 1-2 sentences max.
4. Never repeat yourself. Never use filler phrases like "Sure!" or "Of course!".
5. Voice output only — no markdown, no bullet points.`
            }]
          }
        },
        callbacks: {
          onopen: () => {
            isSessionActive = true;
            console.log(`✅ Gemini session established in ${Date.now() - sessionStart}ms`);
            sendToClient({ type: 'status', status: 'connected' });
          },
          onmessage: async (message) => { await handleGeminiMessage(message); },
          onerror: (error) => {
            console.error('❌ Gemini session error:', error.message);
            sendToClient({ type: 'status', status: 'error', message: error.message || 'Gemini error' });
          },
          onclose: () => {
            isSessionActive = false;
            console.log('🔌 Gemini session closed');
            sendToClient({ type: 'status', status: 'disconnected' });
          },
        },
      });
    } catch (error) {
      console.error('❌ Failed to start Gemini session:', error.message);
      sendToClient({ type: 'status', status: 'error', message: error.message });
    }
  };

  const handleGeminiMessage = async (message) => {
    if (message.toolCall) {
      const toolCallStart = Date.now();
      const toolCall = message.toolCall;
      const functionResponses = [];

      for (const fc of toolCall.functionCalls) {
        if (fc.name === 'query_knowledge_base') {
          const { query } = fc.args;
          console.log(`🔧 Tool call: query_knowledge_base("${query}")`);

          const result = await queryDocuments(query, selectedCategory, clientWs);
          const truncated = result.length > 800 ? result.substring(0, 800) + '…' : result;

          functionResponses.push({
            name: 'query_knowledge_base',
            id: fc.id,
            response: { result: truncated }
          });
        }
      }

      if (functionResponses.length > 0) {
        console.log(`📤 Sending tool response to Gemini (${Date.now() - toolCallStart}ms for KB lookup)`);
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
          if (part.inlineData) {
            if (turnStartTime) {
              console.log(`🔊 First audio chunk received — TTFA: ${Date.now() - turnStartTime}ms`);
              turnStartTime = null;
            }
            sendToClient({ type: 'audio', data: part.inlineData.data });
          }
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
        } else {
          console.log(`🤖 Gemini-general-response: ${aiTranscript}`);
        }
        sendToClient({ type: 'transcript', role: 'ai', text: aiTranscript });
      }

      if (content.turnComplete) {
        clientWs.isQdrantResponse = false;
        console.log('✅ Turn complete');
      }
    }
  };

  await startGeminiSession();

  clientWs.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'audio' && isSessionActive && geminiSession) {
        if (!turnStartTime) {
          turnStartTime = Date.now();
          console.log(`🎙️ Turn started — timing TTFA...`);
        }
        geminiSession.sendRealtimeInput({
          audio: { mimeType: 'audio/pcm;rate=16000', data: message.data }
        });
      } else if (message.type === 'category_select') {
        selectedCategory = message.category;
        console.log(`📂 Category selected: ${selectedCategory}`);
      } else if (message.type === 'end_turn' && isSessionActive && geminiSession) {
        console.log('🛑 End of turn signal sent');
        geminiSession.sendRealtimeInput({ audioStreamEnd: true });
      }
    } catch (error) {
      console.error('❌ Error handling client message:', error.message);
    }
  });

  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
    if (geminiSession) geminiSession.close();
    isSessionActive = false;
  });
};