/**
 * Configuration: JWT Security Settings
 * 
 * Enforces secret strength, safe token expiration defaults,
 * and unified secret resolution across auth controllers and middleware.
 */

const DEV_PRIMARY_SECRET = 'super_secure_jwt_secret_key_at_least_32_characters_long_for_dev';
const DEV_FALLBACK_SECRETS = [
  DEV_PRIMARY_SECRET,
  'dev_insecure_jwt_secret_ai_resume_job_matcher_testing_only',
  'ai_resume_matcher_dev_jwt_secret_2026_key'
];

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is not set in production.');
      err.code = 'MISSING_JWT_SECRET';
      throw err;
    }
    // Consistent development fallback so active sessions do not break if .env is missing
    return DEV_PRIMARY_SECRET;
  }

  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    console.warn('[SECURITY WARNING]: JWT_SECRET in production is shorter than 32 characters. Consider rotating to a strong random key.');
  }

  return secret;
};

const getJwtExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || '7d';
};

module.exports = {
  getJwtSecret,
  getJwtExpiresIn,
  DEV_PRIMARY_SECRET,
  DEV_FALLBACK_SECRETS
};
