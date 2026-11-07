const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { parseResume } = require('../services/resumeParser');
const { calculateAtsScore } = require('../services/atsScoreService');
const { fallbackAnalysesStore } = require('./resumeController');
const { generatePdfReportStream } = require('../services/reportService');
const { getUploadDir } = require('../config/storage');

/**
 * Controller: Standalone ATS Resume Checker
 * 
 * Implements Task 40:
 * - Standalone ATS scoring without requiring a target job description
 * - File upload (PDF/DOCX) or existing resumeId processing
 * - Transparent 9-category scoring, warnings, strengths, and recommendations
 * - User-isolated history and downloadable PDF reports
 */

let atsCheckIdCounter = 5000;

/**
 * POST /api/ats/check
 * 
 * Evaluates an uploaded PDF/DOCX resume (or previously uploaded resumeId)
 * and returns standalone ATS readiness scoring results.
 */
const checkAtsResume = async (req, res) => {
  try {
    const userId = req.userId;
    let savedFilename = null;
    let originalName = null;
    let fileSize = null;
    let mimeType = null;

    // Check if file was uploaded via Multer in this request
    if (req.file) {
      savedFilename = req.file.filename;
      originalName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
    } else if (req.body && req.body.resumeId) {
      // Look up existing resumeId
      const rawResumeId = String(req.body.resumeId).trim();
      const numericId = parseInt(rawResumeId, 10);
      let existingRecord = null;

      if (!isNaN(numericId)) {
        try {
          const [rows] = await pool.execute(
            'SELECT id, user_id, resume_filename FROM resume_analyses WHERE id = ? LIMIT 1',
            [numericId]
          );
          if (rows && rows.length > 0) existingRecord = rows[0];
        } catch (_) {}

        if (!existingRecord && fallbackAnalysesStore.has(numericId)) {
          existingRecord = fallbackAnalysesStore.get(numericId);
        }
      }

      if (!existingRecord) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Resume record not found with ID: ${rawResumeId}`
        });
      }

      if (Number(existingRecord.user_id) !== Number(userId)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: You do not own this resume record.'
        });
      }

      savedFilename = existingRecord.resume_filename;
      originalName = existingRecord.original_filename || existingRecord.resume_filename;
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Please upload a PDF or DOCX resume file, or provide an existing resumeId.'
      });
    }

    // Securely resolve file on disk
    const uploadDir = getUploadDir();
    const safeFilename = path.basename(savedFilename);
    const resolvedFilePath = path.join(uploadDir, safeFilename);

    if (!resolvedFilePath.startsWith(uploadDir) || !fs.existsSync(resolvedFilePath)) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'The resume document file was not found on the server.'
      });
    }

    // Extract text from document
    let extractionResult;
    try {
      extractionResult = await parseResume(resolvedFilePath);
    } catch (parseErr) {
      console.error('[checkAtsResume Parser Error]:', parseErr.message);
      return res.status(parseErr.statusCode || 400).json({
        error: 'Extraction Error',
        message: parseErr.message || 'Unable to extract text from the resume document.'
      });
    }

    // Calculate ATS score in Standalone Mode (no job description)
    const atsResult = calculateAtsScore(extractionResult.text, null);

    let checkId = null;
    const breakdownJson = JSON.stringify(atsResult.categoryBreakdown);
    const improvementsJson = JSON.stringify(atsResult.improvements);

    // Save standalone ATS evaluation in MySQL resume_analyses
    try {
      const [insertResult] = await pool.execute(
        `INSERT INTO resume_analyses 
           (user_id, job_title, job_description, resume_filename, match_score, ats_score, ats_breakdown, improvement_suggestions, created_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NOW())`,
        [
          userId,
          'Standalone ATS Check',
          'Standalone ATS Resume Evaluation (No Job Description)',
          safeFilename,
          atsResult.atsScore,
          breakdownJson,
          improvementsJson
        ]
      );
      if (insertResult && insertResult.insertId) {
        checkId = insertResult.insertId;
      }
    } catch (dbErr) {
      console.warn('[checkAtsResume DB Notice]:', dbErr.message);
    }

    // Fallback store handling if MySQL disconnected
    if (!checkId) {
      atsCheckIdCounter += 1;
      checkId = atsCheckIdCounter;
    }

    fallbackAnalysesStore.set(Number(checkId), {
      id: Number(checkId),
      user_id: userId,
      job_title: 'Standalone ATS Check',
      job_description: 'Standalone ATS Resume Evaluation (No Job Description)',
      resume_filename: safeFilename,
      original_filename: originalName || safeFilename,
      match_score: null,
      ats_score: atsResult.atsScore,
      ats_breakdown: atsResult.categoryBreakdown,
      improvement_suggestions: atsResult.improvements,
      created_at: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'Standalone ATS evaluation completed successfully.',
      checkId,
      id: checkId,
      atsScore: atsResult.atsScore,
      tier: atsResult.tier,
      categoryBreakdown: atsResult.categoryBreakdown,
      strengths: atsResult.strengths,
      improvements: atsResult.improvements,
      warnings: atsResult.warnings || [],
      detectedSections: atsResult.detectedSections || [],
      missingSections: atsResult.missingSections || [],
      documentStats: atsResult.documentStats,
      rawPoints: atsResult.rawPoints,
      maxPossiblePoints: atsResult.maxPossiblePoints,
      standaloneMode: true,
      disclaimer: atsResult.disclaimer,
      resumeDetails: {
        filename: safeFilename,
        originalName: originalName || safeFilename,
        documentType: extractionResult.documentType,
        wordCount: extractionResult.wordCount,
        charCount: extractionResult.charCount
      },
      evaluatedAt: atsResult.evaluatedAt
    });

  } catch (error) {
    console.error('[checkAtsResume Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during ATS evaluation.'
    });
  }
};

/**
 * GET /api/ats/history
 * 
 * Returns past ATS checks for the authenticated user (strict user isolation).
 */
const getAtsHistory = async (req, res) => {
  try {
    const userId = req.userId;
    let checks = [];

    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, ats_score, ats_breakdown, created_at
         FROM resume_analyses 
         WHERE user_id = ? AND ats_score IS NOT NULL
         ORDER BY created_at DESC 
         LIMIT 50`,
        [userId]
      );
      if (rows && rows.length > 0) {
        checks = rows.map(r => {
          let breakdown = [];
          try {
            breakdown = typeof r.ats_breakdown === 'string' ? JSON.parse(r.ats_breakdown) : (r.ats_breakdown || []);
          } catch (_) {}
          return {
            id: r.id,
            jobTitle: r.job_title,
            filename: r.resume_filename,
            atsScore: r.ats_score !== null ? Number(r.ats_score) : null,
            categoryCount: Array.isArray(breakdown) ? breakdown.length : 0,
            isStandalone: !r.job_description || r.job_description.includes('Standalone ATS'),
            createdAt: r.created_at
          };
        });
      }
    } catch (dbErr) {
      console.warn('[getAtsHistory DB Notice]:', dbErr.message);
    }

    // Merge fallback store records if applicable
    for (const [id, item] of fallbackAnalysesStore.entries()) {
      if (Number(item.user_id) === Number(userId) && item.ats_score !== null && item.ats_score !== undefined) {
        if (!checks.some(c => Number(c.id) === Number(id))) {
          checks.push({
            id: Number(id),
            jobTitle: item.job_title || 'Standalone ATS Check',
            filename: item.original_filename || item.resume_filename,
            atsScore: Number(item.ats_score),
            categoryCount: Array.isArray(item.ats_breakdown) ? item.ats_breakdown.length : 0,
            isStandalone: !item.job_description || item.job_description.includes('Standalone ATS'),
            createdAt: item.created_at || new Date()
          });
        }
      }
    }

    // Sort newest first
    checks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: checks.length,
      history: checks
    });

  } catch (error) {
    console.error('[getAtsHistory Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve ATS checks history.'
    });
  }
};

