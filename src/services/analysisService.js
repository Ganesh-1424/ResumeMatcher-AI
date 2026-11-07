import api from './api';

/**
 * Service for interacting with the Job Analysis API (POST /api/analyses).
 * Handles creating new analyses, fetching analysis history, and retrieving single analyses.
 */

/**
 * Create a new job analysis record linking a previously uploaded resume
 * with a target job title and job description.
 * 
 * @param {Object} payload
 * @param {string|number} payload.resumeId - ID or saved filename of the uploaded resume
 * @param {string} payload.jobTitle - Job title
 * @param {string} payload.jobDescription - Complete job description text
 * @returns {Promise<Object>} API response data with analysis record and resume details
 */
export const createJobAnalysis = async ({ resumeId, jobTitle, jobDescription }) => {
  const response = await api.post('/analyses', {
    resumeId,
    jobTitle: typeof jobTitle === 'string' ? jobTitle.trim() : jobTitle,
    jobDescription: typeof jobDescription === 'string' ? jobDescription.trim() : jobDescription,
  });
  return response.data;
};

/**
 * Fetch job analyses for the authenticated user with optional pagination, search, and sorting.
 * Calls GET /api/analyses
 * 
 * @param {Object} [params] - Query options
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=10] - Items per page
 * @param {string} [params.search=''] - Keyword to filter by job title
 * @param {string} [params.sort='desc'] - Sort direction by creation date ('desc' or 'asc')
 * @returns {Promise<Object>} API response with analyses array and pagination metadata
 */
export const getJobAnalyses = async (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page !== undefined && params.page !== null) queryParams.set('page', params.page);
  if (params.limit !== undefined && params.limit !== null) queryParams.set('limit', params.limit);
  if (params.search) queryParams.set('search', params.search);
  if (params.sort) queryParams.set('sort', params.sort);

  const queryString = queryParams.toString();
  const url = queryString ? `/analyses?${queryString}` : '/analyses';
  const response = await api.get(url);
  return response.data;
};

/**
 * Fetch dashboard statistics for the authenticated user.
 * Calls GET /api/analyses/dashboard/stats
 * 
 * @returns {Promise<Object>} Statistics payload { totalAnalyses, averageMatchScore, averageAtsScore, analysesLast30Days, recentAnalysis }
 */
export const getDashboardStatistics = async () => {
  const response = await api.get('/analyses/dashboard/stats');
  return response.data;
};

/**
 * Fetch a single job analysis by ID.
 * 
 * @param {string|number} id - Analysis ID
 * @returns {Promise<Object>} Analysis details
 */
export const getJobAnalysisById = async (id) => {
  const response = await api.get(`/analyses/${id}`);
  return response.data;
};

/**
 * Execute semantic matching using text embeddings for an analysis record.
 * Calls POST /api/analyses/:id/match
 * 
 * @param {string|number} id - Analysis ID
 * @returns {Promise<Object>} Semantic matching results including matchScore, rawSimilarity, model, and explanation
 */
export const calculateSemanticMatch = async (id) => {
  const response = await api.post(`/analyses/${id}/match`);
  return response.data;
};

/**
 * Execute skill gap analysis for an analysis record.
 * Calls POST /api/analyses/:id/skills
 * 
 * @param {string|number} id - Analysis ID
 * @returns {Promise<Object>} Skill gap results (matched, missing, additional skills, summary)
 */
export const analyzeSkillGap = async (id) => {
  const response = await api.post(`/analyses/${id}/skills`);
  return response.data;
};

/**
 * Execute ATS readiness scoring for an analysis record.
 * Calls POST /api/analyses/:id/ats-score
 * 
 * @param {string|number} id - Analysis ID
 * @returns {Promise<Object>} ATS evaluation results (atsScore, categoryBreakdown, strengths, improvements, disclaimer)
 */
export const calculateAtsScore = async (id) => {
  const response = await api.post(`/analyses/${id}/ats-score`);
  return response.data;
};

/**
 * Generate AI resume improvement suggestions for an analysis record.
 * Calls POST /api/analyses/:id/suggestions
 * 
 * @param {string|number} id - Analysis ID
 * @returns {Promise<Object>} AI suggestions (summary, suggestions list, priority, disclaimer)
 */
export const generateImprovementSuggestions = async (id) => {
  const response = await api.post(`/analyses/${id}/suggestions`);
  return response.data;
};

/**
 * Download generated PDF analysis report for an analysis record.
 * Calls GET /api/analyses/:id/report with responseType: 'blob'
 * 
 * @param {string|number} id - Analysis ID
 * @returns {Promise<Blob>} PDF Blob object
 */
export const downloadAnalysisReport = async (id) => {
  const response = await api.get(`/analyses/${id}/report`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  createJobAnalysis,
  getJobAnalyses,
  getDashboardStatistics,
  getJobAnalysisById,
  calculateSemanticMatch,
  analyzeSkillGap,
  calculateAtsScore,
  generateImprovementSuggestions,
  downloadAnalysisReport,
};
