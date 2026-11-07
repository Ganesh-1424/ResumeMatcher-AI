const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { getJwtSecret, getJwtExpiresIn } = require('../config/jwt');
const { verifyGoogleIdToken } = require('../services/googleAuthService');
const { loadFallbackStore, saveFallbackStore } = require('../config/persistentStore');

/**
 * Fallback store for users with disk backup.
 * Ensures signup and login remain testable during development when MySQL is offline.
 */
const fallbackUsersStore = new Map();
let fallbackUserIdCounter = 1;

// Initialize from persistent disk store
try {
  const diskData = loadFallbackStore();
  if (diskData.users && diskData.users.length > 0) {
    for (const u of diskData.users) {
      if (u && u.email) {
        fallbackUsersStore.set(u.email.toLowerCase(), u);
        if (Number(u.id) >= fallbackUserIdCounter) {
          fallbackUserIdCounter = Number(u.id) + 1;
        }
      }
    }
  }
} catch (_) {}

const syncUsersToDisk = () => {
  try {
    const existing = loadFallbackStore();
    existing.users = Array.from(fallbackUsersStore.values());
    saveFallbackStore(existing);
  } catch (_) {}
};

/**
 * Basic email format validator regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/signup
 * Registers a new user account with hashed password and stores it in MySQL.
 */
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // 1. Validation: Field presence
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, email, and password are required fields.'
      });
    }

    // 2. Normalize and sanitize inputs
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Validate Name
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name must be at least 2 characters long.'
      });
    }

    if (trimmedName.length > 100) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name cannot exceed 100 characters.'
      });
    }

    // Validate Email format
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please provide a valid email address.'
      });
    }

    if (normalizedEmail.length > 191) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email address cannot exceed 191 characters.'
      });
    }

    // Validate Password
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (password.length > 128) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password cannot exceed 128 characters.'
      });
    }

    // Hash the password with bcryptjs (10 salt rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let newUserId = null;

    // 3. Try to register user in MySQL
    try {
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );

      if (existingUsers && existingUsers.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'An account with this email address is already registered.'
        });
      }

      const [insertResult] = await pool.execute(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [trimmedName, normalizedEmail, passwordHash]
      );
      if (insertResult && insertResult.insertId) {
        newUserId = insertResult.insertId;
      }
    } catch (dbErr) {
      console.warn('[Signup DB Notice]: MySQL unavailable, using fallback store:', dbErr.message);
      if (fallbackUsersStore.has(normalizedEmail)) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'An account with this email address is already registered.'
        });
      }
    }

    if (!newUserId) {
      fallbackUserIdCounter += 1;
      newUserId = fallbackUserIdCounter;
    }

    const newUser = {
      id: newUserId,
      name: trimmedName,
      email: normalizedEmail,
      password_hash: passwordHash,
      created_at: new Date()
    };
    fallbackUsersStore.set(normalizedEmail, newUser);
    syncUsersToDisk();

    let jwtSecret;
    try {
      jwtSecret = getJwtSecret();
    } catch (secErr) {
      console.error('[Signup JWT Error]:', secErr.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication service configuration error.'
      });
    }

    const jwtExpiresIn = getJwtExpiresIn();
    const token = jwt.sign({ id: newUserId, email: normalizedEmail }, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address is already registered.'
      });
    }

    console.error('[Signup Controller Error]:', error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while creating your account. Please try again later.'
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user credentials, compares password hash, and issues a JWT token.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required fields.'
      });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required.'
      });
    }

    const invalidCredentialsResponse = () => {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.'
      });
    };

    let user = null;

    try {
      const [rows] = await pool.execute(
        'SELECT id, name, email, password_hash, previous_password_hash, auth_provider, google_id, created_at FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );
      if (rows && rows.length > 0) {
        user = rows[0];
      }
    } catch (dbErr) {
      console.warn('[Login DB Notice]: MySQL unavailable, checking fallback store:', dbErr.message);
    }

    if (!user && fallbackUsersStore.has(normalizedEmail)) {
      user = fallbackUsersStore.get(normalizedEmail);
    }

    if (!user) {
      return invalidCredentialsResponse();
    }

    // Handle account originally created via Google authentication
    if (user.auth_provider === 'google' || (!user.password_hash && user.google_id)) {
      return res.status(400).json({
        error: 'Bad Request',
        code: 'GOOGLE_AUTH_ACCOUNT',
        message: 'This account was created with Google Sign-In. Please sign in using the "Continue with Google" button.'
      });
    }

    // Verify password against active password hash
    let isPasswordMatch = false;
    if (user.password_hash) {
      isPasswordMatch = await bcrypt.compare(password, user.password_hash);
    }

    // Also support verifying against previous password if user rotated credentials
    if (!isPasswordMatch && user.previous_password_hash) {
      isPasswordMatch = await bcrypt.compare(password, user.previous_password_hash);
    }

    // Also support verifying against fallback store if registered while DB was offline/recovering
    if (!isPasswordMatch && fallbackUsersStore.has(normalizedEmail)) {
      const fallbackUser = fallbackUsersStore.get(normalizedEmail);
      if (fallbackUser && fallbackUser.password_hash) {
        isPasswordMatch = await bcrypt.compare(password, fallbackUser.password_hash);
        if (isPasswordMatch) {
          try {
            await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [fallbackUser.password_hash, user.id]);
          } catch (_) {}
        }
      }
    }

    if (!isPasswordMatch) {
      return invalidCredentialsResponse();
    }

    let jwtSecret;
    try {
      jwtSecret = getJwtSecret();
    } catch (secErr) {
      console.error('[Login JWT Error]:', secErr.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication service configuration error.'
      });
    }

    const payload = {
      id: user.id,
      email: user.email
    };

    const jwtExpiresIn = getJwtExpiresIn();
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('[Login Controller Error]:', error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login. Please try again later.'
    });
  }
};

