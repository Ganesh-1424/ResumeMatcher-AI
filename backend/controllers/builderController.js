/**
 * Controller: AI Resume Builder
 * 
 * Implements Task 41:
 * - CRUD operations for user saved resumes (with MySQL & fallback store)
 * - Strict user isolation (ownership verification via req.userId)
 * - PDF generation supporting Modern, ATS Minimal, and Software Engineer templates
 * - Deep integration with existing ATS scoring and Skill Gap services
 * - AI writing assistance using Gemini with rule-based fallback
 */

const { pool } = require('../config/db');
const { serializeResumeToText } = require('../services/resumeSerializer');
const { calculateAtsScore } = require('../services/atsScoreService');
const { analyzeSkillGap } = require('../services/skillGapService');
const { generateWritingAssistance } = require('../services/builderAiService');
const { generateResumePdfStream } = require('../services/resumePdfService');
const { loadFallbackStore, saveFallbackStore } = require('../config/persistentStore');

/**
 * Fallback store for saved builder resumes with disk backup
 */
const fallbackSavedResumesStore = new Map();
let fallbackResumeIdCounter = 2000;

try {
  const diskData = loadFallbackStore();
  if (diskData.savedResumes && diskData.savedResumes.length > 0) {
    for (const r of diskData.savedResumes) {
      if (r && r.id) {
        fallbackSavedResumesStore.set(Number(r.id), r);
        if (Number(r.id) >= fallbackResumeIdCounter) {
          fallbackResumeIdCounter = Number(r.id) + 1;
        }
      }
    }
  }
} catch (_) {}

const syncSavedResumesToDisk = () => {
  try {
    const existing = loadFallbackStore();
    existing.savedResumes = Array.from(fallbackSavedResumesStore.values());
    saveFallbackStore(existing);
  } catch (_) {}
};

/**
 * Helper to safely parse JSON or return original object
 */
function safeParse(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

/**
 * POST /api/resumes/builder
 * 
 * Saves a new resume draft in MySQL.
 */
const saveResume = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      title,
      template = 'modern',
      personalInfo = {},
      summary = '',
      education = [],
      skills = {},
      experience = [],
      projects = [],
      certifications = [],
      additionalInfo = ''
    } = req.body || {};

    const cleanTitle = (title && typeof title === 'string' && title.trim().length > 0)
      ? title.trim().slice(0, 255)
      : 'Untitled Resume';

    const validTemplates = ['modern', 'ats_minimal', 'minimal', 'software_engineer', 'tech'];
    const cleanTemplate = validTemplates.includes(template) ? template : 'modern';

    let resumeId = null;

    try {
      const [result] = await pool.execute(
        `INSERT INTO saved_resumes 
           (user_id, title, template, personal_info, summary, education, skills, experience, projects, certifications, additional_info, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          cleanTitle,
          cleanTemplate,
          JSON.stringify(personalInfo),
          summary || '',
          JSON.stringify(education),
          JSON.stringify(skills),
          JSON.stringify(experience),
          JSON.stringify(projects),
          JSON.stringify(certifications),
          additionalInfo || ''
        ]
      );
      if (result && result.insertId) {
        resumeId = result.insertId;
      }
    } catch (dbErr) {
      console.warn('[saveResume DB Notice]: MySQL query failed:', dbErr.message);
    }

    if (!resumeId) {
      fallbackResumeIdCounter += 1;
      resumeId = fallbackResumeIdCounter;
    }

    const savedRecord = {
      id: Number(resumeId),
      userId: Number(userId),
      title: cleanTitle,
      template: cleanTemplate,
      personalInfo,
      summary,
      education,
      skills,
      experience,
      projects,
      certifications,
      additionalInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    fallbackSavedResumesStore.set(Number(resumeId), {
      id: Number(resumeId),
      user_id: Number(userId),
      title: cleanTitle,
      template: cleanTemplate,
      personal_info: personalInfo,
      summary,
      education,
      skills,
      experience,
      projects,
      certifications,
      additional_info: additionalInfo,
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Resume saved successfully.',
      resume: savedRecord
    });

  } catch (error) {
    console.error('[saveResume Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save resume draft.'
    });
  }
};

/**
 * GET /api/resumes/builder
 * 
 * Returns all saved resumes for the authenticated user.
 */
const getSavedResumes = async (req, res) => {
  try {
    const userId = req.userId;
    let resumes = [];

    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, title, template, personal_info, ats_score, created_at, updated_at
         FROM saved_resumes 
         WHERE user_id = ? 
         ORDER BY updated_at DESC`,
        [userId]
      );
      if (rows && rows.length > 0) {
        resumes = rows.map((r) => {
          const p = safeParse(r.personal_info, {});
          return {
            id: r.id,
            userId: r.user_id,
            title: r.title,
            template: r.template,
            candidateName: p.fullName || p.name || 'Untitled',
            atsScore: r.ats_score !== null ? Number(r.ats_score) : null,
            createdAt: r.created_at,
            updatedAt: r.updated_at
          };
        });
      }
    } catch (dbErr) {
      console.warn('[getSavedResumes DB Notice]:', dbErr.message);
    }

    // Merge in fallback store entries
    for (const [id, r] of fallbackSavedResumesStore.entries()) {
      if (Number(r.user_id) === Number(userId) && !resumes.some((x) => Number(x.id) === Number(id))) {
        const p = safeParse(r.personal_info, {});
        resumes.push({
          id: Number(id),
          userId: Number(userId),
          title: r.title || 'Untitled Resume',
          template: r.template || 'modern',
          candidateName: p.fullName || p.name || 'Untitled',
          atsScore: r.ats_score !== null && r.ats_score !== undefined ? Number(r.ats_score) : null,
          createdAt: r.created_at || new Date(),
          updatedAt: r.updated_at || new Date()
        });
      }
    }

    resumes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return res.status(200).json({
      success: true,
      count: resumes.length,
      resumes
    });

  } catch (error) {
    console.error('[getSavedResumes Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve saved resumes.'
    });
  }
};

