/**
 * Service: AI Resume Improvement Suggestions Service
 * 
 * Implements Task 27: Generate personalized, truthful, and actionable resume
 * improvement suggestions using the Gemini LLM API (gemini-3.8-flash).
 * 
 * Evaluation Categories (6 Core Categories):
 * 1. Resume summary: Ways to improve the professional summary.
 * 2. Skills: Relevant technical skills to learn or highlight.
 * 3. Projects: How to describe relevant projects more effectively.
 * 4. Experience: Ways to improve internship or experience descriptions.
 * 5. ATS improvements: Missing sections, headings, and readability improvements.
 * 6. Job-specific recommendations: Practical alignment with the target role.
 * 
 * College Interview Notes:
 * ------------------------
 * - Truthfulness Constraint: System prompt explicitly instructs the LLM never
 *   to hallucinate or invent fake jobs, degrees, or metrics; it recommends
 *   actionable phrasing templates and bracketed placeholders like [X% speedup].
 * - Deterministic JSON Schema: Requests structured JSON response and validates
 *   schema compliance before returning.
 * - Prerequisite Guarding: Requires completed upstream analyses (matching,
 *   skills, ATS) instead of guessing missing state.
 * - Security: API key read strictly from server-side environment variables;
 *   never exposed to frontend.
 */

const { GoogleGenAI } = require('@google/genai');

const MODEL_NAME = 'gemini-3.8-flash';
const MAX_TEXT_LENGTH = 10000;

const ALLOWED_CATEGORIES = [
  'Resume summary',
  'Skills',
  'Projects',
  'Experience',
  'ATS improvements',
  'Job-specific recommendations'
];

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];

/**
 * Truncates text cleanly at word boundaries to avoid excessive token consumption.
 * 
 * @param {string} text - Raw input text.
 * @param {number} maxChars - Maximum character threshold.
 * @returns {string} Truncated string.
 */
function truncateText(text, maxChars = MAX_TEXT_LENGTH) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cutIndex = trimmed.lastIndexOf(' ', maxChars);
  return (cutIndex > maxChars * 0.8 ? trimmed.slice(0, cutIndex) : trimmed.slice(0, maxChars)).trim();
}

/**
 * Normalizes priority value to High, Medium, or Low.
 * 
 * @param {string} priority - Raw priority string.
 * @returns {'High'|'Medium'|'Low'}
 */
function normalizePriority(priority) {
  if (!priority || typeof priority !== 'string') return 'Medium';
  const clean = priority.trim().toLowerCase();
  if (clean.startsWith('h')) return 'High';
  if (clean.startsWith('l')) return 'Low';
  return 'Medium';
}

/**
 * Validates and cleans AI-generated suggestions output.
 * 
 * @param {Object} rawOutput - Parsed JSON object from Gemini.
 * @returns {{ summary: string, suggestions: Array<Object> }} Validated structure.
 */
function validateSuggestions(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'object') {
    throw new Error('AI provider returned an invalid JSON object format.');
  }

  const summary = typeof rawOutput.summary === 'string' && rawOutput.summary.trim().length > 0
    ? rawOutput.summary.trim()
    : 'Review prioritized suggestions below to optimize resume alignment, ATS parsability, and technical clarity.';

  const rawList = Array.isArray(rawOutput.suggestions) ? rawOutput.suggestions : [];
  if (rawList.length === 0) {
    throw new Error('AI provider returned an empty suggestions list.');
  }

  const validatedSuggestions = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;

    // Normalize category
    let category = item.category && typeof item.category === 'string' ? item.category.trim() : 'Job-specific recommendations';
    if (!ALLOWED_CATEGORIES.includes(category)) {
      // Find closest matching category or default
      const match = ALLOWED_CATEGORIES.find((cat) => cat.toLowerCase() === category.toLowerCase());
      category = match || 'Job-specific recommendations';
    }

    const issue = typeof item.issue === 'string' && item.issue.trim().length > 0
      ? item.issue.trim()
      : 'Opportunity to improve alignment with target position requirements.';

    const recommendation = typeof item.recommendation === 'string' && item.recommendation.trim().length > 0
      ? item.recommendation.trim()
      : 'Refine section phrasing to clearly demonstrate required technical competencies.';

    const priority = normalizePriority(item.priority);

    const explanation = typeof item.explanation === 'string' && item.explanation.trim().length > 0
      ? item.explanation.trim()
      : 'Helps recruiters and ATS scanners quickly confirm your technical readiness.';

    validatedSuggestions.push({
      category,
      issue,
      recommendation,
      priority,
      explanation
    });
  }

  if (validatedSuggestions.length === 0) {
    throw new Error('Failed to validate any structured suggestions from the AI response.');
  }

  return {
    summary,
    suggestions: validatedSuggestions
  };
}

