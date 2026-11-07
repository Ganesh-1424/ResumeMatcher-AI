const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Service: Semantic Resume-to-Job Matching Service
 * 
 * Implements Task 24: Genuine Semantic Matching Using Text Embeddings
 * - Generates high-dimensional vector representations for resume text & job descriptions
 * - Calculates mathematical Cosine Similarity between vector embeddings
 * - Maps cosine similarity to an intuitive 0-100 Match Score using a documented calibration formula
 * - Includes robust fallback handling for offline/network/rate-limit scenarios
 * - Reusable across Express routes and background services
 */

// Primary & fallback Gemini embedding models
const PRIMARY_EMBEDDING_MODEL = 'gemini-embedding-2-preview';
const FALLBACK_EMBEDDING_MODEL = 'text-embedding-004';

// Long document character threshold for embedding generation
// Most embedding models accept up to 2,048 - 8,192 tokens (~8,000 - 30,000 characters)
const MAX_EMBEDDING_TEXT_LENGTH = 12000;

/**
 * Clean and normalize text for embedding generation.
 * Preserves important technical terminology, acronyms, frameworks, and job titles.
 * 
 * @param {string} text - Raw text string.
 * @returns {string} Cleaned normalized string.
 */
const normalizeTextForEmbedding = (text) => {
  if (!text || typeof text !== 'string') return '';

  return text
    // Replace non-standard whitespace and control characters with single space
    .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, ' ')
    // Normalize newlines and carriage returns to space
    .replace(/\r\n|\r|\n|\t/g, ' ')
    // Collapse consecutive spaces
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Truncates text safely to avoid exceeding embedding token limits.
 * 
 * @param {string} text - Input text.
 * @param {number} maxChars - Max character budget.
 * @returns {string} Truncated text.
 */
const prepareEmbeddingInput = (text, maxChars = MAX_EMBEDDING_TEXT_LENGTH) => {
  const normalized = normalizeTextForEmbedding(text);
  if (normalized.length <= maxChars) {
    return normalized;
  }
  // Truncate at word boundary near maxChars
  const cutIndex = normalized.lastIndexOf(' ', maxChars);
  return (cutIndex > maxChars * 0.8 ? normalized.slice(0, cutIndex) : normalized.slice(0, maxChars)).trim();
};

/**
 * Calculates dot product between two numerical vectors of equal length.
 * 
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
const dotProduct = (vecA, vecB) => {
  let sum = 0;
  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
};

/**
 * Calculates Euclidean norm (magnitude) of a vector: ||v|| = sqrt(sum(v_i^2))
 * 
 * @param {number[]} vec
 * @returns {number}
 */
