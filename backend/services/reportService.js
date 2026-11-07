/**
 * Service: PDF Analysis Report Generator
 * 
 * Implements Task 30: Generate downloadable PDF report using PDFKit.
 * Sections included:
 * 1. Title, Generation Date, and Analysis ID
 * 2. Target Job Title and Analyzed Resume Filename
 * 3. Resume–Job Semantic Match Score & Classification
 * 4. Technical Skills Breakdown (Matched, Missing, Additional)
 * 5. ATS Readiness Score & Category Breakdown
 * 6. AI-Generated Personalized Improvement Suggestions with Priority Labels
 * 7. Important Limitations and ATS estimation disclaimer
 * 
 * Secure design:
 * - Sanitizes all text and handles automatic multi-page wrapping
 * - Does not expose server filesystem paths or secrets
 * - Streams directly to writable output stream (HTTP response)
 */

const path = require('path');
const PDFDocument = require('pdfkit');

/**
 * Format date string nicely for the PDF header
 */
function formatDate(dateInput) {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return new Date().toISOString();
  }
}

/**
 * Safely parse JSON string or return existing object/array
 */
function safeParseJson(value, defaultValue = []) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return defaultValue;
  }
}

/**
 * Generates the complete PDF report and pipes it into the provided writable stream.
 * 
 * @param {Object} record - The analysis record retrieved from MySQL or store
 * @param {WritableStream} outputStream - Express response or writable stream
 * @returns {Promise<void>}
 */
