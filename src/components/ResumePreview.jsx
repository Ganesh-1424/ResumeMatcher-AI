import React, { forwardRef } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  ExternalLink
} from 'lucide-react';

/**
 * Component: ResumePreview
 * 
 * Renders live document preview for:
 * 1. Modern Professional ('modern')
 * 2. ATS-Friendly Minimal ('ats_minimal')
 * 3. Software Engineer ('software_engineer')
 */
const ResumePreview = forwardRef(({ resumeData, template = 'modern' }, ref) => {
  const p = resumeData.personalInfo || resumeData.personal_info || {};
  const currentTemplate = template || resumeData.template || 'modern';

  if (currentTemplate === 'ats_minimal') {
    return <AtsMinimalTemplate ref={ref} data={resumeData} p={p} />;
  }

  if (currentTemplate === 'software_engineer') {
    return <SoftwareEngineerTemplate ref={ref} data={resumeData} p={p} />;
  }

  return <ModernProfessionalTemplate ref={ref} data={resumeData} p={p} />;
});

ResumePreview.displayName = 'ResumePreview';

export default ResumePreview;

/**
 * ----------------------------------------------------------------------------
 * 1. MODERN PROFESSIONAL TEMPLATE
 * ----------------------------------------------------------------------------
 */
const ModernProfessionalTemplate = forwardRef(({ data, p }, ref) => {
  const contactItems = [];
  if (p.email) contactItems.push({ icon: Mail, text: p.email, href: `mailto:${p.email}` });
  if (p.phone) contactItems.push({ icon: Phone, text: p.phone, href: `tel:${p.phone}` });
  if (p.location) contactItems.push({ icon: MapPin, text: p.location });
  if (p.linkedin) contactItems.push({ icon: Linkedin, text: p.linkedin.replace(/^https?:\/\/(www\.)?/, ''), href: p.linkedin.startsWith('http') ? p.linkedin : `https://${p.linkedin}` });
  if (p.github) contactItems.push({ icon: Github, text: p.github.replace(/^https?:\/\/(www\.)?/, ''), href: p.github.startsWith('http') ? p.github : `https://${p.github}` });
  if (p.portfolio) contactItems.push({ icon: Globe, text: p.portfolio.replace(/^https?:\/\/(www\.)?/, ''), href: p.portfolio.startsWith('http') ? p.portfolio : `https://${p.portfolio}` });

  return (
    <div
      ref={ref}
      className="bg-white text-slate-800 p-8 sm:p-10 shadow-lg rounded-xl max-w-4xl mx-auto font-sans leading-relaxed text-sm print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      style={{ minHeight: '1056px' }}
    >
      {/* Header */}
      <div className="text-center pb-5 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {p.fullName || 'Your Full Name'}
        </h1>

        {contactItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-600">
            {contactItems.map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5">
                <item.icon className="w-3.5 h-3.5 text-blue-600" />
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline">
                    {item.text}
                  </a>
                ) : (
                  <span>{item.text}</span>
                )}
                {idx < contactItems.length - 1 && <span className="text-slate-300 ml-2">•</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Professional Summary */}
      {data.summary && data.summary.trim() && (
        <div className="mt-5 space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
            Professional Summary
          </h2>
          <p className="text-xs leading-relaxed text-slate-700 text-justify">
            {data.summary}
          </p>
        </div>
      )}

      {/* Work Experience */}
      {data.experience && data.experience.length > 0 && (
        <div className="mt-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
            Work Experience
          </h2>
          <div className="space-y-3.5">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-baseline justify-between flex-wrap gap-1">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {exp.role} <span className="font-semibold text-slate-600">at {exp.company}</span>
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                {exp.location && (
                  <div className="text-[11px] text-slate-500 italic">{exp.location}</div>
                )}
                {exp.description && (
                  <p className="text-xs text-slate-700">{exp.description}</p>
                )}
                {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                    {exp.bullets.filter(b => b && b.trim()).map((b, bIdx) => (
                      <li key={bIdx} className="leading-relaxed">
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <div className="mt-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
            Key Projects
          </h2>
          <div className="space-y-3.5">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-baseline justify-between flex-wrap gap-1">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {proj.name}
                    {proj.techStack && (
                      <span className="text-xs font-normal text-blue-600 ml-2">
                        [{proj.techStack}]
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {proj.githubUrl && (
                      <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <Github className="w-3 h-3" /> Code
                      </a>
                    )}
                    {proj.liveUrl && (
                      <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Live
                      </a>
                    )}
                  </div>
                </div>
                {proj.description && (
                  <p className="text-xs text-slate-700">{proj.description}</p>
                )}
                {Array.isArray(proj.highlights) && proj.highlights.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 pl-1">
                    {proj.highlights.filter(h => h && h.trim()).map((h, hIdx) => (
                      <li key={hIdx} className="leading-relaxed">
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Skills */}
      {data.skills && (
        <div className="mt-5 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
            Technical Skills
          </h2>
          <div className="space-y-1 text-xs text-slate-700">
            {typeof data.skills === 'object' && !Array.isArray(data.skills) ? (
              <>
                {data.skills.programmingLanguages && (
                  <div><strong className="text-slate-900 font-semibold">Languages:</strong> {data.skills.programmingLanguages}</div>
                )}
                {data.skills.frontend && (
                  <div><strong className="text-slate-900 font-semibold">Frontend:</strong> {data.skills.frontend}</div>
                )}
                {data.skills.backend && (
                  <div><strong className="text-slate-900 font-semibold">Backend:</strong> {data.skills.backend}</div>
                )}
                {data.skills.databases && (
                  <div><strong className="text-slate-900 font-semibold">Databases:</strong> {data.skills.databases}</div>
                )}
                {data.skills.toolsPlatforms && (
                  <div><strong className="text-slate-900 font-semibold">Tools & Platforms:</strong> {data.skills.toolsPlatforms}</div>
                )}
                {data.skills.other && (
                  <div><strong className="text-slate-900 font-semibold">Other:</strong> {data.skills.other}</div>
                )}
              </>
            ) : (
              <div>{Array.isArray(data.skills) ? data.skills.join(', ') : String(data.skills)}</div>
            )}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
            Education
          </h2>
          <div className="space-y-2.5">
            {data.education.map((edu, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex items-baseline justify-between flex-wrap gap-1">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                    {edu.degree} {edu.fieldOfStudy || edu.specialization ? `in ${edu.fieldOfStudy || edu.specialization}` : ''}
                  </span>
                  <span className="text-xs text-slate-500">
                    {edu.startDate} – {edu.endDate}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {edu.institution} {edu.gpa ? `• GPA: ${edu.gpa}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications & Achievements */}
      {data.certifications && data.certifications.length > 0 && (
        <div className="mt-5 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
            Certifications & Achievements
          </h2>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
            {data.certifications.map((c, idx) => {
              const name = typeof c === 'string' ? c : `${c.name || ''} ${c.issuer ? `(${c.issuer})` : ''} ${c.date ? `— ${c.date}` : ''}`;
              return <li key={idx}><span>{name}</span></li>;
            })}
          </ul>
        </div>
      )}

      {/* Additional Information */}
      {data.additionalInfo && data.additionalInfo.trim() && (
        <div className="mt-5 space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
            Additional Information
          </h2>
          <p className="text-xs leading-relaxed text-slate-700">
            {data.additionalInfo}
          </p>
        </div>
      )}
    </div>
  );
});

ModernProfessionalTemplate.displayName = 'ModernProfessionalTemplate';

/**
 * ----------------------------------------------------------------------------
 * 2. ATS-FRIENDLY MINIMAL TEMPLATE
 * ----------------------------------------------------------------------------
 * Pure black text, standard single-column, no tables or boxes, maximal OCR.
 */
const AtsMinimalTemplate = forwardRef(({ data, p }, ref) => {
  const contactParts = [];
  if (p.email) contactParts.push(p.email);
  if (p.phone) contactParts.push(p.phone);
  if (p.location) contactParts.push(p.location);
  if (p.linkedin) contactParts.push(p.linkedin);
  if (p.github) contactParts.push(p.github);

  return (
    <div
      ref={ref}
      className="bg-white text-black p-8 sm:p-10 shadow-lg rounded-xl max-w-4xl mx-auto font-sans leading-normal text-xs print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      style={{ minHeight: '1056px' }}
    >
      {/* Candidate Name */}
      <div className="text-center pb-3 border-b border-black">
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          {p.fullName || 'CANDIDATE NAME'}
        </h1>
        {contactParts.length > 0 && (
          <div className="mt-1.5 text-[11px] text-gray-800">
            {contactParts.join(' | ')}
          </div>
        )}
      </div>

      {/* Professional Summary */}
      {data.summary && data.summary.trim() && (
        <div className="mt-4 space-y-1">
          <h2 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-0.5">
            Professional Summary
          </h2>
          <p className="text-xs text-justify leading-relaxed">
            {data.summary}
          </p>
        </div>
      )}

      {/* Work Experience */}
      {data.experience && data.experience.length > 0 && (
        <div className="mt-4 space-y-2">
          <h2 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-0.5">
            Work Experience
          </h2>
          <div className="space-y-3">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between font-bold text-xs">
                  <span>{exp.role}, {exp.company}</span>
                  <span>{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                </div>
                {exp.location && <div className="text-[11px] italic">{exp.location}</div>}
                {exp.description && <p className="text-xs">{exp.description}</p>}
                {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                  <ul className="list-disc list-inside text-xs space-y-0.5 pl-1">
                    {exp.bullets.filter(b => b && b.trim()).map((b, bIdx) => (
                      <li key={bIdx}><span>{b}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Skills */}
      {data.skills && (
        <div className="mt-4 space-y-1">
          <h2 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-0.5">
            Technical Skills
          </h2>
          <div className="space-y-0.5 text-xs">
            {typeof data.skills === 'object' && !Array.isArray(data.skills) ? (
              <>
                {data.skills.programmingLanguages && <div><strong>Languages:</strong> {data.skills.programmingLanguages}</div>}
                {data.skills.frontend && <div><strong>Frontend:</strong> {data.skills.frontend}</div>}
                {data.skills.backend && <div><strong>Backend:</strong> {data.skills.backend}</div>}
                {data.skills.databases && <div><strong>Databases:</strong> {data.skills.databases}</div>}
                {data.skills.toolsPlatforms && <div><strong>Tools & Platforms:</strong> {data.skills.toolsPlatforms}</div>}
                {data.skills.other && <div><strong>Other:</strong> {data.skills.other}</div>}
              </>
            ) : (
              <div>{Array.isArray(data.skills) ? data.skills.join(', ') : String(data.skills)}</div>
            )}
          </div>
        </div>
      )}

      {/* Projects */}
      {data.projects && data.projects.length > 0 && (
        <div className="mt-4 space-y-2">
          <h2 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-0.5">
            Key Projects
          </h2>
          <div className="space-y-2.5">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold text-xs">
                  {proj.name} {proj.techStack && `(Tech: ${proj.techStack})`}
                </div>
                {proj.description && <p className="text-xs">{proj.description}</p>}
                {Array.isArray(proj.highlights) && proj.highlights.length > 0 && (
                  <ul className="list-disc list-inside text-xs space-y-0.5 pl-1">
                    {proj.highlights.filter(h => h && h.trim()).map((h, hIdx) => (
                      <li key={hIdx}><span>{h}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {data.education && data.education.length > 0 && (
        <div className="mt-4 space-y-2">
          <h2 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-0.5">
            Education
          </h2>
          <div className="space-y-1.5">
            {data.education.map((edu, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-bold text-xs">
                  <span>{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</span>
                  <span>{edu.startDate} - {edu.endDate}</span>
                </div>
                <div>{edu.institution} {edu.gpa ? `| GPA: ${edu.gpa}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div className="mt-4 space-y-1">
          <h2 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-0.5">
            Certifications & Achievements
          </h2>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {data.certifications.map((c, idx) => {
              const name = typeof c === 'string' ? c : `${c.name || ''} ${c.issuer ? `(${c.issuer})` : ''} ${c.date ? `— ${c.date}` : ''}`;
              return <li key={idx}><span>{name}</span></li>;
            })}
          </ul>
        </div>
      )}

      {/* Additional Info */}
      {data.additionalInfo && data.additionalInfo.trim() && (
        <div className="mt-4 space-y-1">
          <h2 className="font-bold text-xs uppercase tracking-wider border-b border-black pb-0.5">
            Additional Information
          </h2>
          <p className="text-xs">{data.additionalInfo}</p>
        </div>
      )}
    </div>
  );
});

AtsMinimalTemplate.displayName = 'AtsMinimalTemplate';

/**
 * ----------------------------------------------------------------------------
 * 3. SOFTWARE ENGINEER TEMPLATE
 * ----------------------------------------------------------------------------
 * Tech matrix at top, project stacks highlighted, links, action-oriented.
 */
const SoftwareEngineerTemplate = forwardRef(({ data, p }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-white text-slate-900 p-8 sm:p-10 shadow-lg rounded-xl max-w-4xl mx-auto font-sans leading-relaxed text-xs print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      style={{ minHeight: '1056px' }}
    >
      {/* Header: Left-Aligned Software Engineer Style */}
      <div className="border-b-2 border-indigo-600 pb-4">
        <h1 className="text-2xl font-black text-slate-950 tracking-tight">
          {p.fullName || 'Software Engineer'}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
          {p.email && <span>{p.email}</span>}
          {p.phone && <span>{p.phone}</span>}
          {p.location && <span>{p.location}</span>}
          {p.github && (
            <a href={p.github.startsWith('http') ? p.github : `https://${p.github}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-mono">
              github.com/{p.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
            </a>
          )}
          {p.linkedin && (
            <a href={p.linkedin.startsWith('http') ? p.linkedin : `https://${p.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              linkedin
            </a>
          )}
          {p.portfolio && (
            <a href={p.portfolio.startsWith('http') ? p.portfolio : `https://${p.portfolio}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              portfolio
            </a>
          )}
        </div>
      </div>

      {/* 1. Technical Skills Matrix (Prominently near top!) */}
      {data.skills && (
        <div className="mt-4 space-y-1.5">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <span>// TECHNICAL SKILLS & STACK</span>
          </h2>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1 text-xs">
            {typeof data.skills === 'object' && !Array.isArray(data.skills) ? (
              <>
                {data.skills.programmingLanguages && (
                  <div><strong className="text-slate-950 font-semibold">Languages:</strong> {data.skills.programmingLanguages}</div>
                )}
                {data.skills.frontend && (
                  <div><strong className="text-slate-950 font-semibold">Frontend:</strong> {data.skills.frontend}</div>
                )}
                {data.skills.backend && (
                  <div><strong className="text-slate-950 font-semibold">Backend & APIs:</strong> {data.skills.backend}</div>
                )}
                {data.skills.databases && (
                  <div><strong className="text-slate-950 font-semibold">Databases:</strong> {data.skills.databases}</div>
                )}
                {data.skills.toolsPlatforms && (
                  <div><strong className="text-slate-950 font-semibold">DevOps & Cloud:</strong> {data.skills.toolsPlatforms}</div>
                )}
                {data.skills.other && (
                  <div><strong className="text-slate-950 font-semibold">Core Concepts:</strong> {data.skills.other}</div>
                )}
              </>
            ) : (
              <div>{Array.isArray(data.skills) ? data.skills.join(', ') : String(data.skills)}</div>
            )}
          </div>
        </div>
      )}

      {/* 2. Engineering Summary */}
      {data.summary && data.summary.trim() && (
        <div className="mt-4 space-y-1">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700">
            // ENGINEERING SUMMARY
          </h2>
          <p className="text-xs leading-relaxed text-slate-800 text-justify">
            {data.summary}
          </p>
        </div>
      )}

      {/* 3. Technical Projects */}
      {data.projects && data.projects.length > 0 && (
        <div className="mt-4 space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700">
            // TECHNICAL PROJECTS
          </h2>
          <div className="space-y-3">
            {data.projects.map((proj, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-baseline justify-between flex-wrap gap-1">
                  <span className="font-bold text-slate-950 text-xs">
                    {proj.name}
                    {proj.techStack && (
                      <span className="ml-2 font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        {proj.techStack}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {proj.githubUrl && (
                      <a href={proj.githubUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        [source]
                      </a>
                    )}
                    {proj.liveUrl && (
                      <a href={proj.liveUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        [live]
                      </a>
                    )}
                  </div>
                </div>
                {proj.description && <p className="text-xs text-slate-700">{proj.description}</p>}
                {Array.isArray(proj.highlights) && proj.highlights.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5 pl-1">
                    {proj.highlights.filter(h => h && h.trim()).map((h, hIdx) => (
                      <li key={hIdx} className="leading-relaxed"><span>{h}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Experience & Roles */}
      {data.experience && data.experience.length > 0 && (
        <div className="mt-4 space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700">
            // EXPERIENCE
          </h2>
          <div className="space-y-3">
            {data.experience.map((exp, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-baseline flex-wrap">
                  <span className="font-bold text-slate-950 text-xs">
                    {exp.role} <span className="font-normal text-slate-600">@ {exp.company}</span>
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                {exp.location && <div className="text-[11px] text-slate-500">{exp.location}</div>}
                {exp.description && <p className="text-xs text-slate-700">{exp.description}</p>}
                {Array.isArray(exp.bullets) && exp.bullets.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5 pl-1">
                    {exp.bullets.filter(b => b && b.trim()).map((b, bIdx) => (
                      <li key={bIdx} className="leading-relaxed"><span>{b}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Education */}
      {data.education && data.education.length > 0 && (
        <div className="mt-4 space-y-2">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700">
            // EDUCATION
          </h2>
          <div className="space-y-1.5">
            {data.education.map((edu, idx) => (
              <div key={idx}>
                <div className="flex justify-between font-bold text-xs">
                  <span>{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</span>
                  <span className="font-mono text-slate-500 font-normal">{edu.startDate} – {edu.endDate}</span>
                </div>
                <div className="text-slate-600">{edu.institution} {edu.gpa ? `| GPA: ${edu.gpa}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Certifications */}
      {data.certifications && data.certifications.length > 0 && (
        <div className="mt-4 space-y-1">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700">
            // CERTIFICATIONS & HONORS
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5">
            {data.certifications.map((c, idx) => {
              const name = typeof c === 'string' ? c : `${c.name || ''} ${c.issuer ? `(${c.issuer})` : ''} ${c.date ? `— ${c.date}` : ''}`;
              return <li key={idx}><span>{name}</span></li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
});

SoftwareEngineerTemplate.displayName = 'SoftwareEngineerTemplate';
