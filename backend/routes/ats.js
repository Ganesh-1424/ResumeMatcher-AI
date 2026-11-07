const express = require('express');
const router = express.Router();
const {
  checkAtsResume,
  getAtsHistory,
  getAtsCheckById,
  downloadAtsReport
} = require('../controllers/atsController');
const { verifyToken } = require('../middleware/authMiddleware');
const { atsUploadMiddleware } = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');

/**
 * Routes for Standalone ATS Resume Checker
 * Base path: /api/ats
 * 
 * All routes require JWT authentication.
 */

// POST /api/ats/check - Upload resume & evaluate standalone ATS readiness score
router.post('/check', verifyToken, uploadLimiter, atsUploadMiddleware, checkAtsResume);

// Fallback POST /api/ats (root path alias)
router.post('/', verifyToken, uploadLimiter, atsUploadMiddleware, checkAtsResume);

// GET /api/ats/history - Retrieve user's past ATS check records
router.get('/history', verifyToken, getAtsHistory);

// GET /api/ats/:id/report - Stream downloadable PDF ATS analysis report
router.get('/:id/report', verifyToken, downloadAtsReport);

// GET /api/ats/:id - Retrieve specific ATS check results
router.get('/:id', verifyToken, getAtsCheckById);

module.exports = router;