/**
 * GET /api/auth/profile
 * Returns authenticated user profile, statistics, and recent activity.
 * Strict user isolation: retrieves only data owned by req.userId.
 * Never exposes password_hash.
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    let user = null;

    try {
      const [rows] = await pool.execute(
        'SELECT id, name, email, google_id, avatar_url, auth_provider, password_hash, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
        [userId]
      );
      if (rows && rows.length > 0) {
        user = rows[0];
      }
    } catch (dbErr) {
      console.warn('[Profile DB Notice]:', dbErr.message);
    }

    if (!user) {
      for (const u of fallbackUsersStore.values()) {
        if (Number(u.id) === Number(userId)) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found.'
      });
    }

    // Determine authProvider and if account has password
    const authProvider = user.auth_provider === 'google' || user.google_id ? 'google' : 'local';
    const hasPassword = Boolean(user.password_hash);

    // Compute user statistics
    let totalAnalyses = 0;
    let totalAtsChecks = 0;
    let totalBuilderResumes = 0;
    let recentActivity = [];

    // 1. Query MySQL for stats
    try {
      const [analysisRows] = await pool.execute(
        `SELECT id, job_title, resume_filename, match_score, ats_score, created_at 
         FROM resume_analyses 
         WHERE user_id = ? 
         ORDER BY created_at DESC LIMIT 20`,
        [userId]
      );
      if (analysisRows && analysisRows.length > 0) {
        for (const row of analysisRows) {
          if (row.match_score !== null && row.match_score !== undefined) {
            totalAnalyses++;
          }
          if (row.ats_score !== null && row.ats_score !== undefined) {
            totalAtsChecks++;
          }
          recentActivity.push({
            id: `analysis-${row.id}`,
            entityId: row.id,
            type: row.match_score !== null ? 'analysis' : 'ats_check',
            title: row.job_title || row.resume_filename || 'Resume Analysis',
            score: row.match_score !== null ? Number(row.match_score) : Number(row.ats_score),
            date: row.created_at,
            link: row.match_score !== null ? `/matches/${row.id}` : `/ats-checker`
          });
        }
      }

      const [builderRows] = await pool.execute(
        `SELECT id, title, template, ats_score, created_at, updated_at 
         FROM saved_resumes 
         WHERE user_id = ? 
         ORDER BY updated_at DESC LIMIT 20`,
        [userId]
      );
      if (builderRows && builderRows.length > 0) {
        totalBuilderResumes = builderRows.length;
        for (const b of builderRows) {
          recentActivity.push({
            id: `builder-${b.id}`,
            entityId: b.id,
            type: 'builder_resume',
            title: b.title || 'Resume Draft',
            score: b.ats_score !== null ? Number(b.ats_score) : null,
            date: b.updated_at || b.created_at,
            link: `/builder`
          });
        }
      }
    } catch (statsErr) {
      console.warn('[Profile Stats DB Notice]:', statsErr.message);
    }

    // Merge in fallback stores
    try {
      const { fallbackAnalysesStore } = require('./resumeController');
      for (const [id, a] of fallbackAnalysesStore.entries()) {
        if (Number(a.user_id) === Number(userId)) {
          const isAnalysis = a.match_score !== null && a.match_score !== undefined;
          if (isAnalysis) totalAnalyses++;
          if (a.ats_score !== null && a.ats_score !== undefined) totalAtsChecks++;

          if (!recentActivity.some(item => item.entityId === id && (item.type === 'analysis' || item.type === 'ats_check'))) {
            recentActivity.push({
              id: `analysis-${id}`,
              entityId: id,
              type: isAnalysis ? 'analysis' : 'ats_check',
              title: a.job_title || a.resume_filename || 'Resume Analysis',
              score: isAnalysis ? Number(a.match_score) : Number(a.ats_score),
              date: a.created_at || new Date(),
              link: isAnalysis ? `/matches/${id}` : `/ats-checker`
            });
          }
        }
      }
    } catch (_) {}

    try {
      const { fallbackSavedResumesStore } = require('./builderController');
      for (const [id, b] of fallbackSavedResumesStore.entries()) {
        if (Number(b.user_id) === Number(userId)) {
          totalBuilderResumes++;
          if (!recentActivity.some(item => item.entityId === id && item.type === 'builder_resume')) {
            recentActivity.push({
              id: `builder-${id}`,
              entityId: id,
              type: 'builder_resume',
              title: b.title || 'Resume Draft',
              score: b.ats_score !== null && b.ats_score !== undefined ? Number(b.ats_score) : null,
              date: b.updated_at || b.created_at || new Date(),
              link: `/builder`
            });
          }
        }
      }
    } catch (_) {}

    // Sort recent activity by date descending and limit to top 6
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentActivity = recentActivity.slice(0, 6);

    // CRITICAL SECURITY: Never expose password_hash
    const sanitizedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url || null,
      authProvider,
      hasPassword,
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at
    };

    return res.status(200).json({
      success: true,
      message: 'Protected profile retrieved successfully',
      user: sanitizedUser,
      stats: {
        totalAnalyses,
        totalAtsChecks,
        totalBuilderResumes
      },
      recentActivity
    });
  } catch (error) {
    console.error('[Profile Controller Error]:', error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to retrieve user profile.'
    });
  }
};

/**
 * PUT /api/auth/profile
 * Updates user profile information (name, avatar_url).
 * Uses parameterized queries and user isolation.
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, avatarUrl } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name must be at least 2 characters long.'
      });
    }

    const cleanName = name.trim().slice(0, 100);
    const cleanAvatar = avatarUrl && typeof avatarUrl === 'string' ? avatarUrl.trim().slice(0, 500) : null;

    let updated = false;
    let userRow = null;

    try {
      await pool.execute(
        'UPDATE users SET name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?',
        [cleanName, cleanAvatar, userId]
      );
      const [rows] = await pool.execute(
        'SELECT id, name, email, google_id, avatar_url, auth_provider, password_hash, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
        [userId]
      );
      if (rows && rows.length > 0) {
        userRow = rows[0];
        updated = true;
      }
    } catch (dbErr) {
      console.warn('[updateProfile DB Notice]:', dbErr.message);
    }

    // Update in fallback store
    for (const [email, u] of fallbackUsersStore.entries()) {
      if (Number(u.id) === Number(userId)) {
        u.name = cleanName;
        if (cleanAvatar !== undefined) u.avatar_url = cleanAvatar;
        u.updated_at = new Date();
        fallbackUsersStore.set(email, u);
        if (!userRow) userRow = u;
        updated = true;
        break;
      }
    }

    if (!updated && !userRow) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found.'
      });
    }

    const authProvider = userRow.auth_provider === 'google' || userRow.google_id ? 'google' : 'local';

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        avatarUrl: userRow.avatar_url || null,
        authProvider,
        hasPassword: Boolean(userRow.password_hash),
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at || new Date()
      }
    });
  } catch (error) {
    console.error('[updateProfile Controller Error]:', error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile.'
    });
  }
};

/**
 * PUT /api/auth/password
 * PUT /api/auth/profile/password
 * Changes password for authenticated user with current password verification.
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 8 characters long.'
      });
    }

    let user = null;
    try {
      const [rows] = await pool.execute(
        'SELECT id, email, password_hash, auth_provider, google_id FROM users WHERE id = ? LIMIT 1',
        [userId]
      );
      if (rows && rows.length > 0) user = rows[0];
    } catch (dbErr) {
      console.warn('[changePassword DB Notice]:', dbErr.message);
    }

    if (!user) {
      for (const u of fallbackUsersStore.values()) {
        if (Number(u.id) === Number(userId)) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User account not found.'
      });
    }

    // Check if account has an existing password to verify
    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Current password is required to change your password.'
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Current password is incorrect.'
        });
      }
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    try {
      await pool.execute(
        'UPDATE users SET previous_password_hash = password_hash, password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newHash, userId]
      );
    } catch (dbErr) {
      console.warn('[changePassword update DB Notice]:', dbErr.message);
    }

    // Update in fallback store
    for (const [email, u] of fallbackUsersStore.entries()) {
      if (Number(u.id) === Number(userId)) {
        u.previous_password_hash = u.password_hash;
        u.password_hash = newHash;
        u.updated_at = new Date();
        fallbackUsersStore.set(email, u);
        break;
      }
    }
    syncUsersToDisk();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });

  } catch (error) {
    console.error('[changePassword Controller Error]:', error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update password.'
    });
  }
};

/**
 * POST /api/auth/google
 * Authenticates a user with a verified Google OpenID Connect ID token.
 * 
 * Enforces:
 * - Google signature, issuer, audience, and expiration verification.
 * - Unverified Google emails are rejected.
 * - Email collisions with existing password-based accounts are detected and safely blocked (409 Conflict).
 * - Existing Google accounts log in without duplicate account creation.
 * - New Google users are provisioned in MySQL without a password.
 * - Returns identical application JWT and user payload structure as standard login.
 */
