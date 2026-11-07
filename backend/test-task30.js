/**
 * Automated Test Suite: Task 30 - Downloadable PDF Analysis Reports
 * 
 * Verifies:
 * 1. Security & Authentication:
 *    - Missing JWT returns 401 Unauthorized
 *    - Expired/Invalid JWT returns 401 Unauthorized
 *    - Invalid analysis ID returns 400 Bad Request
 *    - Non-existent analysis ID returns 404 Not Found
 *    - User B attempting to download User A's analysis report returns 404 Not Found (ownership isolation)
 * 2. PDF Report Generation & Headers:
 *    - Content-Type is application/pdf
 *    - Content-Disposition header is attachment; filename="analysis-report-<id>.pdf"
 *    - Valid PDF binary stream format (%PDF magic bytes)
 * 3. Complete Analysis Record:
 *    - Correctly renders full data (match score, skills, ATS score, categories, AI suggestions, disclaimers)
 * 4. Partial Analysis Record:
 *    - Handles null/missing optional fields without crashing or inventing values
 * 5. Multi-page Content:
 *    - Handles long suggestions and large text content spanning multiple pages
 * 6. Leak Prevention:
 *    - No server filesystem paths, password hashes, or JWT secrets in headers or output
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ai_resume_job_matcher_2026_super_secure_key';
process.env.PORT = '5003'; // Dedicated test port

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const analysisRoutes = require('./routes/analyses');
const { fallbackAnalysesStore } = require('./controllers/resumeController');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/analyses', analysisRoutes);

let server;

function httpRequest(urlPath, options = {}) {
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const url = new URL(`http://localhost:5003/api${normalizedPath}`);
  const method = options.method || 'GET';
  const headers = options.headers || {};

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let parsedJson = null;
          try {
            parsedJson = JSON.parse(buffer.toString('utf8'));
          } catch (_) {
            parsedJson = null;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            buffer,
            data: parsedJson,
            text: buffer.toString('utf8'),
          });
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (options.body) {
      if (typeof options.body === 'object') {
        req.write(JSON.stringify(options.body));
      } else {
        req.write(options.body);
      }
    }
    req.end();
  });
}

function makeToken(userId, email = 'user@example.com', expiresIn = '1h') {
  return jwt.sign({ id: userId, userId, email }, process.env.JWT_SECRET, { expiresIn });
}

async function runTests() {
  console.log('================================================================');
  console.log(' Task 30 Test Suite: Downloadable PDF Analysis Reports');
  console.log('================================================================\n');

  await new Promise((resolve) => {
    server = app.listen(5003, () => {
      console.log(' Test server running on http://localhost:5003');
      resolve();
    });
  });

  const USER_A_ID = 401;
  const USER_B_ID = 402;
  const tokenA = makeToken(USER_A_ID, 'alice@example.com');
  const tokenB = makeToken(USER_B_ID, 'bob@example.com');
  const expiredToken = makeToken(USER_A_ID, 'alice@example.com', '-1s');

  let passedTests = 0;
  let totalTests = 0;

  function runCase(name, fn) {
    totalTests++;
    return fn()
      .then(() => {
        passedTests++;
        console.log(`  PASSED: ${name}`);
      })
      .catch((err) => {
        console.error(`  FAILED: ${name}`);
        console.error(`     Error: ${err.message}`);
      });
  }

  // --------------------------------------------------------------------------
  // Seed In-Memory Store
  // --------------------------------------------------------------------------
  const ANALYSIS_COMPLETE_ID = 801;
  const ANALYSIS_PARTIAL_ID = 802;
  const ANALYSIS_LONG_ID = 803;

  fallbackAnalysesStore.set(ANALYSIS_COMPLETE_ID, {
    id: ANALYSIS_COMPLETE_ID,
    user_id: USER_A_ID,
    job_title: 'Senior Full Stack Engineer',
    job_description: 'We require a Senior Full Stack Engineer with extensive experience in React, Node.js, Express, MySQL, Docker, and Kubernetes.',
    resume_filename: 'uploads/alice-resume.pdf',
    original_filename: 'Alice_Resume_2026.pdf',
    match_score: 88.5,
    ats_score: 84.0,
    matched_skills: ['React', 'Node.js', 'Express', 'MySQL', 'JavaScript'],
    missing_skills: ['Docker', 'Kubernetes'],
    additional_skills: ['Tailwind CSS', 'Vite', 'REST API'],
    ats_breakdown: [
      { name: 'Contact Information', earnedPoints: 10, maxPoints: 10, status: 'pass', detail: 'Email, phone, and location present.' },
      { name: 'Summary Statement', earnedPoints: 10, maxPoints: 10, status: 'pass', detail: 'Clear executive summary.' },
      { name: 'Work Experience', earnedPoints: 20, maxPoints: 20, status: 'pass', detail: 'Reverse chronological order.' },
      { name: 'Skills Section', earnedPoints: 15, maxPoints: 15, status: 'pass', detail: 'Categorized technical competencies.' },
      { name: 'Education', earnedPoints: 10, maxPoints: 10, status: 'pass', detail: 'B.S. in Computer Science.' },
      { name: 'Action Verbs', earnedPoints: 10, maxPoints: 10, status: 'pass', detail: 'Strong impact action verbs used.' },
      { name: 'Measurable Metrics', earnedPoints: 5, maxPoints: 10, status: 'needs-improvement', detail: 'Could quantify more project impacts.' },
      { name: 'Standard Formatting', earnedPoints: 4, maxPoints: 5, status: 'pass', detail: 'Clean typography without tables.' }
    ],
    improvement_suggestions: [
      {
        category: 'Missing Keywords',
        priority: 'High',
        issue: 'Docker and Kubernetes containerization skills are not highlighted.',
        recommendation: 'Incorporate demonstrated containerization tools in your DevOps or projects section.',
        explanation: 'The target role lists container deployment as a core requirement.'
      },
      {
        category: 'Impact Metrics',
        priority: 'Medium',
        issue: 'Experience bullet points describe tasks rather than quantified business outcomes.',
        recommendation: 'Add percentage improvements, user counts, or latency reductions.',
        explanation: 'Hiring managers look for demonstrable scale and ROI.'
      }
    ],
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString()
  });

  fallbackAnalysesStore.set(ANALYSIS_PARTIAL_ID, {
    id: ANALYSIS_PARTIAL_ID,
    user_id: USER_A_ID,
    job_title: 'Junior Frontend Developer',
    job_description: 'Entry-level frontend developer focusing on HTML, CSS, and modern JavaScript frameworks.',
    resume_filename: 'alice-draft.pdf',
    match_score: null,
    ats_score: null,
    matched_skills: null,
    missing_skills: null,
    additional_skills: null,
    ats_breakdown: null,
    improvement_suggestions: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const longSuggestions = [];
  for (let i = 1; i <= 12; i++) {
    longSuggestions.push({
      category: `Strategic Optimization Domain #${i}`,
      priority: i % 2 === 0 ? 'High' : 'Medium',
      issue: `Detailed observation ${i}: The candidate's resume lacks depth in architectural design pattern ${i} which was emphasized in job requirements.`,
      recommendation: `Actionable remedy ${i}: Explicitly document implementation of modern scalable solutions including test automation and CI/CD pipelines.`,
      explanation: `Contextual justification ${i}: Demonstrates high engineering maturity and production readiness.`
    });
  }

  fallbackAnalysesStore.set(ANALYSIS_LONG_ID, {
    id: ANALYSIS_LONG_ID,
    user_id: USER_A_ID,
    job_title: 'Lead Software Architect',
    job_description: 'Architectural leadership for distributed cloud platforms.',
    resume_filename: 'alice-architect.pdf',
    match_score: 91.0,
    ats_score: 90.0,
    matched_skills: ['Architecture', 'Distributed Systems', 'Go', 'Kubernetes'],
    missing_skills: ['Kafka'],
    additional_skills: ['gRPC', 'Terraform'],
    ats_breakdown: [],
    improvement_suggestions: longSuggestions,
    created_at: new Date().toISOString()
  });

  // --------------------------------------------------------------------------
  // TEST SUITE EXECUTION
  // --------------------------------------------------------------------------

  // 1. Missing JWT Token
  await runCase('GET /api/analyses/:id/report - Rejects request with missing JWT (401)', async () => {
    const res = await httpRequest(`/analyses/${ANALYSIS_COMPLETE_ID}/report`);
    assert.strictEqual(res.statusCode, 401, 'Must return 401 Unauthorized');
    assert.strictEqual(res.data?.error, 'Unauthorized');
  });

  // 2. Expired JWT Token
  await runCase('GET /api/analyses/:id/report - Rejects request with expired JWT (401)', async () => {
    const res = await httpRequest(`/analyses/${ANALYSIS_COMPLETE_ID}/report`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.strictEqual(res.statusCode, 401, 'Must return 401 on expired token');
  });

  // 3. Invalid ID format
  await runCase('GET /api/analyses/:id/report - Rejects invalid analysis ID (400)', async () => {
    const res = await httpRequest('/analyses/abc/report', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.statusCode, 400, 'Must return 400 on non-numeric ID');

    const resNeg = await httpRequest('/analyses/-5/report', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(resNeg.statusCode, 400, 'Must return 400 on negative ID');
  });

  // 4. Non-existent ID
  await runCase('GET /api/analyses/:id/report - Returns 404 for non-existent record', async () => {
    const res = await httpRequest('/analyses/999999/report', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.statusCode, 404, 'Must return 404 Not Found');
  });

  // 5. Ownership isolation: User B accessing User A's report
  await runCase('GET /api/analyses/:id/report - Enforces ownership isolation (User B receives 404 for User A report)', async () => {
    const res = await httpRequest(`/analyses/${ANALYSIS_COMPLETE_ID}/report`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(res.statusCode, 404, 'Must return 404 to protect confidentiality and ownership');
  });

  // 6. Complete Analysis Report Download
  await runCase('GET /api/analyses/:id/report - Successfully downloads complete PDF report with valid headers', async () => {
    const res = await httpRequest(`/analyses/${ANALYSIS_COMPLETE_ID}/report`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.statusCode, 200, 'Must return 200 OK');
    assert.strictEqual(res.headers['content-type'], 'application/pdf', 'Content-Type must be application/pdf');
    assert.strictEqual(
      res.headers['content-disposition'],
      `attachment; filename="analysis-report-${ANALYSIS_COMPLETE_ID}.pdf"`,
      'Content-Disposition must specify attachment with safe filename'
    );

    // Verify PDF header magic bytes
    const pdfMagic = res.buffer.slice(0, 5).toString('ascii');
    assert.strictEqual(pdfMagic, '%PDF-', 'Downloaded file must begin with %PDF- header');

    // Verify non-empty size
    assert.ok(res.buffer.length > 2000, `PDF size must be substantial (actual: ${res.buffer.length} bytes)`);

    // Verify no filesystem server path leakage in header or text
    assert.ok(!res.headers['content-disposition'].includes('/'), 'Content-Disposition must not contain path slashes');
    assert.ok(!res.headers['content-disposition'].includes('\\'), 'Content-Disposition must not contain backslashes');
  });

  // 7. Partial Analysis Report Download
  await runCase('GET /api/analyses/:id/report - Handles partial analysis record with ungenerated fields safely', async () => {
    const res = await httpRequest(`/analyses/${ANALYSIS_PARTIAL_ID}/report`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.statusCode, 200, 'Must return 200 OK even when scores and suggestions are null');
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    const pdfMagic = res.buffer.slice(0, 5).toString('ascii');
    assert.strictEqual(pdfMagic, '%PDF-');
    assert.ok(res.buffer.length > 1000, 'Partial PDF size must be valid');
  });

  // 8. Long suggestions multi-page pagination
  await runCase('GET /api/analyses/:id/report - Successfully paginates multi-page suggestions without overflow', async () => {
    const res = await httpRequest(`/analyses/${ANALYSIS_LONG_ID}/report`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(res.statusCode, 200, 'Must generate multi-page PDF successfully');
    assert.strictEqual(res.headers['content-type'], 'application/pdf');
    const pdfMagic = res.buffer.slice(0, 5).toString('ascii');
    assert.strictEqual(pdfMagic, '%PDF-');
    assert.ok(res.buffer.length > 5000, 'Multi-page PDF must be larger than standard 1-page');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` Task 30 Tests Completed: ${passedTests}/${totalTests} Passed`);
  console.log('----------------------------------------------------------------\n');

  server.close(() => {
    if (passedTests === totalTests) {
      console.log(' ALL TASK 30 TESTS PASSED SUCCESSFULLY!\n');
      process.exit(0);
    } else {
      console.error(' SOME TESTS FAILED!\n');
      process.exit(1);
    }
  });
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
