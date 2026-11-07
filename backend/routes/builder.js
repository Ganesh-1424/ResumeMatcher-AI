const express = require('express');
const router = express.Router();
const {
  saveResume,
  getSavedResumes,
  getResumeById,
  updateResume,
  duplicateResume,
  deleteResume,
  downloadPdf,
  checkAtsScore,
  matchJobDescription,
  getAiAssistance
} = require('../controllers/builderController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * Routes for AI Resume Builder
 * Mounted at: /api/resumes/builder and /api/builder
 * 
 * All routes require JWT authentication.
 */

// Save new resume draft
router.post('/', verifyToken, saveResume);

// List all saved resumes for authenticated user
router.get('/', verifyToken, getSavedResumes);

// PDF generation from live body payload
router.post('/pdf', verifyToken, downloadPdf);

// ATS scoring of builder resume (reuses existing ATS engine)
router.post('/ats-score', verifyToken, checkAtsScore);

// Job description matching and skill gap analysis
router.post('/match', verifyToken, matchJobDescription);

// AI writing assistance
router.post('/ai-assist', verifyToken, getAiAssistance);

// Specific resume operations by ID
router.get('/:id', verifyToken, getResumeById);
router.put('/:id', verifyToken, updateResume);
router.post('/:id/duplicate', verifyToken, duplicateResume);
router.delete('/:id', verifyToken, deleteResume);
router.get('/:id/pdf', verifyToken, downloadPdf);

module.exports = router;
