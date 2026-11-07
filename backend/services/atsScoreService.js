/**
 * Service: Advanced ATS Readiness Scoring Service
 * 
 * Implements Task 40: Advanced ATS Resume Checker & Accurate Scoring Engine
 * 
 * Transparent, rule-based evaluation system covering 9 structural dimensions (Total: 100 points):
 * 1. Contact Information: 10 points
 * 2. Professional Summary or Objective: 10 points
 * 3. Education: 10 points
 * 4. Work Experience / Internships: 15 points
 * 5. Projects: 10 points
 * 6. Technical Skills: 10 points
 * 7. Relevant Keywords: 15 points (when job description is available)
 * 8. Formatting & Structural Readability: 15 points
 * 9. Certifications & Achievements: 5 points
 * 
 * Key Reliability Features:
 * - Substantive Content Verification: Heading alone does NOT award full points without substantive content.
 * - Varied Heading Detection: Handles "Employment History", "Career Profile", "Key Projects", etc.
 * - Keyword Stuffing Detection: Identifies repeated keyword dumping that triggers ATS spam filters.
 * - Readability Checks: Paragraph density (>150 words), missing bullet points, and character encoding glitches.
 * - Standalone Mode: Accurately normalizes readiness score (out of 85) when no job description is provided.
 * - Honest Plain-Text Disclaimer: Clear boundary acknowledging what plain-text parsers cannot see (fonts, margins, tables).
 */

const { extractSkills } = require('./skillGapService');

/**
 * Standard ATS scoring category configuration and maximum point weights.
 */
const SCORING_CATEGORIES = {
  CONTACT_INFO: { id: 'contact_info', name: 'Contact Information', maxPoints: 10 },
  SUMMARY: { id: 'summary', name: 'Professional Summary / Objective', maxPoints: 10 },
  EDUCATION: { id: 'education', name: 'Education Section', maxPoints: 10 },
  EXPERIENCE: { id: 'experience', name: 'Work Experience / Internships', maxPoints: 15 },
  PROJECTS: { id: 'projects', name: 'Projects Section', maxPoints: 10 },
  SKILLS: { id: 'skills', name: 'Technical Skills Section', maxPoints: 10 },
  KEYWORDS: { id: 'keywords', name: 'Relevant Keywords', maxPoints: 15 },
  READABILITY: { id: 'readability', name: 'Formatting & Structural Readability', maxPoints: 15 },
  CERTIFICATIONS: { id: 'certifications', name: 'Certifications & Achievements', maxPoints: 5 }
};

/**
 * Evaluates contact information (email, phone, online links).
 * Max: 10 points
 * - Valid email (4 points)
 * - Valid phone number (3 points)
 * - Online profile/portfolio (3 points)
 */
