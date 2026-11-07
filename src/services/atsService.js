import api from './api';

/**
 * Service: Standalone ATS Resume Checker API
 * 
 * Interacts with /api/ats endpoints for standalone resume scoring,
 * history retrieval, and PDF report downloads.
 */

/**
 * Upload and evaluate a resume for standalone ATS readiness.
 * 
 * @param {File|FormData|Object} fileOrPayload - File object, FormData, or { resumeId }
 * @returns {Promise<Object>} ATS evaluation results
 */
export const checkAtsResume = async (fileOrPayload) => {
  if (fileOrPayload instanceof FormData) {
    const response = await api.post('/ats/check', fileOrPayload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  if (fileOrPayload instanceof File) {
    const formData = new FormData();
    formData.append('resume', fileOrPayload);
    const response = await api.post('/ats/check', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Otherwise assume JSON payload (e.g. { resumeId: 123 })
  const response = await api.post('/ats/check', fileOrPayload);
  return response.data;
};

/**
 * Fetch previous ATS checks history for the authenticated user.
 * 
 * @returns {Promise<Object>} History array and count
 */
export const getAtsHistory = async () => {
  const response = await api.get('/ats/history');
  return response.data;
};

/**
 * Fetch a specific ATS check by ID.
 * 
 * @param {string|number} id - Check / Analysis ID
 * @returns {Promise<Object>} Detailed check data
 */
export const getAtsCheckById = async (id) => {
  const response = await api.get(`/ats/${id}`);
  return response.data;
};

/**
 * Download generated ATS PDF analysis report.
 * 
 * @param {string|number} id - Check / Analysis ID
 * @returns {Promise<Blob>} PDF Blob object
 */
export const downloadAtsReport = async (id) => {
  const response = await api.get(`/ats/${id}/report`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  checkAtsResume,
  getAtsHistory,
  getAtsCheckById,
  downloadAtsReport,
};
