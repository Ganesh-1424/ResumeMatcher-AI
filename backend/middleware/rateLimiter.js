const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * 
 * Protects public and expensive backend endpoints from brute-force credential stuffing,
 * denial of service (DoS), resource exhaustion, and AI API quota starvation.
 */

// 1. Authentication Rate Limiter (Signup & Login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth attempts per window
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.'
  },
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-bypass-rate-limit'] === 'test'
});

// 2. Resume Upload Rate Limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 resume uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many file uploads from this IP address. Please wait before uploading more resumes.'
  },
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-bypass-rate-limit'] === 'test'
});

// 3. Expensive AI & Embedding Analysis Rate Limiter
const aiAnalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 heavy AI operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded for AI analysis operations. Please wait a moment before trying again.'
  },
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-bypass-rate-limit'] === 'test'
});

// 4. General Global API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Generous general limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP address. Please try again later.'
  },
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-bypass-rate-limit'] === 'test'
});

module.exports = {
  authLimiter,
  uploadLimiter,
  aiAnalysisLimiter,
  apiLimiter
};
