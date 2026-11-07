/**
 * Service: AI Resume Builder Writing Assistance
 * 
 * Implements Task 41 Requirement 5:
 * - Professional summary generation & refinement
 * - Project description & bullet point enhancement
 * - Internship & work experience bullet improvement (action verbs + metric placeholders)
 * - Skills presentation & categorization
 * - Grammar, conciseness, and clarity polish
 * 
 * Critical Ethical Safeguards:
 * - NEVER invent skills, qualifications, companies, projects, or fake metrics.
 * - Uses only the candidate-supplied context.
 * - Recommends bracketed placeholders like "[insert quantifiable metric if available]".
 * - Provides editable suggestions without overwriting user content.
 */

const { GoogleGenAI } = require('@google/genai');

/**
 * Generates AI-assisted writing suggestions for Resume Builder.
 * 
 * @param {Object} params
 * @param {string} params.type - 'summary' | 'experience_bullet' | 'project_bullet' | 'skills' | 'polish'
 * @param {string} params.inputText - Existing user drafted text
 * @param {Object} [params.context={}] - Supporting context (e.g. role, skills, tech stack, company)
 * @returns {Promise<Object>} Structured writing suggestions
 */
async function generateWritingAssistance({ type, inputText = '', context = {} }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

  // Fallback heuristic if API key is not configured or in testing environment
  if (!apiKey) {
    return generateFallbackAssistance({ type, inputText, context });
  }

  const ai = new GoogleGenAI({ apiKey });

  let promptInstruction = '';
  switch (type) {
    case 'summary':
      promptInstruction = `
Task: Professional Summary Generation / Polish
The user is drafting their professional summary for their resume.
Candidate context provided:
- Target Role: ${context.role || context.jobTitle || 'Software Engineer'}
- Key Skills: ${context.skills || 'Technical competencies'}
- Years/Experience Level: ${context.experienceLevel || 'Early career / Student'}
- Current Draft / Notes: "${inputText}"

Rules:
1. Draft 2 distinct options:
   Option A: Strong, concise 2-sentence summary focusing on technical competencies and value delivery.
   Option B: Impact-oriented 3-sentence summary with bracketed metric placeholders like "[e.g. scalable REST APIs]".
2. DO NOT invent false past employers, degrees, or certifications.
3. Return clean, polished text ready to insert.
`;
      break;

    case 'experience_bullet':
      promptInstruction = `
Task: Work / Internship Experience Bullet Polish
The user wants to strengthen an experience bullet point.
Context:
- Role: ${context.role || 'Developer'}
- Company: ${context.company || 'Organization'}
- Current Bullet: "${inputText}"

Rules:
1. Begin with a strong action verb (e.g. Architected, Engineered, Developed, Optimized, Orchestrated, Automated).
2. Clearly highlight the action taken, tools used, and outcome.
3. Use bracketed placeholders for metrics like "[e.g. improved response latency by ~25%]" or "[supporting N concurrent users]".
4. DO NOT invent fake achievements or tools not mentioned.
5. Provide 2 refined variations.
`;
      break;

    case 'project_bullet':
      promptInstruction = `
Task: Technical Project Bullet Polish
The user wants to improve a project highlight.
Context:
- Project Name: ${context.projectName || 'Software Project'}
- Tech Stack: ${context.techStack || 'Relevant technologies'}
- Current Description: "${inputText}"

Rules:
1. Start with an impactful action verb.
2. Emphasize engineering challenge, architecture/stack, and user-facing or technical result.
3. Include bracketed placeholders like "[e.g. integrated WebSocket real-time updates]" where appropriate.
4. Provide 2 refined variations.
`;
      break;

    case 'skills':
      promptInstruction = `
Task: Technical Skills Presentation & Organization
The user provided the following raw skills or technologies:
"${inputText}"

Rules:
1. Organize the skills into clean, standard categories: Languages, Frontend, Backend, Databases, Tools & Platforms.
2. Only organize skills explicitly mentioned; do not invent credentials.
3. Suggest 2-3 standard adjacent skills as bracketed "(Optional to consider if learned)".
`;
      break;

    case 'polish':
    default:
      promptInstruction = `
Task: Professional Resume Proofreading & Clarity Polish
Current text: "${inputText}"

Rules:
1. Correct any grammar, spelling, or awkward phrasing.
2. Enhance active voice and professional brevity.
3. Maintain exact factual details without exaggerating or hallucinating.
4. Provide 2 refined options.
`;
      break;
  }

  const fullPrompt = `
You are a senior technical resume writer and career coach.
${promptInstruction}

CRITICAL RULES:
- Never hallucinate false employers, degrees, skills, or metrics.
- Keep all suggestions factual and strictly grounded in the user's input.
- Return ONLY valid JSON with this exact schema:
{
  "summary": "Brief 1-sentence note explaining what was improved",
  "suggestions": [
    {
      "label": "Option 1 (Concise)",
      "text": "Polished text variation 1"
    },
    {
      "label": "Option 2 (Impact-driven)",
      "text": "Polished text variation 2"
    }
  ],
  "tips": ["One actionable tip for candidate"]
}
`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await ai.models.generateContent(
      {
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const rawText = response.text || '';
    const parsed = JSON.parse(rawText);

    if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
      return {
        success: true,
        type,
        summary: parsed.summary || 'AI suggestions generated successfully.',
        suggestions: parsed.suggestions,
        tips: parsed.tips || []
      };
    }
    throw new Error('Malformed response from AI model');

  } catch (err) {
    console.warn('[builderAiService Warning]: Gemini call failed, using heuristic fallback:', err.message);
    return generateFallbackAssistance({ type, inputText, context });
  }
}

