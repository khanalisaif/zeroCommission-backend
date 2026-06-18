import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import {
  uploadDocuments,
  getDocuments,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router({ mergeParams: true }); // inherits :token from parent

// POST   /api/applications/:token/documents       → Upload docs (any field name = docId)
router.post('/', upload.any(), uploadDocuments);

// GET    /api/applications/:token/documents       → Get all docs for an application
router.get('/', getDocuments);

// DELETE /api/applications/:token/documents/:docFileId → Delete a specific doc
router.delete('/:docFileId', deleteDocument);

export default router;
