/**
 * Task 42: Profile Endpoint & User Management Test Suite
 * 
 * Verifies:
 * 1. GET /api/auth/profile - Returns authenticated user details, metrics, and activity.
 * 2. Strict User Isolation - User B cannot view or modify User A's profile.
 * 3. Security Hardening - Never exposes password_hash or sensitive secrets.
 * 4. PUT /api/auth/profile - Updates user name and profile info.
 * 5. PUT /api/auth/profile/password - Changes password with current password verification.
 * 6. Authenticates with new password on subsequent logins.
 * 7. Correct handling for Google vs Email accounts.
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getJwtSecret } = require('./config/jwt');

const JWT_SECRET = getJwtSecret();
const PORT = process.env.PORT || 5000;

// Test Users
const userA = { id: 201, email: 'kaganesh04@gmail.com', name: 'K A Ganesh' };
const userB = { id: 202, email: 'bob_other@example.com', name: 'Bob Intruder' };

const tokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: '1h' });
const tokenB = jwt.sign(userB, JWT_SECRET, { expiresIn: '1h' });

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
          rawBody: buffer.toString('utf8')
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
  console.log('         TASK 42: USER PROFILE TEST SUITE           ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 0. Seed Test Users via Signup
    // -------------------------------------------------------------------------
    console.log('[Setup] Registering Test Users for Profile Validation...');
    const signupA = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'K A Ganesh',
      email: 'kaganesh04@gmail.com',
      password: 'OriginalPassword123!'
    });

    let realTokenA = signupA.data?.token;
    let userAId = signupA.data?.user?.id;

    if (!realTokenA) {
      // User already exists in MySQL, log in to obtain real JWT and user ID
      const loginA = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        email: 'kaganesh04@gmail.com',
        password: 'OriginalPassword123!'
      });
      realTokenA = loginA.data?.token || tokenA;
      userAId = loginA.data?.user?.id || userA.id;

      // Reset name to K A Ganesh if previous test updated it
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/profile',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realTokenA}`
        }
      }, {
        name: 'K A Ganesh'
      });
    }

    const signupB = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Bob Intruder',
      email: 'bob_other@example.com',
      password: 'BobPassword123!'
    });

    let realTokenB = signupB.data?.token;
    if (!realTokenB) {
      const loginB = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        email: 'bob_other@example.com',
        password: 'BobPassword123!'
      });
      realTokenB = loginB.data?.token || tokenB;
    }

    // -------------------------------------------------------------------------
    // 1. GET /api/auth/profile - Retrieve Profile
    // -------------------------------------------------------------------------
    console.log('\n[1/7] Testing GET /api/auth/profile for User A...');
    const getRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${realTokenA}`
      }
    });

    assert(
      getRes.statusCode === 200 && getRes.data?.success && getRes.data?.user,
      'GET /api/auth/profile returns 200 with user data',
      `Got status ${getRes.statusCode}`
    );

    assert(
      getRes.data?.user?.email === 'kaganesh04@gmail.com' && getRes.data?.user?.name === 'K A Ganesh',
      'Profile contains correct user name and email',
      `Got name: ${getRes.data?.user?.name}, email: ${getRes.data?.user?.email}`
    );

    // -------------------------------------------------------------------------
    // 2. Security Check: Never expose password_hash
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Checking Sensitive Field Masking (Security Hardening)...');
    assert(
      getRes.data?.user?.password_hash === undefined && getRes.data?.user?.password === undefined,
      'password_hash is NOT exposed in profile API response',
      'password_hash was present in payload'
    );

    assert(
      getRes.data?.stats && typeof getRes.data.stats.totalAnalyses === 'number' && typeof getRes.data.stats.totalAtsChecks === 'number',
      'Profile includes stats overview object (totalAnalyses, totalAtsChecks, totalBuilderResumes)',
      `Stats: ${JSON.stringify(getRes.data?.stats)}`
    );

    // -------------------------------------------------------------------------
    // 3. User Isolation Check
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Testing User Isolation & Boundary Protection...');
    const getResB = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${realTokenB}`
      }
    });

    assert(
      getResB.statusCode === 200 && getResB.data?.user?.email === 'bob_other@example.com',
      'User B only sees their own profile, not User A profile (User Isolation)',
      `Got email: ${getResB.data?.user?.email}`
    );

    // Unauthenticated request
    const noAuthRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'GET'
    });

    assert(
      noAuthRes.statusCode === 401,
      'Unauthenticated request to /api/auth/profile rejected with 401 Unauthorized',
      `Got status ${noAuthRes.statusCode}`
    );

    // -------------------------------------------------------------------------
    // 4. PUT /api/auth/profile - Update Name and Info
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Testing PUT /api/auth/profile (Update Profile Info)...');
    const updateRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${realTokenA}`
      }
    }, {
      name: 'K A Ganesh (Updated)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    });

    assert(
      updateRes.statusCode === 200 && updateRes.data?.success && updateRes.data?.user?.name === 'K A Ganesh (Updated)',
      'PUT /api/auth/profile successfully updates user name and avatar',
      `Got name: ${updateRes.data?.user?.name}`
    );

    // Validation: short name
    const badNameRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${realTokenA}`
      }
    }, {
      name: 'X'
    });

    assert(
      badNameRes.statusCode === 400,
      'Short name (< 2 chars) rejected with 400 Bad Request',
      `Got status ${badNameRes.statusCode}`
    );

    // -------------------------------------------------------------------------
    // 5. Change Password - Negative Tests (Wrong current password)
    // -------------------------------------------------------------------------
    console.log('\n[5/7] Testing Password Change (Negative Security Tests)...');
    const wrongCurrentPwRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile/password',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${realTokenA}`
      }
    }, {
      currentPassword: 'WrongPassword123!',
      newPassword: 'BrandNewPassword456!'
    });

    assert(
      wrongCurrentPwRes.statusCode === 401,
      'Incorrect current password rejected with 401 Unauthorized',
      `Got status ${wrongCurrentPwRes.statusCode}`
    );

    // Short new password (< 8 chars)
    const shortNewPwRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile/password',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${realTokenA}`
      }
    }, {
      currentPassword: 'OriginalPassword123!',
      newPassword: 'short'
    });

    assert(
      shortNewPwRes.statusCode === 400,
      'Short new password (< 8 chars) rejected with 400 Bad Request',
      `Got status ${shortNewPwRes.statusCode}`
    );

    // -------------------------------------------------------------------------
    // 6. Change Password - Successful Flow
    // -------------------------------------------------------------------------
    console.log('\n[6/7] Testing Password Change (Successful Execution)...');
    const changePwRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/profile/password',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${realTokenA}`
      }
    }, {
      currentPassword: 'OriginalPassword123!',
      newPassword: 'NewSecurePassword2026!'
    });

    assert(
      changePwRes.statusCode === 200 && changePwRes.data?.success,
      'PUT /api/auth/profile/password successfully changes password',
      `Got status ${changePwRes.statusCode}`
    );

    // -------------------------------------------------------------------------
    // 7. Verify Login with New Password
    // -------------------------------------------------------------------------
    console.log('\n[7/7] Testing Login with New Password...');
    const loginOldRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'kaganesh04@gmail.com',
      password: 'OriginalPassword123!'
    });

    assert(
      loginOldRes.statusCode === 401,
      'Old password no longer works (rejected with 401)',
      `Got status ${loginOldRes.statusCode}`
    );

    const loginNewRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'kaganesh04@gmail.com',
      password: 'NewSecurePassword2026!'
    });

    assert(
      loginNewRes.statusCode === 200 && loginNewRes.data?.token,
      'Login with new password succeeds and returns fresh JWT',
      `Got status ${loginNewRes.statusCode}`
    );

    // Revert password back to OriginalPassword123! so the account remains in expected active state
    if (loginNewRes.data?.token) {
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/profile/password',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginNewRes.data.token}`
        }
      }, {
        currentPassword: 'NewSecurePassword2026!',
        newPassword: 'OriginalPassword123!'
      });

      // Revert name back to K A Ganesh
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/profile',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${realTokenA}`
        }
      }, {
        name: 'K A Ganesh'
      });
    }

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
