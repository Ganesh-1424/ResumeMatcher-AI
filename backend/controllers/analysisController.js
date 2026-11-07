const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { parseResume } = require('../services/resumeParser');
const { performSemanticMatch } = require('../services/matchingService');
const { analyzeSkillGap } = require('../services/skillGapService');
const { calculateAtsScore } = require('../services/atsScoreService');
const suggestionService = require('../services/suggestionService');
const { ALLOWED_CATEGORIES } = suggestionService;
const { fallbackAnalysesStore } = require('./resumeController');
const { generatePdfReportStream } = require('../services/reportService');
const { getUploadDir } = require('../config/storage');

/**
 * Controller: Job Analysis Management
 * 
 * Implements Task 23: Create the Job Analysis API (POST /api/analyses)
 * - Verifies input parameters and trims whitespace
 * - Verifies resume existence and authenticated user ownership
 * - Reuses server-side resume parser service to extract resume text
 * - Saves new analysis record to MySQL resume_analyses table
 * - Initializes scores to NULL for future AI matching stages
 */

/**
 * POST /api/analyses
 * 
 * Creates a new job analysis record:
 * 1. Validates resumeId, jobTitle, and jobDescription
 * 2. Checks resume record ownership (must belong to authenticated user)
 * 3. Resolves resume file securely on server disk (prevents path traversal)
 * 4. Extracts text using server-side resume parser
 * 5. Saves analysis to MySQL resume_analyses with match_score and ats_score as NULL
 * 6. Returns HTTP 201 Created with structured analysis details
 */
