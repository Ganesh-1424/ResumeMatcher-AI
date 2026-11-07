/**
 * Mock results dataset for testing and demonstrating the Resume Analysis Results UI.
 * This structured sample data allows the frontend results dashboard to be tested
 * and reviewed before backend embedding generation and ATS scoring are connected.
 */
export const sampleAnalysisResult = {
  jobTitle: 'Full Stack Web Developer',
  resumeFileName: 'Alex_Morgan_Resume.pdf',
  analyzedAt: 'Just now',
  isSampleData: true,
  
  // Overall semantic match score out of 100
  matchScore: 78,
  matchScoreDescription:
    'Represents the semantic relevance and qualification overlap between your resume content and the provided job description.',

  // ATS (Applicant Tracking System) compatibility score out of 100
  atsScore: 85,
  atsScoreDescription:
    'Evaluates resume section headings, keyword placement, text readability, and file structure to estimate automated screening clearance.',

  // ATS Evaluation category breakdown assessing document readability and structural guidelines
  atsCategories: [
    {
      id: 'contact_info',
      name: 'Contact information present',
      status: 'Meets guideline',
      detail: 'Email, phone number, and professional profile links identified.'
    },
    {
      id: 'section_headings',
      name: 'Resume section headings are clear',
      status: 'Meets guideline',
      detail: 'Recognized standard headers (Skills, Experience, Education).'
    },
    {
      id: 'skills_identified',
      name: 'Skills are easy to identify',
      status: 'Meets guideline',
      detail: 'Categorized technical keywords formatted for automated parsers.'
    },
    {
      id: 'education_present',
      name: 'Education information is present',
      status: 'Meets guideline',
      detail: 'Degree program, institution, and graduation timeline identified.'
    },
    {
      id: 'experience_present',
      name: 'Work experience or project experience is present',
      status: 'Needs improvement',
      detail: 'Project descriptions should include more quantifiable outcomes.'
    },
    {
      id: 'text_readability',
      name: 'Resume text appears readable and well organized',
      status: 'Meets guideline',
      detail: 'Consistent typography without complex non-standard graphics or tables.'
    }
  ],

  // Skills detected in both the resume and target job requirements
  matchedSkills: [
    'JavaScript',
    'React',
    'HTML',
    'CSS',
    'SQL',
    'Tailwind CSS',
    'Git',
    'Responsive Design'
  ],

  // Essential skills mentioned in the job description that were not detected in the resume
  missingSkills: [
    'Node.js',
    'Express.js',
    'REST APIs',
    'MySQL Optimization',
    'Docker'
  ],

  // Tailored, actionable suggestions to improve interview shortlisting
  suggestions: [
    {
      id: 1,
      category: 'Skills to Highlight',
      priority: 'High',
      title: 'Emphasize Core Front-End Proficiencies',
      description:
        'Your resume matches key requirements in React, JavaScript, and Tailwind CSS. Ensure these technologies are positioned prominently near the top of your technical skills list.',
      action: 'Move React and JavaScript to the front of your "Technical Skills" section and highlight them in your top project.'
    },
    {
      id: 2,
      category: 'Project Descriptions to Improve',
      priority: 'High',
      title: 'Clarify Full-Stack Architecture in Academic Projects',
      description:
        'The job posting emphasizes full-stack development (Node.js and Express). If your college capstone projects involved backend services, explicitly state how your frontend connected with them.',
      action: 'Revise project descriptions to specify: "Architected responsive React client connected to Node/Express backend endpoints with JSON payloads."'
    },
    {
      id: 3,
      category: 'Missing Keywords to Review',
      priority: 'High',
      title: 'Review Unlisted Skills You Already Possess',
      description:
        'Terms like "REST APIs" and "MySQL Optimization" are flagged as missing. If you have practical experience with these through coursework or labs, make sure they are written in your resume text.',
      action: 'Audit your coursework and add genuine proficiencies such as "REST APIs", "CRUD Operations", and "Relational Databases" to your skills section.'
    },
    {
      id: 4,
      category: 'Measurable Results',
      priority: 'Medium',
      title: 'Describe Achievements with Quantifiable Results',
      description:
        'Bullet points currently focus on duties rather than impact. Employers evaluate candidate competence by looking for measurable outcomes.',
      action: 'Incorporate quantifiable metrics, such as "Optimized SQL queries to cut latency by 30%" or "Delivered 5 responsive page layouts across all mobile viewports."'
    },
    {
      id: 5,
      category: 'Resume Formatting Improvements',
      priority: 'Low',
      title: 'Standardize Section Headers for ATS Readers',
      description:
        'Ensure all section titles use standard naming conventions (e.g., "Technical Skills", "Work Experience", "Education") to prevent automated parser confusion.',
      action: 'Keep single-column linear layout without embedded text boxes, graphics, or tables in critical experience sections.'
    }
  ]
};
