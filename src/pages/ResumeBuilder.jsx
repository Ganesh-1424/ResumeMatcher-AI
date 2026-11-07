import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Save,
  Download,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Wand2,
  Copy,
  History,
  Eye,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
  Printer,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import ResumePreview from '../components/ResumePreview';
import {
  saveResumeDraft,
  getSavedResumes,
  getSavedResumeById,
  updateResumeDraft,
  duplicateResumeDraft,
  deleteResumeDraft,
  downloadResumePdf,
  checkBuilderAtsScore,
  matchBuilderWithJob,
  getAiWritingAssistance
} from '../services/builderService';
import { getATSScoreTier, getCategoryStatusConfig } from '../components/ATSReadinessScore';
import { useAuth } from '../context/AuthContext';

// Sample Starter Data
const SAMPLE_RESUME = {
  title: 'Full Stack Software Engineer',
  template: 'modern',
  personalInfo: {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/janedoe',
    github: 'github.com/janedoe',
    portfolio: 'janedoe.dev'
  },
  summary: 'Results-driven Full Stack Software Engineer with expertise in building scalable web applications, distributed APIs, and real-time platforms. Passionate about clean architecture, performance optimization, and developer productivity.',
  skills: {
    programmingLanguages: 'JavaScript, TypeScript, Python, SQL, Go',
    frontend: 'React, Next.js, Tailwind CSS, Redux Toolkit, HTML5/CSS3',
    backend: 'Node.js, Express.js, RESTful APIs, WebSockets, GraphQL',
    databases: 'PostgreSQL, MongoDB, Redis, MySQL',
    toolsPlatforms: 'Docker, AWS (S3, ECS), Git, GitHub Actions, Linux, Jest',
    other: 'CI/CD Pipelines, Microservices Architecture, Agile/Scrum'
  },
  experience: [
    {
      role: 'Full Stack Developer',
      company: 'CloudScale Technologies',
      location: 'San Francisco, CA',
      startDate: 'Jan 2023',
      endDate: '',
      current: true,
      description: 'Engineered high-throughput cloud microservices and responsive web client interfaces.',
      bullets: [
        'Architected and deployed responsive React dashboard used by 15,000+ monthly active enterprise users.',
        'Engineered distributed Node.js/PostgreSQL microservices handling ~2.5M daily API queries with 99.9% uptime.',
        'Optimized database queries and introduced Redis caching, reducing average API response latency by 35%.'
      ]
    },
    {
      role: 'Software Engineer Intern',
      company: 'Nova Digital Labs',
      location: 'San Jose, CA',
      startDate: 'Jun 2022',
      endDate: 'Dec 2022',
      current: false,
      description: 'Collaborated on frontend feature development and automated test suites.',
      bullets: [
        'Engineered 12+ modular React UI components integrated into the core customer billing portal.',
        'Implemented end-to-end integration test suites with Jest and Cypress, elevating test coverage from 62% to 88%.'
      ]
    }
  ],
  projects: [
    {
      name: 'Real-Time Telemetry & Monitoring Dashboard',
      techStack: 'React, Node.js, WebSockets, PostgreSQL, Docker',
      githubUrl: 'https://github.com/janedoe/telemetry-dash',
      liveUrl: 'https://telemetry-demo.janedoe.dev',
      description: 'Full-stack distributed system monitoring tool providing live WebSocket metric visualization and alerting.',
      highlights: [
        'Built real-time telemetry streaming pipeline supporting 500+ events/sec with sub-50ms latency.',
        'Containerized services using Docker Compose with automated GitHub Actions CI/CD deployment.'
      ]
    },
    {
      name: 'AI Document Parser & Search Engine',
      techStack: 'Python, FastAPI, React, Tailwind CSS, SQLite',
      githubUrl: 'https://github.com/janedoe/ai-doc-parser',
      liveUrl: '',
      description: 'Full-stack search engine enabling semantic text retrieval and structured JSON data extraction from PDF/DOCX files.',
      highlights: [
        'Engineered text extraction pipeline processing multi-page documents with 98% accuracy.',
        'Implemented token-budgeted semantic search indices accelerating keyword query matching.'
      ]
    }
  ],
  education: [
    {
      institution: 'California State University',
      degree: 'Bachelor of Science',
      fieldOfStudy: 'Computer Science',
      startDate: '2019',
      endDate: '2023',
      gpa: '3.85 / 4.0',
      details: 'Relevant coursework: Data Structures, Distributed Systems, Database Management, Algorithms.'
    }
  ],
  certifications: [
    {
      name: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services',
      date: '2024'
    },
    {
      name: 'Meta Front-End Developer Professional Certificate',
      issuer: 'Coursera / Meta',
      date: '2023'
    }
  ],
  additionalInfo: 'Languages: English (Native), Spanish (Conversational). Hackathon Winner: 1st Place Regional Hackathon (2023).'
};