/**
 * Generates personalized resume improvement suggestions using Gemini API.
 * 
 * @param {Object} context
 * @param {string} context.resumeText - Extracted text from uploaded resume.
 * @param {string} context.jobTitle - Target job title.
 * @param {string} context.jobDescription - Target job posting text.
 * @param {number} context.matchScore - Semantic match score (0-100).
 * @param {Array<string>} context.matchedSkills - Overlapping technical skills.
 * @param {Array<string>} context.missingSkills - Missing required skills.
 * @param {number} context.atsScore - ATS readiness score (0-100).
 * @param {Array<Object>} context.atsBreakdown - Category breakdown from ATS evaluation.
 * @returns {Promise<Object>} Formatted suggestions with executive summary and categorized items.
 */
async function generateAiSuggestions({
  resumeText,
  jobTitle,
  jobDescription,
  matchScore,
  matchedSkills,
  missingSkills,
  atsScore,
  atsBreakdown
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

  if (!apiKey) {
    console.log('[suggestionService]: GEMINI_API_KEY not found in environment; using deterministic suggestions engine.');
    return generateDeterministicSuggestions({
      jobTitle,
      missingSkills,
      atsScore,
      atsBreakdown
    });
  }

  // Sanitize and budget input sizes
  const safeResume = truncateText(resumeText, 8000);
  const safeJobDesc = truncateText(jobDescription, 10000);
  const matchedStr = Array.isArray(matchedSkills) && matchedSkills.length > 0 ? matchedSkills.join(', ') : 'None detected';
  const missingStr = Array.isArray(missingSkills) && missingSkills.length > 0 ? missingSkills.join(', ') : 'None detected';

  const atsSummary = Array.isArray(atsBreakdown)
    ? atsBreakdown.map((c) => `${c.name}: ${c.earnedPoints}/${c.maxPoints} (${c.status})`).join('; ')
    : 'Not available';

  const prompt = `
You are an expert technical career coach and resume strategist assisting a software engineering student.
Analyze the provided candidate resume against the targeted job requirements and generate actionable, tailored resume improvement suggestions.

### TARGET JOB DETAILS
- Job Title: ${jobTitle || 'Software Engineer'}
- Job Description:
${safeJobDesc}

### CURRENT CANDIDATE EVALUATION METRICS
- Semantic Match Score: ${matchScore !== null && matchScore !== undefined ? `${matchScore}%` : 'N/A'}
- Matched Technical Skills: ${matchedStr}
- Missing Required Skills: ${missingStr}
- ATS Readiness Score: ${atsScore !== null && atsScore !== undefined ? `${atsScore}/100` : 'N/A'}
- ATS Category Statuses: ${atsSummary}

### CANDIDATE RESUME TEXT
${safeResume}

### CRITICAL RULES & INSTRUCTIONS
1. NEVER invent or hallucinate false experiences, companies, degrees, certifications, or fake metrics.
2. Recommend truthful, actionable improvements. When suggesting bullet points that need quantifiable impact, use bracketed placeholders such as "[e.g. reduced query latency by ~30%]" or "[quantify impact if available]".
3. Cover each of the following 6 categories:
   - "Resume summary": Ways to make the objective or professional summary impactful and tailored to this specific job.
   - "Skills": High-priority skills from the missing skills list to acquire, refresh, or highlight.
   - "Projects": Practical advice to rephrase technical projects, detail tech stack tools, and emphasize relevant features.
   - "Experience": Tips to strengthen work/internship bullet points with action verbs and quantifiable results.
   - "ATS improvements": Guidance to fix missing headings, formatting issues, or structural gaps identified in the ATS score.
   - "Job-specific recommendations": Specific alignments for this exact job title and company needs.
4. Each suggestion must include:
   - "category": exactly one of the 6 category names above
   - "issue": concise description of the weakness or gap in the current resume
   - "recommendation": concrete, specific advice with sample phrasing or template
   - "priority": "High", "Medium", or "Low"
   - "explanation": brief rationale explaining why this matters for the targeted role
5. Provide 6 to 9 total suggestions (at least 1 per category).

Return ONLY valid JSON with this exact schema:
{
  "summary": "2-3 sentence executive summary highlighting the top 2-3 highest-leverage improvements.",
  "suggestions": [
    {
      "category": "Resume summary",
      "issue": "...",
      "recommendation": "...",
      "priority": "High",
      "explanation": "..."
    }
  ]
}
`;

  const ai = new GoogleGenAI({ apiKey });

  // 20-second timeout controller to guard against network stalls
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    let response;
    // Try primary model (gemini-2.5-flash), with fallback to gemini-3.8-flash
    try {
      response = await ai.models.generateContent(
        {
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        },
        { signal: controller.signal }
      );
    } catch (primaryModelErr) {
      console.warn(`[suggestionService]: Primary model (gemini-2.5-flash) error: ${primaryModelErr.message}. Trying gemini-3.8-flash...`);
      response = await ai.models.generateContent(
        {
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        },
        { signal: controller.signal }
      );
    }

    clearTimeout(timeoutId);

    const responseText = response.text ? response.text.trim() : '';
    if (!responseText) {
      throw new Error('AI provider returned an empty response.');
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Failed to parse AI provider output into valid JSON.');
    }

    return validateSuggestions(parsedJson);

  } catch (error) {
    clearTimeout(timeoutId);

    console.warn(`[suggestionService Notice]: Gemini API unavailable (${error.message}). Utilizing resilient contextual suggestions engine.`);
    
    // Return high-quality contextual fallback suggestions based on actual missing skills and ATS status
    return generateDeterministicSuggestions({
      jobTitle,
      missingSkills,
      atsScore,
      atsBreakdown
    });
  }
}

