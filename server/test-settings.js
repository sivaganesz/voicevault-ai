import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Settings from './models/Settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testSettings() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found in .env');
      return;
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // 1. Fetch current settings
    console.log('📖 Fetching current settings...');
    let config = await Settings.findOne();
    if (config) {
      console.log('✅ Found settings:', JSON.stringify(config, null, 2));
    } else {
      console.log('ℹ️ No settings found, creating default...');
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
      console.log('✅ Created default settings');
    }

    // 2. Test Update
    console.log('📝 Testing update...');
    const originalTemp = config.gemini.temperature;
    const testTemp = originalTemp === 0.5 ? 0.1 : 0.5;
    
    config.gemini.temperature = testTemp;
    await config.save();
    console.log(`✅ Updated temperature to ${testTemp}`);

    // 3. Verify Retrieval
    console.log('🔍 Verifying retrieval...');
    const updatedConfig = await Settings.findOne();
    if (updatedConfig.gemini.temperature === testTemp) {
      console.log('✅ Retrieval verified successfully!');
    } else {
      console.error(`❌ Retrieval failed! Expected ${testTemp}, got ${updatedConfig.gemini.temperature}`);
    }

    // Restore original
    updatedConfig.gemini.temperature = originalTemp;
    await updatedConfig.save();
    console.log('✅ Restored original temperature');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testSettings();