const createAnalysis = async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeId, jobTitle, jobDescription } = req.body || {};

    // ------------------------------------------------------------------------
    // 1. Input Validation
    // ------------------------------------------------------------------------

    // Require resumeId
    if (resumeId === undefined || resumeId === null || String(resumeId).trim() === '') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Resume ID (resumeId) is required.'
      });
    }

    // Require jobTitle
    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Job title (jobTitle) is required.'
      });
    }

    // Maximum length for jobTitle (matches VARCHAR(255) in MySQL schema)
    const trimmedJobTitle = jobTitle.trim();
    if (trimmedJobTitle.length > 255) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Job title must not exceed 255 characters.'
      });
    }

    // Require jobDescription
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Job description (jobDescription) is required.'
      });
    }

    // Length constraints for jobDescription (minimum 20 chars, maximum 10,000 chars)
    const trimmedJobDescription = jobDescription.trim();
    if (trimmedJobDescription.length < 20) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Job description is too brief. Please provide at least 20 characters of job details.'
      });
    }

    if (trimmedJobDescription.length > 10000) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Job description is too long. Maximum allowed length is 10,000 characters.'
      });
    }

    // ------------------------------------------------------------------------
    // 2. Resume Lookup & Ownership Verification
    // ------------------------------------------------------------------------
    const rawResumeId = String(resumeId).trim();
    const numericResumeId = parseInt(rawResumeId, 10);
    let resumeRecord = null;

    // A. Check MySQL database first if numeric ID
    if (!isNaN(numericResumeId)) {
      try {
        const [rows] = await pool.execute(
          'SELECT id, user_id, resume_filename, job_title, created_at FROM resume_analyses WHERE id = ? LIMIT 1',
          [numericResumeId]
        );
        if (rows && rows.length > 0) {
          resumeRecord = rows[0];
        }
      } catch (dbErr) {
        console.warn('[createAnalysis DB Notice]: MySQL query by ID failed:', dbErr.message);
      }
    }

    // B. Check in-memory fallback store if not found in database
    if (!resumeRecord && !isNaN(numericResumeId) && fallbackAnalysesStore.has(numericResumeId)) {
      resumeRecord = fallbackAnalysesStore.get(numericResumeId);
    }

    // C. Check if resumeId corresponds to the saved filename (e.g. resume-1741...pdf)
    if (!resumeRecord) {
      try {
        const [rows] = await pool.execute(
          'SELECT id, user_id, resume_filename, job_title, created_at FROM resume_analyses WHERE resume_filename = ? LIMIT 1',
          [rawResumeId]
        );
        if (rows && rows.length > 0) {
          resumeRecord = rows[0];
        }
      } catch (_) {}

      if (!resumeRecord) {
        for (const item of fallbackAnalysesStore.values()) {
          if (item.resume_filename === rawResumeId) {
            resumeRecord = item;
            break;
          }
        }
      }
    }

    // If resume record is still not found, reject with 404
    if (!resumeRecord) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Resume record not found with ID: ${rawResumeId}`
      });
    }

    // Verify ownership: resume must belong to the authenticated user
    if (Number(resumeRecord.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to analyze this resume.'
      });
    }

    // ------------------------------------------------------------------------
    // 3. Secure File Resolution & Server-Side Text Extraction
    // ------------------------------------------------------------------------
    const uploadDir = getUploadDir();
    const safeFilename = path.basename(resumeRecord.resume_filename);
    const resolvedFilePath = path.join(uploadDir, safeFilename);

    // Guard against path traversal
    if (!resolvedFilePath.startsWith(uploadDir)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid resume file reference.'
      });
    }

    // Verify file exists on server disk
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The uploaded resume file was not found on the server disk.'
      });
    }

    // Re-use existing resumeParser service to extract resume text on the server
    let extractionResult;
    try {
      extractionResult = await parseResume(resolvedFilePath);
    } catch (parseErr) {
      console.error('[createAnalysis Text Extraction Error]:', parseErr.message);
      return res.status(parseErr.statusCode || 400).json({
        error: 'Extraction Error',
        message: parseErr.message || 'Unable to extract text from the specified resume.'
      });
    }

    // ------------------------------------------------------------------------
    // 4. Create Analysis Record in MySQL
    // ------------------------------------------------------------------------
    let analysisId = null;

    try {
      const [insertResult] = await pool.execute(
        `INSERT INTO resume_analyses 
           (user_id, job_title, job_description, resume_filename, match_score, ats_score, created_at)
         VALUES (?, ?, ?, ?, NULL, NULL, NOW())`,
        [
          userId,
          trimmedJobTitle,
          trimmedJobDescription,
          safeFilename
        ]
      );

      if (insertResult && insertResult.insertId) {
        analysisId = insertResult.insertId;
      }
    } catch (dbErr) {
      console.warn('[createAnalysis DB Notice]: Could not insert into MySQL:', dbErr.message);
    }

    // Fallback store handling for offline development testing
    if (!analysisId) {
      const fallbackId = Date.now();
      analysisId = fallbackId;
    }

    const newRecord = {
      id: Number(analysisId),
      user_id: Number(userId),
      job_title: trimmedJobTitle,
      job_description: trimmedJobDescription,
      resume_filename: safeFilename,
      original_filename: resumeRecord.original_filename || safeFilename,
      match_score: null,
      ats_score: null,
      created_at: new Date()
    };

    fallbackAnalysesStore.set(Number(analysisId), newRecord);

    // ------------------------------------------------------------------------
    // 5. Return HTTP 201 Created Response
    // ------------------------------------------------------------------------
    return res.status(201).json({
      success: true,
      message: 'Job analysis created successfully',
      analysis: {
        id: Number(analysisId),
        userId: Number(userId),
        jobTitle: trimmedJobTitle,
        jobDescription: trimmedJobDescription,
        resumeFilename: safeFilename,
        originalFilename: resumeRecord.original_filename || safeFilename,
        matchScore: null,
        atsScore: null,
        createdAt: newRecord.created_at.toISOString ? newRecord.created_at.toISOString() : newRecord.created_at
      },
      resumeDetails: {
        documentType: extractionResult.documentType,
        wordCount: extractionResult.wordCount,
        charCount: extractionResult.charCount,
        isTruncated: extractionResult.isTruncated
      }
    });

  } catch (error) {
    console.error('[createAnalysis Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while creating the job analysis.'
    });
  }
};

/**
 * GET /api/analyses
 * 
 * Implements Task 29: Analysis History API with pagination, search, and sorting.
 * - Requires JWT authentication (userId from token)
 * - Returns only analyses belonging to the authenticated user
 * - Retrieves records from MySQL with parameterized queries
 * - Supports pagination: ?page=1&limit=10 (defaults: page=1, limit=10, max limit=50)
 * - Supports search: ?search=keyword (case-insensitive substring match on job_title)
 * - Supports sorting: ?sort=desc|asc (by created_at, default desc)
 */
const getAnalyses = async (req, res) => {
  try {
    const userId = req.userId;
    const { page, limit, search, sort } = req.query;

    // 1. Validate & normalize pagination parameters
    let pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) pageNum = 1;

    let limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1) limitNum = 10;
    if (limitNum > 50) limitNum = 50;

    const offset = (pageNum - 1) * limitNum;

    // 2. Normalize sorting (allowed: 'asc', 'desc')
    const sortDir = (typeof sort === 'string' && sort.toLowerCase() === 'asc') ? 'ASC' : 'DESC';

    // 3. Normalize search query (trim)
    const searchQuery = typeof search === 'string' ? search.trim() : '';

    let analyses = [];
    let totalCount = 0;
    let dbSuccess = false;

    try {
      // A. Count query for pagination metadata
      let countSql = `SELECT COUNT(*) AS total FROM resume_analyses WHERE user_id = ?`;
      const countParams = [userId];

      if (searchQuery) {
        countSql += ` AND LOWER(job_title) LIKE ?`;
        countParams.push(`%${searchQuery.toLowerCase()}%`);
      }

      const [countRows] = await pool.execute(countSql, countParams);
      if (countRows && countRows.length > 0) {
        totalCount = Number(countRows[0].total) || 0;
      }

      // B. Paginated records query
      let querySql = `
        SELECT id, user_id, job_title, resume_filename, match_score, ats_score, created_at, updated_at 
        FROM resume_analyses 
        WHERE user_id = ?
      `;
      const queryParams = [userId];

      if (searchQuery) {
        querySql += ` AND LOWER(job_title) LIKE ?`;
        queryParams.push(`%${searchQuery.toLowerCase()}%`);
      }

      querySql += ` ORDER BY created_at ${sortDir} LIMIT ${limitNum} OFFSET ${offset}`;

      const [rows] = await pool.execute(querySql, queryParams);
      if (rows) {
        analyses = rows.map((r) => ({
          id: r.id,
          jobTitle: r.job_title || 'Untitled Role',
          resumeFilename: r.resume_filename,
          matchScore: r.match_score !== null && r.match_score !== undefined ? Number(r.match_score) : null,
          atsScore: r.ats_score !== null && r.ats_score !== undefined ? Number(r.ats_score) : null,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
        dbSuccess = true;
      }
    } catch (dbErr) {
      console.warn('[getAnalyses DB Notice]: MySQL query failed:', dbErr.message);
    }

    // Fallback store synchronization when MySQL is offline or during test runs
    if (!dbSuccess || (analyses.length === 0 && totalCount === 0)) {
      let filtered = [];
      for (const item of fallbackAnalysesStore.values()) {
        if (Number(item.user_id) === Number(userId)) {
          if (!searchQuery || (item.job_title && item.job_title.toLowerCase().includes(searchQuery.toLowerCase()))) {
            filtered.push(item);
          }
        }
      }

      filtered.sort((a, b) => {
        const timeA = new Date(a.created_at || 0).getTime();
        const timeB = new Date(b.created_at || 0).getTime();
        return sortDir === 'ASC' ? timeA - timeB : timeB - timeA;
      });

      totalCount = filtered.length;
      const sliced = filtered.slice(offset, offset + limitNum);
      analyses = sliced.map((item) => ({
        id: item.id,
        jobTitle: item.job_title || 'Untitled Role',
        resumeFilename: item.resume_filename,
        matchScore: item.match_score !== null && item.match_score !== undefined ? Number(item.match_score) : null,
        atsScore: item.ats_score !== null && item.ats_score !== undefined ? Number(item.ats_score) : null,
        createdAt: item.created_at,
        updatedAt: item.updated_at || item.created_at
      }));
    }

    const totalPages = Math.ceil(totalCount / limitNum) || (totalCount === 0 ? 0 : 1);

    return res.status(200).json({
      success: true,
      analyses,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error('[getAnalyses Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve analyses.'
    });
  }
};

/**
 * GET /api/analyses/dashboard/stats
 * 
 * Implements Task 29: Dashboard Statistics API.
 * Calculates summary metrics using the authenticated user's records:
 * - totalAnalyses: Count of all analyses completed by user
 * - averageMatchScore: Average match score across records with completed match scores
 * - averageAtsScore: Average ATS score across records with completed ATS scores
 * - analysesLast30Days: Count of analyses created in the last 30 days
 * - recentAnalysis: Most recent analysis record (or null if none)
 */
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.userId;
    let totalAnalyses = 0;
    let averageMatchScore = null;
    let averageAtsScore = null;
    let analysesLast30Days = 0;
    let recentAnalysis = null;
    let dbSuccess = false;

    try {
      // 1. Aggregates query using parameterized query
      const [aggRows] = await pool.execute(
        `SELECT 
           COUNT(*) AS total_analyses,
           AVG(match_score) AS avg_match_score,
           AVG(ats_score) AS avg_ats_score,
           SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS analyses_30_days
         FROM resume_analyses 
         WHERE user_id = ?`,
        [userId]
      );

      if (aggRows && aggRows.length > 0) {
        const row = aggRows[0];
        totalAnalyses = Number(row.total_analyses) || 0;
        averageMatchScore = row.avg_match_score !== null && row.avg_match_score !== undefined
          ? Math.round(Number(row.avg_match_score))
          : null;
        averageAtsScore = row.avg_ats_score !== null && row.avg_ats_score !== undefined
          ? Math.round(Number(row.avg_ats_score))
          : null;
        analysesLast30Days = Number(row.analyses_30_days) || 0;
      }

      // 2. Most recent analysis query
      const [recentRows] = await pool.execute(
        `SELECT id, user_id, job_title, resume_filename, match_score, ats_score, created_at 
         FROM resume_analyses 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (recentRows && recentRows.length > 0) {
        const r = recentRows[0];
        recentAnalysis = {
          id: r.id,
          jobTitle: r.job_title || 'Untitled Role',
          resumeFilename: r.resume_filename,
          matchScore: r.match_score !== null && r.match_score !== undefined ? Number(r.match_score) : null,
          atsScore: r.ats_score !== null && r.ats_score !== undefined ? Number(r.ats_score) : null,
          createdAt: r.created_at
        };
      }

      dbSuccess = true;
    } catch (dbErr) {
      console.warn('[getDashboardStats DB Notice]: MySQL query failed:', dbErr.message);
    }

    // Fallback calculation if MySQL had none or is offline
    if (!dbSuccess || (totalAnalyses === 0 && fallbackAnalysesStore.size > 0)) {
      const userRecords = [];
      for (const item of fallbackAnalysesStore.values()) {
        if (Number(item.user_id) === Number(userId)) {
          userRecords.push(item);
        }
      }

      userRecords.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      totalAnalyses = userRecords.length;

      const recordsWithMatch = userRecords.filter((r) => r.match_score !== null && r.match_score !== undefined);
      averageMatchScore = recordsWithMatch.length > 0
        ? Math.round(recordsWithMatch.reduce((sum, r) => sum + Number(r.match_score), 0) / recordsWithMatch.length)
        : null;

      const recordsWithAts = userRecords.filter((r) => r.ats_score !== null && r.ats_score !== undefined);
      averageAtsScore = recordsWithAts.length > 0
        ? Math.round(recordsWithAts.reduce((sum, r) => sum + Number(r.ats_score), 0) / recordsWithAts.length)
        : null;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      analysesLast30Days = userRecords.filter((r) => new Date(r.created_at || 0) >= thirtyDaysAgo).length;

      if (userRecords.length > 0) {
        const first = userRecords[0];
        recentAnalysis = {
          id: first.id,
          jobTitle: first.job_title || 'Untitled Role',
          resumeFilename: first.resume_filename,
          matchScore: first.match_score !== null && first.match_score !== undefined ? Number(first.match_score) : null,
          atsScore: first.ats_score !== null && first.ats_score !== undefined ? Number(first.ats_score) : null,
          createdAt: first.created_at
        };
      } else {
        recentAnalysis = null;
      }
    }

    return res.status(200).json({
      success: true,
      totalAnalyses,
      averageMatchScore,
      averageAtsScore,
      analysesLast30Days,
      recentAnalysis,
      stats: {
        totalAnalyses,
        averageMatchScore,
        averageAtsScore,
        analysesLast30Days,
        recentAnalysis
      }
    });

  } catch (error) {
    console.error('[getDashboardStats Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard statistics.'
    });
  }
};

