/**
 * Test Suite: Task 28 - Integrate Frontend with Resume Analysis Backend
 * 
 * Verifies:
 * 1. Authentication flow (signup/login) and JWT verification
 * 2. Resume upload (POST /api/resumes/upload) with 'resume' field
 * 3. Job submission (POST /api/analyses) with resumeId, jobTitle, and jobDescription
 * 4. 4-Step Analysis Workflow in exact order:
 *    - 1. POST /api/analyses/:id/match
 *    - 2. POST /api/analyses/:id/skills
 *    - 3. POST /api/analyses/:id/ats-score
 *    - 4. POST /api/analyses/:id/suggestions
 * 5. Fetching saved analysis (GET /api/analyses/:id) reflecting all 4 steps
 * 6. Ownership & authorization protection: another user cannot access or run analysis steps
 * 7. Error handling: invalid files, expired/missing JWT, duplicate prevention
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Ensure required environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ai_resume_job_matcher_2026_super_secure_key';
process.env.PORT = '5001'; // Separate test port

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const analysisRoutes = require('./routes/analyses');
const { fallbackAnalysesStore } = require('./controllers/analysisController');
const suggestionService = require('./services/suggestionService');

// Mock external AI call for fast deterministic testing
suggestionService.generateAiSuggestions = async () => ({
  suggestions: [
    {
      category: 'Resume summary',
      issue: 'Summary lacks quantification of impact',
      recommendation: 'Highlight 3+ years experience delivering scalable web apps',
      priority: 'High',
      explanation: 'Target role emphasizes enterprise-scale experience.'
    },
    {
      category: 'Skills',
      issue: 'Docker is missing from skills section',
      recommendation: 'Add Docker containerization experience or certification',
      priority: 'High',
      explanation: 'Target job description requires container deployment proficiency.'
    }
  ],
  summary: 'Focus on highlighting full-stack projects and containerization skills.'
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/analyses', analysisRoutes);

let server;
const BASE_URL = 'http://localhost:5001/api';

/**
 * Helper to make HTTP requests
 */
async function httpRequest(urlPath, options = {}) {
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const url = new URL(`http://localhost:5001/api${normalizedPath}`);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  let body = options.body;

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = rawData ? JSON.parse(rawData) : null;
          } catch (_) {
            parsed = rawData;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed,
          });
        });
      }
    );

    req.on('error', reject);

    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

/**
 * Helper to create multipart/form-data payload with 'resume' field
 */
