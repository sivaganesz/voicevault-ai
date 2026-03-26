import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import * as state from '../config/state.js';
import { parseFile } from '../services/parsingService.js';
import { createEmbedding } from '../services/aiService.js';

const uploadJobs = new Map();

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

    updateProgress('Uploading to Cloudinary', 10);
    
    let cloudinaryResult;
    try {
      cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        resource_type: 'auto',
        folder: 'voice-vault-documents',
        public_id: `${Date.now()}-${req.file.originalname.replace(/\.[^/.]+$/, "")}`
      });
    } catch (err) {
      console.error('❌ Cloudinary Upload Failed:', err);
      updateProgress('Cloudinary error', 0);
      throw new Error(`Cloudinary error: ${err.message}`);
    }

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

    updateProgress('Generating embeddings', 60);
    const chunks = parsedText.split(/\n\s*\n/).filter(c => c.trim().length > 50);
    const finalChunks = chunks.length > 0 ? chunks : [parsedText.substring(0, 2000)];

    const points = [];
    for (let i = 0; i < finalChunks.length; i++) {
      const chunk = finalChunks[i];
      try {
        const embedding = await createEmbedding(chunk);
        
        points.push({
          id: crypto.randomUUID(),
          vector: embedding,
          payload: {
            text: chunk,
            filename: req.file.originalname,
            category: category,
            timestamp: new Date().toISOString(),
            cloudinary_url: cloudinaryResult.secure_url,
            cloudinary_id: cloudinaryResult.public_id
          }
        });
      } catch (err) {
        console.error(`❌ Embedding failed for chunk ${i}:`, err);
        updateProgress('Embedding error', 0);
        throw new Error(`AI Embedding error: ${err.message}`);
      }
    }

    updateProgress('Storing in Vector Database', 90);
    try {
      await state.qdrantClient.upsert(state.COLLECTION_NAME, {
        wait: true,
        points: points
      });
    } catch (err) {
      console.error('❌ Qdrant Upsert Failed:', err);
      updateProgress('Database error', 0);
      throw new Error(`Qdrant database error: ${err.message}`);
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    updateProgress('Completed', 100);

    res.json({
      success: true,
      message: 'File uploaded to Cloudinary and indexed in Qdrant',
      filename: req.file.originalname,
      category: category,
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
      setTimeout(() => {
        uploadJobs.delete(jobId);
      }, 10000);
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
        name: name, size: file.bytes, date: file.created_at,
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
