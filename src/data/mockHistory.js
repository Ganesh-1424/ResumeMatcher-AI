/**
 * Mock analysis history dataset for the User Dashboard and MatchDetails views.
 * Stores sample historical scans to demonstrate the dashboard metrics,
 * searching, filtering, and detail navigation before MySQL persistence is connected.
 */
export const sampleAnalysisHistory = [
  {
    id: 'scan-01',
    jobTitle: 'Full Stack Web Developer',
    resumeFileName: 'Alex_Morgan_Resume.pdf',
    date: '2026-10-11',
    matchScore: 78,
    matchScoreDescription:
      'Solid full-stack alignment with strong React proficiencies and moderate Node/Express backend gaps.',
    atsScore: 85,
    atsScoreDescription:
      'High structural parsability with standardized technical headings and clean linear typography.',
    atsCategories: [
      { id: 'contact', name: 'Contact information present', status: 'Meets guideline', detail: 'Email, phone, and GitHub links detected.' },
      { id: 'headers', name: 'Resume section headings are clear', status: 'Meets guideline', detail: 'Conventional headers recognized.' },
      { id: 'skills', name: 'Skills are easy to identify', status: 'Meets guideline', detail: 'Technical keywords grouped logically.' },
      { id: 'education', name: 'Education information is present', status: 'Meets guideline', detail: 'B.Tech/BE Computer Science verified.' },
      { id: 'experience', name: 'Work experience or project experience is present', status: 'Needs improvement', detail: 'Add metrics to full-stack project bullets.' },
      { id: 'formatting', name: 'Resume text appears readable and well organized', status: 'Meets guideline', detail: 'Single column layout without nested tables.' }
    ],
    matchedSkills: ['JavaScript', 'React', 'HTML', 'CSS', 'SQL', 'Git', 'Tailwind CSS'],
    missingSkills: ['Node.js', 'Express.js', 'REST APIs', 'MySQL Optimization', 'Docker'],
    suggestions: [
      {
        id: 1,
        category: 'Skills to Highlight',
        priority: 'High',
        title: 'Lead with Core Frontend Competencies',
        description: 'React, JavaScript, and Tailwind are confirmed matches. Feature them at the beginning of your skills list.',
        action: 'Reorder your skills inventory to place React and JavaScript first.'
      },
      {
        id: 2,
        category: 'Project Descriptions to Improve',
        priority: 'High',
        title: 'Clarify Full-Stack Integration in Capstone Work',
        description: 'The job posting asks for Node.js and Express. If your projects had backend components, explain how they interfaced.',
        action: 'Specify client-server data flow in your primary web project.'
      },
      {
        id: 3,
        category: 'Missing Keywords to Review',
        priority: 'Medium',
        title: 'Add REST API and CRUD Keywords',
        description: 'RESTful API principles are missing from your text. Add them if you possess coursework experience.',
        action: 'Include "REST APIs" and "JSON Data Handling" under technical competencies.'
      }
    ],
    notes: 'Strong frontend match with moderate backend skill gaps.'
  },
  {
    id: 'scan-02',
    jobTitle: 'Frontend React Developer',
    resumeFileName: 'Alex_Morgan_Resume.pdf',
    date: '2026-10-09',
    matchScore: 91,
    matchScoreDescription:
      'Exceptional alignment for client-side web application engineering with minimal missing requirements.',
    atsScore: 88,
    atsScoreDescription:
      'Outstanding readability with high keyword density across modern UI libraries and styling tools.',
    atsCategories: [
      { id: 'contact', name: 'Contact information present', status: 'Meets guideline', detail: 'Direct contact info and portfolio link found.' },
      { id: 'headers', name: 'Resume section headings are clear', status: 'Meets guideline', detail: 'Clean standard hierarchy.' },
      { id: 'skills', name: 'Skills are easy to identify', status: 'Meets guideline', detail: 'Frontend stack clearly highlighted.' },
      { id: 'education', name: 'Education information is present', status: 'Meets guideline', detail: 'Graduation year and coursework listed.' },
      { id: 'experience', name: 'Work experience or project experience is present', status: 'Meets guideline', detail: 'Strong UI development bullets provided.' },
      { id: 'formatting', name: 'Resume text appears readable and well organized', status: 'Meets guideline', detail: 'Clean font sizing and margins.' }
    ],
    matchedSkills: ['React', 'JavaScript', 'Tailwind CSS', 'HTML', 'CSS', 'Responsive Design', 'Git'],
    missingSkills: ['Next.js', 'Jest'],
    suggestions: [
      {
        id: 1,
        category: 'Skills to Highlight',
        priority: 'Medium',
        title: 'Showcase Component Architecture',
        description: 'Your React and Tailwind capabilities match the role. Emphasize responsive design and state management.',
        action: 'Mention custom hooks and responsive design patterns in project highlights.'
      },
      {
        id: 2,
        category: 'Missing Keywords to Review',
        priority: 'Medium',
        title: 'Review Testing and SSR Frameworks',
        description: 'Role mentions Jest unit testing and Next.js. If you have built projects with Next.js, add it to your tools.',
        action: 'List experience with Jest or modern testing libraries if applicable.'
      }
    ],
    notes: 'Excellent match for core UI engineering requirements.'
  },
  {
    id: 'scan-03',
    jobTitle: 'Backend Node.js Engineer',
    resumeFileName: 'Alex_Morgan_Resume.pdf',
    date: '2026-10-06',
    matchScore: 58,
    matchScoreDescription:
      'Moderate alignment; candidate resume currently emphasizes UI engineering over distributed server systems.',
    atsScore: 82,
    atsScoreDescription:
      'Good baseline ATS parsability, but server-side keyword density is low.',
    atsCategories: [
      { id: 'contact', name: 'Contact information present', status: 'Meets guideline', detail: 'Contact info verified.' },
      { id: 'headers', name: 'Resume section headings are clear', status: 'Meets guideline', detail: 'Recognizable headers.' },
      { id: 'skills', name: 'Skills are easy to identify', status: 'Meets guideline', detail: 'Readable skill list.' },
      { id: 'education', name: 'Education information is present', status: 'Meets guideline', detail: 'Degree listed.' },
      { id: 'experience', name: 'Work experience or project experience is present', status: 'Needs improvement', detail: 'Needs backend-focused project descriptions.' },
      { id: 'formatting', name: 'Resume text appears readable and well organized', status: 'Meets guideline', detail: 'Standard fonts used.' }
    ],
    matchedSkills: ['JavaScript', 'SQL', 'Git'],
    missingSkills: ['Node.js', 'Express.js', 'Microservices', 'Redis', 'Docker', 'GraphQL'],
    suggestions: [
      {
        id: 1,
        category: 'Project Descriptions to Improve',
        priority: 'High',
        title: 'Add Dedicated Server-Side Projects',
        description: 'To compete for backend roles, add a project showcasing API endpoints, middleware, and database connectivity.',
        action: 'Document a backend project featuring Express.js routes and relational database queries.'
      },
      {
        id: 2,
        category: 'Missing Keywords to Review',
        priority: 'High',
        title: 'Highlight Database and Cache Concepts',
        description: 'You possess SQL skills. Expand on query optimization, transactions, or caching if familiar.',
        action: 'Detail SQL indexing, query design, and relational schema modeling.'
      }
    ],
    notes: 'Notable backend framework gaps identified.'
  },
  {
    id: 'scan-04',
    jobTitle: 'Junior Software Engineer',
    resumeFileName: 'Alex_Morgan_Resume.pdf',
    date: '2026-10-03',
    matchScore: 84,
    matchScoreDescription:
      'High compatibility for an entry-level software engineer with strong fundamental programming coverage.',
    atsScore: 86,
    atsScoreDescription:
      'Meets all automated ATS structural criteria for graduate intake programs.',
    atsCategories: [
      { id: 'contact', name: 'Contact information present', status: 'Meets guideline', detail: 'Complete header verified.' },
      { id: 'headers', name: 'Resume section headings are clear', status: 'Meets guideline', detail: 'Clear standard section layout.' },
      { id: 'skills', name: 'Skills are easy to identify', status: 'Meets guideline', detail: 'Programming languages listed clearly.' },
      { id: 'education', name: 'Education information is present', status: 'Meets guideline', detail: 'University education and GPA listed.' },
      { id: 'experience', name: 'Work experience or project experience is present', status: 'Meets guideline', detail: 'Engineering capstone projects included.' },
      { id: 'formatting', name: 'Resume text appears readable and well organized', status: 'Meets guideline', detail: 'ATS compliant formatting.' }
    ],
    matchedSkills: ['JavaScript', 'React', 'HTML', 'CSS', 'SQL', 'Git'],
    missingSkills: ['TypeScript', 'CI/CD'],
    suggestions: [
      {
        id: 1,
        category: 'Measurable Results',
        priority: 'Medium',
        title: 'Quantify Final-Year Project Outcomes',
        description: 'Highlight problem scope and team contributions for engineering capstone projects.',
        action: 'Include project metrics: user base, performance speedup, or automated test coverage.'
      },
      {
        id: 2,
        category: 'Missing Keywords to Review',
        priority: 'Low',
        title: 'Mention Version Control & CI/CD Tooling',
        description: 'Junior roles look for Git fluency and basic CI workflows.',
        action: 'Add Git workflows, GitHub pull requests, or GitHub Actions to developer tools.'
      }
    ],
    notes: 'High compatibility for entry-level engineering position.'
  },
  {
    id: 'scan-05',
    jobTitle: 'Data Analyst & Visualization',
    resumeFileName: 'Alex_Morgan_Resume.pdf',
    date: '2026-09-28',
    matchScore: 38,
    matchScoreDescription:
      'Substantial divergence; candidate profile is optimized for software engineering rather than data analytics.',
    atsScore: 79,
    atsScoreDescription:
      'Standard format, but low keyword alignment with data science and analytics tooling.',
    atsCategories: [
      { id: 'contact', name: 'Contact information present', status: 'Meets guideline', detail: 'Header verified.' },
      { id: 'headers', name: 'Resume section headings are clear', status: 'Meets guideline', detail: 'Standard headers.' },
      { id: 'skills', name: 'Skills are easy to identify', status: 'Meets guideline', detail: 'Skills listed, but mostly web dev.' },
      { id: 'education', name: 'Education information is present', status: 'Meets guideline', detail: 'Degree verified.' },
      { id: 'experience', name: 'Work experience or project experience is present', status: 'Needs improvement', detail: 'Lacks quantitative data analysis projects.' },
      { id: 'formatting', name: 'Resume text appears readable and well organized', status: 'Meets guideline', detail: 'Readable document.' }
    ],
    matchedSkills: ['SQL'],
    missingSkills: ['Python', 'Pandas', 'Tableau', 'PowerBI', 'Statistics'],
    suggestions: [
      {
        id: 1,
        category: 'Skills to Highlight',
        priority: 'High',
        title: 'Expand Relational Database Skills',
        description: 'SQL is your single overlapping skill. Feature complex queries, joins, and data aggregations.',
        action: 'Detail SQL capabilities including aggregate queries, group-by joins, and subqueries.'
      },
      {
        id: 2,
        category: 'Missing Keywords to Review',
        priority: 'High',
        title: 'Highlight Data Manipulation Libraries',
        description: 'Data analytics roles require Python or R. If you have completed academic labs with Python or Pandas, include them.',
        action: 'Add data analytics coursework, Python scripts, or data visualization tools if studied.'
      }
    ],
    notes: 'Significant domain divergence from candidate profile.'
  }
];

/**
 * Data access helper to retrieve a historical analysis by its unique ID.
 * Prepares the application for clean replacement with an Express.js API call (e.g., api.get(`/matches/${id}`)).
 *
 * @param {string} id - The scan ID (e.g. 'scan-01')
 * @returns {object|null} The matched history item or null if not found
 */
export function getAnalysisById(id) {
  if (!id) return null;
  const normalizedId = String(id).trim().toLowerCase();
  return (
    sampleAnalysisHistory.find(
      (item) => String(item.id).trim().toLowerCase() === normalizedId
    ) || null
  );
}
