/**
 * Test Suite: Task 29 - Persistent Analysis History and Dashboard APIs
 * 
 * Verifies:
 * 1. GET /api/analyses:
 *    - JWT authentication required (401 on missing/invalid token)
 *    - User isolation: returns only records belonging to the authenticated user
 *    - Correct payload fields (id, jobTitle, resumeFilename, matchScore, atsScore, createdAt)
 *    - Pagination (page, limit, total, totalPages, hasNextPage, hasPrevPage)
 *    - Search filtering by job title
 *    - Sorting by creation date (desc, asc)
 *    - Parameter sanitization and validation
 * 2. GET /api/analyses/:id:
 *    - JWT authentication required
 *    - Ownership verification: returns 404 if record does not belong to user or does not exist
 *    - Returns complete analysis: jobTitle, jobDescription, resumeFilename, matchScore, atsScore,
 *      matchedSkills, missingSkills, additionalSkills, atsBreakdown, improvementSuggestions, createdAt
 *    - Sensitive data protection: no password hashes, JWT secrets, or disk paths returned
 * 3. GET /api/analyses/dashboard/stats:
 *    - Returns totalAnalyses, averageMatchScore, averageAtsScore, analysesLast30Days, recentAnalysis
 *    - Correct calculations across completed scores only
 *    - Graceful zero/empty state for new users without NaN or exceptions
 */

const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ai_resume_job_matcher_2026_super_secure_key';
process.env.PORT = '5002'; // Dedicated test port

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

