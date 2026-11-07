import api from './api';

/**
 * Service: AI Resume Builder API Client
 * 
 * Handles resume draft persistence, PDF downloads, ATS scoring integration,
 * job matching integration, and AI writing assistance.
 */

/**
 * Save a new resume draft.
 */
export const saveResumeDraft = async (resumeData) => {
  const response = await api.post('/builder', resumeData);
  return response.data;
};

/**
 * Fetch all saved resumes for the authenticated user.
 */
export const getSavedResumes = async () => {
  const response = await api.get('/builder');
  return response.data;
};

/**
 * Get a specific resume by ID.
 */
export const getSavedResumeById = async (id) => {
  const response = await api.get(`/builder/${id}`);
  return response.data;
};

/**
 * Update an existing resume draft.
 */
export const updateResumeDraft = async (id, resumeData) => {
  const response = await api.put(`/builder/${id}`, resumeData);
  return response.data;
};

/**
 * Duplicate a resume draft.
 */
export const duplicateResumeDraft = async (id) => {
  const response = await api.post(`/builder/${id}/duplicate`);
  return response.data;
};

/**
 * Delete a saved resume.
 */
export const deleteResumeDraft = async (id) => {
  const response = await api.delete(`/builder/${id}`);
  return response.data;
};

/**
 * Download resume as PDF directly from current builder payload.
 */
export const downloadResumePdf = async (resumeData) => {
  const response = await api.post('/builder/pdf', resumeData, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Download saved resume as PDF by ID.
 */
export const downloadSavedResumePdf = async (id) => {
  const response = await api.get(`/builder/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Run ATS scoring on the builder resume using the existing ATS engine.
 */
export const checkBuilderAtsScore = async (resumeData, id = null) => {
  const response = await api.post('/builder/ats-score', {
    resumeData,
    id,
  });
  return response.data;
};

/**
 * Match builder resume against a target job description using existing skill-gap & matching logic.
 */
export const matchBuilderWithJob = async (resumeData, jobTitle, jobDescription) => {
  const response = await api.post('/builder/match', {
    resumeData,
    jobTitle,
    jobDescription,
  });
  return response.data;
};

/**
 * Request AI writing assistance for summary, experience bullet, project highlight, or polish.
 */
export const getAiWritingAssistance = async ({ type, inputText, context }) => {
  const response = await api.post('/builder/ai-assist', {
    type,
    inputText,
    context,
  });
  return response.data;
};

export default {
  saveResumeDraft,
  getSavedResumes,
  getSavedResumeById,
  updateResumeDraft,
  duplicateResumeDraft,
  deleteResumeDraft,
  downloadResumePdf,
  downloadSavedResumePdf,
  checkBuilderAtsScore,
  matchBuilderWithJob,
  getAiWritingAssistance,
};
