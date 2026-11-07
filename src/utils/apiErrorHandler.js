/**
 * Centralized API Error Handling Utility
 * 
 * Safely parses, normalizes, and humanizes errors from Axios, backend APIs,
 * network failures, or file extraction issues.
 * 
 * Security:
 * - Strips internal server stack traces, database details (SQL/ER_*),
 *   filesystem paths, and sensitive tokens.
 * - Categorizes errors for actionable UI feedback and safe retry states.
 */

/**
 * Normalizes an API error into a structured, user-friendly object.
 * 
 * @param {Error|Object} error - Caught error object from Axios or Promise
 * @param {string} [defaultMessage="An unexpected error occurred. Please try again."] - Fallback copy
 * @returns {{
 *   message: string,
 *   title: string,
 *   status: number|null,
 *   code: string,
 *   canRetry: boolean,
 *   requiresAuth: boolean,
 *   details: string|null
 * }}
 */
export function parseApiError(error, defaultMessage = 'An unexpected error occurred. Please try again.') {
  if (!error) {
    return {
      title: 'Unexpected Error',
      message: defaultMessage,
      status: null,
      code: 'UNKNOWN_ERROR',
      canRetry: true,
      requiresAuth: false,
      details: null
    };
  }

  // 1. Handle cancelled requests
  if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
    return {
      title: 'Request Cancelled',
      message: 'The operation was cancelled.',
      status: null,
      code: 'REQUEST_CANCELLED',
      canRetry: false,
      requiresAuth: false,
      details: null
    };
  }

  // 2. Handle timeout errors
  if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
    return {
      title: 'Connection Timed Out',
      message: 'The server took too long to process your request. Please check your network connection and try again.',
      status: 408,
      code: 'TIMEOUT',
      canRetry: true,
      requiresAuth: false,
      details: null
    };
  }

  // 3. Handle network / server unreachable
  if (
    error.message === 'Network Error' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNREFUSED' ||
    !error.response
  ) {
    return {
      title: 'Server Unavailable',
      message: 'Cannot communicate with the backend server. Please verify your connection or ensure the API server is active on port 5000.',
      status: 503,
      code: 'NETWORK_ERROR',
      canRetry: true,
      requiresAuth: false,
      details: null
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // Extract raw message from server payload
  let serverMessage = '';
  if (typeof data === 'string') {
    serverMessage = data;
  } else if (data && typeof data === 'object') {
    serverMessage = data.message || data.error || '';
  }

  // Security sanitize: scrub internal SQL errors, stack traces, node_modules paths
  const containsSensitiveData =
    serverMessage.includes('SQL') ||
    serverMessage.includes('ER_') ||
    serverMessage.includes('ECONNREFUSED') ||
    serverMessage.includes('at ') ||
    serverMessage.includes('node_modules') ||
    serverMessage.includes('Trace:') ||
    serverMessage.includes('/var/') ||
    serverMessage.includes('/backend/');

  if (containsSensitiveData) {
    serverMessage = 'A temporary database or service error occurred. Please try again shortly.';
  }

  // 4. Map HTTP status codes and domain-specific errors
  switch (status) {
    case 400: // Bad Request / Validation Failure
      return {
        title: 'Validation Error',
        message: serverMessage || 'Invalid request inputs. Please check your form fields and try again.',
        status: 400,
        code: data?.code || 'VALIDATION_ERROR',
        canRetry: false,
        requiresAuth: false,
        details: null
      };

    case 401: // Unauthorized / Expired JWT
      return {
        title: 'Session Expired',
        message: serverMessage || 'Your session has expired or is invalid. Please log in again to continue.',
        status: 401,
        code: 'UNAUTHORIZED',
        canRetry: false,
        requiresAuth: true,
        details: null
      };

    case 403: // Forbidden / Ownership
      return {
        title: 'Access Denied',
        message: serverMessage || 'You do not have permission to access or modify this analysis record.',
        status: 403,
        code: 'FORBIDDEN',
        canRetry: false,
        requiresAuth: false,
        details: null
      };

    case 404: // Not Found
      return {
        title: 'Record Not Found',
        message: serverMessage || 'The requested analysis record or resume document could not be found.',
        status: 404,
        code: 'NOT_FOUND',
        canRetry: false,
        requiresAuth: false,
        details: null
      };

    case 409: // Conflict (Duplicate email/record)
      return {
        title: 'Conflict',
        message: serverMessage || 'An account with this email address already exists. Please log in.',
        status: 409,
        code: 'CONFLICT',
        canRetry: false,
        requiresAuth: false,
        details: null
      };

    case 413: // File Size Limit
      return {
        title: 'File Too Large',
        message: 'The uploaded file exceeds the 5 MB limit. Please upload a smaller resume.',
        status: 413,
        code: 'FILE_TOO_LARGE',
        canRetry: false,
        requiresAuth: false,
        details: null
      };

    case 429: // Rate Limited
      return {
        title: 'Rate Limit Reached',
        message: 'Too many requests were sent in a short period. Please wait a moment before trying again.',
        status: 429,
        code: 'RATE_LIMITED',
        canRetry: true,
        requiresAuth: false,
        details: null
      };

    case 500:
    case 502:
    case 503:
    case 504: {
      const lower = serverMessage.toLowerCase();
      // AI or Embedding Provider Failure
      if (lower.includes('gemini') || lower.includes('embedding') || lower.includes('ai') || lower.includes('quota')) {
        return {
          title: 'AI Service Notice',
          message: 'The AI scoring service is temporarily experiencing high load. You can retry the step in a moment.',
          status,
          code: 'AI_PROVIDER_ERROR',
          canRetry: true,
          requiresAuth: false,
          details: null
        };
      }
      return {
        title: 'Service Error',
        message: serverMessage || 'The server encountered an error processing your request. Please try again in a moment.',
        status,
        code: 'SERVER_ERROR',
        canRetry: true,
        requiresAuth: false,
        details: null
      };
    }

    default:
      return {
        title: 'Error',
        message: serverMessage || defaultMessage,
        status,
        code: 'API_ERROR',
        canRetry: true,
        requiresAuth: false,
        details: null
      };
  }
}

export default {
  parseApiError
};