/**
 * GET /api/analyses/:id
 * 
 * Implements Task 29: Analysis Details API.
 * - Requires JWT authentication
 * - Returns the complete saved analysis
 * - Verifies ownership on every request; returns 404 if record does not exist or does not belong to user
 * - Never returns passwords, hashes, JWT secrets, or filesystem paths
 */
const getAnalysisById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid analysis ID. A positive integer is required.'
      });
    }

    let record = null;

    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, match_score, ats_score, matched_skills, missing_skills, additional_skills, ats_breakdown, improvement_suggestions, created_at, updated_at 
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) {
        record = rows[0];
      }
    } catch (dbErr) {
      console.warn('[getAnalysisById DB Notice]:', dbErr.message);
    }

    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    // Ownership verification: return 404 when record does not exist OR does not belong to the user
    if (!record || Number(record.user_id) !== Number(userId)) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Analysis record not found with ID: ${numericId}`
      });
    }

    // Safely parse JSON fields if stored as JSON strings
    let matchedSkills = [];
    let missingSkills = [];
    let additionalSkills = [];
    let atsBreakdown = [];
    let improvementSuggestions = [];

    try {
      matchedSkills = typeof record.matched_skills === 'string'
        ? JSON.parse(record.matched_skills)
        : (record.matched_skills || []);
    } catch (_) { matchedSkills = record.matched_skills || []; }

    try {
      missingSkills = typeof record.missing_skills === 'string'
        ? JSON.parse(record.missing_skills)
        : (record.missing_skills || []);
    } catch (_) { missingSkills = record.missing_skills || []; }

    try {
      additionalSkills = typeof record.additional_skills === 'string'
        ? JSON.parse(record.additional_skills)
        : (record.additional_skills || []);
    } catch (_) { additionalSkills = record.additional_skills || []; }

    try {
      atsBreakdown = typeof record.ats_breakdown === 'string'
        ? JSON.parse(record.ats_breakdown)
        : (record.ats_breakdown || []);
    } catch (_) { atsBreakdown = record.ats_breakdown || []; }

    try {
      improvementSuggestions = typeof record.improvement_suggestions === 'string'
        ? JSON.parse(record.improvement_suggestions)
        : (record.improvement_suggestions || []);
    } catch (_) { improvementSuggestions = record.improvement_suggestions || []; }

    return res.status(200).json({
      success: true,
      analysis: {
        id: record.id,
        userId: record.user_id,
        user_id: record.user_id,
        jobTitle: record.job_title || 'Untitled Role',
        job_title: record.job_title || 'Untitled Role',
        jobDescription: record.job_description,
        job_description: record.job_description,
        resumeFilename: record.resume_filename,
        resume_filename: record.resume_filename,
        originalFilename: record.original_filename || record.resume_filename,
        original_filename: record.original_filename || record.resume_filename,
        matchScore: record.match_score !== null && record.match_score !== undefined ? Number(record.match_score) : null,
        match_score: record.match_score !== null && record.match_score !== undefined ? Number(record.match_score) : null,
        atsScore: record.ats_score !== null && record.ats_score !== undefined ? Number(record.ats_score) : null,
        ats_score: record.ats_score !== null && record.ats_score !== undefined ? Number(record.ats_score) : null,
        matchedSkills,
        matched_skills: matchedSkills,
        missingSkills,
        missing_skills: missingSkills,
        additionalSkills,
        additional_skills: additionalSkills,
        atsBreakdown,
        ats_breakdown: atsBreakdown,
        improvementSuggestions,
        improvement_suggestions: improvementSuggestions,
        createdAt: record.created_at,
        created_at: record.created_at,
        updatedAt: record.updated_at || record.created_at,
        updated_at: record.updated_at || record.created_at
      }
    });

  } catch (error) {
    console.error('[getAnalysisById Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve analysis details.'
    });
  }
};

/**
 * GET /api/analyses/:id/report
 * 
 * Implements Task 30: Downloadable PDF Analysis Reports.
 * - Requires JWT authentication
 * - Verifies ownership on every request (404 if record missing or belongs to another user)
 * - Retrieves saved analysis results from MySQL (or store)
 * - Generates professional multi-page PDF using PDFKit
 * - Returns PDF stream with Content-Type: application/pdf and Content-Disposition: attachment; filename="analysis-report-${id}.pdf"
 * - Does not expose internal file paths, keys, or passwords
 */
const generateAnalysisReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid analysis ID. A positive integer is required.'
      });
    }

    let record = null;

    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, match_score, ats_score, matched_skills, missing_skills, additional_skills, ats_breakdown, improvement_suggestions, created_at, updated_at 
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) {
        record = rows[0];
      }
    } catch (dbErr) {
      console.warn('[generateAnalysisReport DB Notice]:', dbErr.message);
    }

    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    // Ownership verification: return 404 when record does not exist OR does not belong to the user
    if (!record || Number(record.user_id) !== Number(userId)) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Analysis record not found with ID: ${numericId}`
      });
    }

    // Sanitize filename to prevent header injection or directory traversal
    const safeFilename = `analysis-report-${numericId}.pdf`;

    // Set download headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    // Stream PDF directly to client response
    await generatePdfReportStream(record, res);

  } catch (error) {
    console.error('[generateAnalysisReport Controller Error]:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate PDF analysis report.'
      });
    }
  }
};

