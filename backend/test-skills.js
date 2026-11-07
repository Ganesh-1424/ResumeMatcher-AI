/**
 * Test Suite: Task 25 - Resume Skill Gap Analysis API
 * 
 * Verifies:
 * 1. Skill configuration: token boundary matching, alias resolution, avoidance of false positives.
 * 2. POST /api/analyses/:id/skills endpoint execution.
 * 3. Validation: invalid IDs, missing JWT, invalid JWT.
 * 4. Ownership security: access to another user's analysis is rejected (403).
 * 5. Data preservation: ensures match_score is preserved and not overwritten.
 * 6. Categorization & response structure (Matched, Missing, Additional, Summary, Disclaimer).
 */

const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });
const app = require('./server');
const { extractSkills, analyzeSkillGap } = require('./services/skillGapService');
const { fallbackAnalysesStore } = require('./controllers/resumeController');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ai_resume_job_matcher_2026_super_secure_key';

// Helper to make local HTTP requests to Express app
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
  console.log(' Starting Task 25: Resume Skill Gap Analysis API Test Suite');
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
  // Unit Test 1: Skill Extraction & False-Positive Prevention
  // ------------------------------------------------------------------------
  console.log('\n--- 1. Testing Skill Extraction & Boundary Matching ---');

  const testTextWithTraps = `
    Candidate has excellent communication skills and is always going to team discussions.
    Experienced in JavaScript, React, and CSS.
    Worked with Google Cloud and clear documentation.
    Trusted developer who never feels frustrated.
  `;
  const detectedSkills = extractSkills(testTextWithTraps).map((s) => s.name);
  console.log('Detected skills from trap text:', detectedSkills);

  // Must detect JavaScript, React, CSS
  assert(detectedSkills.includes('JavaScript'), 'Detects JavaScript');
  assert(detectedSkills.includes('React'), 'Detects React');
  assert(detectedSkills.includes('CSS'), 'Detects CSS');

  // Must NOT falsely detect Java (inside JavaScript)
  assert(!detectedSkills.includes('Java'), 'Does NOT falsely detect Java inside JavaScript');

  // Must NOT falsely detect Go (inside going / good)
  assert(!detectedSkills.includes('Go'), 'Does NOT falsely detect Go inside "going"');

  // Must NOT falsely detect C (inside CSS / clear)
  assert(!detectedSkills.includes('C'), 'Does NOT falsely detect C inside "CSS" or "clear"');

  // Must NOT falsely detect Rust (inside trusted / frustrated)
  assert(!detectedSkills.includes('Rust'), 'Does NOT falsely detect Rust inside "trusted" or "frustrated"');

  // ------------------------------------------------------------------------
  // Unit Test 2: Alias Resolution (JS -> JavaScript, Postgres -> PostgreSQL)
  // ------------------------------------------------------------------------
  console.log('\n--- 2. Testing Skill Alias Canonicalization ---');
  const aliasText = 'Built backends with JS, Node, Postgres, K8s, and Spring Boot';
  const aliasSkills = extractSkills(aliasText).map((s) => s.name);
  console.log('Detected skills from alias text:', aliasSkills);

  assert(aliasSkills.includes('JavaScript'), 'Resolves alias "JS" -> JavaScript');
  assert(aliasSkills.includes('Node.js'), 'Resolves alias "Node" -> Node.js');
  assert(aliasSkills.includes('PostgreSQL'), 'Resolves alias "Postgres" -> PostgreSQL');
  assert(aliasSkills.includes('Kubernetes'), 'Resolves alias "K8s" -> Kubernetes');
  assert(aliasSkills.includes('Spring Boot'), 'Resolves "Spring Boot"');

  // ------------------------------------------------------------------------
  // Unit Test 3: Set-based Skill Gap Comparison
  // ------------------------------------------------------------------------
  console.log('\n--- 3. Testing Skill Gap Comparison Logic ---');
  const sampleResume = 'Skills: JavaScript, TypeScript, React, Node.js, Express.js, MySQL, Git, Docker, HTML, CSS';
  const sampleJob = 'Seeking Developer with JavaScript, React, Node.js, Python, AWS, Docker, and PostgreSQL';

  const gapResult = analyzeSkillGap(sampleResume, sampleJob);
  console.log('Gap Summary:', gapResult.summary);
  console.log('Matched:', gapResult.skillNames.matched);
  console.log('Missing:', gapResult.skillNames.missing);
  console.log('Additional:', gapResult.skillNames.additional);

  assert(gapResult.skillNames.matched.includes('JavaScript'), 'Matched includes JavaScript');
  assert(gapResult.skillNames.matched.includes('React'), 'Matched includes React');
  assert(gapResult.skillNames.matched.includes('Node.js'), 'Matched includes Node.js');
  assert(gapResult.skillNames.matched.includes('Docker'), 'Matched includes Docker');

  assert(gapResult.skillNames.missing.includes('Python'), 'Missing includes Python');
  assert(gapResult.skillNames.missing.includes('AWS'), 'Missing includes AWS');
  assert(gapResult.skillNames.missing.includes('PostgreSQL'), 'Missing includes PostgreSQL');

  assert(gapResult.skillNames.additional.includes('TypeScript'), 'Additional includes TypeScript');
  assert(gapResult.skillNames.additional.includes('MySQL'), 'Additional includes MySQL');
  assert(gapResult.skillNames.additional.includes('Git'), 'Additional includes Git');

  // ------------------------------------------------------------------------
  // HTTP Tests: Starting test server
  // ------------------------------------------------------------------------
  console.log('\n--- 4. Testing HTTP Endpoint POST /api/analyses/:id/skills ---');
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Test server running on ephemeral port ${port}`);

  try {
    // Generate test JWTs with proper `id` property expected by authMiddleware
    const user1Token = jwt.sign({ id: 1, email: 'student1@example.com' }, JWT_SECRET, { expiresIn: '1h' });
    const user2Token = jwt.sign({ id: 2, email: 'student2@example.com' }, JWT_SECRET, { expiresIn: '1h' });

    // Seed test record in fallbackAnalysesStore pointing to existing valid PDF
    const testAnalysisId = 999;
    fallbackAnalysesStore.set(testAnalysisId, {
      id: testAnalysisId,
      user_id: 1,
      job_title: 'Full Stack Engineer',
      job_description: 'Looking for a developer with proficiency in JavaScript, React, Node.js, Python, AWS, Docker, and MongoDB.',
      resume_filename: 'resume_john_doe_resume_1791786336015-753817482.pdf',
      match_score: 84.5,
      ats_score: null,
      matched_skills: null,
      missing_skills: null,
      additional_skills: null,
      created_at: new Date()
    });

    // 4.1 Missing JWT
    const resNoAuth = await makeRequest(server, {
      path: `/api/analyses/${testAnalysisId}/skills`,
      method: 'POST'
    });
    assert(resNoAuth.status === 401, 'Rejects request without JWT with 401 Unauthorized');

    // 4.2 Invalid JWT
    const resBadToken = await makeRequest(server, {
      path: `/api/analyses/${testAnalysisId}/skills`,
      method: 'POST',
      headers: { Authorization: 'Bearer totally-invalid-token' }
    });
    assert(resBadToken.status === 401, 'Rejects request with invalid JWT with 401 Unauthorized');

    // 4.3 Invalid ID (non-numeric)
    const resBadId = await makeRequest(server, {
      path: '/api/analyses/invalid-id/skills',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resBadId.status === 400, 'Rejects invalid non-numeric ID with 400 Bad Request');

    // 4.4 Non-existent analysis
    const resNotFound = await makeRequest(server, {
      path: '/api/analyses/999999/skills',
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resNotFound.status === 404, 'Returns 404 Not Found for non-existent analysis');

    // 4.5 Unauthorized access: User 2 tries to run skill analysis on User 1's record
    const resForbidden = await makeRequest(server, {
      path: `/api/analyses/${testAnalysisId}/skills`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert(resForbidden.status === 403, 'Rejects cross-user analysis attempt with 403 Forbidden');

    // 4.6 Successful skill gap analysis by legitimate owner (User 1)
    const resSuccess = await makeRequest(server, {
      path: `/api/analyses/${testAnalysisId}/skills`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    console.log('\nSuccess Response Summary:', resSuccess.data.summary);
    console.log('Success Response Matched:', resSuccess.data.skillNames.matched);
    console.log('Success Response Missing:', resSuccess.data.skillNames.missing);
    console.log('Success Response Additional:', resSuccess.data.skillNames.additional);

    assert(resSuccess.status === 200, 'Returns 200 OK on successful skill gap analysis');
    assert(resSuccess.data.success === true, 'Response contains success: true');
    assert(resSuccess.data.analysisId === testAnalysisId, 'Response returns correct analysisId');
    assert(Array.isArray(resSuccess.data.skillNames.matched), 'Response contains matched skill list');
    assert(Array.isArray(resSuccess.data.skillNames.missing), 'Response contains missing skill list');
    assert(Array.isArray(resSuccess.data.skillNames.additional), 'Response contains additional skill list');
    assert(typeof resSuccess.data.summary.matchPercentage === 'number', 'Response contains calculated matchPercentage');
    assert(typeof resSuccess.data.disclaimer === 'string', 'Response contains clear disclaimer explaining missing skills');

    // 4.7 Verify data preservation (match_score remains intact)
    const storedAfter = fallbackAnalysesStore.get(testAnalysisId);
    assert(storedAfter.match_score === 84.5, 'Preserves existing match_score (84.5) without overwriting');
    assert(Array.isArray(storedAfter.matched_skills), 'Stores matched_skills in record');
    assert(Array.isArray(storedAfter.missing_skills), 'Stores missing_skills in record');
    assert(Array.isArray(storedAfter.additional_skills), 'Stores additional_skills in record');

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

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
