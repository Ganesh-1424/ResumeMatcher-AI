const express = require('express');
const router = express.Router();
const {
  createAnalysis,
  getAnalyses,
  getDashboardStats,
  getAnalysisById,
  generateAnalysisReport,
  matchAnalysis,
  analyzeSkills,
  scoreAts,
  generateSuggestions
} = require('../controllers/analysisController');
const { verifyToken } = require('../middleware/authMiddleware');
const { aiAnalysisLimiter } = require('../middleware/rateLimiter');

/**
 * Routes for Job Analysis
 * Base path: /api/analyses
 * 
 * All routes are protected by JWT authentication (verifyToken).
 */

// POST /api/analyses - Create a new job analysis record (Task 23)
router.post('/', verifyToken, createAnalysis);

// GET /api/analyses/dashboard/stats - Get dashboard summary statistics (Task 29)
router.get('/dashboard/stats', verifyToken, getDashboardStats);

// GET /api/analyses - List all analyses for authenticated user (Task 29)
router.get('/', verifyToken, getAnalyses);

// GET /api/analyses/:id/report - Generate and stream PDF report (Task 30)
router.get('/:id/report', verifyToken, generateAnalysisReport);

// GET /api/analyses/:id - Get specific analysis details (Task 29)
router.get('/:id', verifyToken, getAnalysisById);

// POST /api/analyses/:id/match - Run semantic matching using embeddings (Task 24)
router.post('/:id/match', verifyToken, aiAnalysisLimiter, matchAnalysis);

// POST /api/analyses/:id/skills - Run skill gap analysis (Task 25)
router.post('/:id/skills', verifyToken, aiAnalysisLimiter, analyzeSkills);

// POST /api/analyses/:id/ats-score - Run ATS readiness scoring (Task 26)
router.post('/:id/ats-score', verifyToken, aiAnalysisLimiter, scoreAts);

// POST /api/analyses/:id/suggestions - Generate AI resume improvement suggestions (Task 27)
router.post('/:id/suggestions', verifyToken, aiAnalysisLimiter, generateSuggestions);

module.exports = router;
