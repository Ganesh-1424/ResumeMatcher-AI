/**
 * Service: Resume PDF Generator
 * 
 * Generates formatted multi-page PDF resumes using PDFKit.
 * Supports 3 professional templates:
 * 1. Modern Professional ('modern')
 * 2. ATS-Friendly Minimal ('ats_minimal')
 * 3. Software Engineer ('software_engineer')
 * 
 * Multi-page safe: automatically paginates without clipping.
 */

const PDFDocument = require('pdfkit');

/**
 * Generates a formatted PDF resume and pipes it to the output stream.
 * 
 * @param {Object} resumeData - Structured resume data from Resume Builder
 * @param {string} [template='modern'] - Template key: 'modern' | 'ats_minimal' | 'software_engineer'
 * @param {WritableStream} outputStream - Express response or file stream
 * @returns {Promise<void>}
 */
function generateResumePdfStream(resumeData = {}, template = 'modern', outputStream) {
  return new Promise((resolve, reject) => {
    try {
      const p = resumeData.personalInfo || resumeData.personal_info || {};
      const candidateName = p.fullName || p.name || 'Candidate Resume';

      const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `${candidateName} - Resume`,
          Author: candidateName,
          Subject: 'Professional Resume',
          Keywords: 'resume, software engineer, curriculum vitae, professional',
          CreationDate: new Date()
        }
      });

      doc.on('error', (err) => reject(err));
      outputStream.on('error', (err) => reject(err));
      outputStream.on('finish', () => resolve());

      doc.pipe(outputStream);

      const chosenTemplate = (template || resumeData.template || 'modern').toLowerCase();

      if (chosenTemplate === 'ats_minimal' || chosenTemplate === 'minimal') {
        renderAtsMinimalTemplate(doc, resumeData);
      } else if (chosenTemplate === 'software_engineer' || chosenTemplate === 'tech' || chosenTemplate === 'software') {
        renderSoftwareEngineerTemplate(doc, resumeData);
      } else {
        renderModernTemplate(doc, resumeData);
      }

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Format string or object additional info safely
 */
function formatAdditionalInfo(info) {
  if (!info) return '';
  if (typeof info === 'string') return info.trim();
  if (typeof info === 'object') {
    const parts = [];
    if (info.languages) parts.push(`Languages: ${info.languages}`);
    if (info.awards) parts.push(`Awards & Honors: ${info.awards}`);
    if (info.interests) parts.push(`Interests: ${info.interests}`);
    for (const [key, val] of Object.entries(info)) {
      if (!['languages', 'awards', 'interests'].includes(key) && val) {
        parts.push(`${key}: ${val}`);
      }
    }
    return parts.join('\n');
  }
  return String(info).trim();
}

/**
 * Helper to check page bottom and add a clean page break if needed
 */
function ensurePageSpace(doc, neededPoints = 60) {
  if (doc.y + neededPoints > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

/**
 * ----------------------------------------------------------------------------
 * 1. MODERN PROFESSIONAL TEMPLATE
 * ----------------------------------------------------------------------------
 */
function renderModernTemplate(doc, data) {
  const p = data.personalInfo || data.personal_info || {};
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const primaryColor = '#1d4ed8'; // Blue 700
  const darkColor = '#0f172a';    // Slate 900
  const bodyColor = '#334155';    // Slate 700
  const mutedColor = '#64748b';   // Slate 500
  const dividerColor = '#cbd5e1'; // Slate 300

  // Header: Name
  doc
    .fillColor(darkColor)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(p.fullName || p.name || 'Your Name', { align: 'center' });

  // Contact Info row
  const contactParts = [];
  if (p.email) contactParts.push(p.email);
  if (p.phone) contactParts.push(p.phone);
  if (p.location) contactParts.push(p.location);
  if (p.linkedin) contactParts.push(p.linkedin.replace(/^https?:\/\/(www\.)?/, ''));
  if (p.github) contactParts.push(p.github.replace(/^https?:\/\/(www\.)?/, ''));
  if (p.portfolio) contactParts.push(p.portfolio.replace(/^https?:\/\/(www\.)?/, ''));

  if (contactParts.length > 0) {
    doc.moveDown(0.3);
    doc
      .fillColor(mutedColor)
      .font('Helvetica')
      .fontSize(9)
      .text(contactParts.join('  •  '), { align: 'center', width: pageWidth });
  }

  doc.moveDown(0.8);

  const drawSectionTitle = (title) => {
    ensurePageSpace(doc, 40);
    doc
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(title.toUpperCase());

    doc
      .strokeColor(primaryColor)
      .lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y + 2)
      .lineTo(doc.page.margins.left + pageWidth, doc.y + 2)
      .stroke();

    doc.moveDown(0.5);
  };

  // Professional Summary
  if (data.summary && data.summary.trim()) {
    drawSectionTitle('Professional Summary');
    doc
      .fillColor(bodyColor)
      .font('Helvetica')
      .fontSize(9.5)
      .text(data.summary.trim(), { align: 'justify', lineGap: 2 });
    doc.moveDown(0.7);
  }

  // Work Experience
  const expList = Array.isArray(data.experience) ? data.experience : [];
  if (expList.length > 0) {
    drawSectionTitle('Work Experience');
    for (const exp of expList) {
      ensurePageSpace(doc, 50);
      const title = exp.role || 'Role';
      const company = exp.company ? ` at ${exp.company}` : '';
      const dates = exp.startDate || exp.endDate ? `${exp.startDate || ''} – ${exp.current ? 'Present' : (exp.endDate || '')}` : '';

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`${title}${company}`, { continued: Boolean(dates) });

      if (dates) {
        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(9)
          .text(dates, { align: 'right' });
      }

      if (exp.location) {
        doc
          .fillColor(mutedColor)
          .font('Helvetica-Oblique')
          .fontSize(8.5)
          .text(exp.location);
      }

      if (exp.description) {
        doc.moveDown(0.2);
        doc
          .fillColor(bodyColor)
          .font('Helvetica')
          .fontSize(9)
          .text(exp.description, { lineGap: 1.5 });
      }

      if (Array.isArray(exp.bullets) && exp.bullets.length > 0) {
        doc.moveDown(0.2);
        for (const b of exp.bullets) {
          if (b && b.trim()) {
            doc
              .fillColor(bodyColor)
              .font('Helvetica')
              .fontSize(9)
              .text(`•  ${b.trim()}`, { indent: 10, lineGap: 1.5 });
          }
        }
      }
      doc.moveDown(0.5);
    }
  }

  // Projects
  const projList = Array.isArray(data.projects) ? data.projects : [];
  if (projList.length > 0) {
    drawSectionTitle('Key Projects');
    for (const proj of projList) {
      ensurePageSpace(doc, 45);
      const projName = proj.name || 'Project';
      const techStack = proj.techStack ? ` | ${proj.techStack}` : '';

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(projName, { continued: Boolean(techStack) });

      if (techStack) {
        doc
          .fillColor(primaryColor)
          .font('Helvetica')
          .fontSize(9)
          .text(techStack);
      }

      const links = [];
      if (proj.githubUrl) links.push(`GitHub: ${proj.githubUrl}`);
      if (proj.liveUrl) links.push(`Live: ${proj.liveUrl}`);
      if (links.length > 0) {
        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(8.5)
          .text(links.join('  •  '));
      }

      if (proj.description) {
        doc.moveDown(0.15);
        doc
          .fillColor(bodyColor)
          .font('Helvetica')
          .fontSize(9)
          .text(proj.description, { lineGap: 1.5 });
      }

      if (Array.isArray(proj.highlights) && proj.highlights.length > 0) {
        doc.moveDown(0.2);
        for (const h of proj.highlights) {
          if (h && h.trim()) {
            doc
              .fillColor(bodyColor)
              .font('Helvetica')
              .fontSize(9)
              .text(`•  ${h.trim()}`, { indent: 10, lineGap: 1.5 });
          }
        }
      }
      doc.moveDown(0.5);
    }
  }

  // Technical Skills
  const skills = data.skills;
  if (skills && (typeof skills === 'object' || typeof skills === 'string')) {
    drawSectionTitle('Technical Skills');
    doc.fillColor(bodyColor).font('Helvetica').fontSize(9);

    if (typeof skills === 'object' && !Array.isArray(skills)) {
      if (skills.programmingLanguages) doc.font('Helvetica-Bold').text('Programming Languages: ', { continued: true }).font('Helvetica').text(skills.programmingLanguages);
      if (skills.frontend) doc.font('Helvetica-Bold').text('Frontend Technologies: ', { continued: true }).font('Helvetica').text(skills.frontend);
      if (skills.backend) doc.font('Helvetica-Bold').text('Backend Technologies: ', { continued: true }).font('Helvetica').text(skills.backend);
      if (skills.databases) doc.font('Helvetica-Bold').text('Databases & Storage: ', { continued: true }).font('Helvetica').text(skills.databases);
      if (skills.toolsPlatforms) doc.font('Helvetica-Bold').text('Tools & Platforms: ', { continued: true }).font('Helvetica').text(skills.toolsPlatforms);
      if (skills.other) doc.font('Helvetica-Bold').text('Other Proficiencies: ', { continued: true }).font('Helvetica').text(skills.other);
    } else if (Array.isArray(skills)) {
      doc.text(skills.map(s => typeof s === 'string' ? s : s.name).join(', '));
    } else {
      doc.text(String(skills));
    }
    doc.moveDown(0.7);
  }

  // Education
  const eduList = Array.isArray(data.education) ? data.education : [];
  if (eduList.length > 0) {
    drawSectionTitle('Education');
    for (const edu of eduList) {
      ensurePageSpace(doc, 35);
      const degree = edu.degree || 'Degree';
      const field = edu.fieldOfStudy || edu.specialization ? ` in ${edu.fieldOfStudy || edu.specialization}` : '';
      const dates = edu.startDate || edu.endDate ? `${edu.startDate || ''} – ${edu.endDate || ''}` : '';

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`${degree}${field}`, { continued: Boolean(dates) });

      if (dates) {
        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(9)
          .text(dates, { align: 'right' });
      }

      if (edu.institution) {
        doc
          .fillColor(bodyColor)
          .font('Helvetica')
          .fontSize(9)
          .text(edu.institution, { continued: Boolean(edu.gpa) });

        if (edu.gpa) {
          doc
            .fillColor(mutedColor)
            .font('Helvetica')
            .fontSize(8.5)
            .text(`  |  GPA: ${edu.gpa}`);
        } else {
          doc.text('');
        }
      }
      doc.moveDown(0.4);
    }
  }

  // Certifications & Achievements
  const certList = Array.isArray(data.certifications) ? data.certifications : [];
  if (certList.length > 0) {
    drawSectionTitle('Certifications & Achievements');
    for (const c of certList) {
      ensurePageSpace(doc, 20);
      const certName = typeof c === 'string' ? c : c.name || 'Certification';
      const issuer = typeof c === 'object' && c.issuer ? ` (${c.issuer})` : '';
      const date = typeof c === 'object' && c.date ? ` — ${c.date}` : '';

      doc
        .fillColor(bodyColor)
        .font('Helvetica')
        .fontSize(9)
        .text(`•  ${certName}${issuer}${date}`, { indent: 10 });
    }
    doc.moveDown(0.5);
  }

  // Additional Information
  const formattedAddInfo = formatAdditionalInfo(data.additionalInfo || data.additional_info);
  if (formattedAddInfo) {
    drawSectionTitle('Additional Information');
    doc
      .fillColor(bodyColor)
      .font('Helvetica')
      .fontSize(9)
      .text(formattedAddInfo, { lineGap: 1.5 });
  }
}

