/**
 * Service: Resume Serializer
 * 
 * Converts structured Resume Builder JSON documents into clean, standard
 * plain text for ATS scoring, semantic embedding matching, and text parsing.
 */

/**
 * Serializes a structured resume object into standard plain text.
 * 
 * @param {Object} resumeData - Structured resume builder data
 * @returns {string} Plain text representation of the resume
 */
function serializeResumeToText(resumeData = {}) {
  if (!resumeData || typeof resumeData !== 'object') {
    return '';
  }

  const parts = [];
  const p = resumeData.personalInfo || resumeData.personal_info || {};

  // 1. Contact Information Header
  const contactLines = [];
  if (p.fullName || p.name) contactLines.push(p.fullName || p.name);
  
  const contactDetails = [];
  if (p.email) contactDetails.push(`Email: ${p.email}`);
  if (p.phone) contactDetails.push(`Phone: ${p.phone}`);
  if (p.location) contactDetails.push(`Location: ${p.location}`);
  if (p.linkedin) contactDetails.push(`LinkedIn: ${p.linkedin}`);
  if (p.github) contactDetails.push(`GitHub: ${p.github}`);
  if (p.portfolio) contactDetails.push(`Portfolio: ${p.portfolio}`);
  
  if (contactDetails.length > 0) {
    contactLines.push(contactDetails.join(' | '));
  }
  if (contactLines.length > 0) {
    parts.push(contactLines.join('\n'));
  }

  // 2. Professional Summary
  const summary = resumeData.summary || '';
  if (typeof summary === 'string' && summary.trim().length > 0) {
    parts.push(`Professional Summary:\n${summary.trim()}`);
  }

  // 3. Technical Skills
  const skills = resumeData.skills || {};
  const skillLines = [];
  if (typeof skills === 'string' && skills.trim().length > 0) {
    skillLines.push(skills.trim());
  } else if (Array.isArray(skills)) {
    skillLines.push(skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean).join(', '));
  } else if (typeof skills === 'object') {
    if (skills.programmingLanguages) skillLines.push(`• Languages: ${skills.programmingLanguages}`);
    if (skills.frontend) skillLines.push(`• Frontend: ${skills.frontend}`);
    if (skills.backend) skillLines.push(`• Backend: ${skills.backend}`);
    if (skills.databases) skillLines.push(`• Databases: ${skills.databases}`);
    if (skills.toolsPlatforms) skillLines.push(`• Tools & Platforms: ${skills.toolsPlatforms}`);
    if (skills.other) skillLines.push(`• Additional Skills: ${skills.other}`);
  }
  if (skillLines.length > 0) {
    parts.push(`Technical Skills:\n${skillLines.join('\n')}`);
  }

  // 4. Work Experience & Internships
  const experience = Array.isArray(resumeData.experience) ? resumeData.experience : [];
  if (experience.length > 0) {
    const expLines = ['Work Experience:'];
    for (const exp of experience) {
      const headerBits = [];
      if (exp.role) headerBits.push(exp.role);
      if (exp.company) headerBits.push(`at ${exp.company}`);
      if (exp.location) headerBits.push(`(${exp.location})`);
      if (exp.startDate || exp.endDate) {
        headerBits.push(`| ${exp.startDate || ''} - ${exp.current ? 'Present' : (exp.endDate || '')}`);
      }
      expLines.push(headerBits.join(' '));

      if (exp.description) {
        expLines.push(exp.description);
      }
      if (Array.isArray(exp.bullets)) {
        for (const bullet of exp.bullets) {
          if (bullet && typeof bullet === 'string' && bullet.trim().length > 0) {
            expLines.push(`• ${bullet.trim()}`);
          }
        }
      }
      expLines.push(''); // Spacer
    }
    parts.push(expLines.join('\n').trim());
  }

  // 5. Projects
  const projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];
  if (projects.length > 0) {
    const projLines = ['Projects:'];
    for (const proj of projects) {
      const headerBits = [];
      if (proj.name) headerBits.push(proj.name);
      if (proj.techStack) headerBits.push(`[${proj.techStack}]`);
      if (proj.githubUrl) headerBits.push(`(GitHub: ${proj.githubUrl})`);
      if (proj.liveUrl) headerBits.push(`(Live: ${proj.liveUrl})`);
      projLines.push(headerBits.join(' '));

      if (proj.description) {
        projLines.push(proj.description);
      }
      if (Array.isArray(proj.highlights)) {
        for (const h of proj.highlights) {
          if (h && typeof h === 'string' && h.trim().length > 0) {
            projLines.push(`• ${h.trim()}`);
          }
        }
      }
      projLines.push('');
    }
    parts.push(projLines.join('\n').trim());
  }

  // 6. Education
  const education = Array.isArray(resumeData.education) ? resumeData.education : [];
  if (education.length > 0) {
    const eduLines = ['Education:'];
    for (const edu of education) {
      const headerBits = [];
      if (edu.degree) headerBits.push(edu.degree);
      if (edu.fieldOfStudy || edu.specialization) headerBits.push(`in ${edu.fieldOfStudy || edu.specialization}`);
      if (edu.institution) headerBits.push(`| ${edu.institution}`);
      if (edu.startDate || edu.endDate) {
        headerBits.push(`(${edu.startDate || ''} - ${edu.endDate || ''})`);
      }
      if (edu.gpa) headerBits.push(`| GPA/Score: ${edu.gpa}`);
      eduLines.push(headerBits.join(' '));

      if (edu.details) {
        eduLines.push(edu.details);
      }
      eduLines.push('');
    }
    parts.push(eduLines.join('\n').trim());
  }

  // 7. Certifications & Achievements
  const certs = Array.isArray(resumeData.certifications) ? resumeData.certifications : [];
  if (certs.length > 0) {
    const certLines = ['Certifications & Achievements:'];
    for (const c of certs) {
      if (typeof c === 'string') {
        certLines.push(`• ${c}`);
      } else if (typeof c === 'object') {
        const bits = [];
        if (c.name) bits.push(c.name);
        if (c.issuer) bits.push(`(${c.issuer})`);
        if (c.date) bits.push(`- ${c.date}`);
        if (c.details) bits.push(`: ${c.details}`);
        certLines.push(`• ${bits.join(' ')}`);
      }
    }
    parts.push(certLines.join('\n').trim());
  }

  // 8. Additional Information
  const additional = resumeData.additionalInfo || resumeData.additional_info || '';
  if (typeof additional === 'string' && additional.trim().length > 0) {
    parts.push(`Additional Information:\n${additional.trim()}`);
  }

  return parts.join('\n\n').trim();
}

module.exports = {
  serializeResumeToText
};
