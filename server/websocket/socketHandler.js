import { WebSocket } from 'ws';
import * as state from '../config/state.js';
import { queryDocuments } from '../services/vectorService.js';

export const handleConnection = async (clientWs) => {
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
      if (!state.ai) {
        sendToClient({ type: 'status', status: 'error', message: 'Gemini AI is not configured. Please add your API key in Settings.' });
        return;
      }
      sendToClient({ type: 'status', status: 'connecting' });

      geminiSession = await state.ai.live.connect({
        model: state.MODEL,
        config: {
          responseModalities: ["AUDIO"],
          temperature: state.globalSettings?.gemini?.temperature || 0.1,
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
    console.log('🔌 Client disconnected');
    if (geminiSession) geminiSession.close();
    isSessionActive = false;
  });
};