/**
 * ----------------------------------------------------------------------------
 * 2. ATS-FRIENDLY MINIMAL TEMPLATE
 * ----------------------------------------------------------------------------
 * Single-column, black & white, standard headings, maximum parsability.
 */
function renderAtsMinimalTemplate(doc, data) {
  const p = data.personalInfo || data.personal_info || {};
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const textColor = '#000000';
  const grayColor = '#374151';

  // Candidate Name
  doc
    .fillColor(textColor)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text((p.fullName || p.name || 'CANDIDATE NAME').toUpperCase(), { align: 'center' });

  // Contact line
  const contactParts = [];
  if (p.email) contactParts.push(p.email);
  if (p.phone) contactParts.push(p.phone);
  if (p.location) contactParts.push(p.location);
  if (p.linkedin) contactParts.push(p.linkedin);
  if (p.github) contactParts.push(p.github);

  if (contactParts.length > 0) {
    doc.moveDown(0.2);
    doc
      .fillColor(grayColor)
      .font('Helvetica')
      .fontSize(9)
      .text(contactParts.join(' | '), { align: 'center' });
  }

  doc.moveDown(0.8);

  const drawAtsHeader = (title) => {
    ensurePageSpace(doc, 35);
    doc.moveDown(0.4);
    doc
      .fillColor(textColor)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(title.toUpperCase());

    doc
      .strokeColor('#000000')
      .lineWidth(0.75)
      .moveTo(doc.page.margins.left, doc.y + 1)
      .lineTo(doc.page.margins.left + pageWidth, doc.y + 1)
      .stroke();

    doc.moveDown(0.4);
  };

  // Summary
  if (data.summary && data.summary.trim()) {
    drawAtsHeader('Professional Summary');
    doc
      .fillColor(textColor)
      .font('Helvetica')
      .fontSize(9.5)
      .text(data.summary.trim(), { align: 'justify', lineGap: 1.5 });
  }

  // Work Experience
  const expList = Array.isArray(data.experience) ? data.experience : [];
  if (expList.length > 0) {
    drawAtsHeader('Work Experience');
    for (const exp of expList) {
      ensurePageSpace(doc, 45);
      const title = exp.role || 'Job Title';
      const company = exp.company ? `, ${exp.company}` : '';
      const dates = exp.startDate || exp.endDate ? `${exp.startDate || ''} - ${exp.current ? 'Present' : (exp.endDate || '')}` : '';

      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`${title}${company}`, { continued: Boolean(dates) });

      if (dates) {
        doc.font('Helvetica').fontSize(9).text(dates, { align: 'right' });
      }

      if (exp.location) {
        doc.font('Helvetica-Oblique').fontSize(8.5).text(exp.location);
      }

      if (exp.description) {
        doc.font('Helvetica').fontSize(9).text(exp.description);
      }

      if (Array.isArray(exp.bullets)) {
        for (const b of exp.bullets) {
          if (b && b.trim()) {
            doc.font('Helvetica').fontSize(9).text(`- ${b.trim()}`, { indent: 8 });
          }
        }
      }
      doc.moveDown(0.3);
    }
  }

  // Technical Skills
  const skills = data.skills;
  if (skills) {
    drawAtsHeader('Technical Skills');
    doc.fillColor(textColor).font('Helvetica').fontSize(9);
    if (typeof skills === 'object' && !Array.isArray(skills)) {
      if (skills.programmingLanguages) doc.text(`Languages: ${skills.programmingLanguages}`);
      if (skills.frontend) doc.text(`Frontend: ${skills.frontend}`);
      if (skills.backend) doc.text(`Backend: ${skills.backend}`);
      if (skills.databases) doc.text(`Databases: ${skills.databases}`);
      if (skills.toolsPlatforms) doc.text(`Tools & Platforms: ${skills.toolsPlatforms}`);
      if (skills.other) doc.text(`Other: ${skills.other}`);
    } else {
      doc.text(Array.isArray(skills) ? skills.join(', ') : String(skills));
    }
  }

  // Projects
  const projList = Array.isArray(data.projects) ? data.projects : [];
  if (projList.length > 0) {
    drawAtsHeader('Projects');
    for (const proj of projList) {
      ensurePageSpace(doc, 40);
      const name = proj.name || 'Project Name';
      const stack = proj.techStack ? ` (Technologies: ${proj.techStack})` : '';

      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`${name}${stack}`);

      if (proj.description) {
        doc.font('Helvetica').fontSize(9).text(proj.description);
      }

      if (Array.isArray(proj.highlights)) {
        for (const h of proj.highlights) {
          if (h && h.trim()) {
            doc.font('Helvetica').fontSize(9).text(`- ${h.trim()}`, { indent: 8 });
          }
        }
      }
      doc.moveDown(0.3);
    }
  }

  // Education
  const eduList = Array.isArray(data.education) ? data.education : [];
  if (eduList.length > 0) {
    drawAtsHeader('Education');
    for (const edu of eduList) {
      ensurePageSpace(doc, 30);
      const degree = edu.degree || 'Degree';
      const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : '';
      const dates = edu.startDate || edu.endDate ? `${edu.startDate || ''} - ${edu.endDate || ''}` : '';

      doc
        .fillColor(textColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`${degree}${field}`, { continued: Boolean(dates) });

      if (dates) {
        doc.font('Helvetica').fontSize(9).text(dates, { align: 'right' });
      }

      if (edu.institution) {
        doc.font('Helvetica').fontSize(9).text(`${edu.institution}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`);
      }
      doc.moveDown(0.3);
    }
  }

  // Certifications
  const certList = Array.isArray(data.certifications) ? data.certifications : [];
  if (certList.length > 0) {
    drawAtsHeader('Certifications');
    for (const c of certList) {
      const name = typeof c === 'string' ? c : `${c.name || ''} ${c.issuer ? `(${c.issuer})` : ''} ${c.date || ''}`;
      doc.font('Helvetica').fontSize(9).text(`- ${name.trim()}`, { indent: 8 });
    }
  }

  // Additional Information
  const formattedAddInfo = formatAdditionalInfo(data.additionalInfo || data.additional_info);
  if (formattedAddInfo) {
    drawAtsHeader('Additional Information');
    doc.font('Helvetica').fontSize(9).text(formattedAddInfo);
  }
}

