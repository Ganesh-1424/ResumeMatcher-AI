const http = require('http');
const assert = require('assert');
const app = require('./server');

let server;
let port;
let token;
let userResumeId;

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

async function runCopyPasteTests() {
  console.log('================================================================');
  console.log(' Job Description Textarea Copy/Paste & Lifecycle Test Suite');
  console.log('================================================================\n');

  server = app.listen(0, '127.0.0.1', async () => {
    port = server.address().port;

    try {
      // 1. Authenticate user
      const signupRes = await makeRequest(
        {
          path: '/api/auth/signup',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Paste Tester',
          email: `pastetester_${Date.now()}@example.com`,
          password: 'Password123!',
        }
      );
      assert.strictEqual(signupRes.statusCode, 201, '1. User signup succeeds with 201');
      token = signupRes.data.token;
      assert.ok(token, 'JWT token returned');
      console.log('  [PASS] 1. User authenticated with JWT session token');

      // 2. Upload valid resume
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const genuinePdfContent = 
        '%PDF-1.4\n' +
        '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n' +
        '2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n' +
        '3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj\n' +
        '4 0 obj <</Length 245>> stream\n' +
        'BT /F1 12 Tf 72 712 Td (Alice Verified - Full Stack Cloud Engineer) Tj\n' +
        '0 -20 Td (Email: alice.verified@example.com | Phone: 555-0199) Tj\n' +
        '0 -20 Td (Skills: JavaScript, TypeScript, React, Node.js, Express, MySQL, Docker, AWS) Tj ET\n' +
        'endstream endobj\n' +
        'xref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000201 00000 n \n' +
        'trailer <</Size 5 /Root 1 0 R>>\nstartxref\n500\n%%EOF';
      const pdfHeader = Buffer.from(genuinePdfContent, 'utf8');
      const filename = 'sample_resume.pdf';

      let multipartBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${filename}"\r\nContent-Type: application/pdf\r\n\r\n`),
        pdfHeader,
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
              'Authorization': `Bearer ${token}`,
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

      assert.strictEqual(uploadRes.statusCode, 200, '2. Resume upload succeeds');
      userResumeId = uploadRes.data.analysisId;
      assert.ok(userResumeId, 'Valid analysis ID returned');
      console.log('  [PASS] 2. Resume uploaded successfully, staged as analysisId:', userResumeId);

      // 3. Test Pasting a Short Job Description (~150 chars)
      const pastedShortDesc = 'We are seeking a Full Stack Developer to build modern web applications using React, Node.js, Express, and MySQL. Experience with REST APIs and Git required.';
      const shortAnalysisRes = await makeRequest(
        {
          path: '/api/analyses',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        {
          resumeId: userResumeId,
          jobTitle: 'Full Stack Developer',
          jobDescription: pastedShortDesc,
        }
      );
      assert.strictEqual(shortAnalysisRes.statusCode, 201, '3. Pasted short job description accepted (201)');
      assert.strictEqual(shortAnalysisRes.data.analysis.jobDescription, pastedShortDesc, 'Pasted short description matches verbatim');
      console.log('  [PASS] 3. Pasted short job description saved and verified accurately');

      // 4. Test Pasting a Long Job Description (5,000 chars)
      const baseBlock = 'Senior Backend Engineer role: Architect and optimize microservices in Node.js and Express. Maintain high performance database queries in MySQL. Collaborate with frontend React teams. ';
      let pastedLongDesc = baseBlock.repeat(30).substring(0, 5000);
      const longAnalysisRes = await makeRequest(
        {
          path: '/api/analyses',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        {
          resumeId: userResumeId,
          jobTitle: 'Senior Backend Engineer',
          jobDescription: pastedLongDesc,
        }
      );
      assert.strictEqual(longAnalysisRes.statusCode, 201, '4. Pasted 5,000 char job description accepted (201)');
      assert.strictEqual(longAnalysisRes.data.analysis.jobDescription.length, 5000, 'Length is exactly 5,000 characters');
      console.log('  [PASS] 4. Pasted 5,000 character job description accepted and saved without truncation');

      // 5. Test Pasting Maximum Allowed 10,000 Characters
      const full10kDesc = 'Full Stack Cloud Engineer: Build scalable cloud-native architectures with React and Node.js. '.repeat(150).substring(0, 10000);
      assert.strictEqual(full10kDesc.length, 10000, 'Full string is exactly 10,000 characters');

      const max10kRes = await makeRequest(
        {
          path: '/api/analyses',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        {
          resumeId: userResumeId,
          jobTitle: 'Principal Cloud Architect',
          jobDescription: full10kDesc,
        }
      );
      assert.strictEqual(max10kRes.statusCode, 201, '5. Pasted 10,000 char job description accepted (201)');
      assert.strictEqual(max10kRes.data.analysis.jobDescription.length, 10000, 'Saved description retains all 10,000 characters');
      const maxAnalysisId = max10kRes.data.analysis.id;
      console.log('  [PASS] 5. Exactly 10,000 character pasted description saved successfully');

      // 6. Test Editing Pasted Text (Simulating user editing / appending to pasted text)
      const editedPastedDesc = full10kDesc.substring(0, 9900) + ' [Edited by applicant: specialized in AWS Lambda & Docker].';
      const editedRes = await makeRequest(
        {
          path: '/api/analyses',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        {
          resumeId: userResumeId,
          jobTitle: 'Cloud Specialist',
          jobDescription: editedPastedDesc,
        }
      );
      assert.strictEqual(editedRes.statusCode, 201, '6. Edited pasted text accepted (201)');
      assert.ok(editedRes.data.analysis.jobDescription.includes('[Edited by applicant: specialized in AWS Lambda & Docker].'), 'Contains newly appended text');
      console.log('  [PASS] 6. Edited pasted text correctly submitted and persisted in database');

      // 7. Verify Retrieval of Pasted 10,000 char analysis via GET /api/analyses/:id
      const fetchRes = await makeRequest({
        path: `/api/analyses/${maxAnalysisId}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      assert.strictEqual(fetchRes.statusCode, 200, '7. GET /api/analyses/:id succeeds');
      assert.strictEqual(fetchRes.data.analysis.jobDescription.length, 10000, 'Retrieved description has complete 10,000 characters');
      console.log('  [PASS] 7. Retrieved full 10,000 character description intact from MySQL storage');

      // 8. Boundary: Rejecting over limit (> 10,000 chars)
      const overLimitDesc = 'A'.repeat(10001);
      const overRes = await makeRequest(
        {
          path: '/api/analyses',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        {
          resumeId: userResumeId,
          jobTitle: 'Over Limit Role',
          jobDescription: overLimitDesc,
        }
      );
      assert.strictEqual(overRes.statusCode, 400, '8. Exceeding 10,000 characters properly rejected with 400');
      assert.strictEqual(overRes.data.error, 'Validation Error');
      console.log('  [PASS] 8. Exceeding 10,000 characters cleanly rejected with 400 Validation Error');

      console.log('\n================================================================');
      console.log(' ALL JOB DESCRIPTION COPY/PASTE & EDITING TESTS PASSED (100%)');
      console.log('================================================================\n');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test failed:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runCopyPasteTests();