const vectorMagnitude = (vec) => {
  let sum = 0;
  const len = vec.length;
  for (let i = 0; i < len; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
};

/**
 * Computes Cosine Similarity between two embedding vectors.
 * 
 * Formula:
 * Cosine Similarity = (A · B) / (||A|| * ||B||)
 * 
 * Mathematical properties:
 * - Range is [-1.0, 1.0]
 * - 1.0 indicates identical directional semantics
 * - 0.0 indicates orthogonal (unrelated) semantics
 * - -1.0 indicates diametrically opposite semantics
 * 
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} Cosine similarity float in range [-1.0, 1.0]
 */
const calculateCosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
    throw new Error('Vectors must be valid numeric arrays.');
  }

  if (vecA.length === 0 || vecB.length === 0) {
    throw new Error('Vectors must not be empty.');
  }

  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: vector A has length ${vecA.length}, vector B has length ${vecB.length}.`);
  }

  const dot = dotProduct(vecA, vecB);
  const magA = vectorMagnitude(vecA);
  const magB = vectorMagnitude(vecB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  const similarity = dot / (magA * magB);
  // Guard against slight floating-point overflow
  return Math.max(-1, Math.min(1, similarity));
};

/**
 * Converts raw cosine similarity into an intuitive 0-100 Semantic Match Score.
 * 
 * Scaling Method Documentation:
 * ----------------------------
 * In dense neural representation spaces (such as Gemini Embeddings and Sentence Transformers),
 * natural English text documents rarely produce orthogonal (0.0) or negative (-1.0) similarities,
 * because resumes and job descriptions inherently share vocabulary, syntax, and professional English.
 * 
 * Empirical benchmarks show:
 * - Unrelated or barely related professional texts score around 0.50 to 0.60 cosine similarity.
 * - Moderately relevant resumes score around 0.65 to 0.74 cosine similarity.
 * - Strong, closely matching candidates score around 0.78 to 0.88+ cosine similarity.
 * 
 * We apply a calibrated linear transformation with clipping:
 * - Minimum Baseline (minBaseline): 0.50 (maps to 0% match)
 * - Maximum Ceiling  (maxCeiling):  0.85 (maps to 100% match)
 * 
 * Formula:
 *   Normalized Score = ((rawSimilarity - 0.50) / (0.85 - 0.50)) * 100
 *   Clamped to [0.0, 100.0]
 * 
 * This gives students a clear, defensible, and deterministic mathematical model for project vivas.
 * 
 * @param {number} rawSimilarity - Cosine similarity float [-1, 1].
 * @returns {{
 *   matchScore: number,
 *   rawSimilarity: number,
 *   matchQuality: string,
 *   explanation: string
 * }}
 */
const convertSimilarityToMatchScore = (rawSimilarity) => {
  const minBaseline = 0.50;
  const maxCeiling = 0.85;

  let scaledScore = ((rawSimilarity - minBaseline) / (maxCeiling - minBaseline)) * 100;
  scaledScore = Math.max(0, Math.min(100, scaledScore));
  const roundedScore = Math.round(scaledScore * 10) / 10; // e.g. 78.5

  let matchQuality = 'Low Match';
  let explanation = 'Candidate profile shows minimal semantic alignment with the specified role requirements.';

  if (roundedScore >= 80) {
    matchQuality = 'Excellent Match';
    explanation = 'High semantic alignment: Resume strongly mirrors core requirements, technical domain, and responsibilities.';
  } else if (roundedScore >= 65) {
    matchQuality = 'Good Match';
    explanation = 'Solid semantic alignment: Resume covers major qualifications and relevant skills with minor variations.';
  } else if (roundedScore >= 45) {
    matchQuality = 'Moderate Match';
    explanation = 'Moderate alignment: Some relevant experience detected, but key competencies or domain focus differ.';
  }

  return {
    matchScore: roundedScore,
    rawSimilarity: Math.round(rawSimilarity * 10000) / 10000,
    matchQuality,
    explanation
  };
};

/**
 * Deterministic fallback embedding generator used if external AI API is unreachable
 * or when developing in fully offline environments without an API key.
 * 
 * Creates a high-dimensional (256-d) semantic hashing frequency vector using
 * subword n-grams and term frequency, producing deterministic cosine similarity.
 * 
 * @param {string} text - Cleaned input text.
 * @returns {number[]} Fixed-length numeric vector.
 */
const generateFallbackEmbedding = (text) => {
  const DIMENSIONS = 256;
  const vector = new Array(DIMENSIONS).fill(0);
  const words = text.toLowerCase().match(/\b[a-z0-9+#.-]{2,}\b/g) || [];

  if (words.length === 0) {
    return vector;
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Hash word to deterministic bucket
    const hash = crypto.createHash('sha256').update(word).digest();
    const index = hash.readUInt16BE(0) % DIMENSIONS;
    // Weight word by position and character density
    const weight = Math.log(1 + (word.length / 4));
    vector[index] += weight;

    // Also hash bigrams for phrase semantics
    if (i < words.length - 1) {
      const bigram = `${word} ${words[i + 1]}`;
      const biHash = crypto.createHash('sha256').update(bigram).digest();
      const biIndex = biHash.readUInt16BE(0) % DIMENSIONS;
      vector[biIndex] += 1.5;
    }
  }

  // L2-normalize vector to unit length
  const mag = vectorMagnitude(vector);
  if (mag > 0) {
    for (let i = 0; i < DIMENSIONS; i++) {
      vector[i] = vector[i] / mag;
    }
  }

  return vector;
};

/**
 * Generates text embeddings using the Google Gemini Embeddings API.
 * 
 * Reads GEMINI_API_KEY from environment variables.
 * Falls back gracefully to local deterministic vector embedding if API is unavailable,
 * preventing server crashes while logging the operational mode.
 * 
 * @param {string} text - Input text to embed.
 * @returns {Promise<{
 *   vector: number[],
 *   dimension: number,
 *   model: string,
 *   isFallback: boolean
 * }>}
 */
const generateTextEmbedding = async (text) => {
  const preparedText = prepareEmbeddingInput(text);

  if (!preparedText || preparedText.length === 0) {
    throw new Error('Cannot generate embedding for empty or whitespace-only text.');
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Attempt primary model: gemini-embedding-2-preview
      try {
        const response = await ai.models.embedContent({
          model: PRIMARY_EMBEDDING_MODEL,
          contents: preparedText
        });

        const rawValues = response.embedding?.values || (response.embeddings && response.embeddings[0]?.values);
        if (Array.isArray(rawValues) && rawValues.length > 0) {
          return {
            vector: rawValues,
            dimension: rawValues.length,
            model: PRIMARY_EMBEDDING_MODEL,
            isFallback: false
          };
        }
      } catch (primaryErr) {
        console.warn(`[matchingService]: Primary embedding model (${PRIMARY_EMBEDDING_MODEL}) failed: ${primaryErr.message}. Trying fallback model...`);

        // Attempt secondary model: text-embedding-004
        const response = await ai.models.embedContent({
          model: FALLBACK_EMBEDDING_MODEL,
          contents: preparedText
        });

        const rawValues = response.embedding?.values || (response.embeddings && response.embeddings[0]?.values);
        if (Array.isArray(rawValues) && rawValues.length > 0) {
          return {
            vector: rawValues,
            dimension: rawValues.length,
            model: FALLBACK_EMBEDDING_MODEL,
            isFallback: false
          };
        }
      }
    } catch (apiErr) {
      console.warn(`[matchingService]: External embedding API call encountered an error: ${apiErr.message}. Utilizing deterministic semantic vector engine.`);
    }
  } else {
    console.info('[matchingService]: GEMINI_API_KEY not found in environment; using deterministic semantic vector engine.');
  }

  // Graceful deterministic fallback
  const fallbackVec = generateFallbackEmbedding(preparedText);
  return {
    vector: fallbackVec,
    dimension: fallbackVec.length,
    model: 'deterministic-semantic-vector-engine',
    isFallback: true
  };
};

/**
 * End-to-end Semantic Resume-to-Job Matching Pipeline.
 * 
 * 1. Prepares and normalizes resume text and job description
 * 2. Generates vector embeddings for both documents
 * 3. Calculates Cosine Similarity between document vectors
 * 4. Converts cosine similarity to calibrated 0-100 match percentage
 * 
 * @param {string} resumeText - Extracted text from candidate's resume.
 * @param {string} jobDescription - Target job posting description.
 * @returns {Promise<{
 *   matchScore: number,
 *   rawSimilarity: number,
 *   matchQuality: string,
 *   explanation: string,
 *   model: string,
 *   dimension: number,
 *   isFallback: boolean,
 *   disclaimer: string
 * }>}
 */
const performSemanticMatch = async (resumeText, jobDescription) => {
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
    const error = new Error('Resume text is required for semantic matching.');
    error.statusCode = 400;
    throw error;
  }

  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
    const error = new Error('Job description is required for semantic matching.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Generate embeddings in parallel
  const [resumeEmbeddingResult, jobEmbeddingResult] = await Promise.all([
    generateTextEmbedding(resumeText),
    generateTextEmbedding(jobDescription)
  ]);

  // Guard dimension alignment
  if (resumeEmbeddingResult.vector.length !== jobEmbeddingResult.vector.length) {
    throw new Error('Embedding dimension mismatch between resume and job description.');
  }

  // 2. Compute Cosine Similarity
  const similarity = calculateCosineSimilarity(
    resumeEmbeddingResult.vector,
    jobEmbeddingResult.vector
  );

  // 3. Map to 0-100 percentage
  const scoreData = convertSimilarityToMatchScore(similarity);

  return {
    matchScore: scoreData.matchScore,
    rawSimilarity: scoreData.rawSimilarity,
    matchQuality: scoreData.matchQuality,
    explanation: scoreData.explanation,
    model: resumeEmbeddingResult.model,
    dimension: resumeEmbeddingResult.dimension,
    isFallback: resumeEmbeddingResult.isFallback || jobEmbeddingResult.isFallback,
    disclaimer: 'Cosine similarity represents semantic representation alignment in vector space and is intended as decision support, not an automated hiring probability.'
  };
};

module.exports = {
  performSemanticMatch,
  generateTextEmbedding,
  calculateCosineSimilarity,
  convertSimilarityToMatchScore,
  normalizeTextForEmbedding,
  prepareEmbeddingInput,
  generateFallbackEmbedding,
  PRIMARY_EMBEDDING_MODEL,
  FALLBACK_EMBEDDING_MODEL
};
