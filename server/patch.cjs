const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.js');
let code = fs.readFileSync(indexPath, 'utf-8');

// 1. Add Mongoose and Settings model imports
code = code.replace(
  "import { v2 as cloudinary } from 'cloudinary';",
  "import { v2 as cloudinary } from 'cloudinary';\nimport mongoose from 'mongoose';\nimport Settings from './models/Settings.js';"
);

// 2. Replace hardcoded initializations with dynamic loader and API routes
const initCodeToReplace = `// Configure Cloudinary
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
      console.log(\`🚀 Creating Qdrant collection: \${COLLECTION_NAME}\`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768, // size for gemini-embedding-001 with outputDimensionality
          distance: 'Cosine',
        },
      });
    } else {
      console.log(\`✅ Qdrant collection '\${COLLECTION_NAME}' already exists.\`);
    }
  } catch (error) {
    console.error('❌ Error initializing Qdrant:', error);
  }
}
initQdrant();`;

const newInitCode = `const require = createRequire(import.meta.url);
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
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI not found. Please set it in .env');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
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
        console.log(\`🚀 Creating Qdrant collection: \${COLLECTION_NAME}\`);
        await qdrantClient.createCollection(COLLECTION_NAME, {
          vectors: { size: config.qdrant.vectorSize || 768, distance: 'Cosine' },
        });
      } else {
        console.log(\`✅ Qdrant collection '\${COLLECTION_NAME}' already exists.\`);
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
  }
}

loadAndApplySettings();

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
});`;

code = code.replace(initCodeToReplace, newInitCode);

// 3. Make startGeminiSession robust against missing AI
const startGeminiSessionOld = `  const startGeminiSession = async () => {
    try {
      sendToClient({ type: 'status', status: 'connecting' });`;
      
const startGeminiSessionNew = `  const startGeminiSession = async () => {
    try {
      if (!ai) {
        sendToClient({ type: 'status', status: 'error', message: 'Gemini AI is not configured. Please add your API key in Settings.' });
        return;
      }
      sendToClient({ type: 'status', status: 'connecting' });`;

code = code.replace(startGeminiSessionOld, startGeminiSessionNew);

fs.writeFileSync(indexPath, code);
console.log('Successfully patched index.js');