/**
 * GET /api/resumes/builder/:id
 * 
 * Retrieves complete details for a specific resume (with ownership check).
 */
const getResumeById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid resume ID.'
      });
    }

    let record = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, title, template, personal_info, summary, education, skills, experience, projects, certifications, additional_info, ats_score, created_at, updated_at
         FROM saved_resumes 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) record = rows[0];
    } catch (_) {}

    if (!record && fallbackSavedResumesStore.has(numericId)) {
      record = fallbackSavedResumesStore.get(numericId);
    }

    if (!record) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Resume record not found with ID: ${numericId}`
      });
    }

    if (Number(record.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to access this resume.'
      });
    }

    return res.status(200).json({
      success: true,
      resume: {
        id: record.id,
        userId: record.user_id,
        title: record.title,
        template: record.template,
        personalInfo: safeParse(record.personal_info, {}),
        summary: record.summary || '',
        education: safeParse(record.education, []),
        skills: safeParse(record.skills, {}),
        experience: safeParse(record.experience, []),
        projects: safeParse(record.projects, []),
        certifications: safeParse(record.certifications, []),
        additionalInfo: record.additional_info || '',
        atsScore: record.ats_score !== null && record.ats_score !== undefined ? Number(record.ats_score) : null,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      }
    });

  } catch (error) {
    console.error('[getResumeById Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve resume details.'
    });
  }
};

/**
 * PUT /api/resumes/builder/:id
 * 
 * Updates a previously saved resume draft.
 */
const updateResume = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid resume ID.'
      });
    }

    // Verify existence & ownership first
    let existing = null;
    try {
      const [rows] = await pool.execute(
        'SELECT id, user_id FROM saved_resumes WHERE id = ? LIMIT 1',
        [numericId]
      );
      if (rows && rows.length > 0) existing = rows[0];
    } catch (_) {}

    if (!existing && fallbackSavedResumesStore.has(numericId)) {
      existing = fallbackSavedResumesStore.get(numericId);
    }

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Resume record not found with ID: ${numericId}`
      });
    }

    if (Number(existing.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not own this resume.'
      });
    }

    const {
      title,
      template = 'modern',
      personalInfo = {},
      summary = '',
      education = [],
      skills = {},
      experience = [],
      projects = [],
      certifications = [],
      additionalInfo = ''
    } = req.body || {};

    const cleanTitle = (title && typeof title === 'string' && title.trim().length > 0)
      ? title.trim().slice(0, 255)
      : 'Untitled Resume';

    const validTemplates = ['modern', 'ats_minimal', 'software_engineer'];
    const cleanTemplate = validTemplates.includes(template) ? template : 'modern';

    try {
      await pool.execute(
        `UPDATE saved_resumes 
         SET title = ?, template = ?, personal_info = ?, summary = ?, education = ?, skills = ?, experience = ?, projects = ?, certifications = ?, additional_info = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [
          cleanTitle,
          cleanTemplate,
          JSON.stringify(personalInfo),
          summary || '',
          JSON.stringify(education),
          JSON.stringify(skills),
          JSON.stringify(experience),
          JSON.stringify(projects),
          JSON.stringify(certifications),
          additionalInfo || '',
          numericId,
          userId
        ]
      );
    } catch (dbErr) {
      console.warn('[updateResume DB Notice]:', dbErr.message);
    }

    const updatedObj = {
      id: numericId,
      user_id: Number(userId),
      title: cleanTitle,
      template: cleanTemplate,
      personal_info: personalInfo,
      summary,
      education,
      skills,
      experience,
      projects,
      certifications,
      additional_info: additionalInfo,
      updated_at: new Date()
    };

    fallbackSavedResumesStore.set(numericId, updatedObj);

    return res.status(200).json({
      success: true,
      message: 'Resume updated successfully.',
      resume: {
        id: numericId,
        userId: Number(userId),
        title: cleanTitle,
        template: cleanTemplate,
        personalInfo,
        summary,
        education,
        skills,
        experience,
        projects,
        certifications,
        additionalInfo,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[updateResume Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update resume.'
    });
  }
};

/**
 * POST /api/resumes/builder/:id/duplicate
 * 
 * Clones an existing resume to allow branching/new versions.
 */
const duplicateResume = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid source resume ID.'
      });
    }

    let source = null;
    try {
      const [rows] = await pool.execute(
        `SELECT id, user_id, title, template, personal_info, summary, education, skills, experience, projects, certifications, additional_info
         FROM saved_resumes 
         WHERE id = ? LIMIT 1`,
        [numericId]
      );
      if (rows && rows.length > 0) source = rows[0];
    } catch (_) {}

    if (!source && fallbackSavedResumesStore.has(numericId)) {
      source = fallbackSavedResumesStore.get(numericId);
    }

    if (!source) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Source resume to duplicate was not found.'
      });
    }

    if (Number(source.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to duplicate this resume.'
      });
    }

    const newTitle = `${source.title || 'Untitled Resume'} (Copy)`.slice(0, 255);
    const personalInfo = safeParse(source.personal_info, {});
    const education = safeParse(source.education, []);
    const skills = safeParse(source.skills, {});
    const experience = safeParse(source.experience, []);
    const projects = safeParse(source.projects, []);
    const certifications = safeParse(source.certifications, []);

    let newId = null;
    try {
      const [insertRes] = await pool.execute(
        `INSERT INTO saved_resumes 
           (user_id, title, template, personal_info, summary, education, skills, experience, projects, certifications, additional_info, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          newTitle,
          source.template || 'modern',
          JSON.stringify(personalInfo),
          source.summary || '',
          JSON.stringify(education),
          JSON.stringify(skills),
          JSON.stringify(experience),
          JSON.stringify(projects),
          JSON.stringify(certifications),
          source.additional_info || ''
        ]
      );
      if (insertRes && insertRes.insertId) newId = insertRes.insertId;
    } catch (dbErr) {
      console.warn('[duplicateResume DB Notice]:', dbErr.message);
    }

    if (!newId) {
      fallbackResumeIdCounter += 1;
      newId = fallbackResumeIdCounter;
    }

    fallbackSavedResumesStore.set(Number(newId), {
      id: Number(newId),
      user_id: Number(userId),
      title: newTitle,
      template: source.template || 'modern',
      personal_info: personalInfo,
      summary: source.summary || '',
      education,
      skills,
      experience,
      projects,
      certifications,
      additional_info: source.additional_info || '',
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.status(201).json({
      success: true,
      message: 'Resume duplicated successfully.',
      resume: {
        id: Number(newId),
        userId: Number(userId),
        title: newTitle,
        template: source.template || 'modern',
        personalInfo,
        summary: source.summary || '',
        education,
        skills,
        experience,
        projects,
        certifications,
        additionalInfo: source.additional_info || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[duplicateResume Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to duplicate resume.'
    });
  }
};

/**
 * DELETE /api/resumes/builder/:id
 * 
 * Deletes a saved resume draft.
 */
const deleteResume = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (!id || isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid resume ID.'
      });
    }

    let existing = null;
    try {
      const [rows] = await pool.execute(
        'SELECT id, user_id FROM saved_resumes WHERE id = ? LIMIT 1',
        [numericId]
      );
      if (rows && rows.length > 0) existing = rows[0];
    } catch (_) {}

    if (!existing && fallbackSavedResumesStore.has(numericId)) {
      existing = fallbackSavedResumesStore.get(numericId);
    }

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Resume record not found with ID: ${numericId}`
      });
    }

    if (Number(existing.user_id) !== Number(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not have permission to delete this resume.'
      });
    }

    try {
      await pool.execute(
        'DELETE FROM saved_resumes WHERE id = ? AND user_id = ?',
        [numericId, userId]
      );
    } catch (dbErr) {
      console.warn('[deleteResume DB Notice]:', dbErr.message);
    }

    fallbackSavedResumesStore.delete(numericId);

    return res.status(200).json({
      success: true,
      message: 'Resume deleted successfully.',
      id: numericId
    });

  } catch (error) {
    console.error('[deleteResume Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete resume.'
    });
  }
};

/**
 * POST /api/resumes/builder/pdf
 * GET /api/resumes/builder/:id/pdf
 * 
 * Generates and streams a PDF resume supporting Modern, ATS Minimal, and Software Engineer templates.
 */
const downloadPdf = async (req, res) => {
  try {
    const userId = req.userId;
    let resumeData = null;
    let template = 'modern';

    if (req.params && req.params.id) {
      // Lookup by ID
      const numericId = parseInt(req.params.id, 10);
      let record = null;
      try {
        const [rows] = await pool.execute(
          `SELECT id, user_id, title, template, personal_info, summary, education, skills, experience, projects, certifications, additional_info 
           FROM saved_resumes WHERE id = ? LIMIT 1`,
          [numericId]
        );
        if (rows && rows.length > 0) record = rows[0];
      } catch (_) {}

      if (!record && fallbackSavedResumesStore.has(numericId)) {
        record = fallbackSavedResumesStore.get(numericId);
      }

      if (!record || Number(record.user_id) !== Number(userId)) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Resume record not found.'
        });
      }

      resumeData = {
        title: record.title,
        template: record.template,
        personalInfo: safeParse(record.personal_info, {}),
        summary: record.summary || '',
        education: safeParse(record.education, []),
        skills: safeParse(record.skills, {}),
        experience: safeParse(record.experience, []),
        projects: safeParse(record.projects, []),
        certifications: safeParse(record.certifications, []),
        additionalInfo: record.additional_info || ''
      };
      template = record.template || 'modern';

    } else {
      // Direct POST payload from live builder
      resumeData = req.body || {};
      template = req.body.template || 'modern';
    }

    const p = resumeData.personalInfo || resumeData.personal_info || {};
    const safeName = (p.fullName || p.name || 'resume').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `${safeName}-${template}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await generateResumePdfStream(resumeData, template, res);

  } catch (error) {
    console.error('[downloadPdf Controller Error]:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate resume PDF.'
      });
    }
  }
};

