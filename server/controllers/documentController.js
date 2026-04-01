import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import * as state from '../config/state.js';
import { parseFile } from '../services/parsingService.js';
import { createEmbedding } from '../services/aiService.js';
 
const uploadJobs = new Map();
 
// ── Optimization: parallel embedding with a concurrency cap ──────────────────
// The free Gemini tier has rate limits, so we run at most CONCURRENCY embeddings
// at once instead of fully sequential (old) or fully parallel (risks 429s).
const EMBEDDING_CONCURRENCY = 3;
 
async function embedChunksConcurrently(chunks) {
  const results = new Array(chunks.length);
  let idx = 0;
 
  async function worker() {
    while (idx < chunks.length) {
      const i = idx++;
      const t = Date.now();
      results[i] = await createEmbedding(chunks[i]);
      console.log(`⏱️ Chunk ${i + 1}/${chunks.length} embedded in ${Date.now() - t}ms`);
    }
  }
 
  const workers = Array.from({ length: Math.min(EMBEDDING_CONCURRENCY, chunks.length) }, worker);
  await Promise.all(workers);
  return results;
}
 
export const uploadFile = async (req, res) => {
  let filePath = null;
  const jobId = req.body.jobId;
 
  const updateProgress = (status, progress) => {
    if (jobId) {
      uploadJobs.set(jobId, { status, progress, filename: req.file?.originalname });
    }
  };
 
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
 
    filePath = req.file.path;
    const extension = path.extname(req.file.originalname);
    const category = req.body.category || 'general';
 
    // ── Step 1: Cloudinary upload ─────────────────────────────────────────
    updateProgress('Uploading to Cloudinary', 10);
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        resource_type: 'auto',
        folder: 'voice-vault-documents',
        public_id: `${Date.now()}-${req.file.originalname.replace(/\.[^/.]+$/, '')}`
      });
    } catch (err) {
      console.error('❌ Cloudinary Upload Failed:', err);
      updateProgress('Cloudinary error', 0);
      throw new Error(`Cloudinary error: ${err.message}`);
    }
 
    // ── Step 2: Parse file ────────────────────────────────────────────────
    updateProgress('Parsing file content', 30);
    let parsedText;
    try {
      parsedText = await parseFile(filePath, req.file.mimetype, extension);
    } catch (err) {
      console.error('❌ Parsing Failed:', err);
      updateProgress('Parsing error', 0);
      throw new Error(`Parsing error: ${err.message}`);
    }
 
    if (!parsedText || parsedText.trim().length === 0) {
      updateProgress('Empty content error', 0);
      throw new Error('File content is empty or could not be extracted');
    }
 
    // ── Step 3: Chunk text ────────────────────────────────────────────────
    // Optimization: use a fixed ~500-char sliding window instead of blank-line
    // splitting, which produces more consistent chunk sizes for embedding.
    updateProgress('Chunking document', 50);
    const CHUNK_SIZE = 500;
    const CHUNK_OVERLAP = 50;
    const rawChunks = [];
 
    if (parsedText.length <= CHUNK_SIZE) {
      rawChunks.push(parsedText.trim());
    } else {
      let start = 0;
      while (start < parsedText.length) {
        const end = Math.min(start + CHUNK_SIZE, parsedText.length);
        const chunk = parsedText.substring(start, end).trim();
        if (chunk.length > 30) rawChunks.push(chunk);
        start += CHUNK_SIZE - CHUNK_OVERLAP;
      }
    }
 
    const finalChunks = rawChunks.length > 0 ? rawChunks : [parsedText.substring(0, 2000)];
    console.log(`📄 Document split into ${finalChunks.length} chunks`);
 
    // ── Step 4: Parallel embeddings ───────────────────────────────────────
    updateProgress('Generating embeddings', 60);
    let embeddings;
    try {
      embeddings = await embedChunksConcurrently(finalChunks);
    } catch (err) {
      console.error('❌ Embedding failed:', err);
      updateProgress('Embedding error', 0);
      throw new Error(`AI Embedding error: ${err.message}`);
    }
 
    // ── Step 5: Upsert to Qdrant ──────────────────────────────────────────
    updateProgress('Storing in Vector Database', 90);
    const points = finalChunks.map((chunk, i) => ({
      id: crypto.randomUUID(),
      vector: embeddings[i],
      payload: {
        text: chunk,
        filename: req.file.originalname,
        category,
        timestamp: new Date().toISOString(),
        cloudinary_url: cloudinaryResult.secure_url,
        cloudinary_id: cloudinaryResult.public_id
      }
    }));
 
    try {
      await state.qdrantClient.upsert(state.COLLECTION_NAME, { wait: true, points });
    } catch (err) {
      console.error('❌ Qdrant Upsert Failed:', err);
      updateProgress('Database error', 0);
      throw new Error(`Qdrant database error: ${err.message}`);
    }
 
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
 
    updateProgress('Completed', 100);
    console.log(`✅ Uploaded "${req.file.originalname}" — ${finalChunks.length} chunks indexed`);
 
    res.json({
      success: true,
      message: 'File uploaded to Cloudinary and indexed in Qdrant',
      filename: req.file.originalname,
      category,
      chunksCount: finalChunks.length,
      url: cloudinaryResult.secure_url
    });
 
  } catch (error) {
    console.error('❌ ERROR IN UPLOAD WORKFLOW:', error.message);
    if (jobId) uploadJobs.set(jobId, { status: 'error', progress: 0, error: error.message });
 
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
 
    res.status(500).json({
      error: error.message || 'An unexpected error occurred during processing'
    });
  }
};
 
export const getUploadStatus = (req, res) => {
  const { jobId } = req.params;
 
  if (uploadJobs.has(jobId)) {
    const job = uploadJobs.get(jobId);
    res.json(job);
 
    if (job.progress === 100 || job.status === 'error') {
      setTimeout(() => { uploadJobs.delete(jobId); }, 10000);
    }
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
};
 
export const getDocuments = async (req, res) => {
  try {
    const rawResources = await cloudinary.api.resources({
      type: 'upload', prefix: 'voice-vault-documents/', resource_type: 'raw', max_results: 50
    });
    const imageResources = await cloudinary.api.resources({
      type: 'upload', prefix: 'voice-vault-documents/', resource_type: 'image', max_results: 50
    });
 
    const combinedResources = [...rawResources.resources, ...imageResources.resources];
    const documents = combinedResources.map(file => {
      const name = file.public_id.replace('voice-vault-documents/', '');
      return {
        name, size: file.bytes, date: file.created_at,
        type: path.extname(name) || (file.format ? `.${file.format}` : '.unknown'),
        url: file.secure_url
      };
    });
    documents.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};