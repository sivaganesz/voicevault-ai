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
 
dotenv.config({ path: path.join(__dirname, '.env') });
 
const app = express();
app.use(cors());
app.use(express.json());
 
// ── Optimization: enable HTTP keep-alive on outgoing requests ─────────────────
// Node's default http.globalAgent has keepAlive=false, meaning every REST call
// to Qdrant or Cloudinary opens a fresh TCP connection. Enabling it reuses
// the existing socket and avoids a ~50–150ms TCP+TLS handshake per request.
const keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
http.globalAgent = keepAliveAgent;
 
// Initialize services
await loadAndApplySettings();
 
// ── Optimization: warm up the Qdrant TCP connection on startup ────────────────
// Cloud Qdrant (GCP us-east4) has cold-connection overhead of 200–500ms.
// Running one dummy search at boot pins the keep-alive socket open so the
// first real user query doesn't pay the connection cost.
const warmUpQdrant = async () => {
  if (!state.qdrantClient) return;
  try {
    await state.qdrantClient.getCollections();
    console.log('🔥 Qdrant connection warmed up');
  } catch (e) {
    console.warn('⚠️ Qdrant warm-up skipped:', e.message);
  }
};
warmUpQdrant();
 
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
 
// ── Optimization: disable per-message deflate on WebSocket ────────────────────
// perMessageDeflate (zlib compression) is ON by default in the `ws` library.
// For PCM audio chunks (~2KB each, ~15 chunks/sec) compression adds 1–3ms of
// CPU work per message with near-zero size savings (PCM is already incompressible).
// Turning it off saves CPU and eliminates the deflate latency spike.
const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  maxPayload: 64 * 1024, // 64 KB — well above our 2KB audio chunks
});
 
const PORT = process.env.PORT || 3001;
 
wss.on('connection', handleConnection);
 
// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
 
server.listen(PORT, () => {
  console.log(`🚀 Voice AI Server running on http://localhost:${PORT}`);
});
 