/**
 * ----------------------------------------------------------------------------
 * 3. SOFTWARE ENGINEER TEMPLATE
 * ----------------------------------------------------------------------------
 * Prominent technical skills matrix, project tech stacks in tags, GitHub links.
 */
function renderSoftwareEngineerTemplate(doc, data) {
  const p = data.personalInfo || data.personal_info || {};
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const darkColor = '#0f172a';      // Slate 900
  const accentColor = '#4338ca';    // Indigo 700
  const bodyColor = '#1e293b';      // Slate 800
  const mutedColor = '#64748b';     // Slate 500

  // Header: Name (Left-aligned for tech style)
  doc
    .fillColor(darkColor)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(p.fullName || p.name || 'Software Engineer', { align: 'left' });

  // Contact links
  const contactLinks = [];
  if (p.email) contactLinks.push(p.email);
  if (p.phone) contactLinks.push(p.phone);
  if (p.location) contactLinks.push(p.location);
  if (p.github) contactLinks.push(p.github.replace(/^https?:\/\/(www\.)?/, ''));
  if (p.linkedin) contactLinks.push(p.linkedin.replace(/^https?:\/\/(www\.)?/, ''));
  if (p.portfolio) contactLinks.push(p.portfolio.replace(/^https?:\/\/(www\.)?/, ''));

  if (contactLinks.length > 0) {
    doc.moveDown(0.2);
    doc
      .fillColor(mutedColor)
      .font('Helvetica')
      .fontSize(9)
      .text(contactLinks.join('  |  '), { align: 'left', width: pageWidth });
  }

  doc.moveDown(0.7);

  const drawTechHeader = (title) => {
    ensurePageSpace(doc, 40);
    doc
      .fillColor(accentColor)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`// ${title.toUpperCase()}`);

    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y + 2)
      .lineTo(doc.page.margins.left + pageWidth, doc.y + 2)
      .stroke();

    doc.moveDown(0.4);
  };

  // 1. Technical Skills Matrix (Placed near the top for Software Engineer template!)
  const skills = data.skills;
  if (skills) {
    drawTechHeader('Technical Skills & Stack');
    doc.fillColor(bodyColor).font('Helvetica').fontSize(9);

    if (typeof skills === 'object' && !Array.isArray(skills)) {
      if (skills.programmingLanguages) {
        doc.font('Helvetica-Bold').text('Languages: ', { continued: true }).font('Helvetica').text(skills.programmingLanguages);
      }
      if (skills.frontend) {
        doc.font('Helvetica-Bold').text('Frontend: ', { continued: true }).font('Helvetica').text(skills.frontend);
      }
      if (skills.backend) {
        doc.font('Helvetica-Bold').text('Backend & APIs: ', { continued: true }).font('Helvetica').text(skills.backend);
      }
      if (skills.databases) {
        doc.font('Helvetica-Bold').text('Databases: ', { continued: true }).font('Helvetica').text(skills.databases);
      }
      if (skills.toolsPlatforms) {
        doc.font('Helvetica-Bold').text('DevOps & Tools: ', { continued: true }).font('Helvetica').text(skills.toolsPlatforms);
      }
      if (skills.other) {
        doc.font('Helvetica-Bold').text('Core Concepts: ', { continued: true }).font('Helvetica').text(skills.other);
      }
    } else {
      doc.text(Array.isArray(skills) ? skills.join(', ') : String(skills));
    }
    doc.moveDown(0.6);
  }

  // 2. Summary
  if (data.summary && data.summary.trim()) {
    drawTechHeader('Engineering Summary');
    doc
      .fillColor(bodyColor)
      .font('Helvetica')
      .fontSize(9.5)
      .text(data.summary.trim(), { align: 'justify', lineGap: 1.5 });
    doc.moveDown(0.6);
  }

  // 3. Projects (High importance for Software Engineer template)
  const projList = Array.isArray(data.projects) ? data.projects : [];
  if (projList.length > 0) {
    drawTechHeader('Technical Projects');
    for (const proj of projList) {
      ensurePageSpace(doc, 45);
      const name = proj.name || 'Project';
      const stack = proj.techStack ? ` [${proj.techStack}]` : '';

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(name, { continued: Boolean(stack) });

      if (stack) {
        doc
          .fillColor(accentColor)
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .text(stack);
      }

      const links = [];
      if (proj.githubUrl) links.push(`Code: ${proj.githubUrl}`);
      if (proj.liveUrl) links.push(`Demo: ${proj.liveUrl}`);
      if (links.length > 0) {
        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(8.5)
          .text(links.join('  •  '));
      }

      if (proj.description) {
        doc.moveDown(0.15);
        doc
          .fillColor(bodyColor)
          .font('Helvetica')
          .fontSize(9)
          .text(proj.description, { lineGap: 1.5 });
      }

      if (Array.isArray(proj.highlights)) {
        doc.moveDown(0.15);
        for (const h of proj.highlights) {
          if (h && h.trim()) {
            doc
              .fillColor(bodyColor)
              .font('Helvetica')
              .fontSize(9)
              .text(`▹  ${h.trim()}`, { indent: 10, lineGap: 1.5 });
          }
        }
      }
      doc.moveDown(0.5);
    }
  }

  // 4. Work Experience & Internships
  const expList = Array.isArray(data.experience) ? data.experience : [];
  if (expList.length > 0) {
    drawTechHeader('Experience & Engineering Roles');
    for (const exp of expList) {
      ensurePageSpace(doc, 45);
      const title = exp.role || 'Software Engineer';
      const company = exp.company ? ` @ ${exp.company}` : '';
      const dates = exp.startDate || exp.endDate ? `${exp.startDate || ''} – ${exp.current ? 'Present' : (exp.endDate || '')}` : '';

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`${title}${company}`, { continued: Boolean(dates) });

      if (dates) {
        doc
          .fillColor(mutedColor)
          .font('Helvetica')
          .fontSize(9)
          .text(dates, { align: 'right' });
      }

      if (exp.location) {
        doc.fillColor(mutedColor).font('Helvetica-Oblique').fontSize(8.5).text(exp.location);
      }

      if (exp.description) {
        doc.moveDown(0.15);
        doc.fillColor(bodyColor).font('Helvetica').fontSize(9).text(exp.description);
      }

      if (Array.isArray(exp.bullets)) {
        doc.moveDown(0.15);
        for (const b of exp.bullets) {
          if (b && b.trim()) {
            doc
              .fillColor(bodyColor)
              .font('Helvetica')
              .fontSize(9)
              .text(`▹  ${b.trim()}`, { indent: 10, lineGap: 1.5 });
          }
        }
      }
      doc.moveDown(0.5);
    }
  }

  // 5. Education
  const eduList = Array.isArray(data.education) ? data.education : [];
  if (eduList.length > 0) {
    drawTechHeader('Education');
    for (const edu of eduList) {
      ensurePageSpace(doc, 30);
      const degree = edu.degree || 'B.S. in Computer Science';
      const field = edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : '';
      const dates = edu.startDate || edu.endDate ? `${edu.startDate || ''} – ${edu.endDate || ''}` : '';

      doc
        .fillColor(darkColor)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(`${degree}${field}`, { continued: Boolean(dates) });

      if (dates) {
        doc.fillColor(mutedColor).font('Helvetica').fontSize(9).text(dates, { align: 'right' });
      }

      if (edu.institution) {
        doc
          .fillColor(bodyColor)
          .font('Helvetica')
          .fontSize(9)
          .text(`${edu.institution}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}`);
      }
      doc.moveDown(0.4);
    }
  }

  // 6. Certifications & Achievements
  const certList = Array.isArray(data.certifications) ? data.certifications : [];
  if (certList.length > 0) {
    drawTechHeader('Certifications & Honors');
    for (const c of certList) {
      const name = typeof c === 'string' ? c : `${c.name || ''} ${c.issuer ? `(${c.issuer})` : ''} ${c.date || ''}`;
      doc.fillColor(bodyColor).font('Helvetica').fontSize(9).text(`▹  ${name.trim()}`, { indent: 10 });
    }
  }

  // 7. Additional Information
  const formattedAddInfo = formatAdditionalInfo(data.additionalInfo || data.additional_info);
  if (formattedAddInfo) {
    drawTechHeader('Additional Information');
    doc.fillColor(bodyColor).font('Helvetica').fontSize(9).text(formattedAddInfo, { lineGap: 1.5 });
  }
}

module.exports = {
  generateResumePdfStream
};
