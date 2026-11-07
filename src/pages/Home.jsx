import { Link } from 'react-router-dom';
import {
  Target,
  BarChart3,
  Lightbulb,
  Sparkles,
  FileText,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Search,
  BookOpen,
  Award,
  ChevronRight
} from 'lucide-react';

export default function Home() {
  const scrollToFeatures = (e) => {
    e.preventDefault();
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Four requested core feature cards
  const features = [
    {
      icon: <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      title: 'AI Resume-Job Match Score',
      description:
        'Calculates an objective match percentage comparing your resume credentials against target job descriptions using semantic similarity algorithms.'
    },
    {
      icon: <Lightbulb className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      title: 'Skill Gap Analysis',
      description:
        'Identifies missing technical proficiencies, essential tools, frameworks, and domain knowledge needed to meet the employer’s criteria.'
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      title: 'ATS Readiness Score',
      description:
        'Measures resume formatting, keyword density, and section structure to verify compatibility with modern Applicant Tracking Systems (ATS).'
    },
    {
      icon: <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
      title: 'AI Resume Improvement Suggestions',
      description:
        'Provides personalized, actionable recommendations and bullet points to help customize and elevate your resume for every application.'
    }
  ];

  // Three-step workflow
  const steps = [
    {
      number: '01',
      icon: <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      title: 'Upload your resume in PDF or DOCX format.',
      description:
        'Select your updated resume. The system extracts your education, skills, work experience, and completed projects.'
    },
    {
      number: '02',
      icon: <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
      title: 'Enter the job description.',
      description:
        'Copy and paste the responsibilities, requirements, and required skills directly from any internship or job posting.'
    },
    {
      number: '03',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
      title: 'View your match score, missing skills, and improvement suggestions.',
      description:
        'Review comprehensive evaluation metrics including ATS compatibility, skill discrepancies, and tailored tips to boost your chances.'
    }
  ];

  // Benefits specifically tailored for students and engineering graduates
  const studentBenefits = [
    {
      icon: <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'Identify Critical Skill Gaps',
      description:
        'Discover specific libraries, databases, or frameworks you have not listed yet so you can upskill before campus interviews.'
    },
    {
      icon: <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      title: 'Understand Real Job Requirements',
      description:
        'Deconstruct complex industry job postings into clear, prioritized technical skills and role competencies.'
    },
    {
      icon: <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Improve Resume Quality & Relevance',
      description:
        'Eliminate generic summaries with industry-relevant keywords and strong achievement-focused bullet points.'
    },
    {
      icon: <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'Pass Automated ATS Screeners',
      description:
        'Ensure your formatting, section headers, and keyword alignments bypass robotic filters to land on recruiter desks.'
    }
  ];

  return (
    <div className="space-y-20 py-10">
      
      {/* 1. Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>AI Resume &amp; Career Intelligence Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight text-balance">
              Find Out How Well Your Resume Matches Your{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">Target Role</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Analyze your resume against real job requirements with semantic match scoring, automated ATS readiness validation, and personalized AI skill gap recommendations.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/analyze"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 transition active:scale-95"
              >
                <FileText className="w-5 h-5" />
                Analyze My Resume
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <a
                href="#features"
                onClick={scrollToFeatures}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm transition"
              >
                Explore Features
              </a>
            </div>

            {/* Quick Proof Metrics */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free for Students
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> PDF &amp; DOCX Support
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ATS Compatibility Check
              </span>
            </div>
          </div>

          {/* Hero Visual Card (Career Tech Preview) */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 relative transition-colors">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="text-xs font-medium text-slate-400 ml-2">Match Analysis Sample</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-transparent dark:border-emerald-800">
                  Ready
                </span>
              </div>

              {/* Sample Score Ring */}
              <div className="py-6 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Match Score</div>
                  <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">86%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">High compatibility with role</div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">ATS Score</div>
                  <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">92/100</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">&check; ATS Friendly Format</div>
                </div>
              </div>

              {/* Skills Discovered Preview */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Matched Skills (14)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">85% Match</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">React.js</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">JavaScript</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">Node.js</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">Tailwind</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md">REST APIs</span>
                </div>

                <div className="flex justify-between items-center text-xs pt-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Skill Gaps (3)</span>
                  <span className="text-rose-500 dark:text-rose-400 font-medium">Missing in Resume</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md">Docker</span>
                  <span className="px-2 py-0.5 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md">GraphQL</span>
                  <span className="px-2 py-0.5 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md">Jest Unit Tests</span>
                </div>
              </div>

              {/* Mini Suggestion note */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-100 dark:border-blue-900/60 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                  <strong>Suggestion:</strong> Quantify your full-stack project achievements with metrics (e.g. reduced load time by 30%) to rank higher.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Features</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Intelligent Resume Evaluation
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Everything students and job seekers need to assess readiness and tailor resumes for maximum impact.
          </p>
        </div>

        {/* Four Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center mb-4 group-hover:scale-105 transition">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                <span>Learn more</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="bg-slate-100/80 dark:bg-slate-900/60 py-16 border-y border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Simple Process</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              How It Works
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
              Follow three simple steps to compare your resume with any target job requirement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
                      Step {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                      {step.icon}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-medium">
                  {idx === 0 && 'Accepts .pdf and .docx documents'}
                  {idx === 1 && 'Compatible with all major job portals'}
                  {idx === 2 && 'Instant actionable breakdown'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Benefits Section (For Students & Candidates) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Student Advantages</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Why Students Benefit from ResumeMatch AI
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            Designed specifically to address the challenges engineering graduates face during campus placements and job searches.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {studentBenefits.map((benefit, i) => (
            <div
              key={i}
              className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center mb-4">
                {benefit.icon}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Bottom Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold max-w-2xl mx-auto">
            Ready to Optimize Your Resume for Your Next Interview?
          </h2>
          <p className="text-blue-100 max-w-xl mx-auto text-sm sm:text-base">
            Upload your resume, paste the target job requirements, and get your ATS readiness and skill gap breakdown in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/analyze"
              className="w-full sm:w-auto px-7 py-3.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 shadow-md transition"
            >
              Analyze My Resume
            </Link>
            <Link
              to="/signup"
              className="w-full sm:w-auto px-7 py-3.5 bg-blue-700/60 hover:bg-blue-700 text-white font-semibold rounded-xl border border-blue-400/30 transition"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