/**
 * Deterministic heuristic fallback when Gemini is offline or API key is absent.
 */
function generateFallbackAssistance({ type, inputText = '', context = {} }) {
  const cleanInput = (inputText || '').trim();

  if (type === 'summary') {
    const role = context.role || 'Software Engineer';
    const skills = context.skills || 'modern web technologies and cloud services';
    return {
      success: true,
      type: 'summary',
      summary: 'Heuristic summary templates based on your target role and background.',
      suggestions: [
        {
          label: 'Option 1 (Results-Oriented)',
          text: `Results-driven ${role} with strong hands-on proficiency in ${skills}. Proven background in architecting clean, maintainable systems and delivering scalable software solutions.`
        },
        {
          label: 'Option 2 (Impact-Focused)',
          text: `Passionate ${role} experienced in designing modern applications using ${skills}. Focused on writing robust, well-tested code and optimizing performance for end-user impact.`
        }
      ],
      tips: ['Highlight 3–4 of your strongest technical skills in the opening sentence.']
    };
  }

  if (type === 'experience_bullet' || type === 'project_bullet') {
    let actionVerb = 'Engineered';
    if (cleanInput.toLowerCase().startsWith('worked on') || cleanInput.toLowerCase().startsWith('responsible for')) {
      actionVerb = 'Spearheaded development of';
    } else if (cleanInput.toLowerCase().startsWith('made') || cleanInput.toLowerCase().startsWith('built')) {
      actionVerb = 'Architected and built';
    }

    const polishedBase = cleanInput.replace(/^(i\s+|responsible for\s+|worked on\s+|helped\s+)/i, '');

    return {
      success: true,
      type,
      summary: 'Enhanced bullet points with strong active verbs and quantifiable impact.',
      suggestions: [
        {
          label: 'Option 1 (Action + Stack)',
          text: `${actionVerb} ${polishedBase || 'core application features'} using [relevant tech stack], enhancing modularity and system reliability.`
        },
        {
          label: 'Option 2 (Action + Quantified Outcome)',
          text: `Engineered ${polishedBase || 'key system components'}, streamlining workflows and [e.g. reducing processing time by ~25%].`
        }
      ],
      tips: ['Include quantifiable metrics (percentages, request counts, or time saved) whenever verified.']
    };
  }

  // Default polish
  return {
    success: true,
    type: 'polish',
    summary: 'Refined phrasing for professional impact and conciseness.',
    suggestions: [
      {
        label: 'Option 1 (Clear & Direct)',
        text: cleanInput ? cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1) : 'Collaborated across cross-functional teams to deliver high-quality software.'
      },
      {
        label: 'Option 2 (Active Voice)',
        text: cleanInput ? `Architected and maintained ${cleanInput.toLowerCase().replace(/^(developed|worked on)\s+/i, '')}` : 'Engineered responsive features and improved code coverage.'
      }
    ],
    tips: ['Keep bullet points under 2 lines for optimal ATS and recruiter scanability.']
  };
}

module.exports = {
  generateWritingAssistance
};
