const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { getUploadDir } = require('../config/storage');

/**
 * Configure destination directory for resume uploads.
 * Uses persistent disk storage if UPLOADS_DIR environment variable is provided.
 */
const uploadDir = getUploadDir();

/**
 * Magic numbers (file signatures) for robust validation:
 * - PDF starts with: %PDF- (hex: 25 50 44 46 2d)
 * - DOCX (Zip archive) starts with: PK\x03\x04 (hex: 50 4b 03 04)
 */
const MAGIC_NUMBERS = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  zip: [0x50, 0x4B, 0x03, 0x04] // DOCX, XLSX, PPTX are zipped XML packages
};

/**
 * Validates the binary header (magic bytes) of a file buffer on disk.
 * @param {string} filePath - Absolute path to the uploaded file.
 * @returns {Promise<{ isValid: boolean, detectedType: string|null, error: string|null }>}
 */
const validateFileHeader = async (filePath) => {
  return new Promise((resolve) => {
    // Read the first 8 bytes of the file
    const buffer = Buffer.alloc(8);
    fs.open(filePath, 'r', (err, fd) => {
      if (err) {
        return resolve({
          isValid: false,
          detectedType: null,
          error: 'Unable to open file for security signature verification.'
        });
      }

      fs.read(fd, buffer, 0, 8, 0, (readErr, bytesRead) => {
        fs.close(fd, () => {});

        if (readErr || bytesRead < 4) {
          return resolve({
            isValid: false,
            detectedType: null,
            error: 'File is too short or corrupted to verify integrity.'
          });
        }

        // Check PDF: %PDF
        const isPdf =
          buffer[0] === MAGIC_NUMBERS.pdf[0] &&
          buffer[1] === MAGIC_NUMBERS.pdf[1] &&
          buffer[2] === MAGIC_NUMBERS.pdf[2] &&
          buffer[3] === MAGIC_NUMBERS.pdf[3];

        if (isPdf) {
          return resolve({ isValid: true, detectedType: 'pdf', error: null });
        }

        // Check ZIP (DOCX): PK\x03\x04
        const isZip =
          buffer[0] === MAGIC_NUMBERS.zip[0] &&
          buffer[1] === MAGIC_NUMBERS.zip[1] &&
          buffer[2] === MAGIC_NUMBERS.zip[2] &&
          buffer[3] === MAGIC_NUMBERS.zip[3];

        if (isZip) {
          return resolve({ isValid: true, detectedType: 'docx', error: null });
        }

        return resolve({
          isValid: false,
          detectedType: null,
          error: 'File signature does not match a valid PDF or DOCX document.'
        });
      });
    });
  });
};

/**
 * Configure Multer disk storage:
 * - Destination: backend/uploads (or persistent disk)
 * - Server-controlled cryptographically random filename (prevents collision & guessing)
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const originalExt = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `resume_${Date.now()}_${randomHex}${originalExt}`);
  }
});

/**
 * Multer file filter to validate MIME types and file extensions before storing.
 */
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', // Some browsers / OS categorize .docx as generic zip
    'application/octet-stream', // In rare cases when OS MIME detection fails
    'application/x-zip-compressed'
  ];

  if (!allowedExtensions.includes(ext)) {
    const error = new Error('Invalid file type. Only PDF (.pdf) and Word (.docx) resumes are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error('Invalid MIME type. Only PDF and DOCX files are permitted.');
    error.code = 'INVALID_MIME_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

/**
 * Multer upload middleware instance:
 * - 5 MB file size limit (5 * 1024 * 1024 = 5,242,880 bytes)
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter
});

/**
 * Express middleware wrapper that intercepts Multer errors and returns clear JSON responses.
 */
const uploadResumeMiddleware = (req, res, next) => {
  const singleUpload = upload.single('resume');

  singleUpload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'File size exceeds the 5 MB limit. Please upload a smaller resume file.'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Unexpected field name '${err.field}'. Please use 'resume' as the multipart field name.`
          });
        }
        return res.status(400).json({
          error: 'Bad Request',
          message: `Upload error: ${err.message}`
        });
      }

      if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_MIME_TYPE') {
        return res.status(400).json({
          error: 'Bad Request',
          message: err.message
        });
      }

      return res.status(400).json({
        error: 'Bad Request',
        message: err.message || 'Error uploading file.'
      });
    }

    // Check if file was provided
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No resume file uploaded. Please provide a file with field name "resume".'
      });
    }

    // Deep inspection: verify file magic numbers (signature)
    try {
      const headerVerification = await validateFileHeader(req.file.path);
      const ext = path.extname(req.file.originalname).toLowerCase();

      // Ensure detected magic bytes match the advertised file extension
      const isValidFormat =
        (ext === '.pdf' && headerVerification.detectedType === 'pdf') ||
        (ext === '.docx' && headerVerification.detectedType === 'docx');

      if (!headerVerification.isValid || !isValidFormat) {
        // Delete rejected file from disk immediately
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Security validation failed: File content does not match a genuine PDF or DOCX document.'
        });
      }
    } catch (validationErr) {
      // Cleanup on unexpected error
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to complete resume signature validation.'
      });
    }

    next();
  });
};

/**
 * Middleware: atsUploadMiddleware
 * 
 * Supports both:
 * 1. Multipart file upload ('resume' or 'file' field name)
 * 2. JSON request with existing resumeId (bypasses Multer)
 */
const atsUploadMiddleware = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // If request is JSON, skip Multer and proceed directly to controller
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  // Handle multipart file upload (accepts either field name 'resume' or 'file')
  upload.any()(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'File size exceeds the 5 MB limit. Please upload a smaller resume file.'
          });
        }
        return res.status(400).json({
          error: 'Bad Request',
          message: `Upload error: ${err.message}`
        });
      }

      if (err.code === 'INVALID_FILE_TYPE' || err.code === 'INVALID_MIME_TYPE') {
        return res.status(400).json({
          error: 'Bad Request',
          message: err.message
        });
      }

      return res.status(400).json({
        error: 'Bad Request',
        message: err.message || 'Error uploading file.'
      });
    }

    if (req.files && req.files.length > 0) {
      req.file = req.files[0];

      // Deep inspection: verify file magic numbers
      try {
        const headerVerification = await validateFileHeader(req.file.path);
        const ext = path.extname(req.file.originalname).toLowerCase();

        const isValidFormat =
          (ext === '.pdf' && headerVerification.detectedType === 'pdf') ||
          (ext === '.docx' && headerVerification.detectedType === 'docx');

        if (!headerVerification.isValid || !isValidFormat) {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Security validation failed: File content does not match a genuine PDF or DOCX document.'
          });
        }
      } catch (_) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to complete resume signature validation.'
        });
      }
    }

    next();
  });
};

module.exports = {
  uploadResumeMiddleware,
  atsUploadMiddleware,
  validateFileHeader,
  uploadDir
};