export default function ResumeBuilder() {
  const { isAuthenticated } = useAuth();
  const previewRef = useRef(null);

  // Resume Document State
  const [resumeData, setResumeData] = useState(SAMPLE_RESUME);
  const [currentId, setCurrentId] = useState(null);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'additional'
  const [mobileView, setMobileView] = useState('form'); // 'form' | 'preview'
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saved' | 'saving' | 'error'

  // Saved Drafts Modal
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedResumesList, setSavedResumesList] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // ATS Modal State
  const [showAtsModal, setShowAtsModal] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [isScoringAts, setIsScoringAts] = useState(false);

  // Job Match Modal State
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [targetJobTitle, setTargetJobTitle] = useState('Software Engineer');
  const [targetJobDesc, setTargetJobDesc] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [isMatching, setIsMatching] = useState(false);

  // AI Assistance Modal State
  const [aiModal, setAiModal] = useState({
    isOpen: false,
    type: 'summary',
    targetField: null,
    inputText: '',
    context: {},
    suggestions: [],
    summary: '',
    isLoading: false,
    selectedOption: null
  });

  // Load saved resumes list if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedResumes();
    }
  }, [isAuthenticated]);

  const loadSavedResumes = async () => {
    try {
      setIsLoadingSaved(true);
      const res = await getSavedResumes();
      if (res && res.success) {
        setSavedResumesList(res.resumes || []);
      }
    } catch (_) {}
    finally {
      setIsLoadingSaved(false);
    }
  };

  // Updaters for nested state
  const handlePersonalInfoChange = (field, value) => {
    setResumeData((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value
      }
    }));
  };

  const handleSkillsChange = (field, value) => {
    setResumeData((prev) => ({
      ...prev,
      skills: {
        ...(typeof prev.skills === 'object' && !Array.isArray(prev.skills) ? prev.skills : {}),
        [field]: value
      }
    }));
  };

  // Section List Handlers (Add, Update, Delete, Reorder)
  const handleAddItem = (section, defaultItem) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: [...(Array.isArray(prev[section]) ? prev[section] : []), defaultItem]
    }));
  };

  const handleUpdateItem = (section, index, field, value) => {
    setResumeData((prev) => {
      const list = [...(Array.isArray(prev[section]) ? prev[section] : [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [section]: list };
    });
  };

  const handleDeleteItem = (section, index) => {
    setResumeData((prev) => {
      const list = [...(Array.isArray(prev[section]) ? prev[section] : [])];
      list.splice(index, 1);
      return { ...prev, [section]: list };
    });
  };

  const handleMoveItem = (section, index, direction) => {
    setResumeData((prev) => {
      const list = [...(Array.isArray(prev[section]) ? prev[section] : [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, [section]: list };
    });
  };

  // Bullets Handlers for Experience & Projects
  const handleAddBullet = (section, itemIndex, bulletsField) => {
    setResumeData((prev) => {
      const list = [...prev[section]];
      const item = { ...list[itemIndex] };
      item[bulletsField] = [...(item[bulletsField] || []), ''];
      list[itemIndex] = item;
      return { ...prev, [section]: list };
    });
  };

  const handleUpdateBullet = (section, itemIndex, bulletsField, bulletIndex, value) => {
    setResumeData((prev) => {
      const list = [...prev[section]];
      const item = { ...list[itemIndex] };
      const bullets = [...(item[bulletsField] || [])];
      bullets[bulletIndex] = value;
      item[bulletsField] = bullets;
      list[itemIndex] = item;
      return { ...prev, [section]: list };
    });
  };

  const handleDeleteBullet = (section, itemIndex, bulletsField, bulletIndex) => {
    setResumeData((prev) => {
      const list = [...prev[section]];
      const item = { ...list[itemIndex] };
      const bullets = [...(item[bulletsField] || [])];
      bullets.splice(bulletIndex, 1);
      item[bulletsField] = bullets;
      list[itemIndex] = item;
      return { ...prev, [section]: list };
    });
  };

  // Save / Update Resume
  const handleSave = async () => {
    if (!isAuthenticated) {
      alert('Please log in or sign up to save resume drafts to your account.');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      if (currentId) {
        const res = await updateResumeDraft(currentId, resumeData);
        if (res && res.success) {
          setSaveStatus('saved');
          loadSavedResumes();
        }
      } else {
        const res = await saveResumeDraft(resumeData);
        if (res && res.success) {
          setCurrentId(res.resume?.id || res.id);
          setSaveStatus('saved');
          loadSavedResumes();
        }
      }
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Load Saved Resume
  const handleLoadResume = async (id) => {
    try {
      const res = await getSavedResumeById(id);
      if (res && res.success && res.resume) {
        setResumeData(res.resume);
        setCurrentId(res.resume.id);
        setShowSavedModal(false);
      }
    } catch (err) {
      console.error('Load resume error:', err);
      alert('Failed to load resume draft.');
    }
  };

  // Duplicate Resume
  const handleDuplicate = async (id) => {
    try {
      const res = await duplicateResumeDraft(id);
      if (res && res.success && res.resume) {
        setResumeData(res.resume);
        setCurrentId(res.resume.id);
        loadSavedResumes();
        setShowSavedModal(false);
      }
    } catch (err) {
      console.error('Duplicate error:', err);
      alert('Failed to duplicate resume.');
    }
  };

  // Delete Resume
  const handleDeleteResume = async (id) => {
    if (!window.confirm('Are you sure you want to delete this saved resume draft?')) return;
    try {
      await deleteResumeDraft(id);
      if (currentId === id) {
        setCurrentId(null);
      }
      loadSavedResumes();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete resume.');
    }
  };

  // PDF Download
  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadResumePdf(resumeData);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const safeName = (resumeData.personalInfo?.fullName || 'resume').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      link.setAttribute('download', `${safeName}-${resumeData.template || 'modern'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF. You can also use the browser print dialog to print or save as PDF.');
    }
  };

  // Check ATS Score
  const handleCheckAts = async () => {
    setIsScoringAts(true);
    setShowAtsModal(true);
    setAtsResult(null);

    try {
      const data = await checkBuilderAtsScore(resumeData, currentId);
      if (data && data.success) {
        setAtsResult(data);
      }
    } catch (err) {
      console.error('ATS check failed:', err);
    } finally {
      setIsScoringAts(false);
    }
  };

  // Match with Job Description
  const handleMatchJob = async () => {
    if (!targetJobDesc || targetJobDesc.trim().length < 20) {
      alert('Please enter at least 20 characters of job description.');
      return;
    }

    setIsMatching(true);
    setMatchResult(null);

    try {
      const data = await matchBuilderWithJob(resumeData, targetJobTitle, targetJobDesc);
      if (data && data.success) {
        setMatchResult(data);
      }
    } catch (err) {
      console.error('Match failed:', err);
    } finally {
      setIsMatching(false);
    }
  };

  // Trigger AI Writing Assistant
  const openAiAssistant = async (type, targetField, currentText, context = {}) => {
    setAiModal({
      isOpen: true,
      type,
      targetField,
      inputText: currentText || '',
      context,
      suggestions: [],
      summary: '',
      isLoading: true,
      selectedOption: null
    });

    try {
      const res = await getAiWritingAssistance({
        type,
        inputText: currentText || '',
        context
      });
      if (res && res.success) {
        setAiModal((prev) => ({
          ...prev,
          suggestions: res.suggestions || [],
          summary: res.summary || '',
          isLoading: false
        }));
      }
    } catch (err) {
      console.error('AI assistant error:', err);
      setAiModal((prev) => ({
        ...prev,
        isLoading: false,
        summary: 'Unable to reach AI assistant. Please try again.'
      }));
    }
  };

  // Apply AI Suggestion to Form State
  const applyAiSuggestion = (suggestionText) => {
    if (!suggestionText) return;
    const { targetField } = aiModal;

    if (targetField === 'summary') {
      setResumeData((prev) => ({ ...prev, summary: suggestionText }));
    } else if (targetField?.startsWith('experience_bullet:')) {
      const [, expIdxStr, bulletIdxStr] = targetField.split(':');
      const expIdx = parseInt(expIdxStr, 10);
      const bulletIdx = parseInt(bulletIdxStr, 10);
      handleUpdateBullet('experience', expIdx, 'bullets', bulletIdx, suggestionText);
    } else if (targetField?.startsWith('project_bullet:')) {
      const [, projIdxStr, hIdxStr] = targetField.split(':');
      const projIdx = parseInt(projIdxStr, 10);
      const hIdx = parseInt(hIdxStr, 10);
      handleUpdateBullet('projects', projIdx, 'highlights', hIdx, suggestionText);
    }

    setAiModal({ isOpen: false, type: 'summary', targetField: null, inputText: '', context: {}, suggestions: [], summary: '', isLoading: false, selectedOption: null });
  };

  const templatesList = [
    { id: 'modern', name: 'Modern Professional', desc: 'Balanced typography with blue accents and clean section dividers.' },
    { id: 'ats_minimal', name: 'ATS-Friendly Minimal', desc: 'Single-column monochrome layout optimized for automated parser clearance.' },
    { id: 'software_engineer', name: 'Software Engineer', desc: 'Highlights tech skills matrix, project architectures, and GitHub links.' }
  ];

  const atsTier = atsResult ? getATSScoreTier(atsResult.atsScore) : null;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col transition-colors">
      
      {/* Top Navbar / Action Bar */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Title & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <input
                type="text"
                value={resumeData.title || ''}
                onChange={(e) => setResumeData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Resume Title (e.g. Full Stack Engineer)"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none transition px-1 py-0.5 max-w-[280px] sm:max-w-xs truncate"
              />
              {saveStatus === 'saving' && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mobile View Toggle */}
            <div className="md:hidden flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMobileView('form')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  mobileView === 'form' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Form
              </button>
              <button
                type="button"
                onClick={() => setMobileView('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  mobileView === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Preview
              </button>
            </div>

            {/* Check ATS Score Button */}
            <button
              type="button"
              onClick={handleCheckAts}
              className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Audit against ATS scoring engine"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Check ATS</span>
            </button>

            {/* Match with Job Button */}
            <button
              type="button"
              onClick={() => setShowMatchModal(true)}
              className="px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              title="Match with target job description"
            >
              <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Match Job</span>
            </button>

            {/* Saved Resumes Button */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setShowSavedModal(true)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>Saved ({savedResumesList.length})</span>
              </button>
            )}

            {/* Save Draft Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{currentId ? 'Update' : 'Save'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-600/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Form Editor (Visible on desktop or when mobileView === 'form') */}
        <div className={`lg:col-span-6 space-y-4 ${mobileView === 'form' ? 'block' : 'hidden lg:block'}`}>
          
          {/* Section Navigation Pills */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1 overflow-x-auto text-xs font-semibold scrollbar-none">
            {[
              { id: 'personal', label: 'Contact' },
              { id: 'summary', label: 'Summary' },
              { id: 'skills', label: 'Skills' },
              { id: 'experience', label: 'Experience' },
              { id: 'projects', label: 'Projects' },
              { id: 'education', label: 'Education' },
              { id: 'certifications', label: 'Certs' },
              { id: 'additional', label: 'More' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content Area */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            
            {/* 1. PERSONAL INFO SECTION */}
            {activeTab === 'personal' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Personal & Contact Details
                  </h3>
                  <span className="text-xs text-slate-400">Section 1 of 8</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={resumeData.personalInfo?.fullName || ''}
                      onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Professional Email *
                    </label>
                    <input
                      type="email"
                      value={resumeData.personalInfo?.email || ''}
                      onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                      placeholder="jane.doe@example.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={resumeData.personalInfo?.phone || ''}
                      onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Location (City, State / Country)
                    </label>
                    <input
                      type="text"
                      value={resumeData.personalInfo?.location || ''}
                      onChange={(e) => handlePersonalInfoChange('location', e.target.value)}
                      placeholder="San Francisco, CA"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="text"
                      value={resumeData.personalInfo?.linkedin || ''}
                      onChange={(e) => handlePersonalInfoChange('linkedin', e.target.value)}
                      placeholder="linkedin.com/in/janedoe"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      GitHub Profile URL
                    </label>
                    <input
                      type="text"
                      value={resumeData.personalInfo?.github || ''}
                      onChange={(e) => handlePersonalInfoChange('github', e.target.value)}
                      placeholder="github.com/janedoe"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Personal Portfolio / Website
                    </label>
                    <input
                      type="text"
                      value={resumeData.personalInfo?.portfolio || ''}
                      onChange={(e) => handlePersonalInfoChange('portfolio', e.target.value)}
                      placeholder="https://janedoe.dev"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. SUMMARY SECTION */}
            {activeTab === 'summary' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Professional Summary
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      A concise 2–3 sentence overview of your engineering background and core value.
                    </p>
                  </div>

                  {/* AI Assistance Button */}
                  <button
                    type="button"
                    onClick={() => openAiAssistant('summary', 'summary', resumeData.summary, {
                      role: resumeData.title || 'Software Engineer',
                      skills: typeof resumeData.skills === 'object' ? Object.values(resumeData.skills).join(', ') : ''
                    })}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Polish</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={resumeData.summary || ''}
                  onChange={(e) => setResumeData((prev) => ({ ...prev, summary: e.target.value }))}
                  placeholder="Results-driven Software Engineer with expertise in building scalable web applications..."
                  className="w-full p-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            )}

            {/* 3. TECHNICAL SKILLS SECTION */}
            {activeTab === 'skills' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Technical Skills Inventory
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Categorized competencies for recruiter clarity and ATS index parsers.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Programming Languages
                    </label>
                    <input
                      type="text"
                      value={resumeData.skills?.programmingLanguages || ''}
                      onChange={(e) => handleSkillsChange('programmingLanguages', e.target.value)}
                      placeholder="JavaScript, TypeScript, Python, SQL, C++, Java"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Frontend Technologies
                    </label>
                    <input
                      type="text"
                      value={resumeData.skills?.frontend || ''}
                      onChange={(e) => handleSkillsChange('frontend', e.target.value)}
                      placeholder="React, Next.js, Vue, Tailwind CSS, Redux, HTML5, CSS3"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Backend & APIs
                    </label>
                    <input
                      type="text"
                      value={resumeData.skills?.backend || ''}
                      onChange={(e) => handleSkillsChange('backend', e.target.value)}
                      placeholder="Node.js, Express.js, FastAPI, Django, REST APIs, GraphQL"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Databases & Storage
                    </label>
                    <input
                      type="text"
                      value={resumeData.skills?.databases || ''}
                      onChange={(e) => handleSkillsChange('databases', e.target.value)}
                      placeholder="PostgreSQL, MongoDB, MySQL, Redis, SQLite"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      DevOps, Cloud & Tools
                    </label>
                    <input
                      type="text"
                      value={resumeData.skills?.toolsPlatforms || ''}
                      onChange={(e) => handleSkillsChange('toolsPlatforms', e.target.value)}
                      placeholder="Docker, AWS, Git, GitHub Actions, Linux, Kubernetes, Postman"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. WORK EXPERIENCE SECTION */}
            {activeTab === 'experience' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Work Experience & Internships
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleAddItem('experience', {
                      role: '',
                      company: '',
                      location: '',
                      startDate: '',
                      endDate: '',
                      current: false,
                      description: '',
                      bullets: ['']
                    })}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Role</span>
                  </button>
                </div>

                {(!resumeData.experience || resumeData.experience.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No work experience added yet. Click &quot;Add Role&quot; above.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {resumeData.experience.map((exp, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/80 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Role #{idx + 1}: {exp.role || 'New Position'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveItem('experience', idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveItem('experience', idx, 1)}
                              disabled={idx === resumeData.experience.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('experience', idx)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                              title="Delete entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={exp.role || ''}
                            onChange={(e) => handleUpdateItem('experience', idx, 'role', e.target.value)}
                            placeholder="Job Title (e.g. Software Engineer)"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={exp.company || ''}
                            onChange={(e) => handleUpdateItem('experience', idx, 'company', e.target.value)}
                            placeholder="Company Name"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={exp.startDate || ''}
                            onChange={(e) => handleUpdateItem('experience', idx, 'startDate', e.target.value)}
                            placeholder="Start Date (e.g. Jan 2023)"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={exp.current ? 'Present' : (exp.endDate || '')}
                              disabled={exp.current}
                              onChange={(e) => handleUpdateItem('experience', idx, 'endDate', e.target.value)}
                              placeholder="End Date"
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                            />
                            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              <input
                                type="checkbox"
                                checked={Boolean(exp.current)}
                                onChange={(e) => handleUpdateItem('experience', idx, 'current', e.target.checked)}
                              />
                              Current
                            </label>
                          </div>
                        </div>

                        {/* Bullets List */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>Key Contributions & Accomplishments (Bullet points)</span>
                            <button
                              type="button"
                              onClick={() => handleAddBullet('experience', idx, 'bullets')}
                              className="text-blue-600 text-[11px] hover:underline"
                            >
                              + Add Bullet
                            </button>
                          </div>
                          {(exp.bullets || []).map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                              <span className="text-slate-400">•</span>
                              <input
                                type="text"
                                value={bullet || ''}
                                onChange={(e) => handleUpdateBullet('experience', idx, 'bullets', bIdx, e.target.value)}
                                placeholder="Engineered high-throughput service handling..."
                                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => openAiAssistant('experience_bullet', `experience_bullet:${idx}:${bIdx}`, bullet, {
                                  role: exp.role,
                                  company: exp.company
                                })}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                                title="Enhance bullet with AI"
                              >
                                <Wand2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBullet('experience', idx, 'bullets', bIdx)}
                                className="p-1 text-slate-400 hover:text-rose-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. PROJECTS SECTION */}
            {activeTab === 'projects' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Key Technical Projects
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleAddItem('projects', {
                      name: '',
                      techStack: '',
                      description: '',
                      highlights: [''],
                      githubUrl: '',
                      liveUrl: ''
                    })}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Project</span>
                  </button>
                </div>

                {(!resumeData.projects || resumeData.projects.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No projects added yet. Click &quot;Add Project&quot; above.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {resumeData.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/80 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Project #{idx + 1}: {proj.name || 'New Project'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveItem('projects', idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveItem('projects', idx, 1)}
                              disabled={idx === resumeData.projects.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem('projects', idx)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={proj.name || ''}
                            onChange={(e) => handleUpdateItem('projects', idx, 'name', e.target.value)}
                            placeholder="Project Name"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={proj.techStack || ''}
                            onChange={(e) => handleUpdateItem('projects', idx, 'techStack', e.target.value)}
                            placeholder="Tech Stack (e.g. React, Node.js, Docker)"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={proj.githubUrl || ''}
                            onChange={(e) => handleUpdateItem('projects', idx, 'githubUrl', e.target.value)}
                            placeholder="GitHub Repository URL"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={proj.liveUrl || ''}
                            onChange={(e) => handleUpdateItem('projects', idx, 'liveUrl', e.target.value)}
                            placeholder="Live Demo URL"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <textarea
                          rows={2}
                          value={proj.description || ''}
                          onChange={(e) => handleUpdateItem('projects', idx, 'description', e.target.value)}
                          placeholder="Project overview & architecture description..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />

                        {/* Project Highlights / Bullets */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>Project Key Highlights</span>
                            <button
                              type="button"
                              onClick={() => handleAddBullet('projects', idx, 'highlights')}
                              className="text-blue-600 text-[11px] hover:underline"
                            >
                              + Add Highlight
                            </button>
                          </div>
                          {(proj.highlights || []).map((highlight, hIdx) => (
                            <div key={hIdx} className="flex items-center gap-2">
                              <span className="text-slate-400">•</span>
                              <input
                                type="text"
                                value={highlight || ''}
                                onChange={(e) => handleUpdateBullet('projects', idx, 'highlights', hIdx, e.target.value)}
                                placeholder="Implemented real-time WebSocket messaging..."
                                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => openAiAssistant('project_bullet', `project_bullet:${idx}:${hIdx}`, highlight, {
                                  projectName: proj.name,
                                  techStack: proj.techStack
                                })}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                                title="Enhance project bullet with AI"
                              >
                                <Wand2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBullet('projects', idx, 'highlights', hIdx)}
                                className="p-1 text-slate-400 hover:text-rose-500"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. EDUCATION SECTION */}
            {activeTab === 'education' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Education & Academics
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleAddItem('education', {
                      institution: '',
                      degree: '',
                      fieldOfStudy: '',
                      startDate: '',
                      endDate: '',
                      gpa: ''
                    })}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Degree</span>
                  </button>
                </div>

                {(!resumeData.education || resumeData.education.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No education added. Click &quot;Add Degree&quot; above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {resumeData.education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/80 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Degree #{idx + 1}: {edu.degree || 'Degree Title'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('education', idx)}
                            className="p-1 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={edu.degree || ''}
                            onChange={(e) => handleUpdateItem('education', idx, 'degree', e.target.value)}
                            placeholder="Degree (e.g. Bachelor of Science)"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={edu.fieldOfStudy || ''}
                            onChange={(e) => handleUpdateItem('education', idx, 'fieldOfStudy', e.target.value)}
                            placeholder="Major / Specialization (e.g. Computer Science)"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={edu.institution || ''}
                            onChange={(e) => handleUpdateItem('education', idx, 'institution', e.target.value)}
                            placeholder="College / University Name"
                            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={edu.startDate || ''}
                              onChange={(e) => handleUpdateItem('education', idx, 'startDate', e.target.value)}
                              placeholder="Start Year"
                              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                            <input
                              type="text"
                              value={edu.endDate || ''}
                              onChange={(e) => handleUpdateItem('education', idx, 'endDate', e.target.value)}
                              placeholder="Grad Year"
                              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <input
                          type="text"
                          value={edu.gpa || ''}
                          onChange={(e) => handleUpdateItem('education', idx, 'gpa', e.target.value)}
                          placeholder="CGPA or Percentage (e.g. 3.9 / 4.0 or 88%)"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 7. CERTIFICATIONS SECTION */}
            {activeTab === 'certifications' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Certifications & Achievements
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleAddItem('certifications', { name: '', issuer: '', date: '' })}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Credential</span>
                  </button>
                </div>

                {(!resumeData.certifications || resumeData.certifications.length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No certifications added.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {resumeData.certifications.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700/80 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={typeof c === 'string' ? c : (c.name || '')}
                          onChange={(e) => handleUpdateItem('certifications', idx, 'name', e.target.value)}
                          placeholder="Credential / Award Title"
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={typeof c === 'object' ? (c.issuer || '') : ''}
                          onChange={(e) => handleUpdateItem('certifications', idx, 'issuer', e.target.value)}
                          placeholder="Issuer (e.g. AWS)"
                          className="w-32 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteItem('certifications', idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 8. ADDITIONAL INFO */}
            {activeTab === 'additional' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Additional Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Spoken languages, extracurricular leadership, publications, or volunteer experience.
                  </p>
                </div>

                <textarea
                  rows={4}
                  value={resumeData.additionalInfo || ''}
                  onChange={(e) => setResumeData((prev) => ({ ...prev, additionalInfo: e.target.value }))}
                  placeholder="Languages: English (Fluent), Spanish (Conversational)..."
                  className="w-full p-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

          </div>
        </div>

        {/* RIGHT PANEL: Live Resume Preview (Visible on desktop or when mobileView === 'preview') */}
        <div className={`lg:col-span-6 space-y-4 ${mobileView === 'preview' ? 'block' : 'hidden lg:block'}`}>
          
          {/* Template Selector Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">
              Template:
            </span>
            <div className="flex items-center gap-1.5">
              {templatesList.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setResumeData((prev) => ({ ...prev, template: tpl.id }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    (resumeData.template || 'modern') === tpl.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={tpl.desc}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Document Preview Frame */}
          <div className="bg-slate-200/70 dark:bg-slate-900/60 p-4 sm:p-6 rounded-3xl border border-slate-300/70 dark:border-slate-800 shadow-inner overflow-x-auto max-h-[820px] overflow-y-auto">
            <ResumePreview
              ref={previewRef}
              resumeData={resumeData}
              template={resumeData.template || 'modern'}
            />
          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: AI Writing Assistant Modal                                */}
      {/* ------------------------------------------------------------------ */}
      {aiModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  AI Writing Assistant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAiModal({ isOpen: false, type: 'summary', targetField: null, inputText: '', context: {}, suggestions: [], summary: '', isLoading: false, selectedOption: null })}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiModal.isLoading ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500">Refining text with Gemini AI...</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {aiModal.summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                    {aiModal.summary}
                  </p>
                )}

                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {aiModal.suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setAiModal((prev) => ({ ...prev, selectedOption: item.text }))}
                      className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                        aiModal.selectedOption === item.text
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400 mb-1">
                        {item.label || `Option ${idx + 1}`}
                      </div>
                      <p className="leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* Editable Preview of Selected Option */}
                {aiModal.selectedOption && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Edit Before Applying:
                    </label>
                    <textarea
                      rows={3}
                      value={aiModal.selectedOption}
                      onChange={(e) => setAiModal((prev) => ({ ...prev, selectedOption: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAiModal({ isOpen: false, type: 'summary', targetField: null, inputText: '', context: {}, suggestions: [], summary: '', isLoading: false, selectedOption: null })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!aiModal.selectedOption}
                    onClick={() => applyAiSuggestion(aiModal.selectedOption)}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs"
                  >
                    Apply to Resume
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: Check ATS Score Modal                                     */}
      {/* ------------------------------------------------------------------ */}
      {showAtsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  ATS Score Analysis
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAtsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isScoringAts ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                <p className="text-xs text-slate-500">Evaluating resume against ATS rules...</p>
              </div>
            ) : atsResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Estimated Readiness</span>
                    <span className={`text-3xl font-black ${atsTier?.textColor}`}>
                      {atsResult.atsScore}/100
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${atsTier?.badgeClass}`}>
                    {atsTier?.label}
                  </span>
                </div>

                {atsResult.warnings && atsResult.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-bold">Formatting Alerts:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {atsResult.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Category Breakdown
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {atsResult.categoryBreakdown?.map((cat) => {
                      const cfg = getCategoryStatusConfig(cat.status);
                      return (
                        <div key={cat.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{cat.name}</span>
                            <span className="text-slate-400 ml-2">({cat.earnedPoints}/{cat.maxPoints} pts)</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.badgeClass}`}>
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic border-t border-slate-100 dark:border-slate-800 pt-2">
                  {atsResult.disclaimer}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: Match Job Description Modal                               */}
      {/* ------------------------------------------------------------------ */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Match with Job Description
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMatchModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Job Title
                </label>
                <input
                  type="text"
                  value={targetJobTitle}
                  onChange={(e) => setTargetJobTitle(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Description Text
                </label>
                <textarea
                  rows={5}
                  value={targetJobDesc}
                  onChange={(e) => setTargetJobDesc(e.target.value)}
                  placeholder="Paste complete job description requirements here..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleMatchJob}
                  disabled={isMatching}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2"
                >
                  {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
                  <span>Run Skill Match</span>
                </button>
              </div>

              {matchResult && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Demonstrated Skills ({matchResult.skillGap?.matched?.length || 0})
                      </div>
                      <div className="text-[11px] text-emerald-900 dark:text-emerald-200 mt-1">
                        {matchResult.skillGap?.matched?.join(', ') || 'None identified'}
                      </div>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                      <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                        Missing Skills ({matchResult.skillGap?.missing?.length || 0})
                      </div>
                      <div className="text-[11px] text-rose-900 dark:text-rose-200 mt-1">
                        {matchResult.skillGap?.missing?.join(', ') || 'None! Complete match'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-bold">ATS Alignment: </span>
                    <span>{matchResult.atsResult?.atsScore}/100 with job description keywords evaluated.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 4: Saved Resumes Drawer / Modal                              */}
      {/* ------------------------------------------------------------------ */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Your Saved Resumes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingSaved ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading saved resumes...</div>
            ) : savedResumesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No saved resumes found.</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {savedResumesList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.candidateName} • {item.template} • {new Date(item.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadResume(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold text-[11px] hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(item.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteResume(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
