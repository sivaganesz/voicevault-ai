import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as state from './config/state.js';
import { loadAndApplySettings } from './controllers/settingsController.js';
import settingsRoutes from './routes/settingsRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import { handleConnection } from './websocket/socketHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Services
loadAndApplySettings();

// API Routes
app.use('/api/settings', settingsRoutes);
app.use('/api/documents', documentRoutes);

app.get('/health', async (req, res) => {
  let qdrantStatus = false;
  try {
    if (state.qdrantClient) {
      await state.qdrantClient.getCollections();
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

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

// WebSocket Handler
wss.on('connection', handleConnection);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`🚀 Voice AI Server running on http://localhost:${PORT}`);
});
