import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI();

async function run() {
  try {
    const response = await ai.models.list();
    for (const model of response.pageItems) {
      if (model.supportedGenerationMethods.includes('bidiGenerateContent')) {
        console.log(`✅ Supported Live API model: ${model.name}`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

run();
