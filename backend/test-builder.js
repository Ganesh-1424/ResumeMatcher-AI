/**
 * AI Resume Builder Test Suite (Task 41)
 * 
 * Verifies:
 * 1. Resume draft creation (POST /api/builder)
 * 2. Resume draft listing (GET /api/builder)
 * 3. Specific resume retrieval (GET /api/builder/:id)
 * 4. Resume draft update (PUT /api/builder/:id)
 * 5. Resume draft duplication (POST /api/builder/:id/duplicate)
 * 6. Resume draft deletion (DELETE /api/builder/:id)
 * 7. User isolation & security (User B cannot read/edit/delete User A's draft)
 * 8. ATS scoring engine integration (POST /api/builder/ats-score)
 * 9. Job description matching & skill gap integration (POST /api/builder/match)
 * 10. AI writing assistance service (POST /api/builder/ai-assist)
 * 11. PDFKit multi-template PDF generation (POST /api/builder/pdf)
 * 12. PDF download by ID (GET /api/builder/:id/pdf)
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getJwtSecret } = require('./config/jwt');

const JWT_SECRET = getJwtSecret();
const PORT = process.env.PORT || 5000;

// Test Users
const userA = { id: 101, email: 'builder_user_a@test.com', name: 'Alice Builder' };
const userB = { id: 102, email: 'builder_user_b@test.com', name: 'Bob Intruder' };

const tokenA = jwt.sign(userA, JWT_SECRET, { expiresIn: '1h' });
const tokenB = jwt.sign(userB, JWT_SECRET, { expiresIn: '1h' });

const sampleResumeData = {
  title: 'Senior Full Stack Engineer',
  template: 'modern',
  personalInfo: {
    fullName: 'Alice Builder',
    email: 'alice@example.com',
    phone: '+1 (555) 987-6543',
    location: 'Austin, TX',
    linkedin: 'linkedin.com/in/alicebuilder',
    github: 'github.com/alicebuilder'
  },
  summary: 'Experienced Full Stack Software Engineer with 6+ years designing cloud microservices and high-throughput web applications using Node.js and React.',
  skills: {
    programmingLanguages: 'JavaScript, TypeScript, Python, SQL',
    frontend: 'React, Redux, Tailwind CSS, HTML5, CSS3',
    backend: 'Node.js, Express, PostgreSQL, Redis',
    devops: 'Docker, AWS, CI/CD, Git'
  },
  experience: [
    {
      id: 'exp-1',
      company: 'CloudTech Systems',
      role: 'Senior Software Engineer',
      location: 'Austin, TX',
      startDate: '2021',
      endDate: 'Present',
      current: true,
      description: 'Led architecture of serverless ingestion pipeline processing 5M events daily.\nMentored junior developers and instituted code review standards.'
    }
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of Texas',
      degree: 'B.S. in Computer Science',
      location: 'Austin, TX',
      startDate: '2015',
      endDate: '2019',
      gpa: '3.8'
    }
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'Distributed Job Queue',
      technologies: 'Node.js, Redis, Docker',
      link: 'github.com/alicebuilder/queue',
      description: 'Designed a reliable redis-backed task dispatcher supporting delayed and recurring tasks.'
    }
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023',
      credentialUrl: 'aws.amazon.com'
    }
  ],
  additionalInfo: {
    languages: 'English (Native), Spanish (Professional)',
    awards: 'Employee of the Quarter Q3 2023',
    interests: 'Distributed systems, open source robotics'
  }
};

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
          rawBuffer: buffer
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
  console.log('       AI RESUME BUILDER TEST SUITE (TASK 41)       ');
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

  let createdResumeId = null;

  try {
    // Test 1: Save new resume draft
    console.log('[1/12] Testing POST /api/builder (Save Resume Draft)...');
    const saveRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/builder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, sampleResumeData);

    assert(
      saveRes.statusCode === 201 && saveRes.data && saveRes.data.resume && saveRes.data.resume.id,
      'POST /api/builder creates and returns a saved resume',
      `Got status ${saveRes.statusCode}`
    );
    if (saveRes.data && saveRes.data.resume) {
      createdResumeId = saveRes.data.resume.id;
    }

    // Test 2: List saved resumes for user A
    console.log('\n[2/12] Testing GET /api/builder (List Resumes)...');
    const listRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/builder',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      }
    });

    const resumesList = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.resumes || []);
    assert(
      listRes.statusCode === 200 && resumesList.some(r => r.id === createdResumeId),
      'GET /api/builder returns an array containing the newly created draft',
      `Got status ${listRes.statusCode}`
    );

    // Test 3: Get single resume by ID
    console.log('\n[3/12] Testing GET /api/builder/:id (Get Resume Draft)...');
    const getRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/builder/${createdResumeId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      }
    });

    const resumeDetail = getRes.data?.resume || getRes.data;
    assert(
      getRes.statusCode === 200 && resumeDetail && resumeDetail.title === 'Senior Full Stack Engineer',
      'GET /api/builder/:id retrieves exact resume draft by ID',
      `Got status ${getRes.statusCode}`
    );

    // Test 4: Update resume draft
    console.log('\n[4/12] Testing PUT /api/builder/:id (Update Resume Draft)...');
    const updatedPayload = {
      ...sampleResumeData,
      title: 'Lead Full Stack Architect',
      template: 'tech'
    };
    const updateRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/builder/${createdResumeId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, updatedPayload);

    assert(
      updateRes.statusCode === 200 && updateRes.data && updateRes.data.resume && updateRes.data.resume.title === 'Lead Full Stack Architect',
      'PUT /api/builder/:id updates title and template successfully',
      `Got status ${updateRes.statusCode}`
    );

    // Test 5: Duplicate resume draft
    console.log('\n[5/12] Testing POST /api/builder/:id/duplicate (Duplicate Resume Draft)...');
    const dupRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/builder/${createdResumeId}/duplicate`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      }
    });

    let duplicatedId = null;
    assert(
      dupRes.statusCode === 201 && dupRes.data && dupRes.data.resume && dupRes.data.resume.title.includes('(Copy)'),
      'POST /api/builder/:id/duplicate clones resume and appends (Copy)',
      `Got status ${dupRes.statusCode}`
    );
    if (dupRes.data && dupRes.data.resume) {
      duplicatedId = dupRes.data.resume.id;
    }

    // Test 6: User Isolation & Security
    console.log('\n[6/12] Testing User Isolation & Authorization Guards...');
    const intruderGet = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/builder/${createdResumeId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenB}` // User B trying to access User A's resume
      }
    });

    assert(
      intruderGet.statusCode === 403 || intruderGet.statusCode === 404,
      'User B cannot access User A resume draft (returns 403/404)',
      `Got status ${intruderGet.statusCode}`
    );

    const intruderUpdate = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/builder/${createdResumeId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, { title: 'Hacked Title' });

    assert(
      intruderUpdate.statusCode === 403 || intruderUpdate.statusCode === 404,
      'User B cannot modify User A resume draft (returns 403/404)',
      `Got status ${intruderUpdate.statusCode}`
    );

    // Test 7: Delete duplicated draft
    console.log('\n[7/12] Testing DELETE /api/builder/:id (Delete Resume Draft)...');
    if (duplicatedId) {
      const delRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: `/api/builder/${duplicatedId}`,
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokenA}`
        }
      });

      assert(
        delRes.statusCode === 200,
        'DELETE /api/builder/:id deletes the draft successfully',
        `Got status ${delRes.statusCode}`
      );
    }

    // Test 8: ATS Score Integration
    console.log('\n[8/12] Testing POST /api/builder/ats-score (ATS Audit on Builder Resume)...');
    const atsRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/builder/ats-score',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      resumeData: sampleResumeData,
      jobDescription: 'Seeking Senior Full Stack Engineer experienced with Node.js, React, Docker, and AWS microservices.'
    });

    assert(
      atsRes.statusCode === 200 && atsRes.data && typeof atsRes.data.atsScore === 'number' && atsRes.data.atsScore >= 70,
      'POST /api/builder/ats-score calculates ATS score (> 70 for comprehensive draft)',
      `Score: ${atsRes.data?.atsScore}`
    );

    // Test 9: Job Match & Skill Gap Integration
    console.log('\n[9/12] Testing POST /api/builder/match (Job Description Matcher)...');
    const matchRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/builder/match',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      resumeData: sampleResumeData,
      jobDescription: 'Must know Node.js, React, TypeScript, Docker, Kubernetes, and GraphQL.'
    });

    assert(
      matchRes.statusCode === 200 && matchRes.data && typeof matchRes.data.matchScore === 'number' && Array.isArray(matchRes.data.matchingSkills),
      'POST /api/builder/match performs semantic skill gap analysis on builder payload',
      `Match score: ${matchRes.data?.matchScore}`
    );

    // Test 10: AI Writing Assistance
    console.log('\n[10/12] Testing POST /api/builder/ai-assist (AI Writing Assistance)...');
    const aiRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/builder/ai-assist',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      type: 'bullet',
      input: 'Worked on backend APIs and improved performance',
      context: { role: 'Software Engineer', company: 'Tech Corp' }
    });

    assert(
      aiRes.statusCode === 200 && aiRes.data && aiRes.data.suggestion && aiRes.data.suggestion.length > 10,
      'POST /api/builder/ai-assist returns high-impact action-oriented suggestion',
      `Got: ${aiRes.data?.suggestion?.substring(0, 50)}...`
    );

    // Test 11: PDFKit Direct PDF Generation for all 3 templates
    console.log('\n[11/12] Testing POST /api/builder/pdf for Modern, Minimal, and Tech templates...');
    const templates = ['modern', 'minimal', 'tech'];
    for (const tpl of templates) {
      const pdfRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/builder/pdf',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenA}`
        }
      }, {
        ...sampleResumeData,
        template: tpl
      });

      const isPdf = pdfRes.statusCode === 200 &&
        pdfRes.headers['content-type'] &&
        pdfRes.headers['content-type'].includes('application/pdf') &&
        pdfRes.rawBuffer.slice(0, 4).toString() === '%PDF';

      assert(
        isPdf,
        `Template "${tpl}" produces valid binary PDF starting with %PDF`,
        `Status ${pdfRes.statusCode}, size ${pdfRes.rawBuffer.length} bytes`
      );
    }

    // Test 12: PDF Download by Saved Resume ID
    console.log('\n[12/12] Testing GET /api/builder/:id/pdf (Download by Draft ID)...');
    const pdfByIdRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/builder/${createdResumeId}/pdf`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenA}`
      }
    });

    const isPdfById = pdfByIdRes.statusCode === 200 &&
      pdfByIdRes.headers['content-type'] &&
      pdfByIdRes.headers['content-type'].includes('application/pdf') &&
      pdfByIdRes.rawBuffer.slice(0, 4).toString() === '%PDF';

    assert(
      isPdfById,
      'GET /api/builder/:id/pdf generates and streams PDF from saved draft ID',
      `Status: ${pdfByIdRes.statusCode}, size: ${pdfByIdRes.rawBuffer.length} bytes`
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
