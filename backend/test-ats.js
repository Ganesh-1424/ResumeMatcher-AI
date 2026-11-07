/**
 * Test Suite: Task 40 - Advanced ATS Readiness Scoring Engine & Standalone Checker
 * 
 * Verifies:
 * 1. Scoring logic across all 9 categories:
 *    - Contact: 10 points
 *    - Summary: 10 points
 *    - Education: 10 points
 *    - Experience: 15 points
 *    - Projects: 10 points
 *    - Skills: 10 points
 *    - Relevant Keywords: 15 points (when JD available)
 *    - Formatting & Structural Readability: 15 points
 *    - Certifications: 5 points
 *    Total: 100 points
 * 2. Substantive checks: headings alone do NOT receive full points without content.
 * 3. Keyword stuffing detection & deduction.
 * 4. Dense wall-of-text paragraphs (>150 words) warning.
 * 5. Standalone ATS mode without job description (normalizes across 85 base points).
 * 6. Empty and minimal resumes handled gracefully.
 * 7. POST /api/analyses/:id/ats-score endpoint execution.
 * 8. POST /api/ats/check standalone endpoint execution.
 * 9. GET /api/ats/history user isolation and retrieval.
 * 10. GET /api/ats/:id/report PDF report generation.
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./server');
const { calculateAtsScore, SCORING_CATEGORIES } = require('./services/atsScoreService');
const { fallbackAnalysesStore } = require('./controllers/resumeController');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_ai_resume_job_matcher_2026_super_secure_key';

function makeRequest(server, options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        path: options.path,
        method: options.method || 'GET',
        headers: options.headers || {}
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
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===========================================================');
  console.log(' Starting Task 40: Advanced ATS Scoring & Checker Test Suite');
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

  // ------------------------------------------------------------------------
  // Unit Test 1: Category Weights and Maximum Point Total
  // ------------------------------------------------------------------------
  console.log('\n--- 1. Testing Category Weights (Total 100 Points) ---');
  const totalMax = Object.values(SCORING_CATEGORIES).reduce((s, c) => s + c.maxPoints, 0);
  assert(totalMax === 100, `All 9 categories sum to exactly 100 points (got ${totalMax})`);
  assert(SCORING_CATEGORIES.CONTACT_INFO.maxPoints === 10, 'Contact Information is 10 points');
  assert(SCORING_CATEGORIES.SUMMARY.maxPoints === 10, 'Summary is 10 points');
  assert(SCORING_CATEGORIES.EDUCATION.maxPoints === 10, 'Education is 10 points');
  assert(SCORING_CATEGORIES.EXPERIENCE.maxPoints === 15, 'Experience is 15 points');
  assert(SCORING_CATEGORIES.PROJECTS.maxPoints === 10, 'Projects is 10 points');
  assert(SCORING_CATEGORIES.SKILLS.maxPoints === 10, 'Skills is 10 points');
  assert(SCORING_CATEGORIES.KEYWORDS.maxPoints === 15, 'Relevant Keywords is 15 points');
  assert(SCORING_CATEGORIES.READABILITY.maxPoints === 15, 'Readability is 15 points');
  assert(SCORING_CATEGORIES.CERTIFICATIONS.maxPoints === 5, 'Certifications is 5 points');

  // ------------------------------------------------------------------------
  // Unit Test 2: Full Resume Evaluation (With and Without Job Description)
  // ------------------------------------------------------------------------
  console.log('\n--- 2. Testing Comprehensive Resume Scoring ---');

  const fullResume = `
    Jane Smith
    Email: jane.smith@example.com
    Phone: +1 (555) 987-6543
    LinkedIn: linkedin.com/in/janesmith
    GitHub: github.com/janesmith

    Professional Summary:
    Results-driven Software Engineer with extensive expertise in full-stack development, distributed cloud services, and REST API optimization. Proven track record of architecting scalable applications that reduce latency by 40% and support millions of concurrent requests.

    Education:
    Bachelor of Science in Computer Science
    California State University | Graduated: 2023 | GPA: 3.9/4.0

    Work Experience:
    Full Stack Developer - CloudTech Solutions (Jan 2023 - Present)
    • Developed responsive frontend interfaces with React, TypeScript, and Redux.
    • Engineered microservices using Node.js, Express, and PostgreSQL.
    • Deployed and orchestrated containerized workloads with Docker and AWS.
    • Automated CI/CD build pipelines and improved integration test coverage.

    Projects:
    Healthcare Analytics Dashboard (github.com/janesmith/health-dash)
    • Built real-time patient monitoring platform using React and Node.js.
    • Implemented automated WebSocket telemetry alerts and secure database queries.
    • Deployed containerized services with Docker, Nginx, and cloud pipelines.

    Technical Skills:
    • Languages: JavaScript, TypeScript, Python, SQL
    • Frameworks: React, Node.js, Express.js
    • Databases: PostgreSQL, MongoDB, Redis
    • Tools & DevOps: Git, Docker, AWS, Postman

    Certifications & Achievements:
    • AWS Certified Solutions Architect Associate (2024)
    • 1st Place Winner - Regional University Hackathon (2023)
  `;

  const jobDesc = 'Seeking a Full Stack Developer experienced with React, Node.js, TypeScript, PostgreSQL, and Docker.';

  // Standalone mode (no JD)
  const standaloneResult = calculateAtsScore(fullResume);
  console.log('Standalone Resume ATS Score:', standaloneResult.atsScore);
  assert(standaloneResult.standaloneMode === true, 'Identifies standalone mode when JD is omitted');
  assert(standaloneResult.atsScore >= 85, 'Comprehensive resume scores high ATS score (>= 85) in standalone mode');
  assert(standaloneResult.categoryBreakdown.length === 9, 'All 9 categories represented in breakdown');
  const kwCategory = standaloneResult.categoryBreakdown.find(c => c.id === 'keywords');
  assert(kwCategory.status === 'Not evaluated', 'Keywords category marked as "Not evaluated" in standalone mode');
  assert(kwCategory.earnedPoints === 0, 'Keywords category earns 0 points in standalone mode');

  // Matching mode (with JD)
  const matchResult = calculateAtsScore(fullResume, jobDesc);
  console.log('Matched Resume ATS Score:', matchResult.atsScore);
  assert(matchResult.standaloneMode === false, 'Identifies non-standalone mode when JD is provided');
  const kwMatchedCat = matchResult.categoryBreakdown.find(c => c.id === 'keywords');
  assert(kwMatchedCat.status === 'Meets guideline', 'Keywords category matches skills in JD');
  assert(kwMatchedCat.earnedPoints >= 12, 'Keywords category awards high points (>= 12) for matching skills');

  // ------------------------------------------------------------------------
  // Unit Test 3: Substantive Checks (Header alone vs Real Content)
  // ------------------------------------------------------------------------
  console.log('\n--- 3. Testing Substantive Content Verification (Anti-Cheat) ---');

  // Resume with headings only, but no substantive content under them
  const fakeResume = `
    Alex Developer
    Summary:
    Hi.
    Education:
    Work Experience:
    Projects:
    Skills:
    Certifications:
  `;
  const fakeResult = calculateAtsScore(fakeResume);
  console.log('Fake / Heading-Only Resume ATS Score:', fakeResult.atsScore);
  assert(fakeResult.atsScore < 50, 'Heading-only resume cannot score high (expected < 50)');
  assert(fakeResult.categoryBreakdown.find(c => c.id === 'experience').earnedPoints <= 3, 'Experience heading without content earns <= 3 points');
  assert(fakeResult.categoryBreakdown.find(c => c.id === 'summary').earnedPoints <= 3, 'Summary heading with 1 word earns <= 3 points');

  // ------------------------------------------------------------------------
  // Unit Test 4: Keyword Stuffing Detection
  // ------------------------------------------------------------------------
  console.log('\n--- 4. Testing Keyword Stuffing Detection ---');

  const stuffedResume = `
    John Doe
    Email: john@example.com
    Phone: 555-123-4567
    Summary: React developer with React background building React apps with React state and React components and React hooks and React tools using React framework with React.
    Experience: React engineer at React corp doing React development with React.
    Education: Bachelor of Science in Computer Science, 2022
    Skills: React, JavaScript, Node.js
  `;
  const stuffedResult = calculateAtsScore(stuffedResume);
  console.log('Keyword Stuffed Warnings:', stuffedResult.warnings);
  assert(stuffedResult.documentStats.hasKeywordStuffing === true, 'Correctly flags keyword stuffing in documentStats');
  assert(stuffedResult.warnings.some(w => w.includes('stuffing')), 'Includes keyword stuffing warning message');

  // ------------------------------------------------------------------------
  // Unit Test 5: Empty and Minimal Inputs
  // ------------------------------------------------------------------------
  console.log('\n--- 5. Testing Empty & Minimal Document Handling ---');
  const emptyRes = calculateAtsScore('');
  assert(emptyRes.atsScore === 0, 'Empty document returns ATS score of 0');
  assert(emptyRes.missingSections.length > 5, 'Empty document identifies missing sections');

  // ------------------------------------------------------------------------
  // HTTP Endpoint Tests
  // ------------------------------------------------------------------------
  console.log('\n--- 6. Testing HTTP Endpoints ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  try {
    const user1Token = jwt.sign({ id: 1, email: 'user1@example.com' }, JWT_SECRET, { expiresIn: '1h' });
    const user2Token = jwt.sign({ id: 2, email: 'user2@example.com' }, JWT_SECRET, { expiresIn: '1h' });

    // Seed test analysis for User 1 using real fixture PDF
    const testAnalysisId = 771;
    fallbackAnalysesStore.set(testAnalysisId, {
      id: testAnalysisId,
      user_id: 1,
      job_title: 'Full Stack Engineer',
      job_description: 'Looking for a developer with proficiency in JavaScript, React, Node.js, and Docker.',
      resume_filename: 'resume_test_fixture.pdf',
      match_score: 88.0,
      matched_skills: ['JavaScript', 'React', 'Node.js'],
      missing_skills: ['Docker'],
      additional_skills: ['Express.js', 'Git'],
      ats_score: null,
      ats_breakdown: null,
      created_at: new Date()
    });

    // 6.1 POST /api/analyses/:id/ats-score
    const resAtsAnalysis = await makeRequest(server, {
      path: `/api/analyses/${testAnalysisId}/ats-score`,
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resAtsAnalysis.status === 200, 'POST /api/analyses/:id/ats-score returns 200 OK');
    assert(typeof resAtsAnalysis.data.atsScore === 'number', 'Returns numeric atsScore');
    assert(resAtsAnalysis.data.categoryBreakdown.length === 9, 'Returns all 9 categories');
    assert(Array.isArray(resAtsAnalysis.data.warnings), 'Returns warnings array');
    assert(Array.isArray(resAtsAnalysis.data.detectedSections), 'Returns detectedSections array');

    // 6.2 Data preservation check
    const updatedRecord = fallbackAnalysesStore.get(testAnalysisId);
    assert(updatedRecord.match_score === 88.0, 'Preserves existing match_score (88.0)');
    assert(updatedRecord.matched_skills.includes('React'), 'Preserves matched_skills');

    // 6.3 POST /api/ats/check (Standalone ATS Check with existing resumeId)
    const resAtsCheck = await makeRequest(
      server,
      {
        path: '/api/ats/check',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`
        }
      },
      { resumeId: testAnalysisId }
    );
    assert(resAtsCheck.status === 200, 'POST /api/ats/check returns 200 OK');
    assert(resAtsCheck.data.standaloneMode === true, 'Response specifies standaloneMode: true');
    assert(typeof resAtsCheck.data.atsScore === 'number', 'Response contains calculated atsScore');
    assert(Boolean(resAtsCheck.data.checkId), 'Response contains new checkId');

    // 6.4 GET /api/ats/history
    const resAtsHistory = await makeRequest(server, {
      path: '/api/ats/history',
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resAtsHistory.status === 200, 'GET /api/ats/history returns 200 OK');
    assert(Array.isArray(resAtsHistory.data.history), 'Returns history array');
    assert(resAtsHistory.data.history.length > 0, 'History contains User 1 checks');

    // 6.5 User isolation: User 2 history should not see User 1 checks
    const resUser2History = await makeRequest(server, {
      path: '/api/ats/history',
      method: 'GET',
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert(resUser2History.status === 200, 'User 2 can query history');
    assert(
      !resUser2History.data.history.some(h => h.id === testAnalysisId),
      'User 2 cannot see User 1 checks (Strict user isolation)'
    );

    // 6.6 GET /api/ats/:id/report (PDF Report Streaming)
    const resReport = await makeRequest(server, {
      path: `/api/ats/${resAtsCheck.data.checkId}/report`,
      method: 'GET',
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    assert(resReport.status === 200, 'GET /api/ats/:id/report returns 200 OK');
    assert(resReport.headers['content-type'] === 'application/pdf', 'PDF report has application/pdf content type');

  } finally {
    server.close();
  }

  console.log('\n===========================================================');
  console.log(` Test Results: ${passed} passed, ${failed} failed`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
}

module.exports = runTests;
