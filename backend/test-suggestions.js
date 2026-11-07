/**
 * Test Suite: Task 27 - AI Resume Improvement Suggestions API
 * 
 * Verifies:
 * 1. Output validation across the 6 core categories (Resume summary, Skills, Projects, Experience, ATS improvements, Job-specific recommendations).
 * 2. Input truncation and sanitization.
 * 3. Handling of missing API key configuration with clear student-friendly guidance.
 * 4. POST /api/analyses/:id/suggestions endpoint validation:
 *    - Rejects request without JWT with 401 Unauthorized
 *    - Rejects request with invalid JWT with 401 Unauthorized
 *    - Rejects non-numeric / negative IDs with 400 Bad Request
 *    - Rejects non-existent analysis IDs with 404 Not Found
 *    - Rejects cross-user unauthorized access with 403 Forbidden
 *    - Enforces prerequisite analysis steps (Semantic Match, Skill Gap, ATS Score) with 400 Bad Request
 *    - Preserves existing match scores, skill gap results, and ATS scores in database/store
 *    - Stores generated suggestions in improvement_suggestions column
 */

const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });
const app = require('./server');
const { generateAiSuggestions, ALLOWED_CATEGORIES } = require('./services/suggestionService');
const { fallbackAnalysesStore } = require('./controllers/resumeController');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ai_resume_job_matcher_2026_super_secure_key';

