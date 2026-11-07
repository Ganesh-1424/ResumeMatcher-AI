const express = require('express');
const router = express.Router();
const { uploadResume, extractText } = require('../controllers/resumeController');
const { verifyToken } = require('../middleware/authMiddleware');
const { uploadResumeMiddleware } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/resumes/upload
 * 
 * Upload a PDF or DOCX resume.
 * 
 * Pipeline:
 * 1. verifyToken - Validates JWT Bearer header; rejects unauthenticated requests with 401
 * 2. uploadLimiter - Enforces IP rate limiting on file uploads
 * 3. uploadResumeMiddleware - Runs Multer (5MB limit, PDF/DOCX filter, unique sanitized filename, magic bytes check)
 * 4. uploadResume - Final controller returning structured JSON metadata and analysisId
 */
router.post('/upload', verifyToken, uploadLimiter, uploadResumeMiddleware, uploadResume);

/**
 * POST /api/resumes/:id/extract-text
 * 
 * Extract plain text from an uploaded resume document (PDF or DOCX).
 * 
 * Pipeline:
 * 1. verifyToken - Validates JWT Bearer header (requires valid authentication)
 * 2. extractText - Verifies ownership, safely reads file, parses text with resumeParser, returns clean JSON
 */
router.post('/:id/extract-text', verifyToken, extractText);

module.exports = router;