const googleAuth = async (req, res) => {
  try {
    const { credential, idToken, clientId: clientProvidedId } = req.body || {};
    const tokenToVerify = credential || idToken;

    if (!tokenToVerify) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Google credential / ID token is required.'
      });
    }

    // 1. Verify token with Google Identity Services
    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(tokenToVerify, clientProvidedId);
    } catch (verErr) {
      const statusCode = verErr.statusCode || 401;
      return res.status(statusCode).json({
        error: statusCode === 403 ? 'Forbidden' : 'Unauthorized',
        message: verErr.message || 'Google token verification failed.'
      });
    }

    const { googleId, email: normalizedEmail, name: googleName, avatarUrl } = googleUser;

    let user = null;
    let isNewUser = false;

    // 2. MySQL Persistence Query
    try {
      // 2A. Look up by google_id (returning Google user)
      const [byGoogleId] = await pool.execute(
        'SELECT id, name, email, google_id, auth_provider, password_hash, created_at FROM users WHERE google_id = ? LIMIT 1',
        [googleId]
      );

      if (byGoogleId && byGoogleId.length > 0) {
        user = byGoogleId[0];
      } else {
        // 2B. Check if email already exists (Collision detection with existing password accounts)
        const [byEmail] = await pool.execute(
          'SELECT id, name, email, google_id, auth_provider, password_hash, created_at FROM users WHERE email = ? LIMIT 1',
          [normalizedEmail]
        );

        if (byEmail && byEmail.length > 0) {
          const existingUser = byEmail[0];
          // If the account has no google_id or a different one, do NOT automatically link
          if (!existingUser.google_id || existingUser.google_id !== googleId) {
            return res.status(409).json({
              error: 'Conflict',
              code: 'EMAIL_COLLISION_PASSWORD_EXISTS',
              message: 'An account with this email address already exists using password authentication. Please sign in with your email and password first.'
            });
          }
          user = existingUser;
        } else {
          // 2C. Create new Google user
          const [insertResult] = await pool.execute(
            'INSERT INTO users (name, email, password_hash, google_id, avatar_url, auth_provider, created_at) VALUES (?, ?, NULL, ?, ?, ?, NOW())',
            [googleName || 'Google User', normalizedEmail, googleId, avatarUrl, 'google']
          );
          if (insertResult && insertResult.insertId) {
            user = {
              id: insertResult.insertId,
              name: googleName || 'Google User',
              email: normalizedEmail,
              created_at: new Date()
            };
            isNewUser = true;
          }
        }
      }
    } catch (dbErr) {
      console.warn('[googleAuth DB Notice]:', dbErr.message);
    }

    // 3. Dual-mode fallback in-memory store (active when MySQL is temporarily offline)
    if (!user) {
      // Check fallback by google_id
      for (const u of fallbackUsersStore.values()) {
        if (u.google_id === googleId) {
          user = u;
          break;
        }
      }

      if (!user) {
        // Check fallback by email for collision
        for (const u of fallbackUsersStore.values()) {
          if (u.email === normalizedEmail) {
            if (!u.google_id || u.google_id !== googleId) {
              return res.status(409).json({
                error: 'Conflict',
                code: 'EMAIL_COLLISION_PASSWORD_EXISTS',
                message: 'An account with this email address already exists using password authentication. Please sign in with your email and password first.'
              });
            }
            user = u;
            break;
          }
        }
      }

      if (!user) {
        // Provision new user in fallback store
        fallbackUserIdCounter += 1;
        const newId = fallbackUserIdCounter;
        user = {
          id: newId,
          name: googleName || 'Google User',
          email: normalizedEmail,
          password_hash: null,
          google_id: googleId,
          avatar_url: avatarUrl,
          auth_provider: 'google',
          created_at: new Date()
        };
        fallbackUsersStore.set(normalizedEmail, user);
        isNewUser = true;
      }
    }

    // 4. Issue standard Application JWT token (Never store or return raw Google ID tokens as app JWTs)
    let jwtSecret;
    try {
      jwtSecret = getJwtSecret();
    } catch (secErr) {
      console.error('[Google Auth JWT Error]:', secErr.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication service configuration error.'
      });
    }

    const jwtExpiresIn = getJwtExpiresIn();
    const payload = {
      id: user.id,
      email: user.email
    };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Google account registered successfully' : 'Google login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('[Google Auth Controller Error]:', error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during Google authentication. Please try again later.'
    });
  }
};

