const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env located in the backend folder
dotenv.config({ path: path.join(__dirname, '.env'), override: true });
// Fallback to project root .env for shared configuration
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: false });

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const analysisRoutes = require('./routes/analyses');
const atsRoutes = require('./routes/ats');
const builderRoutes = require('./routes/builder');
const { testConnection } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Headers: Helmet middleware enforces HSTS, nosniff, frameguard, etc.
app.use(helmet({
  contentSecurityPolicy: false, // Prevents breaking inline assets/bundled apps if served together
  crossOriginEmbedderPolicy: false
}));

// Production CORS configuration
const rawAllowed = process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '';
const configuredOrigins = rawAllowed
  ? rawAllowed.split(',').map(item => item.trim()).filter(Boolean)
  : [];

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

const allowedOrigins = [...new Set([...configuredOrigins, ...defaultDevOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, health probes, test suites)
    if (!origin) return callback(null, true);

    // If wildcard origin allowed or development mode
    if (process.env.NODE_ENV !== 'production' || configuredOrigins.includes('*')) {
      return callback(null, true);
    }

    // Check exact match, wildcard subdomains, or Cloud Run preview domains
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      if (allowed.startsWith('*.') && origin.endsWith(allowed.slice(1))) return true;
      return false;
    }) || origin.endsWith('.run.app');

    if (isAllowed) {
      return callback(null, true);
    } else {
      console.warn(`[CORS Blocked]: Origin ${origin} not in allowed origins list.`);
      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-bypass-rate-limit']
};

app.use(cors(corsOptions));

// Request body size limits (prevents Denial of Service via large payloads)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply general API rate limiter to all /api endpoints
app.use('/api', apiLimiter);

// URL Normalization Middleware: Gracefully strip accidental duplicate /api/api prefixes
app.use((req, res, next) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/');
  }
  next();
});

// Health Check Routes (both root /health and /api/health for PaaS and container probes)
app.use('/health', healthRoutes);
app.use('/api', healthRoutes);

// Root Route (when static frontend is not mounted)
app.get('/', (req, res, next) => {
  const distDir = path.resolve(__dirname, '..', 'dist');
  if (fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'))) {
    return next();
  }
  res.status(200).json({
    project: 'AI Resume & Job Matcher',
    status: 'Server is active',
    documentation: '/api/health'
  });
});

// API Routes - Registered with both standard /api/* prefix and root /* alias
// This prevents 404 Route Not Found errors regardless of whether the client Axios
// instance baseURL includes or omits the /api prefix.
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/resumes', resumeRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/analyses', analysisRoutes);
app.use('/api/ats', atsRoutes);
app.use('/ats', atsRoutes);
app.use('/api/resumes/builder', builderRoutes);
app.use('/resumes/builder', builderRoutes);
app.use('/api/builder', builderRoutes);
app.use('/builder', builderRoutes);

// Static SPA file serving if dist directory exists (full-stack single service deployments)
const distDir = path.resolve(__dirname, '..', 'dist');
const rootIndexHtml = path.resolve(__dirname, '..', 'index.html');

app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  if (fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'))) {
    return express.static(distDir)(req, res, next);
  }
  next();
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  if (fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'))) {
    return res.sendFile(path.join(distDir, 'index.html'));
  }
  if (fs.existsSync(rootIndexHtml)) {
    return res.sendFile(rootIndexHtml);
  }
  next();
});

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  // Handle malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Malformed JSON payload in request body.'
    });
  }

  // Handle oversized body payloads
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request payload exceeds the maximum allowed limit of 1 MB.'
    });
  }

  // Handle CORS policy rejection
  if (err && err.message && err.message.includes('CORS policy blocked access')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access blocked by CORS security policy.'
    });
  }

  // Handle Multer upload errors
  if (err && err.name === 'MulterError') {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message || 'File upload error.'
    });
  }

  console.error('[Unhandled Server Error]:', err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  const isServerFault = statusCode >= 500;

  // Never expose raw stack traces or internal filesystem/DB details to clients
  const clientMessage = isServerFault
    ? 'An unexpected error occurred on the server. Please try again later.'
    : (err.message || 'The request could not be completed.');

  return res.status(statusCode).json({
    error: isServerFault ? 'Internal Server Error' : (err.error || 'Error'),
    message: clientMessage
  });
});

// Process-level safety handlers to prevent unexpected server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

// Start Server only if executed directly
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`=========================================`);
    console.log(` AI Resume & Job Matcher - Backend Server`);
    console.log(` Running on: http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(` Signup API:   POST http://localhost:${PORT}/api/auth/signup`);
    console.log(` Login API:    POST http://localhost:${PORT}/api/auth/login`);
    console.log(` Profile API:  GET  http://localhost:${PORT}/api/auth/profile`);
    console.log(` Upload API:   POST http://localhost:${PORT}/api/resumes/upload`);
    console.log(` Extract API:  POST http://localhost:${PORT}/api/resumes/:id/extract-text`);
    console.log(` Analysis API: POST http://localhost:${PORT}/api/analyses`);
    console.log(` Match API:    POST http://localhost:${PORT}/api/analyses/:id/match`);
    console.log(` Skills API:   POST http://localhost:${PORT}/api/analyses/:id/skills`);
    console.log(` ATS API:      POST http://localhost:${PORT}/api/analyses/:id/ats-score`);
    console.log(` AI Tips API:  POST http://localhost:${PORT}/api/analyses/:id/suggestions`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);

    // Verify MySQL Connection and ensure schema and account records
    const dbStatus = await testConnection();
    if (dbStatus.connected) {
      console.log(`[Database] ✅ Connected to MySQL: ${dbStatus.database} on ${dbStatus.host}`);
      try {
        const initDatabase = require('./init-db');
        await initDatabase();
        const reconcileUserAndResumes = require('./migrations/reconcile-user-and-resumes');
        await reconcileUserAndResumes();
      } catch (setupErr) {
        console.warn('[Database Auto-Init Notice]:', setupErr.message);
      }
    } else {
      console.log(`[Database] ⚠️  MySQL Notice: ${dbStatus.message}`);
      console.log(`[Database] ℹ️  Express server is running. Verify MySQL service when querying.`);
    }
  });
}

module.exports = app;
