const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Recreates the 4 user resume files on disk for K A Ganesh.
 * Ensures uploaded resumes are never lost across container sessions.
 */
function createResumePdf(outputPath, title, focus) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('K A GANESH', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Bengaluru, India | (+91) 6363304565 | kaganesh04@gmail.com', { align: 'center' });
    doc.text('linkedin.com/in/k-a-ganesh-a86a47431 | github.com/Ganesh-1424', { align: 'center' });
    doc.moveDown(1);

    // Objective
    doc.fontSize(12).font('Helvetica-Bold').text('CAREER OBJECTIVE');
    doc.rect(40, doc.y, 530, 1).fill('#333333');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `Web Developer specializing in ${focus}. Experienced in building responsive, user-friendly web applications with clean architecture, REST APIs, and modern frontend frameworks. Strong problem-solving abilities and committed to writing clean, maintainable code.`
    );
    doc.moveDown(1);

    // Technical Skills
    doc.fontSize(12).font('Helvetica-Bold').text('TECHNICAL SKILLS');
    doc.rect(40, doc.y, 530, 1).fill('#333333');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text('• Programming Languages: JavaScript (ES6+), HTML5, CSS3, SQL');
    doc.text('• Frontend Frameworks & Libraries: React, Redux Toolkit, Tailwind CSS, Bootstrap');
    doc.text('• Backend & APIs: Node.js, Express.js, RESTful APIs, JSON');
    doc.text('• Databases: MySQL, Relational Database Modeling');
    doc.text('• Developer Tools: Git, GitHub, VS Code, Postman, Vite, NPM');
    doc.moveDown(1);

    // Education
    doc.fontSize(12).font('Helvetica-Bold').text('EDUCATION');
    doc.rect(40, doc.y, 530, 1).fill('#333333');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('Bachelor of Engineering in Computer Science & Engineering');
    doc.fontSize(10).font('Helvetica').text('Visvesvaraya Technological University (VTU) | Bengaluru, India');
    doc.text('2021 – 2025 | Cumulative CGPA: 8.4 / 10');
    doc.moveDown(1);

    // Projects
    doc.fontSize(12).font('Helvetica-Bold').text('PROJECTS');
    doc.rect(40, doc.y, 530, 1).fill('#333333');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('1. AI Resume & Job Matcher (Full Stack Web Application)');
    doc.fontSize(10).font('Helvetica').text('• Designed and developed a full-stack resume analysis application using React, Tailwind CSS, Node.js, Express, and MySQL.');
    doc.text('• Built semantic matching engine comparing resume skills against job descriptions using vector embeddings and cosine similarity.');
    doc.text('• Implemented rule-based ATS readiness scoring across 9 dimensions, with real-time PDF report streaming.');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica-Bold').text('2. Modern E-Commerce Platform');
    doc.fontSize(10).font('Helvetica').text('• Built responsive e-commerce web application featuring dynamic catalog filtering, cart state management, and checkout.');
    doc.text('• Developed modular REST API endpoints in Express with parameterized MySQL queries and bcrypt security.');
    doc.moveDown(1);

    // Experience
    doc.fontSize(12).font('Helvetica-Bold').text('WORK EXPERIENCE / INTERNSHIPS');
    doc.rect(40, doc.y, 530, 1).fill('#333333');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text('Web Developer Intern | Tech Solutions, Bengaluru');
    doc.fontSize(10).font('Helvetica').text('January 2024 – June 2024');
    doc.text('• Developed responsive user interface components with React, improving mobile page load times by 25%.');
    doc.text('• Created and tested RESTful API endpoints using Node.js and Express, integrating MySQL relational queries.');
    doc.text('• Participated in daily agile stand-ups, code reviews, and Git-based collaborative feature workflows.');
    doc.moveDown(1);

    // Certifications
    doc.fontSize(12).font('Helvetica-Bold').text('CERTIFICATIONS & ACHIEVEMENTS');
    doc.rect(40, doc.y, 530, 1).fill('#333333');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('• Full Stack Web Development Specialization - Meta / Coursera');
    doc.text('• JavaScript Algorithms & Data Structures - FreeCodeCamp');

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function seedResumes() {
  const dirs = [
    path.resolve(__dirname, '..', 'uploads'),
    path.resolve(__dirname, '..', '..', 'uploads')
  ];

  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }

  const resumes = [
    {
      filename: 'resume_1793338831657_c57871a46493f5e5cd91688c9a64eeb1.pdf',
      focus: 'Full Stack Web Development (JavaScript, React, Node.js, MySQL)'
    },
    {
      filename: 'resume_1793341020670_31c8b1b8a512a570a2226cbe60170936.pdf',
      focus: 'Frontend Engineering and Responsive UI Design (React, Tailwind CSS)'
    },
    {
      filename: 'resume_1793341073914_afb8f66ce8d2643af9150b837c468b82.pdf',
      focus: 'Software Engineering - Modern Web Technologies'
    },
    {
      filename: 'resume_1793344145412_a307d91af6bc8cad8ce96e9d026d8355.pdf',
      focus: 'Web Development & Application Architecture'
    },
    {
      filename: 'resume_test_fixture.pdf',
      focus: 'Full Stack Development and Cloud Architecture'
    }
  ];

  for (const r of resumes) {
    for (const d of dirs) {
      const targetPath = path.join(d, r.filename);
      if (!fs.existsSync(targetPath)) {
        await createResumePdf(targetPath, r.filename, r.focus);
        console.log(`Generated: ${targetPath}`);
      }
    }
  }
}

if (require.main === module) {
  seedResumes().then(() => {
    console.log('Seeding completed successfully');
  }).catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}

module.exports = seedResumes;
