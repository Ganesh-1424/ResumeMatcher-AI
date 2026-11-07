const jwt = require('jsonwebtoken');
const { getJwtSecret, DEV_FALLBACK_SECRETS } = require('../config/jwt');

/**
 * Authentication Middleware
 * 
 * Verifies JWT token passed in Authorization: Bearer <token> header.
 * Attaches the verified user ID to req.userId and user object to req.user.
 * Rejects requests with missing, invalid, or expired tokens with 401 Unauthorized.
 */
const verifyToken = (req, res, next) => {
  // 1. Read Authorization header (case-insensitive)
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || String(authHeader).trim() === '') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access denied. No authorization header provided.',
      code: 'AUTH_HEADER_MISSING'
    });
  }

  // 2. Validate and extract Bearer prefix
  const rawHeader = String(authHeader).trim();
  const bearerRegex = /^(?:Bearer\s+)+/i;

  if (!bearerRegex.test(rawHeader)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authorization format. Format should be: Bearer <token>',
      code: 'AUTH_FORMAT_INVALID'
    });
  }

  // Extract token string after Bearer (handles duplicate Bearer prefixes gracefully)
  let token = rawHeader.replace(bearerRegex, '').trim();

  // Strip accidental surrounding single or double quotes
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  // Check for missing, empty, or placeholder literal strings
  if (
    !token ||
    token === 'null' ||
    token === 'undefined' ||
    token === '[object Object]'
  ) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is missing.',
      code: 'TOKEN_MISSING'
    });
  }

  // 3. Inspect if a Google ID token was mistakenly passed instead of an application JWT
  try {
    const unverified = jwt.decode(token, { complete: true });
    if (unverified && unverified.payload) {
      const iss = unverified.payload.iss || '';
      if (iss.includes('accounts.google.com')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token: Google ID token received where application JWT was expected. Please log in with your application account.',
          code: 'TOKEN_IS_GOOGLE_ID'
        });
      }
    }
  } catch {
    // Non-JSON or malformed token will be caught by jwt.verify below
  }

  // 4. Resolve JWT signing secret
  let jwtSecret;
  try {
    jwtSecret = getJwtSecret();
  } catch (secErr) {
    console.error('[authMiddleware Error]:', secErr.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication configuration error on the server.',
      code: 'AUTH_CONFIG_ERROR'
    });
  }

  // 5. Verify token signature and expiration
  try {
    let decoded;
    let verifyError = null;

    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      verifyError = err;
      // In development/test mode, check known dev fallback secrets if signature check failed,
      // so active user sessions do not break if environment files were reloaded
      if (err.name === 'JsonWebTokenError' && process.env.NODE_ENV !== 'production') {
        const fallbacks = (DEV_FALLBACK_SECRETS || []).filter((s) => s !== jwtSecret);
        for (const candidate of fallbacks) {
          try {
            decoded = jwt.verify(token, candidate);
            verifyError = null;
            break;
          } catch {
            // Keep testing candidates
          }
        }
      }
    }

    if (verifyError) {
      throw verifyError;
    }

    // Ensure the decoded payload has a valid user id
    const userId = decoded.id || decoded.userId;
    if (!decoded || !userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload.',
        code: 'TOKEN_PAYLOAD_INVALID'
      });
    }

    // Attach verified user information directly to request
    // Note: We never trust user ID supplied in req.body or req.query
    req.userId = userId;
    req.user = {
      id: userId,
      email: decoded.email || null
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or malformed token.',
        code: 'TOKEN_INVALID'
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed.',
      code: 'AUTH_FAILED'
    });
  }
};

module.exports = {
  verifyToken
};