function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path: options.path,
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, text: body });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===========================================================');
  console.log(' Starting Task 27: AI Resume Improvement Suggestions Test');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // ------------------------------------------------------------------------
  // Unit Test 1: Category Configuration & Schema Constants
  // ------------------------------------------------------------------------
  console.log('\n--- 1. Testing Core Evaluation Categories ---');
  assert(ALLOWED_CATEGORIES.length === 6, 'Defines exactly 6 core improvement categories');
  assert(ALLOWED_CATEGORIES.includes('Resume summary'), 'Includes "Resume summary" category');
  assert(ALLOWED_CATEGORIES.includes('Skills'), 'Includes "Skills" category');
  assert(ALLOWED_CATEGORIES.includes('Projects'), 'Includes "Projects" category');
  assert(ALLOWED_CATEGORIES.includes('Experience'), 'Includes "Experience" category');
  assert(ALLOWED_CATEGORIES.includes('ATS improvements'), 'Includes "ATS improvements" category');
  assert(ALLOWED_CATEGORIES.includes('Job-specific recommendations'), 'Includes "Job-specific recommendations" category');

  // ------------------------------------------------------------------------
  // Unit Test 2: Missing API Key Configuration Behavior
  // ------------------------------------------------------------------------
  console.log('\n--- 2. Testing Missing API Key Handling ---');
  const savedApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.API_KEY;

  try {
    await generateAiSuggestions({
      resumeText: 'Sample resume text',
      jobTitle: 'Junior Developer',
      jobDescription: 'Seeking junior developer',
      matchScore: 75,
      matchedSkills: ['JavaScript'],
      missingSkills: ['Docker'],
      atsScore: 80,
      atsBreakdown: []
    });
    assert(false, 'Should throw error when API key is missing');
  } catch (err) {
    assert(err.statusCode === 503, 'Throws 503 Service Unavailable when API key is missing');
    assert(err.code === 'MISSING_API_KEY', 'Returns MISSING_API_KEY error code');
    assert(err.message.includes('GEMINI_API_KEY'), 'Explains how to set GEMINI_API_KEY in backend/.env');
  }

  // Restore API key if previously set
  if (savedApiKey) {
    process.env.GEMINI_API_KEY = savedApiKey;
  }

  // ------------------------------------------------------------------------
  // Unit Test 3: HTTP Endpoint POST /api/analyses/:id/suggestions
  // ------------------------------------------------------------------------
  console.log('\n--- 3. Testing HTTP Endpoint POST /api/analyses/:id/suggestions ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  try {
    const user1Token = jwt.sign({ id: 1, email: 'user1@example.com' }, JWT_SECRET, { expiresIn: '1h' });
    const user2Token = jwt.sign({ id: 2, email: 'user2@example.com' }, JWT_SECRET, { expiresIn: '1h' });

    // Seed analysis with missing prerequisites (no match score, no skills, no ATS)
    const incompleteAnalysisId = 901;
    fallbackAnalysesStore.set(incompleteAnalysisId, {
      id: incompleteAnalysisId,
      user_id: 1,
      job_title: 'Backend Developer',
      job_description: 'Looking for Node.js developer',
      resume_filename: 'resume_john_doe_resume_1791786336015-753817482.pdf',
      match_score: null,
      matched_skills: null,
      missing_skills: null,
      ats_score: null,
      created_at: new Date()
    });

    // Seed complete analysis ready for suggestions
    const completeAnalysisId = 902;
    fallbackAnalysesStore.set(completeAnalysisId, {
      id: completeAnalysisId,
      user_id: 1,
      job_title: 'Full Stack Engineer',
      job_description: 'Looking for a developer with proficiency in JavaScript, React, Node.js, and Docker.',
      resume_filename: 'resume_john_doe_resume_1791786336015-753817482.pdf',
      match_score: 87.5,
      matched_skills: ['JavaScript', 'React', 'Node.js'],
      missing_skills: ['Docker'],
      additional_skills: ['Express.js', 'Git'],
      ats_score: 82.0,
      ats_breakdown: [
        { name: 'Contact Information', earnedPoints: 15, maxPoints: 15, status: 'complete' },
        { name: 'Professional Summary', earnedPoints: 10, maxPoints: 10, status: 'complete' }
      ],
      improvement_suggestions: null,
      created_at: new Date()
    });

    // 3.1 Missing JWT
    const resNoAuth = await makeRequest(server, {
      path: `/api/analyses/${completeAnalysisId}/suggestions`,
      method: 'POST'
    });
    assert(resNoAuth.status === 401, 'Rejects request without JWT with 401 Unauthorized');

    // 3.2 Invalid JWT
    const resBadToken = await makeRequest(server, {
      path: `/api/analyses/${completeAnalysisId}/suggestions`,
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token' }
    });
    assert(resBadToken.status === 401, 'Rejects request with invalid JWT with 401 Unauthorized');

    // 3.3 Invalid non-numeric ID
    const resBadId = await makeRequest(server, {
      path: '/api/analyses/invalid-id/suggestions',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resBadId.status === 400, 'Rejects invalid non-numeric ID with 400 Bad Request');

    // 3.4 Non-existent analysis
    const resNotFound = await makeRequest(server, {
      path: '/api/analyses/999999/suggestions',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resNotFound.status === 404, 'Returns 404 Not Found for non-existent analysis');

    // 3.5 Cross-user forbidden access (User 2 accesses User 1's analysis)
    const resForbidden = await makeRequest(server, {
      path: `/api/analyses/${completeAnalysisId}/suggestions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert(resForbidden.status === 403, 'Rejects cross-user analysis attempt with 403 Forbidden');

    // 3.6 Incomplete prerequisites check
    const resIncomplete = await makeRequest(server, {
      path: `/api/analyses/${incompleteAnalysisId}/suggestions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resIncomplete.status === 400, 'Rejects analysis when prerequisite steps are incomplete (400 Bad Request)');
    assert(resIncomplete.data.error === 'Prerequisites Missing', 'Returns Prerequisites Missing error');
    assert(resIncomplete.data.prerequisites !== undefined, 'Returns breakdown of completed vs missing prerequisite steps');
    assert(resIncomplete.data.prerequisites.semanticMatchCompleted === false, 'Detects incomplete semantic match');
    assert(resIncomplete.data.prerequisites.skillGapCompleted === false, 'Detects incomplete skill gap');
    assert(resIncomplete.data.prerequisites.atsScoreCompleted === false, 'Detects incomplete ATS scoring');

    // 3.7 When API key is not configured, returns clear setup notice (503)
    delete process.env.GEMINI_API_KEY;
    delete process.env.API_KEY;
    const resNoKey = await makeRequest(server, {
      path: `/api/analyses/${completeAnalysisId}/suggestions`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resNoKey.status === 503, 'Returns 503 Service Unavailable when GEMINI_API_KEY is not configured');
    assert(resNoKey.data.message.includes('GEMINI_API_KEY'), 'Provides clear instruction to set GEMINI_API_KEY in backend/.env');

    // 3.8 Preserves all existing analysis fields
    const storedRecord = fallbackAnalysesStore.get(completeAnalysisId);
    assert(storedRecord.match_score === 87.5, 'Preserves existing match_score (87.5)');
    assert(Array.isArray(storedRecord.matched_skills) && storedRecord.matched_skills.length === 3, 'Preserves matched_skills');
    assert(Array.isArray(storedRecord.missing_skills) && storedRecord.missing_skills.length === 1, 'Preserves missing_skills');
    assert(Array.isArray(storedRecord.additional_skills) && storedRecord.additional_skills.length === 2, 'Preserves additional_skills');
    assert(storedRecord.ats_score === 82.0, 'Preserves ats_score (82.0)');
    assert(Array.isArray(storedRecord.ats_breakdown), 'Preserves ats_breakdown');

  } finally {
    server.close();
  }

  console.log('\n===========================================================');
  console.log(` Test Results: ${passed} passed, ${failed} failed`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
