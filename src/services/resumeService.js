import api from './api';

/**
 * Upload a resume file (PDF or DOCX) to the Express.js backend.
 * Protected by JWT authentication automatically attached by Axios interceptor.
 * 
 * @param {File} file - The resume file to upload (PDF or DOCX, max 5MB).
 * @param {Object} [metadata] - Optional additional fields (e.g. jobTitle, jobDescription).
 * @param {Function} [onUploadProgress] - Optional Axios progress callback.
 * @returns {Promise<Object>} API response payload { success, message, file, analysisId }
 */
export const uploadResumeFile = async (file, metadata = {}, onUploadProgress = null) => {
  const formData = new FormData();
  formData.append('resume', file);

  if (metadata.jobTitle) {
    formData.append('jobTitle', metadata.jobTitle);
  }
  if (metadata.jobDescription) {
    formData.append('jobDescription', metadata.jobDescription);
  }

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  if (onUploadProgress && typeof onUploadProgress === 'function') {
    config.onUploadProgress = onUploadProgress;
  }

  const response = await api.post('/resumes/upload', formData, config);
  return response.data;
};

/**
 * Extract readable text from an uploaded resume via POST /api/resumes/:id/extract-text.
 * Protected by JWT authentication automatically attached by Axios interceptor.
 * 
 * @param {string|number} analysisId - The analysis ID or resume identifier.
 * @returns {Promise<Object>} API response payload { success, text, wordCount, charCount, documentType, ... }
 */
export const extractResumeText = async (analysisId) => {
  const response = await api.post(`/resumes/${analysisId}/extract-text`);
  return response.data;
};

export default {
  uploadResumeFile,
  extractResumeText,
};
