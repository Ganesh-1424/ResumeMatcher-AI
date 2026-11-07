const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

/**
 * Maximum character limit for extracted text.
 * Prevents memory exhaustion / Denial of Service from unusually large documents.
 * 100,000 characters is roughly 15,000–20,000 words (a typical multi-page resume is 400–1,500 words).
 */
const MAX_TEXT_LENGTH = 100000;

/**
 * Minimum word count threshold for meaningful resume content.
 */
const MIN_WORD_COUNT = 5;

/**
 * Magic numbers (file signatures) to confirm file format independently of file extension.
 * - PDF starts with %PDF- (0x25, 0x50, 0x44, 0x46)
 * - DOCX is an OpenXML ZIP package starting with PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
 */
const MAGIC_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  docx: [0x50, 0x4B, 0x03, 0x04]
};

/**
 * Detects the document format using both the file extension and magic byte signature.
 * 
 * @param {string} filePath - Absolute path to the file on disk.
 * @returns {Promise<'pdf'|'docx'>} Detected document type.
 * @throws {Error} If the file is inaccessible or an unsupported format.
 */
const detectDocumentType = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext !== '.pdf' && ext !== '.docx') {
    const error = new Error('Unsupported document format. Only PDF (.pdf) and Word (.docx) files are supported.');
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_FORMAT';
    throw error;
  }

  // Read the first 4 bytes to verify magic numbers
  const buffer = Buffer.alloc(4);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
  } catch (ioErr) {
    const error = new Error('Unable to read resume file from disk.');
    error.statusCode = 400;
    error.code = 'FILE_READ_ERROR';
    throw error;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (_) {}
    }
  }

  const isPdfMagic =
    buffer[0] === MAGIC_SIGNATURES.pdf[0] &&
    buffer[1] === MAGIC_SIGNATURES.pdf[1] &&
    buffer[2] === MAGIC_SIGNATURES.pdf[2] &&
    buffer[3] === MAGIC_SIGNATURES.pdf[3];

  const isDocxMagic =
    buffer[0] === MAGIC_SIGNATURES.docx[0] &&
    buffer[1] === MAGIC_SIGNATURES.docx[1] &&
    buffer[2] === MAGIC_SIGNATURES.docx[2] &&
    buffer[3] === MAGIC_SIGNATURES.docx[3];

  if (ext === '.pdf' && isPdfMagic) {
    return 'pdf';
  }

  if (ext === '.docx' && isDocxMagic) {
    return 'docx';
  }

  const mismatchError = new Error(
    `Security validation failed: File content does not match a valid ${ext.toUpperCase().replace('.', '')} document.`
  );
  mismatchError.statusCode = 400;
  mismatchError.code = 'SIGNATURE_MISMATCH';
  throw mismatchError;
};

/**
 * Cleans and normalizes extracted resume text.
 * - Removes control characters and null bytes.
 * - Normalizes Windows CRLF to standard LF.
 * - Replaces excessive blank lines and horizontal whitespace with clean spacing.
 * 
 * @param {string} rawText - Unprocessed raw string from parser.
 * @returns {string} Cleaned readable text.
 */
const cleanExtractedText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  return rawText
    // Remove null bytes and non-printable control characters (except newline, carriage return, and tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace tabs with a single space
    .replace(/\t/g, ' ')
    // Collapse consecutive spaces on the same line
    .replace(/[ ]{2,}/g, ' ')
    // Remove whitespace at the beginning and end of each line
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // Collapse 3 or more consecutive newlines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Extracts plain text from a PDF file using pdf-parse.
 * Handles both classic function export and modern class-based exports safely.
 * 
 * @param {string} filePath - Absolute path to the PDF file.
 * @returns {Promise<string>} Cleaned text extracted from the PDF.
 */
const extractTextFromPdf = async (filePath) => {
  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(filePath);
  } catch (readErr) {
    const error = new Error('Could not read PDF file from disk.');
    error.statusCode = 400;
    throw error;
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    const error = new Error('The uploaded PDF file is empty (0 bytes).');
    error.statusCode = 400;
    throw error;
  }

  try {
    let extractedText = '';

    // Check if pdfParse is a callable function (pdf-parse v1.x)
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(fileBuffer);
      extractedText = data.text || '';
    }
    // Check if pdfParse provides the PDFParse class (pdf-parse v2.x)
    else if (pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: fileBuffer });
      await parser.load();
      const result = await parser.getText();
      extractedText = typeof result === 'string' ? result : (result.text || '');
      if (typeof parser.destroy === 'function') {
        try {
          await parser.destroy();
        } catch (_) {}
      }
    } else {
      throw new Error('Unsupported pdf-parse module interface.');
    }

    return extractedText;
  } catch (pdfErr) {
    const errMessage = (pdfErr.message || '').toLowerCase();

    // Check for password protection / encryption
    if (
      errMessage.includes('password') ||
      errMessage.includes('encrypted') ||
      pdfErr.name === 'PasswordException'
    ) {
      const error = new Error('The PDF resume is password-protected. Please upload an unprotected file.');
      error.statusCode = 400;
      error.code = 'PASSWORD_PROTECTED';
      throw error;
    }

    // Check for corrupted or invalid PDF structure
    if (
      errMessage.includes('invalid pdf') ||
      errMessage.includes('formaterror') ||
      errMessage.includes('corrupt') ||
      errMessage.includes('structure')
    ) {
      const error = new Error('The PDF file is corrupted or could not be read.');
      error.statusCode = 400;
      error.code = 'CORRUPTED_DOCUMENT';
      throw error;
    }

    // Generic PDF parsing error
    const error = new Error(`Failed to extract text from PDF: ${pdfErr.message}`);
    error.statusCode = 400;
    error.code = 'PDF_PARSE_FAILED';
    throw error;
  }
};

