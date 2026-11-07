const http = require('http');
const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('./server');
const { getJwtSecret } = require('./config/jwt');

let server;
let port;
let userAToken;
let userBToken;
let userAAnalysisId;
let userAResumeId;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: port,
        ...options,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed, rawBody: body });
          } catch {
            resolve({ statusCode: res.statusCode, headers: res.headers, data: null, rawBody: body });
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

async function runJwtVerificationTests() {
  console.log('================================================================');
  console.log(' End-to-End JWT Authentication & Resume Analysis Workflow Test');
  console.log('================================================================\n');

  server = app.listen(0, '127.0.0.1', async () => {
    port = server.address().port;
    const jwtSecret = getJwtSecret();

    try {
      // ----------------------------------------------------------------------
      // SECTION 1: User Signup & Login Token Issuance
      // ----------------------------------------------------------------------
      console.log('--- SECTION 1: User Signup & Login Token Issuance ---');

      const userAEmail = `jwttester_a_${Date.now()}@example.com`;
      const signupResA = await makeRequest(
        {
          path: '/api/auth/signup',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Alice Developer',
          email: userAEmail,
          password: 'Password123!',
        }
      );
      assert.strictEqual(signupResA.statusCode, 201, '1.1 User A signup succeeds with 201');
      assert.ok(signupResA.data.token, '1.2 Returns valid application JWT token on signup');
      assert.strictEqual(signupResA.data.token.split('.').length, 3, '1.3 Token has standard 3-segment JWT format');

      // Login User A
      const loginResA = await makeRequest(
        {
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          email: userAEmail,
          password: 'Password123!',
        }
      );
      assert.strictEqual(loginResA.statusCode, 200, '1.4 User A login succeeds with 200');
      userAToken = loginResA.data.token;
      assert.ok(userAToken, '1.5 Login returns valid JWT token');
      console.log('  [PASS] 1. User A signed up and logged in, JWT token issued.');

      // Signup User B for cross-user isolation verification
      const userBEmail = `jwttester_b_${Date.now()}@example.com`;
      const signupResB = await makeRequest(
        {
          path: '/api/auth/signup',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Bob Candidate',
          email: userBEmail,
          password: 'Password123!',
        }
      );
      assert.strictEqual(signupResB.statusCode, 201, '1.6 User B signup succeeds with 201');
      userBToken = signupResB.data.token;
      console.log('  [PASS] 2. User B signed up, separate JWT token issued.');

      // ----------------------------------------------------------------------
      // SECTION 2: Authorization Header & Bearer Parsing Resilience
      // ----------------------------------------------------------------------
      console.log('\n--- SECTION 2: Authorization Header & Token Parsing ---');

      // 2.1 Standard Bearer token
      const stdRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(stdRes.statusCode, 200, '2.1 Standard Bearer <token> accepted (200)');
      console.log('  [PASS] 2.1 Standard Authorization: Bearer <token> accepted.');

      // 2.2 Multiple spaces between Bearer and token
      const multiSpaceRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer    ${userAToken}` },
      });
      assert.strictEqual(multiSpaceRes.statusCode, 200, '2.2 Multiple spaces handled gracefully');
      console.log('  [PASS] 2.2 Bearer with multiple spaces handled gracefully.');

      // 2.3 Accidental duplicate Bearer prefix: Bearer Bearer <token>
      const dupBearerRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer Bearer ${userAToken}` },
      });
      assert.strictEqual(dupBearerRes.statusCode, 200, '2.3 Duplicate Bearer Bearer handled gracefully');
      console.log('  [PASS] 2.3 Accidental duplicate Bearer prefix stripped and accepted.');

      // 2.4 Quoted token: Bearer "<token>"
      const quotedRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer "${userAToken}"` },
      });
      assert.strictEqual(quotedRes.statusCode, 200, '2.4 Quoted token unquoted and accepted');
      console.log('  [PASS] 2.4 Quoted token handled and unquoted safely.');

      // 2.5 Missing Authorization header
      const missingRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
      });
      assert.strictEqual(missingRes.statusCode, 401, '2.5 Missing header rejected with 401');
      assert.strictEqual(missingRes.data.code, 'AUTH_HEADER_MISSING');
      console.log('  [PASS] 2.5 Missing Authorization header cleanly rejected (401 AUTH_HEADER_MISSING).');

      // 2.6 Malformed header format (no Bearer)
      const noBearerRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Basic ${userAToken}` },
      });
      assert.strictEqual(noBearerRes.statusCode, 401, '2.6 Non-Bearer scheme rejected with 401');
      assert.strictEqual(noBearerRes.data.code, 'AUTH_FORMAT_INVALID');
      console.log('  [PASS] 2.6 Non-Bearer scheme rejected (401 AUTH_FORMAT_INVALID).');

      // 2.7 Literal "undefined" / "null" token
      const undefinedRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': 'Bearer undefined' },
      });
      assert.strictEqual(undefinedRes.statusCode, 401, '2.7 Bearer undefined rejected with 401');
      assert.strictEqual(undefinedRes.data.code, 'TOKEN_MISSING');
      console.log('  [PASS] 2.7 Literal "undefined" token rejected (401 TOKEN_MISSING).');

      // 2.8 Expired token
      const expiredToken = jwt.sign({ id: 101, email: 'expired@example.com' }, jwtSecret, { expiresIn: '-10s' });
      const expiredRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${expiredToken}` },
      });
      assert.strictEqual(expiredRes.statusCode, 401, '2.8 Expired token rejected with 401');
      assert.strictEqual(expiredRes.data.code, 'TOKEN_EXPIRED');
      console.log('  [PASS] 2.8 Expired token rejected with 401 (TOKEN_EXPIRED).');

      // 2.9 Tampered signature
      const tamperedToken = jwt.sign({ id: 101, email: 'tampered@example.com' }, 'completely_wrong_secret_key');
      const tamperedRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tamperedToken}` },
      });
      assert.strictEqual(tamperedRes.statusCode, 401, '2.9 Tampered token rejected with 401');
      assert.strictEqual(tamperedRes.data.code, 'TOKEN_INVALID');
      console.log('  [PASS] 2.9 Tampered token rejected with 401 (TOKEN_INVALID).');

      // 2.10 Simulated Google ID token sent directly to protected API
      const fakeGoogleIdToken = jwt.sign(
        {
          iss: 'https://accounts.google.com',
          sub: '109283091823901',
          email: 'googleuser@gmail.com',
          email_verified: true,
        },
        'google_mock_secret'
      );
      const googleTokenRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${fakeGoogleIdToken}` },
      });
      assert.strictEqual(googleTokenRes.statusCode, 401, '2.10 Google ID token detected and rejected');
      assert.strictEqual(googleTokenRes.data.code, 'TOKEN_IS_GOOGLE_ID');
      console.log('  [PASS] 2.10 Google ID token correctly caught and rejected with clear directive.');

      // ----------------------------------------------------------------------
      // SECTION 3: Complete Protected Resume Analysis Workflow
      // ----------------------------------------------------------------------
      console.log('\n--- SECTION 3: Complete Resume Analysis Workflow Execution ---');

      // 3.1 Step 1: Upload PDF Resume (POST /api/resumes/upload)
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const samplePdfContent =
        '%PDF-1.4\n' +
        '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n' +
        '2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n' +
        '3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj\n' +
        '4 0 obj <</Length 230>> stream\n' +
        'BT /F1 12 Tf 72 712 Td (Alice Developer - Full Stack Engineer) Tj\n' +
        '0 -20 Td (Email: alice@example.com) Tj\n' +
        '0 -20 Td (Skills: JavaScript, React, Node.js, Express, MySQL, Tailwind CSS, Git) Tj ET\n' +
        'endstream endobj\n' +
        'xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000201 00000 n \n' +
        'trailer <</Size 5 /Root 1 0 R>>\nstartxref\n500\n%%EOF';

      const multipartBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="alice_resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
        Buffer.from(samplePdfContent, 'utf8'),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const uploadRes = await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: port,
            path: '/api/resumes/upload',
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userAToken}`,
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': multipartBody.length,
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data) }));
          }
        );
        req.on('error', reject);
        req.write(multipartBody);
        req.end();
      });

      assert.strictEqual(uploadRes.statusCode, 200, '3.1 POST /api/resumes/upload succeeds with 200');
      userAResumeId = uploadRes.data.analysisId;
      assert.ok(userAResumeId, 'Returns valid analysisId');
      console.log('  [PASS] 3.1 Resume Upload (POST /api/resumes/upload) succeeded with user JWT.');

      // 3.2 Step 2: Extract text from resume (POST /api/resumes/:id/extract-text)
      const extractRes = await makeRequest({
        path: `/api/resumes/${userAResumeId}/extract-text`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(extractRes.statusCode, 200, '3.2 Text extraction succeeds (200)');
      assert.ok(extractRes.data.text, 'Extracted text returned');
      console.log('  [PASS] 3.2 Resume Text Extraction (POST /api/resumes/:id/extract-text) succeeded.');

      // 3.3 Step 3: Create Job Analysis (POST /api/analyses)
      const createRes = await makeRequest(
        {
          path: '/api/analyses',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userAToken}`,
            'Content-Type': 'application/json',
          },
        },
        {
          resumeId: userAResumeId,
          jobTitle: 'Senior React Developer',
          jobDescription: 'Seeking a Senior React Developer proficient in JavaScript, React, Node.js, Express, and MySQL. Experience with Tailwind CSS and Git required.',
        }
      );
      assert.strictEqual(createRes.statusCode, 201, '3.3 POST /api/analyses succeeds with 201');
      userAAnalysisId = createRes.data.analysis.id;
      assert.ok(userAAnalysisId, 'Returns created analysis ID');
      console.log('  [PASS] 3.3 Create Job Analysis (POST /api/analyses) succeeded with user JWT, id:', userAAnalysisId);

      // 3.4 Step 4: Semantic Matching (POST /api/analyses/:id/match)
      const matchRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}/match`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(matchRes.statusCode, 200, '3.4 Semantic match succeeds with 200');
      assert.ok(typeof matchRes.data.matchScore === 'number', 'Returns numeric match score');
      console.log(`  [PASS] 3.4 Semantic Match (POST /api/analyses/:id/match) score: ${matchRes.data.matchScore}%`);

      // 3.5 Step 5: Skill Gap Analysis (POST /api/analyses/:id/skills)
      const skillsRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}/skills`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.ok(Array.isArray(skillsRes.data.skills?.matched || skillsRes.data.skillNames?.matched), 'Returns matched skills array');
      const matchedCount = (skillsRes.data.skills?.matched || skillsRes.data.skillNames?.matched || []).length;
      console.log(`  [PASS] 3.5 Skill Gap Analysis (POST /api/analyses/:id/skills) matched: ${matchedCount} skills.`);

      // 3.6 Step 6: ATS Readiness Scoring (POST /api/analyses/:id/ats-score)
      const atsRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}/ats-score`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(atsRes.statusCode, 200, '3.6 ATS scoring succeeds with 200');
      assert.ok(typeof atsRes.data.atsScore === 'number', 'Returns numeric ATS score');
      console.log(`  [PASS] 3.6 ATS Scoring (POST /api/analyses/:id/ats-score) score: ${atsRes.data.atsScore}%`);

      // 3.7 Step 7: AI Improvement Suggestions (POST /api/analyses/:id/suggestions)
      const suggRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}/suggestions`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(suggRes.statusCode, 200, '3.7 Suggestions succeed with 200');
      assert.ok(Array.isArray(suggRes.data.suggestions), 'Returns suggestions array');
      console.log(`  [PASS] 3.7 AI Suggestions (POST /api/analyses/:id/suggestions) generated: ${suggRes.data.suggestions.length} items.`);

      // 3.8 Step 8: Dashboard Statistics (GET /api/analyses/dashboard/stats)
      const statsRes = await makeRequest({
        path: '/api/analyses/dashboard/stats',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(statsRes.statusCode, 200, '3.8 Dashboard stats succeeds with 200');
      console.log('  [PASS] 3.8 Dashboard Statistics (GET /api/analyses/dashboard/stats) retrieved.');

      // 3.9 Step 9: Analysis History List (GET /api/analyses)
      const listRes = await makeRequest({
        path: '/api/analyses',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(listRes.statusCode, 200, '3.9 Analysis history succeeds with 200');
      assert.ok(Array.isArray(listRes.data.analyses), 'Returns analyses array');
      console.log(`  [PASS] 3.9 Analysis History (GET /api/analyses) returned ${listRes.data.analyses.length} record(s).`);

      // 3.10 Step 10: Analysis Details (GET /api/analyses/:id)
      const detailRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(detailRes.statusCode, 200, '3.10 Analysis details succeeds with 200');
      assert.strictEqual(detailRes.data.analysis.id, userAAnalysisId);
      console.log('  [PASS] 3.10 Analysis Details (GET /api/analyses/:id) retrieved intact.');

      // 3.11 Step 11: PDF Report Generation (GET /api/analyses/:id/report)
      const reportRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}/report`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userAToken}` },
      });
      assert.strictEqual(reportRes.statusCode, 200, '3.11 PDF report stream succeeds with 200');
      assert.strictEqual(reportRes.headers['content-type'], 'application/pdf');
      console.log('  [PASS] 3.11 PDF Report Generation (GET /api/analyses/:id/report) streamed valid PDF.');

      // ----------------------------------------------------------------------
      // SECTION 4: Multi-User Isolation & Ownership Defense
      // ----------------------------------------------------------------------
      console.log('\n--- SECTION 4: Multi-User Security & Isolation ---');

      // User B tries to access User A's analysis
      const userBDetailRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userBToken}` },
      });
      assert.strictEqual(userBDetailRes.statusCode, 404, '4.1 User B cannot access User A analysis (404 Not Found prevents ID enumeration)');
      console.log('  [PASS] 4.1 User B blocked from accessing User A analysis (404 prevents enumeration).');

      // User B tries to download User A's PDF report
      const userBReportRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}/report`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userBToken}` },
      });
      assert.strictEqual(userBReportRes.statusCode, 404, '4.2 User B cannot download User A PDF report');
      console.log('  [PASS] 4.2 User B blocked from downloading User A PDF report.');

      // User B tries to run AI matching on User A's analysis
      const userBMatchRes = await makeRequest({
        path: `/api/analyses/${userAAnalysisId}/match`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userBToken}` },
      });
      assert.ok(userBMatchRes.statusCode === 403 || userBMatchRes.statusCode === 404, '4.3 User B blocked from triggering AI match on User A record');
      console.log('  [PASS] 4.3 User B blocked from computing AI match on User A record.');

      console.log('\n================================================================');
      console.log(' ALL JWT AUTHENTICATION & WORKFLOW TESTS PASSED (100%)');
      console.log('================================================================\n');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test failed with error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runJwtVerificationTests();
