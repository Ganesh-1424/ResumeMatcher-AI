/**
 * Service: Skill Gap Analysis Service
 * 
 * Implements Task 25: Extract technical skills from Resume and Job Description,
 * resolve aliases, and compare into Matched, Missing, and Additional categories.
 * 
 * College Interview Notes:
 * ------------------------
 * 1. Tokenization & Boundary Matching:
 *    Uses boundary-aware regular expressions to avoid false positives (e.g.,
 *    "Java" is not triggered by "JavaScript", "Go" is not triggered by "Google").
 * 2. Alias Canonicalization:
 *    "JS" and "JavaScript" map to the canonical skill entity "JavaScript",
 *    preventing duplicate or conflicting counting.
 * 3. Set-based Categorization:
 *    - Matched = JobSkills ∩ ResumeSkills
 *    - Missing = JobSkills \ ResumeSkills
 *    - Additional = ResumeSkills \ JobSkills
 */

const { SKILLS_DATABASE } = require('../config/skillsConfig');

/**
 * Extracts recognized technical skills from a given text.
 * 
 * @param {string} text - Raw document text (resume or job description)
 * @returns {Array<Object>} List of uniquely detected skills with id, name, and category
 */
function extractSkills(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize excessive whitespace while preserving punctuation for tokens like C++, C#, .NET
  const normalizedText = text.replace(/[\r\n\t]+/g, ' ');

  const detectedMap = new Map();

  for (const skill of SKILLS_DATABASE) {
    // Check if any alias/pattern matches the text
    for (const pattern of skill.patterns) {
      if (pattern.test(normalizedText)) {
        detectedMap.set(skill.id, {
          id: skill.id,
          name: skill.name,
          category: skill.category
        });
        break; // Skill identified, move to next skill
      }
    }
  }

  return Array.from(detectedMap.values());
}

/**
 * Analyzes skill overlap and gaps between a resume and a job description.
 * 
 * @param {string} resumeText - Extracted text from uploaded resume
 * @param {string} jobDescription - Job posting text
 * @returns {Object} Structured skill gap analysis results
 */
function analyzeSkillGap(resumeText, jobDescription) {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobDescription);

  const resumeSkillMap = new Map(resumeSkills.map((s) => [s.id, s]));
  const jobSkillMap = new Map(jobSkills.map((s) => [s.id, s]));

  const matched = [];
  const missing = [];
  const additional = [];

  // 1. Identify Matched and Missing from Job Description
  for (const [id, skill] of jobSkillMap.entries()) {
    if (resumeSkillMap.has(id)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  // 2. Identify Additional from Resume (skills candidate has that job didn't explicitly request)
  for (const [id, skill] of resumeSkillMap.entries()) {
    if (!jobSkillMap.has(id)) {
      additional.push(skill);
    }
  }

  // Sort each array alphabetically by skill name
  const sortByName = (a, b) => a.name.localeCompare(b.name);
  matched.sort(sortByName);
  missing.sort(sortByName);
  additional.sort(sortByName);

  // Group by category for intuitive dashboard views
  const groupByCategory = (skillsList) => {
    return skillsList.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill.name);
      return acc;
    }, {});
  };

  const totalJobSkills = jobSkills.length;
  const totalResumeSkills = resumeSkills.length;
  const matchedCount = matched.length;
  const missingCount = missing.length;
  const additionalCount = additional.length;

  const matchPercentage = totalJobSkills > 0
    ? Math.round((matchedCount / totalJobSkills) * 100)
    : 0;

  return {
    summary: {
      totalJobSkills,
      totalResumeSkills,
      matchedCount,
      missingCount,
      additionalCount,
      matchPercentage
    },
    skills: {
      matched,
      missing,
      additional
    },
    // Simple string array lists for easy storage and direct display
    skillNames: {
      matched: matched.map((s) => s.name),
      missing: missing.map((s) => s.name),
      additional: additional.map((s) => s.name)
    },
    categorized: {
      matched: groupByCategory(matched),
      missing: groupByCategory(missing),
      additional: groupByCategory(additional)
    },
    disclaimer: 'Missing skills represent requirements from the job description that were not detected in the resume text. This does not necessarily imply the candidate lacks proficiency in these areas.'
  };
}

module.exports = {
  extractSkills,
  analyzeSkillGap
};
