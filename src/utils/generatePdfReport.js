import { jsPDF } from 'jspdf';

/**
 * Sanitizes a string into a URL- and filesystem-safe filename slug.
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeFilename(str) {
  if (!str || typeof str !== 'string') return 'report';
  const clean = str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || 'report';
}

/**
 * Generates and downloads a multi-page PDF report for an analysis record.
 * 
 * @param {object} analysis - The analysis result record to render into PDF
 * @returns {Promise<string>} Downloaded filename
 */
export async function generatePdfReport(analysis) {
  if (!analysis || typeof analysis !== 'object') {
    throw new Error('Invalid analysis record provided for PDF generation.');
  }

  // Safe field extractions
  const jobTitle = analysis.jobTitle || 'Target Role (Unspecified)';
  const dateStr = analysis.date || analysis.analyzedAt || new Date().toISOString().split('T')[0];
  const resumeFile = analysis.resumeFileName || 'Candidate Resume';
  const matchScore = typeof analysis.matchScore === 'number' ? Math.round(analysis.matchScore) : 0;
  const atsScore = typeof analysis.atsScore === 'number' ? Math.round(analysis.atsScore) : 0;
  const matchDescription =
    analysis.matchScoreDescription ||
    'Represents qualification overlap and relevance between resume content and job specifications.';
  const atsDescription =
    analysis.atsScoreDescription ||
    'Evaluates structural formatting, linear layout, and parsability against ATS benchmarks.';
  const matchedSkills = Array.isArray(analysis.matchedSkills) ? analysis.matchedSkills : [];
  const missingSkills = Array.isArray(analysis.missingSkills) ? analysis.missingSkills : [];
  const atsCategories = Array.isArray(analysis.atsCategories) ? analysis.atsCategories : [];
  const suggestions = Array.isArray(analysis.suggestions) ? analysis.suggestions : [];
  const notes = analysis.notes || null;

  // Derive score labels
  const getMatchTier = (s) => {
    if (s >= 85) return 'Strong Match (85-100%)';
    if (s >= 70) return 'Good Match (70-84%)';
    if (s >= 40) return 'Moderate Match (40-69%)';
    return 'Low Match (0-39%)';
  };

  const getAtsTier = (s) => {
    if (s >= 80) return 'ATS Friendly (Passing Target)';
    if (s >= 60) return 'Moderate Parsability';
    return 'Needs Formatting Review';
  };

  // Initialize jsPDF A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 16;
  const marginRight = 16;
  const contentWidth = pageWidth - marginLeft - marginRight; // 178 mm
  const maxY = pageHeight - 20; // 277 mm

  let currentY = 18;

  // Helper to ensure enough vertical space or trigger a new page
  const checkPageBreak = (neededHeight = 15) => {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = 20;
      return true;
    }
    return false;
  };

  // Helper to render horizontal line divider
  const drawDivider = () => {
    checkPageBreak(6);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
    currentY += 6;
  };

  // ==========================================
  // 1. HEADER & BRANDING
  // ==========================================
  // Brand Header Bar
  doc.setFillColor(30, 58, 138); // blue-900
  doc.roundedRect(marginLeft, currentY, contentWidth, 24, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AI RESUME & JOB MATCHER', marginLeft + 8, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Final-Year Engineering Project  |  Resume Analysis & ATS Diagnostic Report', marginLeft + 8, currentY + 17);

  currentY += 28;

  // Sample Notice Banner (Academic Presentation Ethics)
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.4);
  doc.roundedRect(marginLeft, currentY, contentWidth, 12, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14); // amber-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SAMPLE EVALUATION REPORT', marginLeft + 5, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'Demonstration report prepared with project sample data. Production calculations integrate with Express.js & MySQL.',
    marginLeft + 5,
    currentY + 9.5
  );

  currentY += 16;

  // ==========================================
  // 2. METADATA SECTION
  // ==========================================
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TARGET ROLE:', marginLeft + 6, currentY + 6.5);
  doc.text('ANALYSIS DATE:', marginLeft + 6, currentY + 12.5);
  doc.text('RESUME DOCUMENT:', marginLeft + 6, currentY + 18.5);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(jobTitle, marginLeft + 42, currentY + 6.5);
  doc.text(dateStr, marginLeft + 42, currentY + 12.5);
  doc.text(resumeFile, marginLeft + 42, currentY + 18.5);

  currentY += 27;

  // ==========================================
  // 3. OVERALL SCORES SUMMARY (2 COLUMNS)
  // ==========================================
  checkPageBreak(45);

  const colWidth = (contentWidth - 6) / 2; // ~86 mm
  const boxHeight = 40;

  // Box 1: Overall Match Score
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.roundedRect(marginLeft, currentY, colWidth, boxHeight, 3, 3, 'FD');

  doc.setTextColor(30, 58, 138); // blue-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RESUME-JOB MATCH SCORE', marginLeft + 6, currentY + 7);

  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`${matchScore}%`, marginLeft + 6, currentY + 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text(getMatchTier(matchScore), marginLeft + 6, currentY + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const matchDescLines = doc.splitTextToSize(matchDescription, colWidth - 12);
  doc.text(matchDescLines.slice(0, 3), marginLeft + 6, currentY + 28);

  // Box 2: ATS Readiness Score
  const col2X = marginLeft + colWidth + 6;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(col2X, currentY, colWidth, boxHeight, 3, 3, 'FD');

  doc.setTextColor(6, 95, 70); // emerald-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ATS READINESS SCORE', col2X + 6, currentY + 7);

  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`${atsScore}/100`, col2X + 6, currentY + 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text(getAtsTier(atsScore), col2X + 6, currentY + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const atsDescLines = doc.splitTextToSize(atsDescription, colWidth - 12);
  doc.text(atsDescLines.slice(0, 3), col2X + 6, currentY + 28);

  currentY += boxHeight + 8;

  // ==========================================
  // 4. SKILL GAP ANALYSIS SECTION
  // ==========================================
  checkPageBreak(30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Skill Gap Analysis', marginLeft, currentY);
  currentY += 6;

  // Matched Skills Sub-block
  checkPageBreak(20);
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text(`Matched Skills (${matchedSkills.length}) - Present in Resume & Job Description:`, marginLeft, currentY);
  currentY += 5;

  if (matchedSkills.length > 0) {
    // Render as wrapped bullet list or tags
    const matchedText = matchedSkills.join('   •   ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(`•   ${matchedText}`, contentWidth - 4);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, marginLeft + 2, currentY);
      currentY += 4.5;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No matching skills were identified in the candidate resume.', marginLeft + 2, currentY);
    currentY += 5;
  }
  currentY += 3;

  // Missing Skills Sub-block
  checkPageBreak(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`Missing Skills (${missingSkills.length}) - Required by Job but Not Detected in Resume:`, marginLeft, currentY);
  currentY += 5;

  if (missingSkills.length > 0) {
    const missingText = missingSkills.join('   •   ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(`•   ${missingText}`, contentWidth - 4);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, marginLeft + 2, currentY);
      currentY += 4.5;
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Zero missing skill gaps detected! High coverage.', marginLeft + 2, currentY);
    currentY += 5;
  }

  currentY += 5;
  drawDivider();

  // ==========================================
  // 5. ATS EVALUATION CATEGORIES BREAKDOWN
  // ==========================================
  if (atsCategories.length > 0) {
    checkPageBreak(25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('2. ATS Evaluation Categories Breakdown', marginLeft, currentY);
    currentY += 6;

    for (const cat of atsCategories) {
      checkPageBreak(12);

      const status = cat.status || 'Unassessed';
      const isMet = status.toLowerCase() === 'meets guideline';
      const isWarn = status.toLowerCase() === 'needs improvement';

      // Status pill / text
      if (isMet) {
        doc.setTextColor(5, 150, 105);
      } else if (isWarn) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(225, 29, 72);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`[ ${status.toUpperCase()} ]`, marginLeft, currentY);

      // Category Name
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(cat.name || 'Category', marginLeft + 38, currentY);
      currentY += 4.2;

      // Category Details
      if (cat.detail) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const detailLines = doc.splitTextToSize(cat.detail, contentWidth - 38);
        for (const dl of detailLines) {
          checkPageBreak(5);
          doc.text(dl, marginLeft + 38, currentY);
          currentY += 3.8;
        }
      }
      currentY += 2;
    }

    currentY += 4;
    drawDivider();
  }

  // ==========================================
  // 6. RESUME IMPROVEMENT SUGGESTIONS
  // ==========================================
  if (suggestions.length > 0) {
    checkPageBreak(25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Actionable Resume Improvement Suggestions', marginLeft, currentY);
    currentY += 6;

    suggestions.forEach((item, index) => {
      // Calculate estimated box height to avoid awkward splits
      const title = item.title || `Suggestion #${index + 1}`;
      const desc = item.description || '';
      const action = item.action || '';
      const priority = item.priority || 'Normal';
      const category = item.category || 'General';

      const descLines = doc.splitTextToSize(desc, contentWidth - 10);
      const actionLines = action ? doc.splitTextToSize(`Action: ${action}`, contentWidth - 16) : [];
      const totalBlockHeight = 12 + descLines.length * 4 + (action ? 8 + actionLines.length * 3.8 : 0);

      checkPageBreak(Math.min(totalBlockHeight, 45));

      // Light Card Background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginLeft, currentY, contentWidth, totalBlockHeight, 2, 2, 'FD');

      // Top Header: Priority Badge + Category
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);

      if (priority.toLowerCase() === 'high') {
        doc.setTextColor(225, 29, 72);
      } else if (priority.toLowerCase() === 'medium') {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(37, 99, 235);
      }
      doc.text(`[${priority.toUpperCase()} PRIORITY]  ${category}`, marginLeft + 5, currentY + 5.5);

      // Item Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${index + 1}. ${title}`, marginLeft + 5, currentY + 10);

      // Description text
      let textCursorY = currentY + 14.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      for (const line of descLines) {
        doc.text(line, marginLeft + 5, textCursorY);
        textCursorY += 3.8;
      }

      // Practical Action Sub-box
      if (action) {
        textCursorY += 1.5;
        doc.setFillColor(243, 232, 255); // purple-100
        doc.setDrawColor(216, 180, 254); // purple-300
        const actionBoxHeight = 4 + actionLines.length * 3.8;
        doc.roundedRect(marginLeft + 4, textCursorY, contentWidth - 8, actionBoxHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(107, 33, 168); // purple-800
        for (const al of actionLines) {
          doc.text(al, marginLeft + 7, textCursorY + 3.5);
          textCursorY += 3.8;
        }
      }

      currentY += totalBlockHeight + 4;
    });
  }

  // ==========================================
  // 7. OPTIONAL NOTES
  // ==========================================
  if (notes) {
    checkPageBreak(18);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Reviewer Notes: "${notes}"`, marginLeft, currentY);
    currentY += 6;
  }

  // ==========================================
  // 8. PAGE FOOTERS WITH PAGE NUMBERS
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle line above footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, pageHeight - 12, marginLeft + contentWidth, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('AI Resume & Job Matcher  |  Sample Analysis Report', marginLeft, pageHeight - 7.5);

    doc.text(`Page ${i} of ${totalPages}`, marginLeft + contentWidth, pageHeight - 7.5, {
      align: 'right'
    });
  }

  // Meaningful filename construction
  const slug = sanitizeFilename(jobTitle);
  const fileName = `resume-analysis-${slug}.pdf`;

  // Trigger browser download
  doc.save(fileName);

  return fileName;
}
