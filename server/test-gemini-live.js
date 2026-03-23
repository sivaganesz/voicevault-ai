import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: 'v1alpha' }
});

async function run() {
  console.log('Connecting to Gemini API...');
  try {
    const session = await ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-latest',
      config: {
        systemInstruction: { parts: [{ text: "You are a helpful assistant. Say 'Hello, connected successfully' if you hear this." }] },
        responseModalities: ["AUDIO"]
      },
      callbacks: {
        onmessage: (msg) => {
          console.log('\n--- Received Message ---');
          if (msg.text) console.log('TEXT:', msg.text);
          if (msg.serverContent?.modelTurn?.parts) {
            msg.serverContent.modelTurn.parts.forEach(p => {
              if (p.text) console.log('TURN TEXT:', p.text);
              if (p.inlineData) console.log('AUDIO RECEIVED (bytes):', p.inlineData.data.length);
            });
          }
          if (msg.serverContent?.turnComplete) console.log('TURN COMPLETE');
          if (!msg.text && !msg.serverContent) console.log('Keys:', Object.keys(msg));
        },
        onerror: (err) => console.error('API Error:', err),
        onclose: (e) => {
          console.log('Session closed', e ? `Code: ${e.code}` : '');
          process.exit(0);
        }
      }
    });

    console.log('Connected! Sending blank audio chunk...');
    
    // Create 1 second of silent 16kHz PCM audio
    const silentAudio = Buffer.alloc(16000 * 2); // 16,000 samples/sec * 2 bytes/sample
    
    // Try sending with send() method
    session.send({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: silentAudio.toString('base64')
        }]
      }
    });

    console.log('Sent audio. Sending turn complete...');
    
    session.send({
      clientContent: {
        turnComplete: true
      }
    });

    // Wait 5 seconds to receive response
    setTimeout(() => {
      console.log('Finished waiting. Closing.');
      process.exit(0);
    }, 5000);

  } catch (err) {
    console.error('Connection failed:', err);
  }
}

run();