function evaluateContactInfo(text) {
  let earned = 0;
  const detected = [];
  const missing = [];

  // 1. Valid email check (4 points)
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;
  if (emailRegex.test(text)) {
    earned += 4;
    detected.push('Valid email address');
  } else {
    missing.push('Professional email address');
  }

  // 2. Contact phone number (3 points)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/;
  if (phoneRegex.test(text)) {
    earned += 3;
    detected.push('Contact phone number');
  } else {
    missing.push('Phone number');
  }

  // 3. Online profile / portfolio / LinkedIn / GitHub (3 points)
  const profileRegex = /(?:linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_-]+|github\.com\/[a-zA-Z0-9_-]+|gitlab\.com|portfolio|https?:\/\/[^\s]+|www\.[^\s]+)/i;
  if (profileRegex.test(text)) {
    earned += 3;
    detected.push('Online professional profile (LinkedIn, GitHub, or portfolio URL)');
  } else {
    missing.push('Professional portfolio / LinkedIn link');
  }

  const status = earned === 10 ? 'Meets guideline' : earned >= 6 ? 'Needs improvement' : 'Not detected';
  let detail = detected.length > 0 ? `Detected: ${detected.join(', ')}.` : 'No contact details clearly detected.';
  if (missing.length > 0) {
    detail += ` Recommended: Add ${missing.join(', ')}.`;
  }

  return {
    id: SCORING_CATEGORIES.CONTACT_INFO.id,
    name: SCORING_CATEGORIES.CONTACT_INFO.name,
    maxPoints: SCORING_CATEGORIES.CONTACT_INFO.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Evaluates professional summary or career objective.
 * Max: 10 points
 * - Heading detected (3 points)
 * - Substantive narrative (>= 30 words) (7 points)
 * - Brief narrative (15-29 words) (4 points)
 */
function evaluateSummary(text) {
  let earned = 0;
  const summaryHeaderRegex = /\b(professional\s+summary|executive\s+summary|career\s+summary|summary\s+of\s+qualifications|professional\s+profile|career\s+profile|summary|profile|about\s+me|career\s+objective|professional\s+objective|objective)\b/i;
  const match = summaryHeaderRegex.exec(text);
  const hasHeading = Boolean(match);

  if (hasHeading) {
    earned += 3; // Heading detected
    // Check substantive content immediately following heading
    const postHeadingText = text.slice(match.index + match[0].length).trim();
    // Grab text up to next potential major section heading or 800 chars
    const nextHeadingMatch = postHeadingText.search(/\n\s*(experience|education|skills|projects|certifications|employment|academic)/i);
    const summaryBlock = nextHeadingMatch !== -1 ? postHeadingText.slice(0, nextHeadingMatch) : postHeadingText.slice(0, 800);
    const summaryWords = summaryBlock.split(/\s+/).filter(Boolean).length;

    if (summaryWords >= 30) {
      earned += 7; // Substantive narrative
    } else if (summaryWords >= 15) {
      earned += 4; // Brief summary
    } else if (summaryWords > 3) {
      earned += 1; // Extremely short
    }
  } else {
    // If no explicit heading, check if resume begins with a substantive intro paragraph before any section
    const firstHeadingIndex = text.search(/\n\s*(experience|education|skills|projects|employment)/i);
    if (firstHeadingIndex > 100) {
      const introText = text.slice(0, firstHeadingIndex);
      const introWords = introText.split(/\s+/).filter(Boolean).length;
      if (introWords >= 35) {
        earned += 4; // Unlabeled introductory summary present
      }
    }
  }

  const status = earned >= 9 ? 'Meets guideline' : earned >= 4 ? 'Needs improvement' : 'Not detected';
  const detail = earned >= 9
    ? 'Substantive professional summary found highlighting career background and value proposition.'
    : earned >= 4
    ? 'Professional summary detected, but brief. Consider expanding to 3–4 concise sentences detailing your expertise.'
    : 'No professional summary or career objective detected. A targeted summary helps recruiters quickly assess your profile.';

  return {
    id: SCORING_CATEGORIES.SUMMARY.id,
    name: SCORING_CATEGORIES.SUMMARY.name,
    maxPoints: SCORING_CATEGORIES.SUMMARY.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Evaluates education credentials and academic institutions.
 * Max: 10 points
 * - Heading detected (2 points)
 * - Degree / Field of study detected (4 points)
 * - Institution name / Graduation timeline (4 points)
 */
function evaluateEducation(text) {
  let earned = 0;
  const detected = [];
  const missing = [];

  // 1. Heading check (2 points)
  const eduHeaderRegex = /\b(education|academic\s+(background|qualifications|history|credentials)|academics|qualifications|degrees?|educational\s+background)\b/i;
  const match = eduHeaderRegex.exec(text);
  const hasHeading = Boolean(match);
  if (hasHeading) {
    earned += 2;
    detected.push('Education heading');
  } else {
    missing.push('Education heading');
  }

  // Restrict search context to the education section if heading was detected
  let textToSearch = text;
  if (hasHeading && match) {
    const postHeading = text.slice(match.index + match[0].length);
    const nextHeadingIdx = postHeading.search(/\n\s*(experience|skills|projects|certifications|employment|work|summary)/i);
    textToSearch = nextHeadingIdx !== -1 ? postHeading.slice(0, nextHeadingIdx) : postHeading.slice(0, 1000);
  }

  // 2. Degree or major detected (4 points)
  const degreeRegex = /\b(bachelor|master|b\.?tech|m\.?tech|b\.?e\.?|b\.?s\.?|m\.?s\.?|b\.?sc|m\.?sc|ph\.?d|doctorate|diploma|associate|degree|computer\s+science|information\s+technology|software\s+engineering|electrical\s+engineering|data\s+science|mathematics|engineering)\b/i;
  if (degreeRegex.test(textToSearch)) {
    earned += 4;
    detected.push('Degree / field of study');
  } else {
    missing.push('Degree title (e.g. B.Tech, B.S., Computer Science)');
  }

  // 3. Institution name or graduation year / GPA (4 points)
  const instRegex = /\b(university|college|institute|school|academy|polytechnic|graduated|batch|gpa|cgpa|\b20\d{2}\b|\b19\d{2}\b)\b/i;
  if (instRegex.test(textToSearch)) {
    earned += 4;
    detected.push('Institution name or graduation timeline');
  } else {
    missing.push('Institution name or graduation year');
  }

  const status = earned >= 9 ? 'Meets guideline' : earned >= 5 ? 'Needs improvement' : 'Not detected';
  let detail = detected.length > 0 ? `Detected: ${detected.join(', ')}.` : 'Education details not clearly identified.';
  if (missing.length > 0) {
    detail += ` Recommended: Add ${missing.join(', ')}.`;
  }

  return {
    id: SCORING_CATEGORIES.EDUCATION.id,
    name: SCORING_CATEGORIES.EDUCATION.name,
    maxPoints: SCORING_CATEGORIES.EDUCATION.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Evaluates work experience or internship section.
 * Max: 15 points
 * - Heading detected (3 points)
 * - Role titles or company indicators (4 points)
 * - Action verbs / hands-on responsibilities (4 points)
 * - Dates / Employment timeline (4 points)
 */
function evaluateExperience(text) {
  let earned = 0;
  const detected = [];
  const missing = [];

  // 1. Experience heading (3 points)
  const expHeaderRegex = /\b(experience|work\s+experience|professional\s+experience|employment\s+history|career\s+history|work\s+history|internships?|relevant\s+experience)\b/i;
  const match = expHeaderRegex.exec(text);
  const hasHeading = Boolean(match);
  if (hasHeading) {
    earned += 3;
    detected.push('Work experience heading');
  } else {
    missing.push('Experience heading');
  }

  // Restrict search context to the experience section to avoid picking up author name/title
  let textToSearch = text;
  if (hasHeading && match) {
    const postHeading = text.slice(match.index + match[0].length);
    const nextHeadingIdx = postHeading.search(/\n\s*(education|skills|projects|certifications|awards|honors|academics|summary)/i);
    textToSearch = nextHeadingIdx !== -1 ? postHeading.slice(0, nextHeadingIdx) : postHeading.slice(0, 3000);
  }

  // 2. Role titles / Company indicators (4 points)
  const roleRegex = /\b(engineer|developer|architect|specialist|manager|lead|analyst|consultant|administrator|intern|trainee|assistant|associate|officer|coordinator|corp|inc|llc|ltd|solutions|technologies|labs|company)\b/i;
  if (roleRegex.test(textToSearch)) {
    earned += 4;
    detected.push('Job title or employer indicators');
  } else {
    missing.push('Specific job titles or company names');
  }

  // 3. Strong action verbs (4 points)
  const verbMatches = textToSearch.match(/\b(developed|engineered|implemented|architected|designed|built|managed|led|collaborated|maintained|created|optimized|deployed|automated|configured|reduced|increased|delivered|spearheaded|orchestrated|integrated|resolved)\b/gi) || [];
  const uniqueVerbs = new Set(verbMatches.map(v => v.toLowerCase()));
  if (uniqueVerbs.size >= 4) {
    earned += 4;
    detected.push(`${uniqueVerbs.size} distinct action verbs`);
  } else if (uniqueVerbs.size >= 2) {
    earned += 2;
    detected.push(`${uniqueVerbs.size} action verbs (moderate)`);
    missing.push('More diverse action verbs (e.g. engineered, optimized, spearheaded)');
  } else {
    missing.push('Action verbs demonstrating hands-on contributions');
  }

  // 4. Dates / employment timeline (4 points)
  const dateRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|present|\d{4}\s*[-–—]\s*(\d{4}|present))\b/i;
  if (dateRegex.test(textToSearch)) {
    earned += 4;
    detected.push('Employment timeline / date ranges');
  } else {
    missing.push('Employment date ranges (month/year to present)');
  }

  const status = earned >= 13 ? 'Meets guideline' : earned >= 7 ? 'Needs improvement' : 'Not detected';
  let detail = detected.length > 0 ? `Detected: ${detected.join(', ')}.` : 'Work experience not clearly identified.';
  if (missing.length > 0) {
    detail += ` Recommended: Add ${missing.join(', ')}.`;
  }

  return {
    id: SCORING_CATEGORIES.EXPERIENCE.id,
    name: SCORING_CATEGORIES.EXPERIENCE.name,
    maxPoints: SCORING_CATEGORIES.EXPERIENCE.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Evaluates projects section.
 * Max: 10 points
 * - Heading detected (2 points)
 * - Tech stack / tools used mentions (4 points)
 * - Feature descriptions or measurable outcomes (4 points)
 */
function evaluateProjects(text) {
  let earned = 0;
  const detected = [];
  const missing = [];

  // 1. Projects heading (2 points)
  const projHeaderRegex = /\b(projects?|key\s+projects|technical\s+projects|personal\s+projects|academic\s+projects|portfolio\s+projects|selected\s+projects)\b/i;
  const match = projHeaderRegex.exec(text);
  const hasHeading = Boolean(match);
  if (hasHeading) {
    earned += 2;
    detected.push('Projects heading');
  } else {
    missing.push('Projects heading');
  }

  // Restrict search context to the projects section
  let textToSearch = text;
  if (hasHeading && match) {
    const postHeading = text.slice(match.index + match[0].length);
    const nextHeadingIdx = postHeading.search(/\n\s*(education|skills|experience|certifications|awards|honors|academics|summary)/i);
    textToSearch = nextHeadingIdx !== -1 ? postHeading.slice(0, nextHeadingIdx) : postHeading.slice(0, 2000);
  }

  // 2. Tech stack / architecture mentions (4 points)
  const techRegex = /\b(built\s+with|built\s+using|stack|technologies\s+used|github|repository|developed\s+a|created\s+a|api|app|system|website|platform|tools\s+used)\b/i;
  if (techRegex.test(textToSearch)) {
    earned += 4;
    detected.push('Project architecture and tech stack descriptions');
  } else {
    missing.push('Project tools and tech stack (e.g. built using React, Node.js)');
  }

  // 3. Measurable outcomes / features (4 points)
  const outcomeRegex = /\b(features?|implemented|integrated|achieved|improved|optimized|tested|deployed|database|user\s+interface|real-time|dashboard|pipeline)\b/i;
  if (outcomeRegex.test(textToSearch)) {
    earned += 4;
    detected.push('Feature descriptions and outcomes');
  } else {
    missing.push('Feature descriptions or measurable project results');
  }

  const status = earned >= 9 ? 'Meets guideline' : earned >= 5 ? 'Needs improvement' : 'Not detected';
  let detail = detected.length > 0 ? `Detected: ${detected.join(', ')}.` : 'Projects section not identified.';
  if (missing.length > 0) {
    detail += ` Recommended: Add ${missing.join(', ')}.`;
  }

  return {
    id: SCORING_CATEGORIES.PROJECTS.id,
    name: SCORING_CATEGORIES.PROJECTS.name,
    maxPoints: SCORING_CATEGORIES.PROJECTS.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Evaluates technical skills section.
 * Max: 10 points
 * - Skills heading detected (2 points)
 * - Real extracted technical skills count (5 points)
 * - Categorization / grouped structure (3 points)
 */
function evaluateSkills(text) {
  let earned = 0;
  const detected = [];

  // 1. Skills heading (2 points)
  const skillHeaderRegex = /\b(technical\s+skills|skills|core\s+competencies|technologies|tools\s+(&|and)\s+technologies|tech\s+stack|programming\s+languages|technical\s+proficiencies)\b/i;
  if (skillHeaderRegex.test(text)) {
    earned += 2;
    detected.push('Skills heading');
  }

  // 2. Extracted recognized technical skills count (5 points)
  const foundSkills = extractSkills(text);
  if (foundSkills.length >= 6) {
    earned += 5;
    detected.push(`${foundSkills.length} recognized technical competencies`);
  } else if (foundSkills.length >= 3) {
    earned += 3;
    detected.push(`${foundSkills.length} technical competencies (moderate)`);
  } else if (foundSkills.length >= 1) {
    earned += 1;
    detected.push(`${foundSkills.length} technical competency`);
  }

  // 3. Categorization or grouped structure (3 points)
  const catRegex = /\b(languages?|frameworks?|libraries|databases?|tools|platforms|cloud|devops|methodologies)\s*:/i;
  if (catRegex.test(text) || (foundSkills.length >= 7 && /\n\s*[•\*\-·]/.test(text))) {
    earned += 3;
    detected.push('Categorized or grouped structure');
  }

  const status = earned >= 9 ? 'Meets guideline' : earned >= 5 ? 'Needs improvement' : 'Not detected';
  const detail = earned >= 9
    ? `Strong technical skills inventory detected with ${foundSkills.length} competencies and clean structural grouping.`
    : earned >= 5
    ? `Skills section detected (${foundSkills.length} skills identified). Consider organizing into labeled categories (e.g. Languages, Frameworks, Databases).`
    : 'Skills section is missing or contains very few recognized technical keywords.';

  return {
    id: SCORING_CATEGORIES.SKILLS.id,
    name: SCORING_CATEGORIES.SKILLS.name,
    maxPoints: SCORING_CATEGORIES.SKILLS.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Evaluates relevant keywords alignment against a target job description.
 * Max: 15 points
 * When job description is available:
 *   - Compares technical skills and domain terminology between resume and job description.
 * When job description is NOT available (Standalone Mode):
 *   - Marked as 'Not evaluated (Job description required)' with 0 earned points,
 *     and score is normalized across the 85 available base points.
 */
function evaluateRelevantKeywords(resumeText, jobDescription) {
  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
    return {
      id: SCORING_CATEGORIES.KEYWORDS.id,
      name: SCORING_CATEGORIES.KEYWORDS.name,
      maxPoints: SCORING_CATEGORIES.KEYWORDS.maxPoints,
      earnedPoints: 0,
      status: 'Not evaluated',
      detail: 'Job-specific keyword matching requires a target job description. In standalone mode, general ATS structural readiness is evaluated.',
      explanation: 'Provide a target job description to evaluate role-specific keyword alignment and qualification density.',
      available: false
    };
  }

  const jdSkills = extractSkills(jobDescription);
  const resumeSkills = extractSkills(resumeText);
  const resumeSkillIds = new Set(resumeSkills.map(s => s.id));

  let earned = 0;
  let detail = '';

  if (jdSkills.length > 0) {
    const matchedCount = jdSkills.filter(s => resumeSkillIds.has(s.id)).length;
    const matchRatio = matchedCount / jdSkills.length;

    if (matchRatio >= 0.70) {
      earned = 15;
    } else if (matchRatio >= 0.50) {
      earned = 12;
    } else if (matchRatio >= 0.35) {
      earned = 9;
    } else if (matchRatio >= 0.20) {
      earned = 6;
    } else if (matchedCount > 0) {
      earned = 3;
    } else {
      earned = 0;
    }

    const pct = Math.round(matchRatio * 100);
    detail = `Matched ${matchedCount} of ${jdSkills.length} job-required technical skills (${pct}% coverage).`;
  } else {
    // If JD has few recognized skill catalog terms, assess broad word overlap of domain tokens
    const jdTokens = new Set(
      jobDescription.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    );
    const resumeTokens = new Set(
      resumeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
    );

    let commonCount = 0;
    for (const token of jdTokens) {
      if (resumeTokens.has(token)) commonCount++;
    }

    const ratio = jdTokens.size > 0 ? commonCount / jdTokens.size : 0;
    earned = Math.min(15, Math.max(0, Math.round(ratio * 25)));
    detail = `Evaluated general vocabulary alignment (${commonCount} shared domain keywords with job posting).`;
  }

  const status = earned >= 12 ? 'Meets guideline' : earned >= 6 ? 'Needs improvement' : 'Low match';

  return {
    id: SCORING_CATEGORIES.KEYWORDS.id,
    name: SCORING_CATEGORIES.KEYWORDS.name,
    maxPoints: SCORING_CATEGORIES.KEYWORDS.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Evaluates formatting, readability, paragraph density, and encoding integrity.
 * Max: 15 points
 * - Word count (4 points)
 * - Bullet point structure (4 points)
 * - Paragraph length check (<=150 words per block) (4 points)
 * - Clean text extraction & absence of corrupted symbols (3 points)
 * - Deductions: keyword stuffing detection (-2 to -3 points)
 */
function evaluateReadability(text) {
  let earned = 0;
  const warnings = [];
  const words = text.split(/\s+/).filter(Boolean).length;

  // 1. Word count in recommended range (4 points)
  if (words >= 300 && words <= 1200) {
    earned += 4;
  } else if ((words >= 200 && words < 300) || (words > 1200 && words <= 1600)) {
    earned += 2;
  } else if (words < 200) {
    warnings.push(`Resume is very brief (~${words} words). Most ATS recommend 350–800 words for complete coverage.`);
  } else {
    warnings.push(`Resume is unusually long (~${words} words). Keep within 1–2 pages (~400–1,000 words) for optimal ATS readability.`);
  }

  // 2. Bullet point structure indicators (4 points)
  const bulletRegex = /[•\*\-·▪]|\d+\.\s+[A-Z]/;
  const hasBullets = bulletRegex.test(text);
  if (hasBullets) {
    earned += 4;
  } else {
    // Check paragraph structure
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length >= 4) {
      earned += 1;
    }
    warnings.push('No bullet points detected. ATS scanners and recruiters strongly favor bulleted accomplishment statements.');
  }

  // 3. Paragraph length check: detect wall-of-text (> 150 words) (4 points)
  const paragraphBlocks = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const denseBlocks = paragraphBlocks.filter(p => {
    const pWords = p.split(/\s+/).filter(Boolean).length;
    return pWords > 150;
  });

  if (denseBlocks.length === 0) {
    earned += 4;
  } else if (denseBlocks.length <= 2) {
    earned += 2;
    warnings.push(`Contains ${denseBlocks.length} dense text block(s) exceeding 150 words. Break large paragraphs into concise bullet points.`);
  } else {
    warnings.push(`Multiple dense paragraphs (>150 words) detected. Dense text reduces ATS keyword parsing accuracy.`);
  }

  // 4. Clean text extraction & encoding integrity (3 points)
  // Check for corrupted glyphs, replacement characters \ufffd, or excessive non-printable control characters
  const corruptedGlyphRegex = /[\ufffd\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
  const hasCorruptedSymbols = corruptedGlyphRegex.test(text);
  if (!hasCorruptedSymbols) {
    earned += 3;
  } else {
    warnings.push('Document text extraction contains character encoding anomalies or corrupted symbols.');
  }

  // 5. Keyword Stuffing Detection (Artificial repetition penalty)
  // Check if any specific technical keyword or token is repeated an excessive number of times
  const tokenCounts = {};
  const tokens = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const stopWords = new Set(['with', 'that', 'this', 'from', 'have', 'were', 'been', 'their', 'which', 'about', 'more', 'also']);

  for (const t of tokens) {
    if (!stopWords.has(t)) {
      tokenCounts[t] = (tokenCounts[t] || 0) + 1;
    }
  }

  let stuffedTerm = null;
  let maxCount = 0;
  for (const [term, count] of Object.entries(tokenCounts)) {
    // If a term appears > 8 times in a short resume (< 600 words) or > 12 times in any resume
    if ((words < 600 && count >= 8) || count >= 12) {
      if (count > maxCount) {
        maxCount = count;
        stuffedTerm = term;
      }
    }
  }

  if (stuffedTerm && maxCount >= 8) {
    earned = Math.max(0, earned - 3);
    warnings.push(`Potential keyword stuffing detected: The term '${stuffedTerm}' appears ${maxCount} times, which may trigger automated ATS spam filters.`);
  }

  const status = earned >= 13 ? 'Meets guideline' : earned >= 8 ? 'Needs improvement' : 'Needs formatting review';
  const detail = earned >= 13
    ? `Optimal length (~${words} words), clean text formatting, and clear structural hierarchy.`
    : earned >= 8
    ? `Readable format (~${words} words), but could benefit from more structured bullet points and concise phrasing.`
    : `Structural readability concerns: review word count (~${words} words), text density, and bullet points.`;

  return {
    id: SCORING_CATEGORIES.READABILITY.id,
    name: SCORING_CATEGORIES.READABILITY.name,
    maxPoints: SCORING_CATEGORIES.READABILITY.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    warnings,
    available: true
  };
}

/**
 * Evaluates certifications, licenses, and extracurricular achievements.
 * Max: 5 points
 */
function evaluateCertifications(text) {
  const certHeaderRegex = /\b(certifications?|certified|certificates?|achievements?|awards?|honors?|licenses?|credentials?|publications?|hackathons?|competitions?|extracurricular)\b/i;
  const hasCert = certHeaderRegex.test(text);
  const earned = hasCert ? 5 : 0;

  const status = earned === 5 ? 'Meets guideline' : 'Not detected';
  const detail = earned === 5
    ? 'Certifications, licenses, or honors detected, reinforcing candidate credentials.'
    : 'No certifications or achievements section detected. Adding recognized credentials or honors can give an extra edge.';

  return {
    id: SCORING_CATEGORIES.CERTIFICATIONS.id,
    name: SCORING_CATEGORIES.CERTIFICATIONS.name,
    maxPoints: SCORING_CATEGORIES.CERTIFICATIONS.maxPoints,
    earnedPoints: earned,
    status,
    detail,
    explanation: detail,
    available: true
  };
}

/**
 * Returns overall tier classification for the 0-100 ATS score.
 */
function getATSScoreTier(score) {
  if (score >= 80) {
    return {
      label: 'ATS Friendly',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800',
      summary: 'High parsability with standard section headings and clear text layout.'
    };
  }
  if (score >= 60) {
    return {
      label: 'Moderate Parsability',
      textColor: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-transparent dark:border-amber-800',
      summary: 'Acceptable formatting, but a few structural elements need improvement.'
    };
  }
  return {
    label: 'Needs Formatting Review',
    textColor: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-transparent dark:border-rose-800',
    summary: 'Significant formatting or structural issues may hinder automated parsers.'
  };
}

/**
 * Calculates ATS readiness score and breakdown for extracted resume text.
 * 
 * @param {string} resumeText - Readable text extracted from PDF or DOCX resume.
 * @param {string|null} [jobDescription=null] - Optional job description text.
 * @returns {Object} Comprehensive ATS evaluation result.
 */
function calculateAtsScore(resumeText, jobDescription = null) {
  const hasJobDescription = Boolean(
    jobDescription && typeof jobDescription === 'string' && jobDescription.trim().length > 0
  );

  // Guard against null, empty, or unreadable document
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
    const emptyBreakdown = Object.values(SCORING_CATEGORIES).map((cat) => ({
      id: cat.id,
      name: cat.name,
      maxPoints: cat.maxPoints,
      earnedPoints: 0,
      status: 'Not detected',
      detail: 'Document text is empty or unreadable.',
      explanation: 'Document text is empty or unreadable.',
      available: cat.id !== 'keywords' || hasJobDescription
    }));

    return {
      atsScore: 0,
      tier: getATSScoreTier(0),
      categoryBreakdown: emptyBreakdown,
      strengths: [],
      improvements: [
        'The document appears empty or unreadable. Please upload a valid text-based PDF or DOCX file.'
      ],
      warnings: ['No readable text found in uploaded document.'],
      detectedSections: [],
      missingSections: Object.values(SCORING_CATEGORIES).map(c => c.name),
      documentStats: {
        wordCount: 0,
        charCount: 0,
        sectionCount: 0,
        bulletPointsDetected: false,
        hasLongParagraphs: false,
        hasKeywordStuffing: false,
        hasEncodingAnomalies: false
      },
      standaloneMode: !hasJobDescription,
      rawPoints: 0,
      maxPossiblePoints: hasJobDescription ? 100 : 85,
      disclaimer: 'This ATS readiness score is an automated estimation based on standard structural headings, contact details, textual readability, and keyword relevance. Plain-text parsing cannot evaluate physical visual design, custom fonts, multi-column tables, margins, or proprietary corporate ATS filters. This score is an educational estimate, not an official employer evaluation or guarantee of interview selection.',
      evaluatedAt: new Date().toISOString()
    };
  }

  const cleanText = resumeText.trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const charCount = cleanText.length;

  // Evaluate all 9 categories
  const contactCat = evaluateContactInfo(cleanText);
  const summaryCat = evaluateSummary(cleanText);
  const educationCat = evaluateEducation(cleanText);
  const experienceCat = evaluateExperience(cleanText);
  const projectsCat = evaluateProjects(cleanText);
  const skillsCat = evaluateSkills(cleanText);
  const keywordsCat = evaluateRelevantKeywords(cleanText, jobDescription);
  const readabilityCat = evaluateReadability(cleanText);
  const certsCat = evaluateCertifications(cleanText);

  const categories = [
    contactCat,
    summaryCat,
    educationCat,
    experienceCat,
    projectsCat,
    skillsCat,
    keywordsCat,
    readabilityCat,
    certsCat
  ];

  // Calculate scores
  let atsScore = 0;
  let totalEarned = 0;
  let maxPossiblePoints = 100;

  if (hasJobDescription) {
    // All 9 categories evaluated (Total 100 max)
    totalEarned = categories.reduce((sum, c) => sum + c.earnedPoints, 0);
    atsScore = Math.max(0, Math.min(100, Math.round(totalEarned)));
    maxPossiblePoints = 100;
  } else {
    // Standalone Mode: 8 categories evaluated (Total 85 max base)
    // Keywords category is marked as 'Not evaluated (Job description required)'
    const availableCategories = categories.filter(c => c.id !== SCORING_CATEGORIES.KEYWORDS.id);
    totalEarned = availableCategories.reduce((sum, c) => sum + c.earnedPoints, 0);
    maxPossiblePoints = 85;
    // Normalize to 100-point scale for standalone ATS readiness estimation
    atsScore = Math.max(0, Math.min(100, Math.round((totalEarned / 85) * 100)));
  }

  // Identify strengths and areas for improvement
  const strengths = [];
  const improvements = [];
  const detectedSections = [];
  const missingSections = [];

  for (const cat of categories) {
    if (cat.id === 'keywords' && !hasJobDescription) {
      continue; // Skip keywords from strengths/improvements when in standalone mode
    }

    const ratio = cat.earnedPoints / cat.maxPoints;
    if (ratio >= 0.75) {
      strengths.push(`${cat.name}: ${cat.detail}`);
      detectedSections.push(cat.name);
    } else {
      improvements.push(`${cat.name}: ${cat.detail}`);
      if (ratio === 0) {
        missingSections.push(cat.name);
      } else {
        detectedSections.push(`${cat.name} (Needs enhancement)`);
      }
    }
  }

  // Compile formatting and readability warnings
  const warnings = [...(readabilityCat.warnings || [])];
  if (contactCat.earnedPoints < 5) {
    warnings.push('Incomplete contact information detected. Ensure professional email and phone number are visible.');
  }

  const tier = getATSScoreTier(atsScore);

  return {
    atsScore,
    tier,
    categoryBreakdown: categories,
    strengths,
    improvements,
    warnings,
    detectedSections,
    missingSections,
    documentStats: {
      wordCount,
      charCount,
      sectionCount: detectedSections.length,
      bulletPointsDetected: /[•\*\-·▪]|\d+\.\s+[A-Z]/.test(cleanText),
      hasLongParagraphs: (readabilityCat.warnings || []).some(w => w.includes('dense text block') || w.includes('dense paragraphs')),
      hasKeywordStuffing: (readabilityCat.warnings || []).some(w => w.includes('keyword stuffing')),
      hasEncodingAnomalies: (readabilityCat.warnings || []).some(w => w.includes('encoding anomalies'))
    },
    standaloneMode: !hasJobDescription,
    rawPoints: totalEarned,
    maxPossiblePoints,
    disclaimer: 'This ATS readiness score is an automated estimation based on standard structural headings, contact details, textual readability, and keyword relevance. Plain-text parsing cannot evaluate physical visual design, custom fonts, multi-column tables, margins, or proprietary corporate ATS filters. This score is an educational estimate, not an official employer evaluation or guarantee of interview selection.',
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = {
  calculateAtsScore,
  SCORING_CATEGORIES,
  getATSScoreTier
};