/**
 * POST /api/resumes/builder/ats-score
 * 
 * Evaluates the builder resume using the existing ATS scoring service.
 * Connects directly with Task 40's 100-pt ATS engine without code duplication.
 */
const checkAtsScore = async (req, res) => {
  try {
    const resumeData = req.body.resumeData || req.body || {};
    const resumeText = serializeResumeToText(resumeData);

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please fill out some personal info, skills, or experience before checking ATS score.'
      });
    }

    // Call existing ATS readiness service (Task 40)
    const atsResult = calculateAtsScore(resumeText, null);

    // If an existing resume ID was provided, persist score
    if (req.body.id) {
      const numericId = parseInt(req.body.id, 10);
      try {
        await pool.execute(
          'UPDATE saved_resumes SET ats_score = ? WHERE id = ? AND user_id = ?',
          [atsResult.atsScore, numericId, req.userId]
        );
      } catch (_) {}

      if (fallbackSavedResumesStore.has(numericId)) {
        const item = fallbackSavedResumesStore.get(numericId);
        item.ats_score = atsResult.atsScore;
        fallbackSavedResumesStore.set(numericId, item);
      }
    }

    return res.status(200).json({
      success: true,
      atsScore: atsResult.atsScore,
      tier: atsResult.tier,
      categoryBreakdown: atsResult.categoryBreakdown,
      strengths: atsResult.strengths,
      improvements: atsResult.improvements,
      warnings: atsResult.warnings || [],
      detectedSections: atsResult.detectedSections || [],
      missingSections: atsResult.missingSections || [],
      documentStats: atsResult.documentStats,
      disclaimer: atsResult.disclaimer,
      evaluatedAt: atsResult.evaluatedAt
    });

  } catch (error) {
    console.error('[checkAtsScore Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to evaluate ATS readiness score.'
    });
  }
};