/**
 * GET /api/ats/:id
 * 
 * Returns full details of a specific ATS check.
 */
const getAtsCheckById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid ATS check ID.'
      });
    }

    let record = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, ats_score, ats_breakdown, improvement_suggestions, created_at
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) record = rows[0];
    } catch (_) {}

    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ATS check record not found with ID: ${numericId}`
      });
    }

    // User isolation verification
    if (Number(record.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not own this ATS check record.'
      });
    }

    let atsBreakdown = [];
    let improvements = [];
    try {
      atsBreakdown = typeof record.ats_breakdown === 'string' ? JSON.parse(record.ats_breakdown) : (record.ats_breakdown || []);
    } catch (_) {}
    try {
      improvements = typeof record.improvement_suggestions === 'string' ? JSON.parse(record.improvement_suggestions) : (record.improvement_suggestions || []);
    } catch (_) {}

    return res.status(200).json({
      success: true,
      check: {
        id: record.id,
        userId: record.user_id,
        jobTitle: record.job_title,
        resumeFilename: record.resume_filename,
        atsScore: record.ats_score !== null ? Number(record.ats_score) : null,
        categoryBreakdown: atsBreakdown,
        improvements,
        createdAt: record.created_at
      }
    });

  } catch (error) {
    console.error('[getAtsCheckById Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve ATS check details.'
    });
  }
};

/**
 * GET /api/ats/:id/report
 * 
 * Generates and streams PDF report for a standalone ATS check.
 */
const downloadAtsReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid ATS check ID.'
      });
    }

    let record = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, job_title, job_description, resume_filename, match_score, ats_score, matched_skills, missing_skills, additional_skills, ats_breakdown, improvement_suggestions, created_at 
         FROM resume_analyses 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) record = rows[0];
    } catch (_) {}

    if (!record && fallbackAnalysesStore.has(numericId)) {
      record = fallbackAnalysesStore.get(numericId);
    }

    if (!record || Number(record.user_id) !== Number(userId)) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ATS check report not found with ID: ${numericId}`
      });
    }

    const safeFilename = `ats-report-${numericId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    await generatePdfReportStream(record, res);

  } catch (error) {
    console.error('[downloadAtsReport Controller Error]:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate ATS PDF report.'
      });
    }
  }
};

module.exports = {
  checkAtsResume,
  getAtsHistory,
  getAtsCheckById,
  downloadAtsReport
};