/**
 * POST /api/analyses/:id/match
 * 
 * Implements Task 24: Semantic Resume-Job Matching Using Embeddings
 * 1. Requires valid JWT (userId from token)
 * 2. Verifies analysis existence and ownership
 * 3. Securely resolves associated uploaded resume file and extracts text
 * 4. Generates text embeddings and computes Cosine Similarity
 * 5. Converts cosine similarity into a calibrated 0-100 match score
 * 6. Updates MySQL record with match_score (preserving ATS scores & other fields)
 * 7. Returns detailed JSON response with score, raw similarity, model, and metadata
 */
const matchAnalysis = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    // 1. Validate ID parameter
    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid analysis ID. A positive integer is required.'
      });
    }

    // 2. Fetch analysis record
    let record = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, match_score, ats_score, matched_skills, missing_skills, created_at
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) {
        record = rows[0];
      }
    } catch (dbErr) {
      console.warn('[matchAnalysis DB Notice]: MySQL query failed:', dbErr.message);
    }

    // Fallback store lookup if not found in database
    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    // 3. Check existence
    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Analysis record not found with ID: ${numericId}`
      });
    }

    // 4. Verify ownership
    if (Number(record.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to match this analysis.'
      });
    }

    // 5. Verify job description presence
    const jobDescription = record.job_description;
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Associated analysis record has no valid job description for matching.'
      });
    }

    // 6. Securely resolve resume file on disk
    const uploadDir = getUploadDir();
    const safeFilename = path.basename(record.resume_filename);
    const resolvedFilePath = path.join(uploadDir, safeFilename);

    // Guard against directory traversal
    if (!resolvedFilePath.startsWith(uploadDir)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid resume file reference in analysis record.'
      });
    }

    // Verify file exists on server disk
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The associated resume document file was not found on the server.'
      });
    }

    // 7. Extract resume text safely using resumeParser
    let extractionResult;
    try {
      extractionResult = await parseResume(resolvedFilePath);
    } catch (parseErr) {
      console.error('[matchAnalysis Resume Parser Error]:', parseErr.message);
      return res.status(parseErr.statusCode || 400).json({
        error: 'Extraction Error',
        message: parseErr.message || 'Unable to extract text from the resume document for semantic matching.'
      });
    }

    // 8. Execute Semantic Matching Pipeline using Embeddings & Cosine Similarity
    let matchResult;
    try {
      matchResult = await performSemanticMatch(extractionResult.text, jobDescription);
    } catch (matchErr) {
      console.error('[matchAnalysis Semantic Matching Error]:', matchErr.message);
      return res.status(matchErr.statusCode || 500).json({
        error: 'Semantic Matching Error',
        message: matchErr.message || 'Failed to generate embeddings and calculate semantic match score.'
      });
    }

    // 9. Update MySQL record with the calculated match_score
    // CRITICAL: Parameterized query that updates ONLY match_score without overwriting ATS scores or skill data
    try {
      await pool.execute(
        'UPDATE resume_analyses SET match_score = ? WHERE id = ? AND user_id = ?',
        [matchResult.matchScore, numericId, userId]
      );
    } catch (updateErr) {
      console.warn('[matchAnalysis DB Notice]: MySQL update query failed:', updateErr.message);
    }

    // Also update in-memory fallback store if used
    if (fallbackAnalysesStore.has(numericId)) {
      const storedItem = fallbackAnalysesStore.get(numericId);
      storedItem.match_score = matchResult.matchScore;
      storedItem.updated_at = new Date();
      fallbackAnalysesStore.set(numericId, storedItem);
    }

    // 10. Return HTTP 200 with structured JSON response
    return res.status(200).json({
      success: true,
      message: 'Semantic matching completed successfully.',
      analysisId: numericId,
      jobTitle: record.job_title || 'Untitled Role',
      matchScore: matchResult.matchScore,
      rawSimilarity: matchResult.rawSimilarity,
      matchQuality: matchResult.matchQuality,
      explanation: matchResult.explanation,
      embeddingModel: matchResult.model,
      embeddingDimension: matchResult.dimension,
      isFallback: matchResult.isFallback,
      disclaimer: matchResult.disclaimer,
      resumeDetails: {
        filename: safeFilename,
        documentType: extractionResult.documentType,
        wordCount: extractionResult.wordCount,
        charCount: extractionResult.charCount
      },
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[matchAnalysis Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during semantic matching.'
    });
  }
};

/**
 * POST /api/analyses/:id/skills
 * 
 * Implements Task 25: Resume Skill Gap Analysis API
 * 1. Requires valid JWT (userId extracted from token by auth middleware)
 * 2. Validates :id parameter (positive integer)
 * 3. Fetches analysis record and verifies ownership (403 if unauthorized)
 * 4. Resolves resume file securely on server disk (path traversal protection)
 * 5. Extracts resume text via reusable resumeParser service
 * 6. Executes skill gap analysis (identifies Matched, Missing, and Additional skills)
 * 7. Stores skills in MySQL resume_analyses table (parameterized query)
 *    - Updates matched_skills, missing_skills, and additional_skills
 *    - Preserves match_score, ats_score, and other columns
 * 8. Updates fallback store if applicable
 * 9. Returns structured response with summary, categorized lists, and clear disclaimer
 */
const analyzeSkills = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    // 1. Validate ID parameter
    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid analysis ID. A positive integer is required.'
      });
    }

    // 2. Fetch analysis record
    let record = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, match_score, ats_score, matched_skills, missing_skills, created_at
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) {
        record = rows[0];
      }
    } catch (dbErr) {
      console.warn('[analyzeSkills DB Notice]: MySQL query failed:', dbErr.message);
    }

    // Fallback store lookup if not found in database
    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    // 3. Check existence
    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Analysis record not found with ID: ${numericId}`
      });
    }

    // 4. Verify ownership
    if (Number(record.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to run skill analysis on this record.'
      });
    }

    // 5. Verify job description presence
    const jobDescription = record.job_description;
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Associated analysis record has no valid job description for skill gap analysis.'
      });
    }

    // 6. Securely resolve resume file on disk
    const uploadDir = getUploadDir();
    const safeFilename = path.basename(record.resume_filename);
    const resolvedFilePath = path.join(uploadDir, safeFilename);

    // Guard against directory traversal
    if (!resolvedFilePath.startsWith(uploadDir)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid resume file reference in analysis record.'
      });
    }

    // Verify file exists on server disk
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The associated resume document file was not found on the server.'
      });
    }

    // 7. Extract resume text safely using resumeParser
    let extractionResult;
    try {
      extractionResult = await parseResume(resolvedFilePath);
    } catch (parseErr) {
      console.error('[analyzeSkills Resume Parser Error]:', parseErr.message);
      return res.status(parseErr.statusCode || 400).json({
        error: 'Extraction Error',
        message: parseErr.message || 'Unable to extract text from the resume document for skill gap analysis.'
      });
    }

    // 8. Execute Skill Gap Analysis
    const skillGapResult = analyzeSkillGap(extractionResult.text, jobDescription);

    // 9. Update MySQL record with skills data
    // Parameterized query: saves JSON representations, preserves existing scores
    const matchedJson = JSON.stringify(skillGapResult.skillNames.matched);
    const missingJson = JSON.stringify(skillGapResult.skillNames.missing);
    const additionalJson = JSON.stringify(skillGapResult.skillNames.additional);

    try {
      // First attempt update including additional_skills column
      await pool.execute(
        `UPDATE resume_analyses 
         SET matched_skills = ?, missing_skills = ?, additional_skills = ? 
         WHERE id = ? AND user_id = ?`,
        [matchedJson, missingJson, additionalJson, numericId, userId]
      );
    } catch (updateErr) {
      // Fallback if additional_skills column was not yet migrated in an external DB
      console.warn('[analyzeSkills DB Notice]: Extended update failed, retrying with core columns:', updateErr.message);
      try {
        await pool.execute(
          `UPDATE resume_analyses 
           SET matched_skills = ?, missing_skills = ? 
           WHERE id = ? AND user_id = ?`,
          [matchedJson, missingJson, numericId, userId]
        );
      } catch (coreErr) {
        console.warn('[analyzeSkills DB Notice]: Core update query failed:', coreErr.message);
      }
    }

    // Also update in-memory fallback store if used
    if (fallbackAnalysesStore.has(numericId)) {
      const storedItem = fallbackAnalysesStore.get(numericId);
      storedItem.matched_skills = skillGapResult.skillNames.matched;
      storedItem.missing_skills = skillGapResult.skillNames.missing;
      storedItem.additional_skills = skillGapResult.skillNames.additional;
      storedItem.updated_at = new Date();
      fallbackAnalysesStore.set(numericId, storedItem);
    }

    // 10. Return HTTP 200 with structured JSON response
    return res.status(200).json({
      success: true,
      message: 'Skill gap analysis completed successfully.',
      analysisId: numericId,
      jobTitle: record.job_title || 'Untitled Role',
      summary: skillGapResult.summary,
      skills: skillGapResult.skills,
      skillNames: skillGapResult.skillNames,
      categorized: skillGapResult.categorized,
      disclaimer: skillGapResult.disclaimer,
      resumeDetails: {
        filename: safeFilename,
        documentType: extractionResult.documentType
      },
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[analyzeSkills Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during skill gap analysis.'
    });
  }
};