/**
 * POST /api/resumes/builder/match
 * 
 * Reuses the existing skill-gap & matching workflow to evaluate builder resume
 * against a target job title and description.
 */
const matchJobDescription = async (req, res) => {
  try {
    const { resumeData = {}, jobTitle = 'Target Role', jobDescription = '' } = req.body || {};

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please provide at least 20 characters of target job description to match.'
      });
    }

    const resumeText = serializeResumeToText(resumeData);
    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please complete your resume content before matching with a job description.'
      });
    }

    // Reuse existing skillGapService
    const skillGapResult = analyzeSkillGap(resumeText, jobDescription);

    // Reuse existing atsScoreService with job description
    const atsResult = calculateAtsScore(resumeText, jobDescription);

    return res.status(200).json({
      success: true,
      jobTitle,
      jobDescription,
      matchScore: skillGapResult.summary?.matchPercentage ?? 0,
      matchingSkills: skillGapResult.skillNames?.matched || [],
      missingSkills: skillGapResult.skillNames?.missing || [],
      skillGap: {
        matched: skillGapResult.skillNames?.matched || [],
        missing: skillGapResult.skillNames?.missing || [],
        additional: skillGapResult.skillNames?.additional || [],
        summary: skillGapResult.summary
      },
      atsResult: {
        atsScore: atsResult.atsScore,
        categoryBreakdown: atsResult.categoryBreakdown,
        strengths: atsResult.strengths,
        improvements: atsResult.improvements
      }
    });

  } catch (error) {
    console.error('[matchJobDescription Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze resume against job description.'
    });
  }
};