async function httpRequest(urlPath, options = {}) {
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const url = new URL(`http://localhost:5002/api${normalizedPath}`);
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

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('--- Task 29: Persistent Analysis History & Dashboard APIs Test ---');
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

  // Start server
  await new Promise((res) => {
    server = app.listen(5002, () => res());
  });

  const USER1_ID = 501;
  const USER2_ID = 502;
  const EMPTY_USER_ID = 503;

  const user1Token = jwt.sign(
    { id: USER1_ID, email: 'alice@test.com', name: 'Alice' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  const user2Token = jwt.sign(
    { id: USER2_ID, email: 'bob@test.com', name: 'Bob' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  const emptyUserToken = jwt.sign(
    { id: EMPTY_USER_ID, email: 'empty@test.com', name: 'Empty User' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  // Seed sample test records into fallback store for deterministic verification
  // Record 1: Alice - Full Stack (completed scores)
  fallbackAnalysesStore.set(1001, {
    id: 1001,
    user_id: USER1_ID,
    job_title: 'Full Stack Engineer',
    job_description: 'React, Node.js, Express, MySQL, Docker requirements.',
    resume_filename: 'alice_fullstack_resume.pdf',
    original_filename: 'alice_fullstack_resume.pdf',
    match_score: 90,
    ats_score: 85,
    matched_skills: ['React', 'Node.js', 'MySQL'],
    missing_skills: ['Docker'],
    additional_skills: ['Express', 'Git'],
    ats_breakdown: [{ name: 'Contact Info', earnedPoints: 15, maxPoints: 15, status: 'complete' }],
    improvement_suggestions: [
      { category: 'Skills', issue: 'Missing Docker', recommendation: 'Learn Docker', priority: 'High', explanation: 'Required for CI/CD' }
    ],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  });

  // Record 2: Alice - Frontend Developer (completed scores)
  fallbackAnalysesStore.set(1002, {
    id: 1002,
    user_id: USER1_ID,
    job_title: 'Senior Frontend Developer',
    job_description: 'Deep React, TypeScript, Tailwind CSS, performance optimization.',
    resume_filename: 'alice_frontend_resume.pdf',
    original_filename: 'alice_frontend_resume.pdf',
    match_score: 80,
    ats_score: 75,
    matched_skills: ['React', 'Tailwind CSS'],
    missing_skills: ['TypeScript'],
    additional_skills: ['HTML5', 'CSS3'],
    ats_breakdown: [{ name: 'Experience', earnedPoints: 20, maxPoints: 20, status: 'complete' }],
    improvement_suggestions: [],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  });

  // Record 3: Alice - Data Analyst (pending match score)
  fallbackAnalysesStore.set(1003, {
    id: 1003,
    user_id: USER1_ID,
    job_title: 'Data Analyst Intern',
    job_description: 'Python, SQL, Tableau, data visualization and reporting.',
    resume_filename: 'alice_data_resume.pdf',
    original_filename: 'alice_data_resume.pdf',
    match_score: null,
    ats_score: null,
    matched_skills: null,
    missing_skills: null,
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago (> 30 days)
  });

  // Record 4: Bob - DevOps Engineer
  fallbackAnalysesStore.set(2001, {
    id: 2001,
    user_id: USER2_ID,
    job_title: 'DevOps Platform Engineer',
    job_description: 'Kubernetes, Terraform, AWS, Prometheus monitoring.',
    resume_filename: 'bob_devops_resume.pdf',
    original_filename: 'bob_devops_resume.pdf',
    match_score: 95,
    ats_score: 90,
    created_at: new Date(),
  });

  // --------------------------------------------------------------------------
  // PART 1: GET /api/analyses
  // --------------------------------------------------------------------------

  // Test 1.1: Authentication protection
  await test('1.1 GET /api/analyses requires JWT authentication (rejects 401 on missing token)', async () => {
    const res = await httpRequest('/analyses');
    assert.strictEqual(res.statusCode, 401);
  })();

  await test('1.2 GET /api/analyses rejects invalid JWT token with 401', async () => {
    const res = await httpRequest('/analyses', {
      headers: { Authorization: 'Bearer bad_token_123' },
    });
    assert.strictEqual(res.statusCode, 401);
  })();

  // Test 1.3: User isolation
  await test('1.3 GET /api/analyses returns only records belonging to authenticated user', async () => {
    const res = await httpRequest('/analyses', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.analyses));

    // Must include Alice's records but NOT Bob's record (2001)
    const ids = res.data.analyses.map((a) => a.id);
    assert.ok(ids.includes(1001), 'Includes Alice record 1001');
    assert.ok(ids.includes(1002), 'Includes Alice record 1002');
    assert.ok(!ids.includes(2001), 'Does NOT include Bob record 2001');
  })();

  // Test 1.4: Required fields in list records
  await test('1.4 GET /api/analyses returns required fields for each analysis record', async () => {
    const res = await httpRequest('/analyses', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const record = res.data.analyses.find((a) => a.id === 1001);
    assert.ok(record, 'Record 1001 exists');
    assert.strictEqual(record.id, 1001);
    assert.strictEqual(record.jobTitle, 'Full Stack Engineer');
    assert.ok(record.resumeFilename);
    assert.strictEqual(record.matchScore, 90);
    assert.strictEqual(record.atsScore, 85);
    assert.ok(record.createdAt);
  })();

  // Test 1.5: Pagination
  await test('1.5 GET /api/analyses supports pagination (?page=1&limit=2)', async () => {
    const res = await httpRequest('/analyses?page=1&limit=2', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.analyses.length, 2);
    assert.ok(res.data.pagination);
    assert.strictEqual(res.data.pagination.page, 1);
    assert.strictEqual(res.data.pagination.limit, 2);
    assert.ok(res.data.pagination.total >= 3);
    assert.strictEqual(res.data.pagination.hasNextPage, true);
  })();

  // Test 1.6: Search filtering
  await test('1.6 GET /api/analyses supports search by job title (?search=Frontend)', async () => {
    const res = await httpRequest('/analyses?search=Frontend', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.data.analyses.length >= 1);
    assert.ok(res.data.analyses.every((a) => a.jobTitle.toLowerCase().includes('frontend')));
  })();

  // Test 1.7: Sorting by date
  await test('1.7 GET /api/analyses supports sorting (?sort=asc and ?sort=desc)', async () => {
    const resDesc = await httpRequest('/analyses?sort=desc', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(resDesc.statusCode, 200);
    const dateDesc1 = new Date(resDesc.data.analyses[0].createdAt).getTime();
    const dateDesc2 = new Date(resDesc.data.analyses[1].createdAt).getTime();
    assert.ok(dateDesc1 >= dateDesc2, 'Desc sort orders latest first');

    const resAsc = await httpRequest('/analyses?sort=asc', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(resAsc.statusCode, 200);
    const dateAsc1 = new Date(resAsc.data.analyses[0].createdAt).getTime();
    const dateAsc2 = new Date(resAsc.data.analyses[1].createdAt).getTime();
    assert.ok(dateAsc1 <= dateAsc2, 'Asc sort orders oldest first');
  })();

  // Test 1.8: Empty history for new user
  await test('1.8 GET /api/analyses returns empty array and zero total for user with no analyses', async () => {
    const res = await httpRequest('/analyses', {
      headers: { Authorization: `Bearer ${emptyUserToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.analyses.length, 0);
    assert.strictEqual(res.data.pagination.total, 0);
  })();

  // --------------------------------------------------------------------------
  // PART 2: GET /api/analyses/:id
  // --------------------------------------------------------------------------

  // Test 2.1: Authentication protection
  await test('2.1 GET /api/analyses/:id requires JWT authentication', async () => {
    const res = await httpRequest('/analyses/1001');
    assert.strictEqual(res.statusCode, 401);
  })();

  // Test 2.2: Ownership verification (Bob cannot access Alice's analysis)
  await test('2.2 GET /api/analyses/:id returns 404 when requesting another user\'s analysis', async () => {
    const res = await httpRequest('/analyses/1001', {
      headers: { Authorization: `Bearer ${user2Token}` }, // Bob requesting Alice's record
    });
    assert.strictEqual(res.statusCode, 404);
  })();

  // Test 2.3: Non-existent record
  await test('2.3 GET /api/analyses/:id returns 404 for non-existent record ID', async () => {
    const res = await httpRequest('/analyses/999999', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.statusCode, 404);
  })();

  // Test 2.4: Invalid ID parameter
  await test('2.4 GET /api/analyses/:id returns 400 for invalid non-numeric ID', async () => {
    const res = await httpRequest('/analyses/invalid-id-xyz', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.statusCode, 400);
  })();

  // Test 2.5: Full analysis details payload
  await test('2.5 GET /api/analyses/:id returns complete analysis with all required fields', async () => {
    const res = await httpRequest('/analyses/1001', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    const a = res.data.analysis;
    assert.ok(a);
    assert.strictEqual(a.id, 1001);
    assert.strictEqual(a.jobTitle, 'Full Stack Engineer');
    assert.ok(a.jobDescription.includes('React'));
    assert.strictEqual(a.resumeFilename, 'alice_fullstack_resume.pdf');
    assert.strictEqual(a.matchScore, 90);
    assert.strictEqual(a.atsScore, 85);
    assert.ok(Array.isArray(a.matchedSkills) && a.matchedSkills.includes('React'));
    assert.ok(Array.isArray(a.missingSkills) && a.missingSkills.includes('Docker'));
    assert.ok(Array.isArray(a.additionalSkills));
    assert.ok(Array.isArray(a.atsBreakdown));
    assert.ok(Array.isArray(a.improvementSuggestions));
    assert.ok(a.createdAt);

    // Security check: Never return secrets or passwords
    assert.strictEqual(a.password, undefined);
    assert.strictEqual(a.password_hash, undefined);
    assert.strictEqual(a.jwt_secret, undefined);
  })();

  // --------------------------------------------------------------------------
  // PART 3: GET /api/analyses/dashboard/stats
  // --------------------------------------------------------------------------

  // Test 3.1: Authentication protection
  await test('3.1 GET /api/analyses/dashboard/stats requires JWT authentication', async () => {
    const res = await httpRequest('/analyses/dashboard/stats');
    assert.strictEqual(res.statusCode, 401);
  })();

  // Test 3.2: Accurate dashboard statistics for user with records
  await test('3.2 GET /api/analyses/dashboard/stats returns accurate metrics for user with analyses', async () => {
    const res = await httpRequest('/analyses/dashboard/stats', {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);

    const stats = res.data.stats || res.data;
    assert.strictEqual(stats.totalAnalyses, 3, 'Total analyses is 3');

    // Average match score: (90 + 80) / 2 = 85 (ignoring null record 1003)
    assert.strictEqual(stats.averageMatchScore, 85, 'Average match score across completed records is 85');

    // Average ATS score: (85 + 75) / 2 = 80 (ignoring null record 1003)
    assert.strictEqual(stats.averageAtsScore, 80, 'Average ATS score across completed records is 80');

    // Records created in last 30 days: 1001 (5 days) and 1002 (2 days) = 2
    assert.strictEqual(stats.analysesLast30Days, 2, '2 analyses in the last 30 days');

    // Most recent analysis: 1002 (2 days ago)
    assert.ok(stats.recentAnalysis);
    assert.strictEqual(stats.recentAnalysis.id, 1002);
  })();

  // Test 3.3: Graceful stats handling for empty user
  await test('3.3 GET /api/analyses/dashboard/stats handles user with no analyses gracefully without NaN', async () => {
    const res = await httpRequest('/analyses/dashboard/stats', {
      headers: { Authorization: `Bearer ${emptyUserToken}` },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);

    const stats = res.data.stats || res.data;
    assert.strictEqual(stats.totalAnalyses, 0);
    assert.strictEqual(stats.averageMatchScore, null);
    assert.strictEqual(stats.averageAtsScore, null);
    assert.strictEqual(stats.analysesLast30Days, 0);
    assert.strictEqual(stats.recentAnalysis, null);
  })();

  // Shutdown server
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