/**
 * POST /api/analyses/:id/ats-score
 * 
 * Implements Task 26: Implement ATS Readiness Scoring API
 * 1. Requires valid JWT (userId extracted from token by auth middleware)
 * 2. Validates :id parameter (positive integer)
 * 3. Fetches analysis record and verifies ownership (403 if unauthorized)
 * 4. Resolves resume file securely on server disk (path traversal protection)
 * 5. Extracts resume text via reusable resumeParser service
 * 6. Executes ATS readiness evaluation across 8 key structural categories (0-100 pts)
 * 7. Stores ats_score and ats_breakdown in MySQL resume_analyses table (parameterized query)
 *    - Preserves match_score, matched_skills, missing_skills, additional_skills, suggestions
 * 8. Updates fallback store if applicable
 * 9. Returns structured response with score, breakdown, strengths, improvements, and disclaimer
 */
const scoreAts = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    // 1. Validate ID parameter
    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid analysis ID. A positive integer is required.'
      });
    }

    // 2. Fetch analysis record
    let record = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, match_score, ats_score, matched_skills, missing_skills, additional_skills, created_at
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) {
        record = rows[0];
      }
    } catch (dbErr) {
      console.warn('[scoreAts DB Notice]: MySQL query failed:', dbErr.message);
    }

    // Fallback store lookup if not found in database
    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    // 3. Check existence
    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Analysis record not found with ID: ${numericId}`
      });
    }

    // 4. Verify ownership
    if (Number(record.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to evaluate ATS readiness on this record.'
      });
    }

    // 5. Securely resolve resume file on disk
    const uploadDir = getUploadDir();
    const safeFilename = path.basename(record.resume_filename);
    const resolvedFilePath = path.join(uploadDir, safeFilename);

    // Guard against directory traversal
    if (!resolvedFilePath.startsWith(uploadDir)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid resume file reference in analysis record.'
      });
    }

    // Verify file exists on server disk
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The associated resume document file was not found on the server.'
      });
    }

    // 6. Extract resume text safely using resumeParser
    let extractionResult;
    try {
      extractionResult = await parseResume(resolvedFilePath);
    } catch (parseErr) {
      console.error('[scoreAts Resume Parser Error]:', parseErr.message);
      return res.status(parseErr.statusCode || 400).json({
        error: 'Extraction Error',
        message: parseErr.message || 'Unable to extract text from the resume document for ATS scoring.'
      });
    }

    // 7. Calculate ATS Readiness Score using atsScoreService (Task 40)
    const atsResult = calculateAtsScore(extractionResult.text, record.job_description);

    // 8. Update MySQL record with ATS score and category breakdown
    // Parameterized query: preserves match_score, skill gap results, and suggestions
    const breakdownJson = JSON.stringify(atsResult.categoryBreakdown);

    try {
      await pool.execute(
        `UPDATE resume_analyses 
         SET ats_score = ?, ats_breakdown = ? 
         WHERE id = ? AND user_id = ?`,
        [atsResult.atsScore, breakdownJson, numericId, userId]
      );
    } catch (updateErr) {
      console.warn('[scoreAts DB Notice]: MySQL update query failed:', updateErr.message);
    }

    // Also update in-memory fallback store if used
    if (fallbackAnalysesStore.has(numericId)) {
      const storedItem = fallbackAnalysesStore.get(numericId);
      storedItem.ats_score = atsResult.atsScore;
      storedItem.ats_breakdown = atsResult.categoryBreakdown;
      storedItem.updated_at = new Date();
      fallbackAnalysesStore.set(numericId, storedItem);
    }

    // 9. Return HTTP 200 with structured JSON response
    return res.status(200).json({
      success: true,
      message: 'ATS readiness scoring completed successfully.',
      analysisId: numericId,
      jobTitle: record.job_title || 'Untitled Role',
      atsScore: atsResult.atsScore,
      tier: atsResult.tier,
      categoryBreakdown: atsResult.categoryBreakdown,
      strengths: atsResult.strengths,
      improvements: atsResult.improvements,
      warnings: atsResult.warnings || [],
      detectedSections: atsResult.detectedSections || [],
      missingSections: atsResult.missingSections || [],
      documentStats: atsResult.documentStats,
      standaloneMode: atsResult.standaloneMode,
      disclaimer: atsResult.disclaimer,
      resumeDetails: {
        filename: safeFilename,
        documentType: extractionResult.documentType,
        wordCount: extractionResult.wordCount,
        charCount: extractionResult.charCount
      },
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[scoreAts Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during ATS readiness scoring.'
    });
  }
};

/**
 * POST /api/analyses/:id/suggestions
 * 
 * Implements Task 27: Implement AI Resume Improvement Suggestions API
 * 1. Requires valid JWT (userId extracted from token by auth middleware)
 * 2. Validates :id parameter (positive integer)
 * 3. Fetches analysis record and verifies ownership (403 if unauthorized)
 * 4. Checks that prerequisite analysis steps are completed (match score, skill gap, ATS score)
 * 5. Resolves resume file securely on server disk (path traversal protection)
 * 6. Extracts resume text via reusable resumeParser service
 * 7. Calls AI suggestions service (gemini-3.8-flash) with full context
 * 8. Validates structured JSON suggestions across the 6 core categories
 * 9. Stores suggestions in MySQL resume_analyses table (parameterized query)
 *    - Preserves match_score, skill gap results, and ATS results
 * 10. Updates fallback store if applicable
 * 11. Returns structured response with summary, prioritized suggestions, and disclaimer
 */
const generateSuggestions = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    // 1. Validate ID parameter
    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid analysis ID. A positive integer is required.'
      });
    }

    // 2. Fetch analysis record
    let record = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, match_score, ats_score, matched_skills, missing_skills, additional_skills, ats_breakdown, improvement_suggestions, created_at
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) {
        record = rows[0];
      }
    } catch (dbErr) {
      console.warn('[generateSuggestions DB Notice]: MySQL query failed:', dbErr.message);
    }

    // Fallback store lookup if not found in database
    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    // 3. Check existence
    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Analysis record not found with ID: ${numericId}`
      });
    }

    // 4. Verify ownership
    if (Number(record.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to generate suggestions for this analysis.'
      });
    }

    // 5. Verify prerequisite analysis completion
    // Semantic match, Skill gap, and ATS scoring must all be completed first
    const hasMatchScore = record.match_score !== null && record.match_score !== undefined;
    const hasSkills = !!(record.matched_skills && record.missing_skills);
    const hasAtsScore = record.ats_score !== null && record.ats_score !== undefined;

    if (!hasMatchScore || !hasSkills || !hasAtsScore) {
      return res.status(400).json({
        error: 'Prerequisites Missing',
        message: 'Prerequisite analysis steps are missing. Please complete Semantic Matching, Skill Gap Analysis, and ATS Scoring before generating AI improvement suggestions.',
        prerequisites: {
          semanticMatchCompleted: hasMatchScore,
          skillGapCompleted: hasSkills,
          atsScoreCompleted: hasAtsScore
        }
      });
    }

    // Parse JSON fields safely if stored as JSON strings
    let matchedSkills = [];
    let missingSkills = [];
    let atsBreakdown = [];

    try {
      matchedSkills = typeof record.matched_skills === 'string'
        ? JSON.parse(record.matched_skills)
        : (record.matched_skills || []);
    } catch (_) {
      matchedSkills = record.matched_skills || [];
    }

    try {
      missingSkills = typeof record.missing_skills === 'string'
        ? JSON.parse(record.missing_skills)
        : (record.missing_skills || []);
    } catch (_) {
      missingSkills = record.missing_skills || [];
    }

    try {
      atsBreakdown = typeof record.ats_breakdown === 'string'
        ? JSON.parse(record.ats_breakdown)
        : (record.ats_breakdown || []);
    } catch (_) {
      atsBreakdown = record.ats_breakdown || [];
    }

    // 6. Securely resolve resume file on disk
    const uploadDir = getUploadDir();
    const safeFilename = path.basename(record.resume_filename);
    const resolvedFilePath = path.join(uploadDir, safeFilename);

    // Guard against directory traversal
    if (!resolvedFilePath.startsWith(uploadDir)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid resume file reference in analysis record.'
      });
    }

    // Verify file exists on server disk
    if (!fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The associated resume document file was not found on the server.'
      });
    }

    // 7. Extract resume text safely using resumeParser
    let extractionResult;
    try {
      extractionResult = await parseResume(resolvedFilePath);
    } catch (parseErr) {
      console.error('[generateSuggestions Resume Parser Error]:', parseErr.message);
      return res.status(parseErr.statusCode || 400).json({
        error: 'Extraction Error',
        message: parseErr.message || 'Unable to extract text from the resume document for AI suggestions.'
      });
    }

    // 8. Generate AI suggestions using suggestionService
    let aiResult;
    try {
      aiResult = await suggestionService.generateAiSuggestions({
        resumeText: extractionResult.text,
        jobTitle: record.job_title || 'Target Role',
        jobDescription: record.job_description,
        matchScore: record.match_score,
        matchedSkills,
        missingSkills,
        atsScore: record.ats_score,
        atsBreakdown
      });
    } catch (aiErr) {
      console.error('[generateSuggestions AI Error]:', aiErr.message);
      return res.status(aiErr.statusCode || 500).json({
        error: aiErr.code || 'AI Service Error',
        message: aiErr.message || 'Failed to generate AI resume improvement suggestions.'
      });
    }

    // 9. Update MySQL record with improvement_suggestions
    // Parameterized query: preserves all other analysis scores and skills
    const suggestionsJson = JSON.stringify(aiResult.suggestions);

    try {
      await pool.execute(
        `UPDATE resume_analyses 
         SET improvement_suggestions = ? 
         WHERE id = ? AND user_id = ?`,
        [suggestionsJson, numericId, userId]
      );
    } catch (updateErr) {
      console.warn('[generateSuggestions DB Notice]: MySQL update query failed:', updateErr.message);
    }

    // Also update in-memory fallback store if used
    if (fallbackAnalysesStore.has(numericId)) {
      const storedItem = fallbackAnalysesStore.get(numericId);
      storedItem.improvement_suggestions = aiResult.suggestions;
      storedItem.updated_at = new Date();
      fallbackAnalysesStore.set(numericId, storedItem);
    }

    // 10. Return HTTP 200 with structured JSON response
    return res.status(200).json({
      success: true,
      message: 'AI resume improvement suggestions generated successfully.',
      analysisId: numericId,
      jobTitle: record.job_title || 'Untitled Role',
      summary: aiResult.summary,
      suggestions: aiResult.suggestions,
      totalSuggestions: aiResult.suggestions.length,
      categoriesEvaluated: ALLOWED_CATEGORIES,
      disclaimer: 'AI-generated improvement suggestions are tailored recommendations based on the provided job description and extracted resume text. Recommendations are advisory; always ensure details and metrics accurately reflect your genuine qualifications.',
      resumeDetails: {
        filename: safeFilename,
        documentType: extractionResult.documentType
      },
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[generateSuggestions Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while generating AI suggestions.'
    });
  }
};

module.exports = {
  createAnalysis,
  getAnalyses,
  getDashboardStats,
  getAnalysisById,
  generateAnalysisReport,
  matchAnalysis,
  analyzeSkills,
  scoreAts,
  generateSuggestions
};
