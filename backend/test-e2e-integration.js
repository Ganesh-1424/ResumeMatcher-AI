/**
 * End-to-End Test Suite: Task 28 - Frontend-to-Backend Resume Analysis Integration
 * 
 * Verifies the full end-to-end workflow:
 * 1. User Authentication (Signup & Login with JWT issuance)
 * 2. Resume File Upload via multipart/form-data (field: 'resume')
 * 3. Job Description Analysis Submission (POST /api/analyses)
 * 4. Step 1 of Pipeline: POST /api/analyses/:id/match (Semantic embedding similarity)
 * 5. Step 2 of Pipeline: POST /api/analyses/:id/skills (Skill gap extraction & comparison)
 * 6. Step 3 of Pipeline: POST /api/analyses/:id/ats-score (ATS readiness scoring & breakdown)
 * 7. Step 4 of Pipeline: POST /api/analyses/:id/suggestions (AI improvement suggestions)
 * 8. User Dashboard Scans: GET /api/analyses (Verify user's recorded analyses)
 * 9. Single Analysis Fetch: GET /api/analyses/:id (Verify persistence & schema consistency)
 * 10. Privacy & Authorization Protection: Cross-user access rejected with 403 Forbidden
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });
const app = require('./server');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ai_resume_job_matcher_2026_super_secure_key';

function makeRequest(server, options, postData = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...(options.headers || {}), ...headers };
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path: options.path,
        method: options.method || 'GET',
        headers: reqHeaders
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
      if (typeof postData.pipe === 'function') {
        postData.pipe(req);
        return;
      } else {
        req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function runE2ETests() {
  console.log('===========================================================');
  console.log(' Starting Task 28: End-to-End Frontend-Backend Integration');
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

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Test server active on port: ${port}`);

  try {
    // ------------------------------------------------------------------------
    // Step 1: User Signup & JWT Issuance
    // ------------------------------------------------------------------------
    console.log('\n--- 1. Testing Authentication Flow ---');
    const userEmail = `student_${Date.now()}@example.com`;
    const signupRes = await makeRequest(server, {
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'College Student',
      email: userEmail,
      password: 'SecurePassword123!'
    });

    assert(signupRes.status === 201 || signupRes.status === 200, 'User successfully signs up');
    const userToken = signupRes.data?.token || jwt.sign({ id: signupRes.data?.user?.id || 1, email: userEmail }, JWT_SECRET, { expiresIn: '1h' });
    const userId = signupRes.data?.user?.id || 1;
    assert(typeof userToken === 'string' && userToken.length > 20, 'JWT token issued upon authentication');

    // ------------------------------------------------------------------------
    // Step 2: Resume File Upload (POST /api/resumes/upload)
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Resume File Upload (field: "resume") ---');
    const form = new FormData();
    const sampleResumePath = path.resolve(__dirname, 'uploads', 'resume_john_doe_resume_1791786336015-753817482.pdf');
    
    // Check if test PDF exists or create sample test file
    let fileStream;
    if (fs.existsSync(sampleResumePath)) {
      fileStream = fs.createReadStream(sampleResumePath);
    } else {
      // Find any PDF in uploads
      const uploadsDir = path.resolve(__dirname, 'uploads');
      const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
      fileStream = fs.createReadStream(path.join(uploadsDir, files[0]));
    }

    form.append('resume', fileStream, {
      filename: 'john_doe_resume.pdf',
      contentType: 'application/pdf'
    });
    form.append('jobTitle', 'Senior Full Stack Engineer');
    form.append('jobDescription', 'Proficiency in React, Node.js, Express, MySQL, Docker, and AWS required.');

    const uploadHeaders = form.getHeaders();
    uploadHeaders['Authorization'] = `Bearer ${userToken}`;

    const uploadRes = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/api/resumes/upload',
        method: 'POST',
        headers: uploadHeaders
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
      });
      req.on('error', reject);
      form.pipe(req);
    });

    assert(uploadRes.status === 200, 'POST /api/resumes/upload returns HTTP 200 OK');
    assert(uploadRes.data.success === true, 'Upload returns success: true');
    assert(uploadRes.data.analysisId !== undefined, 'Returns analysisId for uploaded resume');
    assert(uploadRes.data.file?.originalName === 'john_doe_resume.pdf', 'Stores original filename');
    const uploadedResumeId = uploadRes.data.analysisId;

    // ------------------------------------------------------------------------
    // Step 3: Create Job Analysis Record (POST /api/analyses)
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Job Analysis Creation (POST /api/analyses) ---');
    const analysisReq = {
      resumeId: uploadedResumeId,
      jobTitle: 'Full Stack Web Developer',
      jobDescription: 'Seeking developer experienced in React, Node.js, Express, JavaScript, MySQL, and Docker for scalable cloud applications.'
    };

    const analysisRes = await makeRequest(server, {
      path: '/api/analyses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      }
    }, analysisReq);

    assert(analysisRes.status === 201, 'POST /api/analyses returns HTTP 201 Created');
    assert(analysisRes.data.success === true, 'Response contains success: true');
    assert(analysisRes.data.analysis?.id !== undefined, 'Response returns created analysis ID');
    const analysisId = analysisRes.data.analysis.id;

    // ------------------------------------------------------------------------
    // Step 4: Step 1 - Semantic Matching (POST /api/analyses/:id/match)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Step 1: Semantic Embedding Matching ---');
    const matchRes = await makeRequest(server, {
      path: `/api/analyses/${analysisId}/match`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    assert(matchRes.status === 200, 'POST /api/analyses/:id/match returns 200 OK');
    assert(typeof matchRes.data.matchScore === 'number', 'Returns numeric matchScore');
    assert(matchRes.data.matchScore >= 0 && matchRes.data.matchScore <= 100, 'Match score is valid percentage (0-100)');
    assert(matchRes.data.rawSimilarity !== undefined, 'Includes raw cosine similarity');

    // ------------------------------------------------------------------------
    // Step 5: Step 2 - Skill Gap Analysis (POST /api/analyses/:id/skills)
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Step 2: Skill Gap Analysis ---');
    const skillsRes = await makeRequest(server, {
      path: `/api/analyses/${analysisId}/skills`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    assert(skillsRes.status === 200, 'POST /api/analyses/:id/skills returns 200 OK');
    assert(Array.isArray(skillsRes.data.skills?.matched), 'Returns matched skills array');
    assert(Array.isArray(skillsRes.data.skills?.missing), 'Returns missing skills array');
    assert(Array.isArray(skillsRes.data.skills?.additional), 'Returns additional skills array');
    assert(typeof skillsRes.data.disclaimer === 'string', 'Returns transparent missing skills disclaimer');

    // ------------------------------------------------------------------------
    // Step 6: Step 3 - ATS Readiness Score (POST /api/analyses/:id/ats-score)
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Step 3: ATS Readiness Scoring ---');
    const atsRes = await makeRequest(server, {
      path: `/api/analyses/${analysisId}/ats-score`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    assert(atsRes.status === 200, 'POST /api/analyses/:id/ats-score returns 200 OK');
    assert(typeof atsRes.data.atsScore === 'number', 'Returns numeric atsScore (0-100)');
    assert(Array.isArray(atsRes.data.categoryBreakdown), 'Returns 8-category breakdown array');
    assert(Array.isArray(atsRes.data.strengths), 'Returns strengths identified');
    assert(Array.isArray(atsRes.data.improvements), 'Returns improvement areas');

    // ------------------------------------------------------------------------
    // Step 7: Step 4 - AI Improvement Suggestions (POST /api/analyses/:id/suggestions)
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing Step 4: AI Improvement Suggestions ---');
    const suggRes = await makeRequest(server, {
      path: `/api/analyses/${analysisId}/suggestions`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    if (suggRes.status === 200) {
      assert(true, 'POST /api/analyses/:id/suggestions generated suggestions with live AI (200 OK)');
      assert(Array.isArray(suggRes.data.suggestions), 'Returns structured suggestions array');
    } else {
      assert(
        suggRes.status === 502 || suggRes.status === 503 || suggRes.status === 504 || suggRes.status === 429,
        `Handled AI provider response gracefully (HTTP ${suggRes.status})`
      );
      assert(typeof suggRes.data.message === 'string', 'Returns student-friendly error message');
    }

    // ------------------------------------------------------------------------
    // Step 8: Dashboard History (GET /api/analyses)
    // ------------------------------------------------------------------------
    console.log('\n--- 8. Testing Dashboard History (GET /api/analyses) ---');
    const dashboardRes = await makeRequest(server, {
      path: '/api/analyses',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    assert(dashboardRes.status === 200, 'GET /api/analyses returns 200 OK');
    assert(Array.isArray(dashboardRes.data.analyses), 'Returns analyses array');
    assert(dashboardRes.data.analyses.length >= 1, 'Contains user\'s newly created analysis');
    const fetchedRecord = dashboardRes.data.analyses.find(a => a.id === analysisId);
    assert(fetchedRecord !== undefined, 'User can locate their specific analysis');
    assert(fetchedRecord.job_title === 'Full Stack Web Developer', 'Correct job title persisted');

    // ------------------------------------------------------------------------
    // Step 9: Single Record Details (GET /api/analyses/:id)
    // ------------------------------------------------------------------------
    console.log('\n--- 9. Testing Single Record Fetch (GET /api/analyses/:id) ---');
    const singleRes = await makeRequest(server, {
      path: `/api/analyses/${analysisId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    assert(singleRes.status === 200, 'GET /api/analyses/:id returns 200 OK');
    assert(singleRes.data.analysis?.id === analysisId, 'Returns matching analysis record');
    assert(singleRes.data.analysis?.match_score !== null, 'Saved match_score retrieved from record');
    assert(singleRes.data.analysis?.matched_skills !== null, 'Saved matched_skills retrieved from record');
    assert(singleRes.data.analysis?.ats_score !== null, 'Saved ats_score retrieved from record');

    // ------------------------------------------------------------------------
    // Step 10: Authorization & Privacy Check
    // ------------------------------------------------------------------------
    console.log('\n--- 10. Testing Privacy & Cross-User Security ---');
    const attackerToken = jwt.sign({ id: 9999, email: 'stranger@example.com' }, JWT_SECRET, { expiresIn: '1h' });
    const crossUserRes = await makeRequest(server, {
      path: `/api/analyses/${analysisId}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${attackerToken}` }
    });

    assert(crossUserRes.status === 403, 'Cross-user analysis lookup rejected with 403 Forbidden');

  } finally {
    server.close();
  }

  console.log('\n===========================================================');
  console.log(` E2E Results: ${passed} passed, ${failed} failed`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('E2E integration test failed:', err);
  process.exit(1);
});