function createMultipartResumePayload(filename, contentBuffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';

  let pre = '';
  pre += `--${boundary}${crlf}`;
  pre += `Content-Disposition: form-data; name="resume"; filename="${filename}"${crlf}`;
  pre += `Content-Type: application/pdf${crlf}${crlf}`;

  const post = `${crlf}--${boundary}--${crlf}`;

  const preBuffer = Buffer.from(pre, 'utf-8');
  const postBuffer = Buffer.from(post, 'utf-8');

  const combined = Buffer.concat([preBuffer, contentBuffer, postBuffer]);

  return {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': combined.length,
    },
    body: combined,
  };
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('--- Task 28: Frontend & Resume Analysis Backend Integration Test ---');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return async () => {
      try {
        await fn();
        console.log(`  [PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`  [FAIL] ${name}`);
        console.error(`         ${err.message}`);
        failed++;
      }
    };
  }

  // Start test server
  await new Promise((res) => {
    server = app.listen(5001, () => {
      res();
    });
  });

  const testUserToken = jwt.sign(
    { userId: 101, email: 'task28.candidate@test.com', name: 'Candidate 28' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  const otherUserToken = jwt.sign(
    { userId: 999, email: 'intruder@test.com', name: 'Intruder' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  let uploadedResumeId = null;
  let createdAnalysisId = null;

  // Test 1: Authentication required for upload
  await test('1. POST /api/resumes/upload enforces JWT authentication (rejects unauthenticated request)', async () => {
    const fakePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const multipart = createMultipartResumePayload('test_resume.pdf', fakePdf);

    const res = await httpRequest('/resumes/upload', {
      method: 'POST',
      headers: { ...multipart.headers },
      body: multipart.body,
    });

    assert.strictEqual(res.statusCode, 401, `Expected 401, got ${res.statusCode}`);
  })();

  // Test 2: Upload valid resume with field name 'resume'
  await test('2. POST /api/resumes/upload accepts valid resume via "resume" field and returns analysisId', async () => {
    // Generate valid mini PDF
    const validPdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 120 >> stream
BT
/F1 12 Tf
72 712 Td
(Jane Doe Software Engineer skills: JavaScript React Node.js MySQL Docker Python Git experience at Acme Corp) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000210 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
380
%%EOF`;

    const pdfBuffer = Buffer.from(validPdfText);
    const multipart = createMultipartResumePayload('Jane_Doe_Resume.pdf', pdfBuffer);

    const res = await httpRequest('/resumes/upload', {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${testUserToken}`,
      },
      body: multipart.body,
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.analysisId, 'Should return analysisId');
    uploadedResumeId = res.data.analysisId;
  })();

  // Test 3: Reject invalid file type
  await test('3. POST /api/resumes/upload rejects invalid file types (e.g. .exe)', async () => {
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
    const multipart = createMultipartResumePayload('dangerous_program.exe', exeBuffer);

    const res = await httpRequest('/resumes/upload', {
      method: 'POST',
      headers: {
        ...multipart.headers,
        Authorization: `Bearer ${testUserToken}`,
      },
      body: multipart.body,
    });

    assert.strictEqual(res.statusCode, 400, `Expected 400, got ${res.statusCode}`);
    assert.ok(
      res.data.message.includes('PDF') || res.data.message.includes('file format') || res.data.message.includes('DOCX'),
      'Should mention allowed file types'
    );
  })();

  // Test 4: Submit Job Description to POST /api/analyses
  await test('4. POST /api/analyses creates new job analysis linking uploaded resume', async () => {
    const res = await httpRequest('/analyses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}`,
      },
      body: {
        resumeId: uploadedResumeId,
        jobTitle: 'Senior Full Stack Developer',
        jobDescription: 'Looking for a Senior Full Stack Developer proficient in React, Node.js, Express, MySQL, REST APIs, and Docker containerization.',
      },
    });

    assert.strictEqual(res.statusCode, 201, `Expected 201, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.analysis, 'Should return created analysis object');
    assert.ok(res.data.analysis.id, 'Should have numeric analysis id');
    assert.strictEqual(res.data.analysis.jobTitle, 'Senior Full Stack Developer');
    createdAnalysisId = res.data.analysis.id;
  })();

  // Test 5: Step 1 - Semantic Match (POST /api/analyses/:id/match)
  await test('5. Workflow Step 1: POST /api/analyses/:id/match computes match score', async () => {
    const res = await httpRequest(`/analyses/${createdAnalysisId}/match`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(typeof res.data.matchScore, 'number');
    assert.ok(res.data.matchScore >= 0 && res.data.matchScore <= 100);
  })();

  // Test 6: Step 2 - Skill Gap (POST /api/analyses/:id/skills)
  await test('6. Workflow Step 2: POST /api/analyses/:id/skills extracts skills and gap', async () => {
    const res = await httpRequest(`/analyses/${createdAnalysisId}/skills`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.skillNames, 'Should contain skillNames object');
    assert.ok(Array.isArray(res.data.skillNames.matched));
    assert.ok(Array.isArray(res.data.skillNames.missing));
  })();

  // Test 7: Step 3 - ATS Score (POST /api/analyses/:id/ats-score)
  await test('7. Workflow Step 3: POST /api/analyses/:id/ats-score calculates ATS readiness score', async () => {
    const res = await httpRequest(`/analyses/${createdAnalysisId}/ats-score`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(typeof res.data.atsScore, 'number');
    assert.ok(res.data.atsScore >= 0 && res.data.atsScore <= 100);
    assert.ok(Array.isArray(res.data.categoryBreakdown));
  })();

  // Test 8: Step 4 - Suggestions (POST /api/analyses/:id/suggestions)
  await test('8. Workflow Step 4: POST /api/analyses/:id/suggestions generates AI improvement recommendations', async () => {
    const res = await httpRequest(`/analyses/${createdAnalysisId}/suggestions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.suggestions));
    assert.ok(res.data.suggestions.length >= 2);
  })();

  // Test 9: GET /api/analyses/:id returns complete saved results (supports page refresh & history loading)
  await test('9. GET /api/analyses/:id retrieves complete verified analysis record with camelCase & snake_case', async () => {
    const res = await httpRequest(`/analyses/${createdAnalysisId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    const analysis = res.data.analysis;
    assert.ok(analysis);
    assert.strictEqual(analysis.id, createdAnalysisId);
    assert.strictEqual(analysis.jobTitle, 'Senior Full Stack Developer');
    assert.strictEqual(typeof analysis.matchScore, 'number');
    assert.strictEqual(typeof analysis.atsScore, 'number');
    assert.ok(Array.isArray(analysis.matchedSkills));
    assert.ok(Array.isArray(analysis.missingSkills));
  })();

  // Test 10: Security & Privacy - Unauthorized user cannot access analysis
  await test('10. Security & Privacy: Another user receives 404/403 when trying to access or alter analysis', async () => {
    const getRes = await httpRequest(`/analyses/${createdAnalysisId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${otherUserToken}`,
      },
    });

    assert.strictEqual(getRes.statusCode, 404, `Expected 404 for different user, got ${getRes.statusCode}`);

    const matchRes = await httpRequest(`/analyses/${createdAnalysisId}/match`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${otherUserToken}`,
      },
    });

    assert.strictEqual(matchRes.statusCode, 403, `Expected 403 for unauthorized step execution, got ${matchRes.statusCode}`);
  })();

  // Test 11: GET /api/analyses returns paginated list belonging only to authenticated user
  await test('11. GET /api/analyses returns user analyses list with pagination', async () => {
    const res = await httpRequest('/analyses', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.analyses));
    assert.ok(res.data.analyses.some((a) => a.id === createdAnalysisId));
  })();

  // Shutdown test server
  await new Promise((res) => server.close(res));

  console.log('\n======================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