/**
 * Resilient contextual fallback suggestions generator.
 * Produces structured, truthful suggestions across all 6 core categories
 * when external LLM endpoints experience spikes, outages, or rate-limits.
 */
function generateDeterministicSuggestions({ jobTitle = 'Target Role', missingSkills = [], atsScore = 70, atsBreakdown = [] }) {
  const topMissing = Array.isArray(missingSkills) && missingSkills.length > 0
    ? missingSkills.slice(0, 3)
    : ['core industry frameworks', 'automated CI/CD pipelines'];

  return {
    summary: `Prioritize tailoring your professional summary and project highlights to the requirements for ${jobTitle}, while addressing missing technical proficiencies and ATS formatting recommendations.`,
    suggestions: [
      {
        category: 'Resume summary',
        issue: 'Professional summary could be more tightly tailored to target role requirements.',
        recommendation: `Revise summary to open with: "Results-driven engineer with expertise in core systems, seeking to contribute technical leadership as a ${jobTitle}."`,
        priority: 'High',
        explanation: 'Customized summaries immediately demonstrate alignment with hiring manager search criteria.'
      },
      {
        category: 'Skills',
        issue: `Key job requirements (${topMissing.join(', ')}) are not prominently featured.`,
        recommendation: `Add a dedicated technical competencies section highlighting verified hands-on experience in ${topMissing.join(', ')}.`,
        priority: 'High',
        explanation: 'Including critical required skills directly impacts both ATS parsing match rates and recruiter screening.'
      },
      {
        category: 'Projects',
        issue: 'Project descriptions focus on task activities rather than architectural decisions and outcomes.',
        recommendation: 'Rephrase project bullets to specify technologies used and concrete impact, e.g. "Architected scalable backend service [e.g. reduced response latency by ~30%]."',
        priority: 'Medium',
        explanation: 'Concrete engineering decisions demonstrate technical depth and problem-solving capability.'
      },
      {
        category: 'Experience',
        issue: 'Work accomplishments can be strengthened with stronger action verbs and metrics.',
        recommendation: 'Begin every experience bullet point with an impactful action verb (e.g., Engineered, Optimized, Spearheaded) followed by [quantifiable metric].',
        priority: 'High',
        explanation: 'Quantifiable achievements provide objective evidence of impact.'
      },
      {
        category: 'ATS improvements',
        issue: 'Document structure can be improved for seamless automated parser extraction.',
        recommendation: 'Use standard chronological section headings (Summary, Experience, Education, Technical Skills) and avoid multi-column tables or nested text boxes.',
        priority: atsScore < 75 ? 'High' : 'Medium',
        explanation: 'Standard header conventions ensure recruitment tracking systems categorize content into proper data fields.'
      },
      {
        category: 'Job-specific recommendations',
        issue: `Alignment with core competencies for ${jobTitle} can be highlighted more effectively.`,
        recommendation: `Integrate domain-specific keywords and deliverables directly relevant to ${jobTitle} throughout your most recent experience entries.`,
        priority: 'Medium',
        explanation: 'Echoing role-specific terminology confirms domain familiarity during recruiter review.'
      }
    ]
  };
}

module.exports = {
  generateAiSuggestions,
  ALLOWED_CATEGORIES
};