/**
 * Extracts plain text from a Word document (.docx) using mammoth.
 * 
 * @param {string} filePath - Absolute path to the DOCX file.
 * @returns {Promise<string>} Cleaned text extracted from the DOCX.
 */
const extractTextFromDocx = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (docxErr) {
    const errMessage = (docxErr.message || '').toLowerCase();

    // Check for corrupted zip structure or password protection
    if (
      errMessage.includes('zip') ||
      errMessage.includes('central directory') ||
      errMessage.includes('end of central directory') ||
      errMessage.includes('corrupted')
    ) {
      const error = new Error('The Word (DOCX) document is corrupted or invalid.');
      error.statusCode = 400;
      error.code = 'CORRUPTED_DOCUMENT';
      throw error;
    }

    if (errMessage.includes('password') || errMessage.includes('encrypted')) {
      const error = new Error('The Word (DOCX) document is password-protected. Please upload an unprotected file.');
      error.statusCode = 400;
      error.code = 'PASSWORD_PROTECTED';
      throw error;
    }

    const error = new Error(`Failed to extract text from Word document: ${docxErr.message}`);
    error.statusCode = 400;
    error.code = 'DOCX_PARSE_FAILED';
    throw error;
  }
};

/**
 * Main service function to parse an uploaded resume file.
 * 
 * Flow:
 * 1. Verifies file presence on disk.
 * 2. Detects whether document is PDF or DOCX (via extension & magic bytes).
 * 3. Extracts readable text using appropriate engine.
 * 4. Cleans and normalizes the text.
 * 5. Validates that the text contains meaningful content (rejects empty / image-only scans).
 * 6. Enforces memory safety limit (MAX_TEXT_LENGTH).
 * 7. Computes word count and character count.
 * 
 * @param {string} filePath - Absolute path to the uploaded resume file.
 * @returns {Promise<{
 *   success: boolean,
 *   documentType: 'pdf'|'docx',
 *   text: string,
 *   wordCount: number,
 *   charCount: number,
 *   isTruncated: boolean
 * }>}
 */
const parseResume = async (filePath) => {
  // 1. Verify file exists
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) {
    const error = new Error('Resume file not found on server disk.');
    error.statusCode = 404;
    error.code = 'FILE_NOT_FOUND';
    throw error;
  }

  // 2. Detect document type
  const documentType = await detectDocumentType(filePath);

  // 3. Extract text
  let rawText = '';
  if (documentType === 'pdf') {
    rawText = await extractTextFromPdf(filePath);
  } else if (documentType === 'docx') {
    rawText = await extractTextFromDocx(filePath);
  }

  // 4. Clean text
  let cleanedText = cleanExtractedText(rawText);

  // 5. Check if document has meaningful text
  // Tokenize words
  const words = cleanedText ? cleanedText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  if (!cleanedText || cleanedText.length < 20 || wordCount < MIN_WORD_COUNT) {
    const error = new Error(
      'Document contains no readable text. It may be an empty document, an image-only scan, or an unsupported format.'
    );
    error.statusCode = 400;
    error.code = 'NO_MEANINGFUL_TEXT';
    throw error;
  }

  // 6. Memory safety: limit text length
  let isTruncated = false;
  if (cleanedText.length > MAX_TEXT_LENGTH) {
    cleanedText = cleanedText.slice(0, MAX_TEXT_LENGTH);
    isTruncated = true;
  }

  const charCount = cleanedText.length;

  return {
    success: true,
    documentType,
    text: cleanedText,
    wordCount,
    charCount,
    isTruncated
  };
};

module.exports = {
  parseResume,
  extractResumeText: parseResume,
  detectDocumentType,
  cleanExtractedText,
  extractTextFromPdf,
  extractTextFromDocx,
  MAX_TEXT_LENGTH,
  MIN_WORD_COUNT
};
