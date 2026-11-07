const express = require('express');
const router = express.Router();
const { testConnection } = require('../config/db');

/**
 * GET /api/health
 * Backend health check endpoint with database connectivity status
 */
router.get(['/', '/health'], async (req, res) => {
  const dbStatus = await testConnection();

  res.status(200).json({
    status: 'OK',
    message: 'AI Resume & Job Matcher Backend is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(1)}s`,
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbStatus.connected,
      host: dbStatus.host,
      name: dbStatus.database,
      status: dbStatus.connected ? 'Connected' : 'Disconnected / Unreachable',
      details: dbStatus.message
    }
  });
});

module.exports = router;

