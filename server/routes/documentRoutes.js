import express from 'express';
import * as documentController from '../controllers/documentController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/upload', upload.single('file'), documentController.uploadFile);
router.get('/upload-status/:jobId', documentController.getUploadStatus);
router.get('/', documentController.getDocuments);

export default router;