function generatePdfReportStream(record, outputStream) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Resume Analysis Report - Record #${record.id}`,
          Author: 'AI Resume & Job Matcher',
          Subject: `Job Match Analysis: ${record.job_title || record.jobTitle || 'Target Role'}`,
          Keywords: 'resume, job match, ats score, skills gap, ai suggestions',
          CreationDate: new Date(),
        },
      });

      // Handle stream errors
      doc.on('error', (err) => {
        reject(err);
      });

      outputStream.on('error', (err) => {
        reject(err);
      });

      outputStream.on('finish', () => {
        resolve();
      });

      doc.pipe(outputStream);

      // ----------------------------------------------------------------------
      // Colors & Palette
      // ----------------------------------------------------------------------
      const primaryColor = '#1e3a8a';   // Deep Blue
      const secondaryColor = '#3b82f6'; // Bright Blue
      const darkColor = '#0f172a';      // Slate 900
      const bodyColor = '#334155';      // Slate 700
      const mutedColor = '#64748b';     // Slate 500
      const borderLineColor = '#e2e8f0'; // Slate 200
      const lightBgColor = '#f8fafc';   // Slate 50

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Helper for horizontal divider line
      const drawDivider = () => {
        doc.moveDown(0.5);
        doc
          .strokeColor(borderLineColor)
          .lineWidth(0.75)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.margins.left + pageWidth, doc.y)
          .stroke();
        doc.moveDown(0.6);
      };

      // Helper for Section Titles
      const drawSectionHeader = (title) => {
        // Ensure space or break to next page if close to bottom
        if (doc.y > doc.page.height - 120) {
          doc.addPage();
        }
        doc
          .fillColor(primaryColor)
          .fontSize(13)
          .font('Helvetica-Bold')
          .text(title, { paragraphGap: 6 });
        doc.fillColor(bodyColor).font('Helvetica').fontSize(10);
      };

      // ----------------------------------------------------------------------
      // 1. Header Banner & Title
      // ----------------------------------------------------------------------
      doc
        .fillColor(primaryColor)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('AI Resume & Job Matcher', { align: 'left' });

      const isStandalone = !record.match_score && (!record.job_description || String(record.job_description).includes('Standalone ATS'));

      doc
        .fillColor(secondaryColor)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(isStandalone ? 'ATS RESUME READINESS & PARSING REPORT' : 'COMPREHENSIVE RESUME & JOB ANALYSIS REPORT', { align: 'left' });

      doc.moveDown(0.2);

      const reportDate = formatDate(record.created_at || record.createdAt);
      doc
        .fillColor(mutedColor)
        .fontSize(9)
        .font('Helvetica')
        .text(`Report Generated: ${reportDate}   |   ${isStandalone ? 'ATS Check Record ID' : 'Analysis Record ID'}: #${record.id}`, { align: 'left' });

      drawDivider();

      // ----------------------------------------------------------------------
      // 2. Target Role & Analyzed Resume Metadata
      // ----------------------------------------------------------------------
      drawSectionHeader('1. Target Position & Document Metadata');

      const jobTitle = record.job_title || record.jobTitle || 'Target Role';
      const rawResumeName = record.original_filename || record.originalFilename || record.resume_filename || record.resumeFilename || 'Uploaded Resume';
      const resumeFileName = path.basename(rawResumeName);

      // Metadata Box
      const metaBoxY = doc.y;
      doc
        .rect(doc.page.margins.left, metaBoxY, pageWidth, 54)
        .fillAndStroke(lightBgColor, borderLineColor);

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Target Role:', doc.page.margins.left + 14, metaBoxY + 12);
      doc
        .fillColor(primaryColor)
        .font('Helvetica')
        .fontSize(10)
        .text(jobTitle, doc.page.margins.left + 95, metaBoxY + 12, { width: pageWidth - 110, ellipsis: true });

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Resume File:', doc.page.margins.left + 14, metaBoxY + 30);
      doc
        .fillColor(bodyColor)
        .font('Helvetica')
        .fontSize(10)
        .text(resumeFileName, doc.page.margins.left + 95, metaBoxY + 30, { width: pageWidth - 110, ellipsis: true });

      doc.y = metaBoxY + 62;
      doc.moveDown(0.5);

      // Target Job Requirements Excerpt if present
      const jobDescription = record.job_description || record.jobDescription;
      if (jobDescription && typeof jobDescription === 'string' && jobDescription.trim().length > 0) {
        doc
          .fillColor(darkColor)
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('Job Description Excerpt:');
        doc.moveDown(0.2);
        const excerpt = jobDescription.length > 300 ? jobDescription.substring(0, 300).trim() + '...' : jobDescription.trim();
        doc
          .fillColor(bodyColor)
          .font('Helvetica-Oblique')
          .fontSize(9)
          .text(`"${excerpt}"`, { width: pageWidth, lineGap: 2 });
        doc.moveDown(0.6);
      }

      drawDivider();

      // ----------------------------------------------------------------------
      // 3. Resume–Job Semantic Match Score
      // ----------------------------------------------------------------------
      drawSectionHeader('2. Resume–Job Semantic Match Score');

      const matchScore = record.match_score !== null && record.match_score !== undefined
        ? Number(record.match_score)
        : (record.matchScore !== null && record.matchScore !== undefined ? Number(record.matchScore) : null);

      if (matchScore !== null && !isNaN(matchScore)) {
        let matchTier = 'Moderate match';
        let tierColor = '#d97706'; // Amber
        if (matchScore >= 85) {
          matchTier = 'Strong match';
          tierColor = '#059669'; // Green
        } else if (matchScore >= 70) {
          matchTier = 'Good match';
          tierColor = '#2563eb'; // Blue
        } else if (matchScore < 40) {
          matchTier = 'Low match';
          tierColor = '#dc2626'; // Red
        }

        const scoreBoxY = doc.y;
        doc
          .rect(doc.page.margins.left, scoreBoxY, pageWidth, 58)
          .fillAndStroke(lightBgColor, borderLineColor);

        // Big numeric score
        doc
          .fillColor(tierColor)
          .font('Helvetica-Bold')
          .fontSize(24)
          .text(`${Math.round(matchScore)}%`, doc.page.margins.left + 16, scoreBoxY + 14);

        // Tier classification label
        doc
          .fillColor(darkColor)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(`Classification: ${matchTier}`, doc.page.margins.left + 95, scoreBoxY + 12);

        doc
          .fillColor(bodyColor)
          .font('Helvetica')
          .fontSize(9)
          .text(
            'Computed using text embeddings and cosine similarity against target job requirements.',
            doc.page.margins.left + 95,
            scoreBoxY + 28,
            { width: pageWidth - 110 }
          );

        doc.y = scoreBoxY + 66;
        doc
          .fillColor(mutedColor)
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .text(isStandalone ? 'Semantic match was not evaluated (Standalone ATS resume inspection without a target job description).' : 'Semantic match calculation has not been executed for this analysis record.');
        doc.moveDown(0.4);
      }

      drawDivider();

      // ----------------------------------------------------------------------
      // 4. Technical Skills Gap Analysis
      // ----------------------------------------------------------------------
      drawSectionHeader('3. Technical Skills Gap Analysis');

      const matchedSkills = safeParseJson(record.matched_skills || record.matchedSkills, []);
      const missingSkills = safeParseJson(record.missing_skills || record.missingSkills, []);
      const additionalSkills = safeParseJson(record.additional_skills || record.additionalSkills, []);

      const hasSkillsAnalysis = matchedSkills.length > 0 || missingSkills.length > 0 || additionalSkills.length > 0;

      if (hasSkillsAnalysis) {
        // Matched Skills
        doc.fillColor('#059669').font('Helvetica-Bold').fontSize(10).text('Matched Skills (Demonstrated):');
        doc.moveDown(0.2);
        if (matchedSkills.length > 0) {
          doc
            .fillColor(bodyColor)
            .font('Helvetica')
            .fontSize(9.5)
            .text(matchedSkills.join(', '), { width: pageWidth, lineGap: 2 });
        } else {
          doc.fillColor(mutedColor).font('Helvetica-Oblique').fontSize(9).text('None identified in resume.');
        }
        doc.moveDown(0.6);

        // Missing Skills
        doc.fillColor('#dc2626').font('Helvetica-Bold').fontSize(10).text('Missing Skills (Target Gap):');
        doc.moveDown(0.2);
        if (missingSkills.length > 0) {
          doc
            .fillColor(bodyColor)
            .font('Helvetica')
            .fontSize(9.5)
            .text(missingSkills.join(', '), { width: pageWidth, lineGap: 2 });
        } else {
          doc.fillColor(mutedColor).font('Helvetica-Oblique').fontSize(9).text('No missing required skills detected.');
        }
        doc.moveDown(0.6);

        // Additional Skills
        if (additionalSkills.length > 0) {
          doc.fillColor('#475569').font('Helvetica-Bold').fontSize(10).text('Additional Skills (Candidate Bonus):');
          doc.moveDown(0.2);
          doc
            .fillColor(bodyColor)
            .font('Helvetica')
            .fontSize(9.5)
            .text(additionalSkills.join(', '), { width: pageWidth, lineGap: 2 });
          doc.moveDown(0.6);
        }
      } else {
        doc
          .fillColor(mutedColor)
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .text('Skill gap analysis has not been executed for this analysis record.');
        doc.moveDown(0.4);
      }

      drawDivider();

      // ----------------------------------------------------------------------
      // 5. ATS Readiness Score & Category Breakdown
      // ----------------------------------------------------------------------
      drawSectionHeader('4. ATS Readiness Score & Format Parsing Breakdown');

      const atsScore = record.ats_score !== null && record.ats_score !== undefined
        ? Number(record.ats_score)
        : (record.atsScore !== null && record.atsScore !== undefined ? Number(record.atsScore) : null);

      const atsBreakdown = safeParseJson(record.ats_breakdown || record.atsBreakdown, []);

      if (atsScore !== null && !isNaN(atsScore)) {
        let atsTier = 'Needs Formatting Review';
        let atsColor = '#dc2626';
        if (atsScore >= 80) {
          atsTier = 'ATS Friendly';
          atsColor = '#059669';
        } else if (atsScore >= 60) {
          atsTier = 'Moderate Parsability';
          atsColor = '#d97706';
        }

        const atsBoxY = doc.y;
        doc
          .rect(doc.page.margins.left, atsBoxY, pageWidth, 52)
          .fillAndStroke(lightBgColor, borderLineColor);

        doc
          .fillColor(atsColor)
          .font('Helvetica-Bold')
          .fontSize(22)
          .text(`${Math.round(atsScore)}/100`, doc.page.margins.left + 16, atsBoxY + 14);

        doc
          .fillColor(darkColor)
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(`ATS Compliance: ${atsTier}`, doc.page.margins.left + 110, atsBoxY + 12);

        doc
          .fillColor(bodyColor)
          .font('Helvetica')
          .fontSize(9)
          .text('Evaluated across 8 structural dimensions for automated applicant tracking readability.', doc.page.margins.left + 110, atsBoxY + 28, {
            width: pageWidth - 125,
          });

        doc.y = atsBoxY + 60;
        doc.moveDown(0.4);

        // Itemized categories breakdown
        if (Array.isArray(atsBreakdown) && atsBreakdown.length > 0) {
          doc.fillColor(darkColor).font('Helvetica-Bold').fontSize(9.5).text('Category Breakdown:');
          doc.moveDown(0.3);

          atsBreakdown.forEach((cat) => {
            const catName = cat.name || cat.category || 'Category';
            const catStatus = cat.status ? cat.status.toUpperCase() : (cat.earnedPoints !== undefined ? `${cat.earnedPoints}/${cat.maxPoints} pts` : 'Assessed');
            const catDetail = cat.detail || cat.summary || '';

            doc
              .fillColor(darkColor)
              .font('Helvetica-Bold')
              .fontSize(9)
              .text(`• ${catName}: `, { continued: true });
            doc
              .fillColor(primaryColor)
              .font('Helvetica-Bold')
              .text(`[${catStatus}] `, { continued: true });
            doc
              .fillColor(bodyColor)
              .font('Helvetica')
              .text(catDetail ? `- ${catDetail}` : '');
            doc.moveDown(0.15);
          });
          doc.moveDown(0.4);
        }
      } else {
        doc
          .fillColor(mutedColor)
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .text('ATS readiness scoring has not been executed for this analysis record.');
        doc.moveDown(0.4);
      }

      drawDivider();

      // ----------------------------------------------------------------------
      // 6. AI-Generated Personalized Improvement Suggestions
      // ----------------------------------------------------------------------
      drawSectionHeader('5. AI-Generated Personalized Improvement Suggestions');

      const suggestions = safeParseJson(record.improvement_suggestions || record.improvementSuggestions, []);

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(8.5)
          .text('Actionable recommendations prioritized to enhance candidate alignment without inventing credentials.');
        doc.moveDown(0.5);

        suggestions.forEach((item, index) => {
          // Check if near bottom of page, start fresh page cleanly
          if (doc.y > doc.page.height - 110) {
            doc.addPage();
          }

          const category = item.category || 'Resume Improvement';
          const priority = (item.priority || 'Medium').toUpperCase();
          const issue = item.issue || item.currentIssue || item.title || 'Optimization Area';
          const recommendation = item.recommendation || item.recommendedImprovement || item.action || '';
          const explanation = item.explanation || item.description || '';

          // Priority badge color
          let priColor = '#2563eb';
          if (priority === 'HIGH') priColor = '#dc2626';
          else if (priority === 'MEDIUM') priColor = '#d97706';

          // Suggestion Item Header
          doc
            .fillColor(primaryColor)
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(`${index + 1}. ${category} `, { continued: true });
          doc
            .fillColor(priColor)
            .font('Helvetica-Bold')
            .fontSize(9)
            .text(`[${priority} PRIORITY]`);

          doc.moveDown(0.2);

          // Current Issue
          doc
            .fillColor(darkColor)
            .font('Helvetica-Bold')
            .fontSize(9)
            .text('   Current Issue: ', { continued: true });
          doc
            .fillColor(bodyColor)
            .font('Helvetica')
            .fontSize(9)
            .text(issue, { lineGap: 1 });

          // Recommended Action
          if (recommendation) {
            doc
              .fillColor(darkColor)
              .font('Helvetica-Bold')
              .fontSize(9)
              .text('   Recommended Improvement: ', { continued: true });
            doc
              .fillColor('#047857') // Dark Emerald
              .font('Helvetica-Bold')
              .fontSize(9)
              .text(recommendation, { lineGap: 1 });
          }

          // Short Explanation
          if (explanation && explanation !== recommendation) {
            doc
              .fillColor(mutedColor)
              .font('Helvetica')
              .fontSize(8.5)
              .text(`   Context: ${explanation}`, { lineGap: 1 });
          }

          doc.moveDown(0.5);
        });
      } else {
        doc
          .fillColor(mutedColor)
          .font('Helvetica-Oblique')
          .fontSize(9.5)
          .text('Personalized AI improvement suggestions have not been generated for this analysis record.');
        doc.moveDown(0.4);
      }

      drawDivider();

      // ----------------------------------------------------------------------
      // 7. Important Limitations & Disclaimers
      // ----------------------------------------------------------------------
      drawSectionHeader('6. Important Disclaimers & Limitations');

      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      const disclaimerBoxY = doc.y;
      const disclaimerText =
        'IMPORTANT LIMITATIONS: The Resume–Job Match Score is computed using semantic vector embeddings and cosine similarity against the provided job description text. It represents computational topical alignment and does NOT reflect hiring probability, candidate aptitude, or guaranteed interview selection.\n\n' +
        'The ATS Readiness Score evaluates structural layout characteristics (headings, contact details, standard sections, and readability) based on common applicant tracking system conventions. It is an algorithmic heuristic and does not simulate proprietary parsing engines used by individual employers.\n\n' +
        'All AI recommendations are advisory suggestions to help articulate existing genuine achievements and must never be used to misrepresent candidate qualifications or experience.';

      doc
        .rect(doc.page.margins.left, disclaimerBoxY, pageWidth, 90)
        .fillAndStroke('#fffbeb', '#fde68a'); // Amber-50 background with Amber-200 border

      doc
        .fillColor('#92400e') // Amber-800
        .font('Helvetica')
        .fontSize(8)
        .text(disclaimerText, doc.page.margins.left + 12, disclaimerBoxY + 10, {
          width: pageWidth - 24,
          lineGap: 2,
        });

      doc.y = disclaimerBoxY + 98;

      // ----------------------------------------------------------------------
      // Footers & Page Numbering across all buffered pages
      // ----------------------------------------------------------------------
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);

        const footerY = doc.page.height - 35;
        doc
          .strokeColor(borderLineColor)
          .lineWidth(0.5)
          .moveTo(doc.page.margins.left, footerY - 5)
          .lineTo(doc.page.margins.left + pageWidth, footerY - 5)
          .stroke();

        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(8)
          .text(
            'AI Resume & Job Matcher | Confidential Career Assessment Report',
            doc.page.margins.left,
            footerY,
            { align: 'left' }
          );

        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(8)
          .text(`Page ${i + 1} of ${totalPages}`, doc.page.margins.left, footerY, {
            align: 'right',
          });
      }

      // Finalize document stream
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePdfReportStream,
};
