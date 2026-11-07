const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  googleAuth,
  linkGoogleAccount
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * Public Routes
 */

// POST /api/auth/signup - Register new user (Rate-limited)
router.post('/signup', authLimiter, signup);

// POST /api/auth/login - Authenticate user & issue JWT (Rate-limited)
router.post('/login', authLimiter, login);

// POST /api/auth/google - Authenticate user via Google OpenID Connect ID token (Rate-limited)
router.post('/google', authLimiter, googleAuth);

// POST /api/auth/google/link - Safely link Google account with verified password
router.post('/google/link', authLimiter, linkGoogleAccount);

// POST /api/auth/logout - Invalidate user session
router.post('/logout', logout);

/**
 * Protected Routes (Requires valid Bearer token)
 */

// GET /api/auth/profile - Retrieve authenticated user profile, statistics, and recent activity
router.get('/profile', verifyToken, getProfile);

// PUT /api/auth/profile - Update user profile details
router.put('/profile', verifyToken, updateProfile);

// PUT /api/auth/profile/password and /password - Change password for authenticated account
router.put('/profile/password', verifyToken, changePassword);
router.put('/password', verifyToken, changePassword);

module.exports = router;
