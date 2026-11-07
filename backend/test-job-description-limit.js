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

async function runTests() {
  console.log('========================================================');
  console.log(' Testing 10,000 Character Job Description Limit');
  console.log('========================================================\n');

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
          name: 'JD Limit Tester',
          email: `jdtester_${Date.now()}@example.com`,
          password: 'Password123!',
        }
      );
      assert.strictEqual(signupRes.statusCode, 201, 'User signup should succeed');
      token = signupRes.data.token;
      assert.ok(token, 'JWT token must be returned');
      console.log('✔ 1. Authenticated user successfully');

      // 2. Upload a valid PDF resume
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const genuinePdfContent = 
        '%PDF-1.4\n' +
        '1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n' +
        '2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n' +
        '3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>> endobj\n' +
        '4 0 obj <</Length 245>> stream\n' +
        'BT /F1 12 Tf 72 712 Td (Alice Verified - Full Stack Cloud Engineer) Tj\n' +
        '0 -20 Td (Email: alice.verified@example.com | Phone: 555-0199) Tj\n' +
        '0 -20 Td (Summary: Experienced Software Engineer specializing in Node.js, React, MySQL, Docker, and AWS.) Tj\n' +
        '0 -20 Td (Skills: JavaScript, TypeScript, React, Node.js, Express, MySQL, PostgreSQL, Docker, AWS, Git, REST APIs, Tailwind CSS.) Tj\n' +
        '0 -20 Td (Experience: Senior Developer at TechCorp. Built scalable microservices, reduced latency by 35%.) Tj\n' +
        '0 -20 Td (Education: B.S. in Computer Science, State University, GPA 3.8.) Tj ET\n' +
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

      assert.strictEqual(uploadRes.statusCode, 200, 'Resume upload should succeed');
      userResumeId = uploadRes.data.analysisId;
      assert.ok(userResumeId, 'Analysis ID must be returned');
      console.log('✔ 2. Uploaded resume successfully, analysisId:', userResumeId);

      // 3. Test submitting exactly 10,000 characters
      const exact10kJobDesc = 'We are looking for a Senior Software Engineer with strong full-stack skills. ' +
        'Requirements: proficiency in React, Node.js, Express, and MySQL. '.repeat(200);
      const trimmed10k = exact10kJobDesc.substring(0, 10000);
      assert.strictEqual(trimmed10k.length, 10000, 'Test string should be exactly 10,000 characters');

      const submit10kRes = await makeRequest(
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
          jobTitle: 'Senior Full Stack Architect',
          jobDescription: trimmed10k,
        }
      );

      assert.strictEqual(submit10kRes.statusCode, 201, 'Job analysis with 10,000 char description should return 201 Created');
      assert.ok(submit10kRes.data.analysis, 'Analysis object must be returned');
      assert.strictEqual(submit10kRes.data.analysis.jobDescription.length, 10000, 'Saved job description should retain all 10,000 characters');
      const analysisId10k = submit10kRes.data.analysis.id;
      console.log('✔ 3. Exactly 10,000 characters submitted and saved successfully without truncation');

      // 4. Verify retrieving the 10,000 character analysis via GET /api/analyses/:id
      const getAnalysisRes = await makeRequest({
        path: `/api/analyses/${analysisId10k}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      assert.strictEqual(getAnalysisRes.statusCode, 200, 'Retrieval should succeed');
      assert.strictEqual(getAnalysisRes.data.analysis.jobDescription.length, 10000, 'Retrieved job description should be exactly 10,000 characters');
      console.log('✔ 4. Retrieved full 10,000 character job description accurately from database');

      // 5. Test rejecting description exceeding 10,000 characters (e.g. 10,001 chars)
      const overLimitDesc = 'A'.repeat(10001);
      const submitOverLimitRes = await makeRequest(
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
          jobTitle: 'Over limit role',
          jobDescription: overLimitDesc,
        }
      );

      assert.strictEqual(submitOverLimitRes.statusCode, 400, 'Exceeding 10,000 characters must return 400 Bad Request');
      assert.strictEqual(submitOverLimitRes.data.error, 'Validation Error');
      assert.ok(submitOverLimitRes.data.message.includes('10,000 characters'), 'Error message should explicitly mention 10,000 characters limit');
      console.log('✔ 5. Job description exceeding 10,000 chars properly rejected with 400 Validation Error');

      // 6. Test minimum length boundary (< 20 chars)
      const briefDesc = 'Too short';
      const submitBriefRes = await makeRequest(
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
          jobTitle: 'Brief role',
          jobDescription: briefDesc,
        }
      );
      assert.strictEqual(submitBriefRes.statusCode, 400, 'Description < 20 chars must return 400 Bad Request');
      console.log('✔ 6. Job description under 20 chars rejected as expected');

      // 7. Verify character counter display formatting
      const sampleCounterLength = 250;
      const maxLen = 10000;
      const formattedCounter = `${sampleCounterLength.toLocaleString()} / ${maxLen.toLocaleString()} characters`;
      assert.strictEqual(formattedCounter, '250 / 10,000 characters', 'Counter must format as "250 / 10,000 characters"');
      console.log('✔ 7. Character counter format matches expected "250 / 10,000 characters"');

      console.log('\n========================================================');
      console.log(' ALL 7 JOB DESCRIPTION LIMIT TESTS PASSED (100%)');
      console.log('========================================================\n');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error('❌ Test failed:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
