import axios from 'axios';

/**
 * Resolves and normalizes the backend API base URL from Vite environment variables.
 * Handles trailing slashes and ensures the /api suffix is present for external URLs.
 */
const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    return '/api';
  }
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  if ((cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) && !cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/api`;
  }
  return cleanUrl;
};

/**
 * Safely sanitizes and validates the JWT authentication token from localStorage.
 * Ensures the token is not null, undefined string, duplicate-prefixed, quoted, or a Google ID token.
 * 
 * @returns {string|null} The clean JWT token string, or null if missing/invalid.
 */
export const getCleanToken = () => {
  try {
    const raw = localStorage.getItem('token');
    if (!raw) return null;

    let token = String(raw).trim();

    // Strip surrounding quotes if present (e.g. from accidental JSON.stringify or bad storage)
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      token = token.slice(1, -1).trim();
    }

    // Strip any leading "Bearer " prefixes (case-insensitive) to prevent "Bearer Bearer ..."
    token = token.replace(/^(?:Bearer\s+)+/i, '').trim();

    // Reject literal placeholder strings or empty values
    if (
      !token ||
      token === 'null' ||
      token === 'undefined' ||
      token === '[object Object]' ||
      token.length < 10
    ) {
      return null;
    }

    // Detect if a raw Google ID token was mistakenly stored instead of application JWT
    // Google ID tokens have 3 parts and their payload iss contains 'accounts.google.com'
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadStr);
        if (payload?.iss && String(payload.iss).includes('accounts.google.com')) {
          console.warn('[api] Detected raw Google ID token stored instead of application JWT. Clearing invalid token.');
          localStorage.removeItem('token');
          return null;
        }
      }
    } catch {
      // Not base64/JSON, allow backend jwt.verify to perform standard verification
    }

    return token;
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Normalize redundant /api prefixes and attach fresh, sanitized JWT
api.interceptors.request.use(
  (config) => {
    // 1. Prevent accidental duplicate /api/api prefixes if a caller passes '/api/...'
    if (config.url) {
      const base = config.baseURL || '';
      if ((base.endsWith('/api') || base === '/api') && config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api/, '');
      }
    }

    // 2. Retrieve the latest sanitized application JWT
    const cleanToken = getCleanToken();

    // 3. Attach in exact format: Authorization: Bearer <JWT_TOKEN>
    if (cleanToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${cleanToken}`;
    } else {
      // Never send malformed "Bearer undefined" or "Bearer null"
      if (config.headers) {
        delete config.headers.Authorization;
        delete config.headers.authorization;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle common errors such as expired session (401)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/signup') ||
        requestUrl.includes('/auth/google');

      // Do NOT delete valid sessions on credential validation errors (e.g. wrong password during login)
      if (!isAuthEndpoint) {
        const serverMessage =
          error.response.data?.message ||
          'Your session has expired or is invalid. Please sign in again.';

        console.warn(`[api] Authentication 401 on ${requestUrl}: ${serverMessage}`);

        // Safely clear stale token and notify application
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: {
              message: serverMessage,
              url: requestUrl,
            },
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export default api;