/**
 * POST /api/auth/google/link
 * Safely links a Google account to an existing user account after password verification.
 */
const linkGoogleAccount = async (req, res) => {
  try {
    const { email, password, credential, idToken } = req.body || {};
    const tokenToVerify = credential || idToken;

    if (!email || !password || !tokenToVerify) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email, password, and Google credential are required to link accounts.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify Google ID token
    let googleUser;
    try {
      googleUser = await verifyGoogleIdToken(tokenToVerify);
    } catch (verErr) {
      return res.status(verErr.statusCode || 401).json({
        error: 'Unauthorized',
        message: verErr.message || 'Google token verification failed.'
      });
    }

    if (googleUser.email !== normalizedEmail) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Google account email does not match the account being linked.'
      });
    }

    // Verify existing password
    let user = null;
    try {
      const [rows] = await pool.execute(
        'SELECT id, name, email, password_hash, google_id, created_at FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );
      if (rows && rows.length > 0) {
        user = rows[0];
      }
    } catch (dbErr) {
      console.warn('[linkGoogle DB Notice]:', dbErr.message);
    }

    if (!user) {
      user = fallbackUsersStore.get(normalizedEmail) || null;
    }

    if (!user || !user.password_hash) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.'
      });
    }

    // Link the account with google_id
    try {
      await pool.execute(
        'UPDATE users SET google_id = ?, auth_provider = ?, avatar_url = ? WHERE id = ?',
        [googleUser.googleId, 'both', googleUser.avatarUrl, user.id]
      );
    } catch (dbErr) {
      console.warn('[linkGoogle Update DB Notice]:', dbErr.message);
    }

    if (fallbackUsersStore.has(normalizedEmail)) {
      const fbUser = fallbackUsersStore.get(normalizedEmail);
      fbUser.google_id = googleUser.googleId;
      fbUser.auth_provider = 'both';
      fbUser.avatar_url = googleUser.avatarUrl;
    }

    const jwtSecret = getJwtSecret();
    const jwtExpiresIn = getJwtExpiresIn();
    const token = jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.status(200).json({
      success: true,
      message: 'Google account linked successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('[Link Google Controller Error]:', error.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unable to link Google account.'
    });
  }
};

/**
 * POST /api/auth/logout
 * Acknowledges user logout and invalidates client session state.
 */
const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

module.exports = {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  googleAuth,
  linkGoogleAccount,
  fallbackUsersStore
};
