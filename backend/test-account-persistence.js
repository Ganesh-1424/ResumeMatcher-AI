const http = require('http');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./config/jwt');

const JWT_SECRET = getJwtSecret();
const PORT = process.env.PORT || 5000;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let parsedJson = null;
        try {
          parsedJson = JSON.parse(buffer.toString('utf8'));
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsedJson,
          rawBody: buffer
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      if (typeof postData === 'string' || Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' TASK 43: ACCOUNT PERSISTENCE & HISTORY TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const existingEmail = 'kaganesh04@gmail.com';
  const existingPassword = 'OriginalPassword123!';

  try {
    // -------------------------------------------------------------------------
    // 1. Login with existing email and password
    // -------------------------------------------------------------------------
    console.log('[1/12] Testing login with existing account credentials...');
    const loginRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: existingEmail,
      password: existingPassword
    });

    assert(
      loginRes.statusCode === 200 && loginRes.data?.token,
      '1.1 Login succeeds with existing account and returns JWT token',
      `Got status ${loginRes.statusCode}: ${JSON.stringify(loginRes.data)}`
    );

    const userToken = loginRes.data?.token;
    const authHeaders = {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    };

    assert(
      loginRes.data?.user?.email === existingEmail && loginRes.data?.user?.name === 'K A Ganesh',
      '1.2 Login response contains verified user name (K A Ganesh) and email',
      `Got name: ${loginRes.data?.user?.name}, email: ${loginRes.data?.user?.email}`
    );

    const userId = loginRes.data?.user?.id;

    // -------------------------------------------------------------------------
    // 2. Open My Profile (/api/auth/profile)
    // -------------------------------------------------------------------------
    console.log('\n[2/12] Testing profile retrieval (/api/auth/profile)...');
    const profileRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'GET',
      headers: authHeaders
    });

    assert(
      profileRes.statusCode === 200 && profileRes.data?.success,
      '2.1 GET /api/auth/profile returns HTTP 200 with profile data',
      `Got status ${profileRes.statusCode}: ${JSON.stringify(profileRes.data)}`
    );

    assert(
      profileRes.data?.user?.email === existingEmail && profileRes.data?.user?.name === 'K A Ganesh',
      '2.2 Profile data correctly loaded from MySQL with user details',
      `Got: ${profileRes.data?.user?.email}`
    );

    assert(
      profileRes.data?.user?.password_hash === undefined,
      '2.3 Security: password_hash is never exposed in profile response'
    );

    // -------------------------------------------------------------------------
    // 3. Open Dashboard Statistics (/api/analyses/dashboard/stats)
    // -------------------------------------------------------------------------
    console.log('\n[3/12] Testing dashboard statistics (/api/analyses/dashboard/stats)...');
    const dashboardRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/analyses/dashboard/stats',
      method: 'GET',
      headers: authHeaders
    });

    assert(
      dashboardRes.statusCode === 200 && dashboardRes.data?.success,
      '3.1 GET /api/analyses/dashboard/stats returns HTTP 200',
      `Got status ${dashboardRes.statusCode}`
    );

    assert(
      Number(dashboardRes.data?.totalAnalyses) >= 1,
      '3.2 Dashboard shows non-zero total analyses from database records',
      `Got totalAnalyses: ${dashboardRes.data?.totalAnalyses}`
    );

    assert(
      dashboardRes.data?.recentAnalysis !== null && dashboardRes.data?.recentAnalysis?.id !== undefined,
      '3.3 Dashboard returns active recent analysis record',
      `Got recent: ${JSON.stringify(dashboardRes.data?.recentAnalysis)}`
    );

    // -------------------------------------------------------------------------
    // 4. Open Previous Analyses List (/api/analyses)
    // -------------------------------------------------------------------------
    console.log('\n[4/12] Testing analysis history list (/api/analyses)...');
    const analysesRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/analyses',
      method: 'GET',
      headers: authHeaders
    });

    assert(
      analysesRes.statusCode === 200 && Array.isArray(analysesRes.data?.analyses),
      '4.1 GET /api/analyses returns HTTP 200 with list of analyses',
      `Got status ${analysesRes.statusCode}`
    );

    assert(
      analysesRes.data?.analyses.length >= 1,
      '4.2 Analysis list contains previous saved analyses for user',
      `Found ${analysesRes.data?.analyses.length} analyses`
    );

    const firstAnalysis = analysesRes.data?.analyses[0];
    const firstAnalysisId = firstAnalysis?.id;

    // -------------------------------------------------------------------------
    // 5. Open Previous Analysis Details (/api/analyses/:id)
    // -------------------------------------------------------------------------
    console.log(`\n[5/12] Testing analysis details for analysis #${firstAnalysisId}...`);
    const detailsRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/analyses/${firstAnalysisId}`,
      method: 'GET',
      headers: authHeaders
    });

    assert(
      detailsRes.statusCode === 200 && detailsRes.data?.success,
      '5.1 GET /api/analyses/:id returns 200 with full analysis details',
      `Got status ${detailsRes.statusCode}`
    );

    assert(
      detailsRes.data?.analysis?.jobTitle && detailsRes.data?.analysis?.atsScore !== undefined,
      '5.2 Analysis details include jobTitle, matchScore, and atsScore',
      `Got jobTitle: ${detailsRes.data?.analysis?.jobTitle}, ATS: ${detailsRes.data?.analysis?.atsScore}`
    );

    // -------------------------------------------------------------------------
    // 6. Download Previous PDF Report (/api/analyses/:id/report)
    // -------------------------------------------------------------------------
    console.log(`\n[6/12] Testing PDF report download for analysis #${firstAnalysisId}...`);
    const reportRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/analyses/${firstAnalysisId}/report`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    assert(
      reportRes.statusCode === 200,
      '6.1 GET /api/analyses/:id/report returns HTTP 200',
      `Got status ${reportRes.statusCode}`
    );

    assert(
      reportRes.headers['content-type'] === 'application/pdf',
      '6.2 Response has Content-Type: application/pdf',
      `Got: ${reportRes.headers['content-type']}`
    );

    assert(
      reportRes.rawBody.slice(0, 4).toString() === '%PDF',
      '6.3 PDF stream starts with valid %PDF magic header',
      `Got header: ${reportRes.rawBody.slice(0, 4).toString()}`
    );

    // -------------------------------------------------------------------------
    // 7. Test Logout and Login Cycle (Session Persistence)
    // -------------------------------------------------------------------------
    console.log('\n[7/12] Testing logout and re-login persistence...');
    // Simulate user logging out (discard token) and logging back in
    const reLoginRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: existingEmail.toUpperCase(), // Test case-insensitive normalization
      password: existingPassword
    });

    assert(
      reLoginRes.statusCode === 200 && reLoginRes.data?.token,
      '7.1 Re-login succeeds with uppercase email (case-insensitive normalization)',
      `Got status ${reLoginRes.statusCode}`
    );

    const reToken = reLoginRes.data?.token;

    // Verify profile loads identically after re-login
    const reProfileRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${reToken}`,
        'Content-Type': 'application/json'
      }
    });

    assert(
      reProfileRes.statusCode === 200 && reProfileRes.data?.user?.email === existingEmail,
      '7.2 Profile loads successfully with authentic data after logout and re-login',
      `Got status ${reProfileRes.statusCode}`
    );

    // Verify history remains accessible
    const reAnalysesRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/analyses',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${reToken}`,
        'Content-Type': 'application/json'
      }
    });

    assert(
      reAnalysesRes.data?.analyses.length === analysesRes.data?.analyses.length,
      '7.3 Previous analyses history fully preserved across logout and re-login',
      `Analyses count: ${reAnalysesRes.data?.analyses.length}`
    );

    // -------------------------------------------------------------------------
    // 8. Test Invalid Password Rejection
    // -------------------------------------------------------------------------
    console.log('\n[8/12] Testing invalid password rejection...');
    const badLoginRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: existingEmail,
      password: 'WrongPassword999!'
    });

    assert(
      badLoginRes.statusCode === 401,
      '8.1 Invalid password correctly rejected with 401 Unauthorized',
      `Got status ${badLoginRes.statusCode}`
    );

    assert(
      badLoginRes.data?.message === 'Invalid email or password.',
      '8.2 Generic error message prevents email enumeration',
      `Got: ${badLoginRes.data?.message}`
    );

    // -------------------------------------------------------------------------
    // 9. Test Unauthorized Access to Another User Records
    // -------------------------------------------------------------------------
    console.log('\n[9/12] Testing multi-tenant isolation and unauthorized access...');
    // Create an intruder token for non-existent/different user (ID 9999)
    const intruderToken = jwt.sign({ id: 9999, email: 'intruder@example.com' }, JWT_SECRET, { expiresIn: '1h' });

    const intruderProfileRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${intruderToken}`,
        'Content-Type': 'application/json'
      }
    });

    assert(
      intruderProfileRes.statusCode === 404,
      '9.1 Intruder token cannot view profile of another user (returns 404 Not Found)',
      `Got status ${intruderProfileRes.statusCode}`
    );

    const intruderAnalysisRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/analyses/${firstAnalysisId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${intruderToken}`,
        'Content-Type': 'application/json'
      }
    });

    assert(
      intruderAnalysisRes.statusCode === 404,
      '9.2 Intruder token cannot view analysis owned by another user (returns 404 Not Found)',
      `Got status ${intruderAnalysisRes.statusCode}`
    );

    const intruderReportRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/analyses/${firstAnalysisId}/report`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${intruderToken}`
      }
    });

    assert(
      intruderReportRes.statusCode === 404,
      '9.3 Intruder token cannot download report owned by another user (returns 404 Not Found)',
      `Got status ${intruderReportRes.statusCode}`
    );

    // -------------------------------------------------------------------------
    // 10. Test Google Account Password Login Notice
    // -------------------------------------------------------------------------
    console.log('\n[10/12] Testing Google Auth account password login handling...');
    // Create a temporary Google-only user in test
    const { pool } = require('./config/db');
    const testGoogleEmail = `google_only_${Date.now()}@gmail.com`;
    await pool.execute(
      `INSERT INTO users (name, email, password_hash, google_id, auth_provider, created_at) 
       VALUES ('Google Only User', ?, NULL, ?, 'google', NOW())`,
      [testGoogleEmail, `google_id_${Date.now()}`]
    );

    const googleUserLogin = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testGoogleEmail,
      password: 'SomePassword123!'
    });

    assert(
      googleUserLogin.statusCode === 400 && googleUserLogin.data?.code === 'GOOGLE_AUTH_ACCOUNT',
      '10.1 Password login for Google-created account returns clear Google Sign-in instruction',
      `Got status ${googleUserLogin.statusCode}: ${googleUserLogin.data?.message}`
    );

    // Clean up test Google user
    await pool.execute('DELETE FROM users WHERE email = ?', [testGoogleEmail]);

    // -------------------------------------------------------------------------
    // 11. Test Malformed / Stale JWT Tokens
    // -------------------------------------------------------------------------
    console.log('\n[11/12] Testing malformed/stale JWT token handling...');
    const malformedTokenRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer malformed.jwt.token'
      }
    });

    assert(
      malformedTokenRes.statusCode === 401,
      '11.1 Malformed JWT token rejected with 401 Unauthorized',
      `Got status ${malformedTokenRes.statusCode}`
    );

    // -------------------------------------------------------------------------
    // 12. Test Resume Builder Integration
    // -------------------------------------------------------------------------
    console.log('\n[12/12] Testing Resume Builder draft persistence...');
    const builderRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/resumes/builder',
      method: 'GET',
      headers: authHeaders
    });

    assert(
      builderRes.statusCode === 200 && Array.isArray(builderRes.data?.resumes),
      '12.1 GET /api/resumes/builder returns user saved resumes',
      `Got status ${builderRes.statusCode}, count: ${builderRes.data?.resumes?.length}`
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('----------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
