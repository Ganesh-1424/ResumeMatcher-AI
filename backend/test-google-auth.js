const http = require('http');
const assert = require('assert');
const app = require('./server');

let server;
let port;

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

async function runGoogleAuthTests() {
  console.log('================================================================');
  console.log(' Task 36: Google Authentication (OpenID Connect) Test Suite');
  console.log('================================================================\n');

  server = app.listen(0, '127.0.0.1', async () => {
    port = server.address().port;

    try {
      // ------------------------------------------------------------------------
      // 1. Missing / Malformed Token Validation
      // ------------------------------------------------------------------------
      console.log('--- 1. Token Validation & Boundary Defenses ---');

      // 1.1 Missing token
      const missingTokenRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        {}
      );
      assert.strictEqual(missingTokenRes.statusCode, 400, '1.1 Missing credential returns 400 Bad Request');
      assert.strictEqual(missingTokenRes.data.error, 'Bad Request');
      console.log('  [PASS] 1.1 Rejects request missing credential with 400 Bad Request');

      // 1.2 Invalid malformed token
      const invalidTokenRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: 'not_a_valid_google_jwt_token' }
      );
      assert.strictEqual(invalidTokenRes.statusCode, 401, '1.2 Invalid token returns 401 Unauthorized');
      console.log('  [PASS] 1.2 Rejects malformed / unverifiable Google token with 401 Unauthorized');

      // 1.3 Expired token
      const expiredMockToken = `mock_google_id_token_:sub_expired_123:expired.user@gmail.com:Expired User:expected_aud:true:-3600`;
      const expiredRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: expiredMockToken }
      );
      assert.strictEqual(expiredRes.statusCode, 401, '1.3 Expired token returns 401 Unauthorized');
      assert.ok(expiredRes.data.message.includes('expired'), '1.3 Error message mentions expired token');
      console.log('  [PASS] 1.3 Rejects expired Google token with 401 Unauthorized');

      // 1.4 Token issued for another OAuth client (Audience Mismatch)
      // When client ID is configured, a token for another audience must be rejected
      process.env.GOOGLE_CLIENT_ID = 'intended_app_client_id.apps.googleusercontent.com';
      const wrongAudToken = `mock_google_id_token_:sub_wrong_aud:hacker@gmail.com:Attacker:attacker_client_id.apps.googleusercontent.com:true:3600`;
      const wrongAudRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: wrongAudToken }
      );
      assert.strictEqual(wrongAudRes.statusCode, 401, '1.4 Wrong audience returns 401 Unauthorized');
      assert.ok(wrongAudRes.data.message.includes('mismatch'), '1.4 Error message identifies audience mismatch');
      console.log('  [PASS] 1.4 Rejects token issued for different OAuth client with 401 Unauthorized');

      // 1.5 Unverified email address
      const unverifiedToken = `mock_google_id_token_:sub_unverified:unverified@gmail.com:Unverified User:intended_app_client_id.apps.googleusercontent.com:false:3600`;
      const unverifiedRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: unverifiedToken }
      );
      assert.strictEqual(unverifiedRes.statusCode, 403, '1.5 Unverified email returns 403 Forbidden');
      assert.ok(unverifiedRes.data.message.includes('not verified'), '1.5 Error message clarifies unverified email status');
      console.log('  [PASS] 1.5 Rejects Google accounts with unverified email addresses (403 Forbidden)');

      // ------------------------------------------------------------------------
      // 2. Successful Google Sign-In & User Provisioning
      // ------------------------------------------------------------------------
      console.log('\n--- 2. Successful Google Sign-In & Application JWT Issuance ---');

      const testGoogleSub = `g_sub_${Date.now()}`;
      const testGoogleEmail = `student.google.${Date.now()}@gmail.com`;
      const testGoogleName = 'Jordan Google Student';
      const validGoogleToken = `mock_google_id_token_:${testGoogleSub}:${testGoogleEmail}:${encodeURIComponent(testGoogleName)}:intended_app_client_id.apps.googleusercontent.com:true:3600`;

      const firstLoginRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: validGoogleToken }
      );

      assert.strictEqual(firstLoginRes.statusCode, 200, '2.1 First-time Google sign-in returns 200 OK');
      assert.ok(firstLoginRes.data.success, '2.1.1 Response indicates success');
      assert.ok(firstLoginRes.data.token, '2.1.2 Returns application JWT token');
      assert.strictEqual(firstLoginRes.data.user.email, testGoogleEmail, '2.1.3 Returns correct verified email');
      assert.strictEqual(firstLoginRes.data.user.name, testGoogleName, '2.1.4 Returns correct Google name');
      assert.strictEqual(firstLoginRes.data.user.password_hash, undefined, '2.1.5 Never exposes password_hash in response');
      const firstUserId = firstLoginRes.data.user.id;
      const appJwtToken = firstLoginRes.data.token;
      console.log('  [PASS] 2.1 First-time Google sign-in successfully provisions account and issues JWT');

      // ------------------------------------------------------------------------
      // 3. Repeated Login by Same Google Account (No Duplication)
      // ------------------------------------------------------------------------
      console.log('\n--- 3. Repeated Login by Same Google Account ---');

      const secondLoginRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: validGoogleToken }
      );

      assert.strictEqual(secondLoginRes.statusCode, 200, '3.1 Repeated Google login returns 200 OK');
      assert.strictEqual(secondLoginRes.data.user.id, firstUserId, '3.1.1 Preserves identical user ID without creating duplicate');
      assert.strictEqual(secondLoginRes.data.user.email, testGoogleEmail, '3.1.2 Preserves verified email');
      assert.ok(secondLoginRes.data.token, '3.1.3 Re-issues fresh application JWT');
      console.log('  [PASS] 3.1 Repeated login by same Google account re-authenticates without account duplication');

      // ------------------------------------------------------------------------
      // 4. Email Collision with Existing Password Account (Anti-Hijack Defense)
      // ------------------------------------------------------------------------
      console.log('\n--- 4. Email Collision Security Defense ---');

      // Create a password-based user first
      const collisionEmail = `local.dev.${Date.now()}@example.com`;
      const collisionPassword = 'Password123!';
      const signupRes = await makeRequest(
        { path: '/api/auth/signup', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { name: 'Local Password User', email: collisionEmail, password: collisionPassword }
      );
      assert.strictEqual(signupRes.statusCode, 201, '4.1 Pre-existing password account created (201)');

      // Attempt Google sign-in with the exact same email from an unlinked Google account
      const attackerGoogleSub = `g_sub_attacker_${Date.now()}`;
      const collidingGoogleToken = `mock_google_id_token_:${attackerGoogleSub}:${collisionEmail}:Impostor:intended_app_client_id.apps.googleusercontent.com:true:3600`;

      const collisionRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: collidingGoogleToken }
      );

      assert.strictEqual(collisionRes.statusCode, 409, '4.2 Email collision safely blocked with 409 Conflict');
      assert.strictEqual(collisionRes.data.error, 'Conflict');
      assert.strictEqual(collisionRes.data.code, 'EMAIL_COLLISION_PASSWORD_EXISTS');
      assert.ok(collisionRes.data.message.includes('password authentication'), '4.2 Informs user to sign in using password first');
      console.log('  [PASS] 4.1 Unlinked Google login attempting takeover of existing password account safely rejected (409 Conflict)');

      // ------------------------------------------------------------------------
      // 5. Safe Account Linking with Password Verification
      // ------------------------------------------------------------------------
      console.log('\n--- 5. Safe Account Linking Flow ---');

      // Attempt linking with wrong password -> 401
      const wrongPassLinkRes = await makeRequest(
        { path: '/api/auth/google/link', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: collisionEmail, password: 'WrongPassword!', credential: collidingGoogleToken }
      );
      assert.strictEqual(wrongPassLinkRes.statusCode, 401, '5.1 Linking with wrong password returns 401');
      console.log('  [PASS] 5.1 Account linking rejected when password verification fails');

      // Link with correct password -> 200
      const validLinkRes = await makeRequest(
        { path: '/api/auth/google/link', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: collisionEmail, password: collisionPassword, credential: collidingGoogleToken }
      );
      assert.strictEqual(validLinkRes.statusCode, 200, '5.2 Linking with correct password returns 200 OK');
      assert.ok(validLinkRes.data.token, '5.2 Returns valid application JWT');
      console.log('  [PASS] 5.2 Account safely linked to Google after password verification');

      // Now Google login for this account succeeds
      const linkedGoogleLoginRes = await makeRequest(
        { path: '/api/auth/google', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { credential: collidingGoogleToken }
      );
      assert.strictEqual(linkedGoogleLoginRes.statusCode, 200, '5.3 Linked account can now log in via Google');
      assert.strictEqual(linkedGoogleLoginRes.data.user.email, collisionEmail);
      console.log('  [PASS] 5.3 Linked account successfully authenticates with Google on subsequent logins');

      // ------------------------------------------------------------------------
      // 6. JWT Protection & Application Endpoint Compatibility
      // ------------------------------------------------------------------------
      console.log('\n--- 6. JWT-Protected Endpoints with Google-Issued JWT ---');

      // 6.1 Access Profile
      const profileRes = await makeRequest({
        path: '/api/auth/profile',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${appJwtToken}` }
      });
      assert.strictEqual(profileRes.statusCode, 200, '6.1 Profile access succeeds with Google-issued JWT');
      assert.strictEqual(profileRes.data.user.email, testGoogleEmail);
      assert.strictEqual(profileRes.data.user.password_hash, undefined, '6.1.1 Password hash omitted from profile');
      console.log('  [PASS] 6.1 Google-authenticated user accesses /api/auth/profile with 200 OK');

      // 6.2 Access Dashboard Stats
      const statsRes = await makeRequest({
        path: '/api/analyses/dashboard/stats',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${appJwtToken}` }
      });
      assert.strictEqual(statsRes.statusCode, 200, '6.2 Dashboard stats accessible with Google-issued JWT');
      assert.ok(statsRes.data.stats !== undefined);
      console.log('  [PASS] 6.2 Google-authenticated user accesses dashboard stats with 200 OK');

      // ------------------------------------------------------------------------
      // 7. Preservation of Email/Password Authentication
      // ------------------------------------------------------------------------
      console.log('\n--- 7. Email/Password Signup and Login Preservation ---');

      const regularEmail = `regular.student.${Date.now()}@example.com`;
      const regularPassword = 'MySecretPass2026!';

      // Signup
      const regularSignupRes = await makeRequest(
        { path: '/api/auth/signup', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { name: 'Standard User', email: regularEmail, password: regularPassword }
      );
      assert.strictEqual(regularSignupRes.statusCode, 201, '7.1 Standard signup continues to work (201)');

      // Login
      const regularLoginRes = await makeRequest(
        { path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: regularEmail, password: regularPassword }
      );
      assert.strictEqual(regularLoginRes.statusCode, 200, '7.2 Standard login continues to work (200)');
      assert.ok(regularLoginRes.data.token, '7.2.1 Returns JWT');

      // Wrong password
      const wrongLoginRes = await makeRequest(
        { path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: regularEmail, password: 'WrongPassword123' }
      );
      assert.strictEqual(wrongLoginRes.statusCode, 401, '7.3 Invalid password rejected with 401');
      console.log('  [PASS] 7.1 Existing email/password signup and login preserved with zero regressions');

      console.log('\n================================================================');
      console.log(' ALL TASK 36 GOOGLE AUTHENTICATION TESTS PASSED (100%)');
      console.log('================================================================\n');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test failed:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runGoogleAuthTests();
