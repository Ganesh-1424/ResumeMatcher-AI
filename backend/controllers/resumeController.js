const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { parseResume } = require('../services/resumeParser');
const { getUploadDir } = require('../config/storage');

const { loadFallbackStore, saveFallbackStore } = require('../config/persistentStore');

/**
 * Fallback store for analysis records with disk backup.
 * Ensures the API remains fully testable and operational during development
 * if MySQL is offline or disconnected.
 */
const fallbackAnalysesStore = new Map();
let fallbackIdCounter = 1000;

try {
  const diskData = loadFallbackStore();
  if (diskData.analyses && diskData.analyses.length > 0) {
    for (const a of diskData.analyses) {
      if (a && a.id) {
        fallbackAnalysesStore.set(Number(a.id), a);
        if (Number(a.id) >= fallbackIdCounter) {
          fallbackIdCounter = Number(a.id) + 1;
        }
      }
    }
  }
} catch (_) {}

const syncAnalysesToDisk = () => {
  try {
    const existing = loadFallbackStore();
    existing.analyses = Array.from(fallbackAnalysesStore.values());
    saveFallbackStore(existing);
  } catch (_) {}
};

/**
 * POST /api/resumes/upload
 * 
 * Handles resume uploads (PDF & DOCX):
 * - Protected by verifyToken middleware (req.userId is guaranteed)
 * - File is validated, scanned for magic numbers, and written to disk by uploadResumeMiddleware
 * - Records an entry in MySQL resume_analyses table (or fallback store)
 * - Returns structured metadata including the new analysisId
 */
const uploadResume = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No resume file uploaded. Please select a PDF or DOCX resume.'
      });
    }

    const userId = req.userId;
    const { jobTitle, jobDescription } = req.body || {};

    const originalName = file.originalname;
    const savedFilename = file.filename;
    const filePath = file.path;
    const fileSize = file.size;
    const mimeType = file.mimetype;

    let analysisId = null;

    // Record the uploaded resume in MySQL resume_analyses
    try {
      const [result] = await pool.execute(
        `INSERT INTO resume_analyses 
           (user_id, job_title, job_description, resume_filename, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [
          userId,
          jobTitle && typeof jobTitle === 'string' ? jobTitle.trim() : null,
          jobDescription && typeof jobDescription === 'string' && jobDescription.trim().length > 0
            ? jobDescription.trim()
            : 'Uploaded resume pending job description and analysis',
          savedFilename
        ]
      );
      if (result && result.insertId) {
        analysisId = result.insertId;
      }
    } catch (dbErr) {
      // Non-blocking log if DB is unreachable during testing
      console.warn('[uploadResume DB Notice]: Could not record analysis in MySQL:', dbErr.message);
    }

    // Maintain in fallback store for consistent ID resolution
    if (!analysisId) {
      fallbackIdCounter += 1;
      analysisId = fallbackIdCounter;
    }

    fallbackAnalysesStore.set(Number(analysisId), {
      id: Number(analysisId),
      user_id: userId,
      job_title: jobTitle ? jobTitle.trim() : null,
      job_description: jobDescription ? jobDescription.trim() : '',
      resume_filename: savedFilename,
      original_filename: originalName,
      created_at: new Date()
    });
    syncAnalysesToDisk();

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      file: {
        originalName,
        savedFilename,
        size: fileSize,
        mimetype: mimeType,
        uploadedAt: new Date().toISOString()
      },
      analysisId,
      userId
    });
  } catch (error) {
    console.error('[Upload Resume Controller Error]:', error);

    // Clean up uploaded file if an error occurred after saving
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('[Cleanup Error]:', unlinkErr.message);
      }
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing the uploaded resume.'
    });
  }
};

/**
 * POST /api/resumes/:id/extract-text
 * 
 * Extracts readable plain text from a previously uploaded resume document:
 * - Protected by verifyToken middleware (req.userId is guaranteed)
 * - Verifies the resume record exists and belongs to the authenticated user
 * - Safely resolves file on disk (guards against path traversal)
 * - Parses PDF or DOCX via resumeParser service
 * - Rejects empty, corrupted, password-protected, or unreadable files with 400 Bad Request
 * - Returns clean text, word count, character count, and document metadata
 */
const extractText = async (req, res) => {
  try {
    const rawId = req.params.id;
    const userId = req.userId;

    if (!rawId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Resume analysis ID is required in the route parameter.'
      });
    }

    const numericId = parseInt(rawId, 10);
    let record = null;

    // 1. Look up in MySQL database if numeric ID
    if (!isNaN(numericId)) {
      try {
        const [rows] = await pool.execute(
          'SELECT id, user_id, job_title, resume_filename, created_at FROM resume_analyses WHERE id = ? LIMIT 1',
          [numericId]
        );
        if (rows && rows.length > 0) {
          record = rows[0];
        }
      } catch (dbErr) {
        console.warn('[extractText DB Notice]: MySQL query failed:', dbErr.message);
      }
    }

    // 2. Check fallback store if not found in database
    if (!record && !isNaN(numericId) && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    // 3. Fallback: check if :id matches saved filename
    if (!record) {
      try {
        const [rows] = await pool.execute(
          'SELECT id, user_id, job_title, resume_filename, created_at FROM resume_analyses WHERE resume_filename = ? LIMIT 1',
          [rawId]
        );
        if (rows && rows.length > 0) {
          record = rows[0];
        }
      } catch (_) {}

      if (!record) {
        for (const fallback of fallbackAnalysesStore.values()) {
          if (fallback.resume_filename === rawId) {
            record = fallback;
            break;
          }
        }
      }
    }

    // 4. Return 404 if record does not exist
    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Resume analysis record not found with ID: ${rawId}`
      });
    }

    // 5. Ownership Security Check: File must belong to the authenticated user
    if (Number(record.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to access this resume.'
      });
    }

    // 6. Secure Path Resolution (prevents directory traversal attacks)
    const uploadDir = getUploadDir();
    const safeFilename = path.basename(record.resume_filename);
    const resolvedFilePath = path.join(uploadDir, safeFilename);

    if (!resolvedFilePath.startsWith(uploadDir)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid file reference.'
      });
    }

    // Verify file actually exists on server disk
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The uploaded resume file was not found on the server disk.'
      });
    }

    // 7. Extract text using resumeParser service
    const extractionResult = await parseResume(resolvedFilePath);

    // 8. Return structured JSON response (no raw server paths exposed)
    return res.status(200).json({
      success: true,
      message: 'Resume text extracted successfully',
      analysisId: record.id,
      filename: record.resume_filename,
      originalFilename: record.original_filename || record.resume_filename,
      documentType: extractionResult.documentType,
      text: extractionResult.text,
      wordCount: extractionResult.wordCount,
      charCount: extractionResult.charCount,
      isTruncated: extractionResult.isTruncated,
      data: {
        analysisId: record.id,
        filename: record.resume_filename,
        originalFilename: record.original_filename || record.resume_filename,
        documentType: extractionResult.documentType,
        text: extractionResult.text,
        wordCount: extractionResult.wordCount,
        charCount: extractionResult.charCount,
        isTruncated: extractionResult.isTruncated
      }
    });

  } catch (error) {
    console.error('[Extract Text Controller Error]:', error.message || error);

    // If an error was thrown by parseResume with a specific status code (e.g. 400 for corrupt/empty)
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.statusCode === 404 ? 'Not Found' : 'Bad Request',
        message: error.message,
        code: error.code || undefined
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while extracting text from the resume.'
    });
  }
};

module.exports = {
  uploadResume,
  extractText,
  extractResumeText: extractText,
  fallbackAnalysesStore
};