/**
 * POST /api/resumes/builder/ai-assist
 * 
 * Provides AI writing assistance for summary, experience bullets, project highlights, and polish.
 */
const getAiAssistance = async (req, res) => {
  try {
    const rawType = req.body?.type || 'polish';
    const inputText = req.body?.inputText || req.body?.input || '';
    const context = req.body?.context || {};

    let cleanType = 'polish';
    if (rawType === 'summary') cleanType = 'summary';
    else if (rawType === 'experience_bullet' || rawType === 'bullet' || rawType === 'experience') cleanType = 'experience_bullet';
    else if (rawType === 'project_bullet' || rawType === 'project') cleanType = 'project_bullet';
    else if (rawType === 'skills' || rawType === 'skill') cleanType = 'skills';
    else if (rawType === 'polish' || rawType === 'grammar') cleanType = 'polish';

    const result = await generateWritingAssistance({
      type: cleanType,
      inputText,
      context
    });

    const firstSuggestion = Array.isArray(result.suggestions) && result.suggestions.length > 0
      ? (typeof result.suggestions[0] === 'object' ? (result.suggestions[0].text || result.suggestions[0].label) : String(result.suggestions[0]))
      : result.summary || '';

    return res.status(200).json({
      ...result,
      suggestion: firstSuggestion
    });

  } catch (error) {
    console.error('[getAiAssistance Controller Error]:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate AI assistance.'
    });
  }
};

module.exports = {
  saveResume,
  getSavedResumes,
  getResumeById,
  updateResume,
  duplicateResume,
  deleteResume,
  downloadPdf,
  checkAtsScore,
  matchJobDescription,
  getAiAssistance,
  fallbackSavedResumesStore
};
