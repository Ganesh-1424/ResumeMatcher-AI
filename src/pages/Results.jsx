import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Target,
  Lightbulb,
  ArrowLeft,
  RotateCcw,
  LayoutDashboard,
  Info,
  Sparkles,
  FileText,
  Briefcase,
  Printer,
  Cpu,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Check,
  ShieldCheck,
  Layers,
  ArrowRight
} from 'lucide-react';
import { sampleAnalysisResult } from '../data/mockResults';
import MatchScore from '../components/MatchScore';
import SkillGapAnalysis from '../components/SkillGapAnalysis';
import ATSReadinessScore from '../components/ATSReadinessScore';
import ImprovementSuggestions from '../components/ImprovementSuggestions';
import DownloadReportButton from '../components/DownloadReportButton';
import {
  getJobAnalysisById,
  calculateSemanticMatch,
  analyzeSkillGap,
  calculateAtsScore,
  generateImprovementSuggestions
} from '../services/analysisService';
import { parseApiError } from '../utils/apiErrorHandler';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const passedState = location.state || {};
  const queryId = searchParams.get('id');

  // Authoritative analysis ID: check state, URL query parameter, and sessionStorage
  const activeAnalysisId =
    passedState.analysisId ||
    (queryId ? parseInt(queryId, 10) : null) ||
    (sessionStorage.getItem('lastAnalysisId') ? parseInt(sessionStorage.getItem('lastAnalysisId'), 10) : null);

  // Metadata
  const [jobTitle, setJobTitle] = useState(
    passedState.jobTitle || passedState.analysisRecord?.job_title || sampleAnalysisResult.jobTitle
  );
  const [resumeFileName, setResumeFileName] = useState(
    passedState.resumeFileName || passedState.analysisRecord?.resume_filename || sampleAnalysisResult.resumeFileName
  );

  // Loading state for initial analysis record retrieval from MySQL
  const [isInitialLoading, setIsInitialLoading] = useState(Boolean(activeAnalysisId));
  const [initialFetchError, setInitialFetchError] = useState(null);

  // Pipeline execution tracking across the 4 required endpoints
  // Order: 1. match -> 2. skills -> 3. ats -> 4. suggestions
  const [stepStatus, setStepStatus] = useState({
    match: { status: 'idle', error: null }, // 'idle' | 'running' | 'success' | 'error'
    skills: { status: 'idle', error: null },
    ats: { status: 'idle', error: null },
    suggestions: { status: 'idle', error: null }
  });

  const [pipelineMessage, setPipelineMessage] = useState('');
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);

  // Live Results Data States
  const [matchScore, setMatchScore] = useState(null);
  const [matchDescription, setMatchDescription] = useState('');
  const [semanticDetails, setSemanticDetails] = useState(null);

  const [matchedSkills, setMatchedSkills] = useState(null);
  const [missingSkills, setMissingSkills] = useState(null);
  const [additionalSkills, setAdditionalSkills] = useState(null);
  const [skillGapDetails, setSkillGapDetails] = useState(null);

  const [atsScore, setAtsScore] = useState(null);
  const [atsCategories, setAtsCategories] = useState(null);
  const [atsDescription, setAtsDescription] = useState('');
  const [atsDetails, setAtsDetails] = useState(null);

  const [suggestions, setSuggestions] = useState(null);
  const [suggestionSummary, setSuggestionSummary] = useState('');

  // Lock to prevent concurrent overlapping runs
  const isExecutingRef = useRef(false);

  /**
   * Helper to parse JSON fields safely
   */
  const safeJsonParse = (val, defaultVal = []) => {
    if (!val) return defaultVal;
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  };

  /**
   * Step 1: Semantic Embeddings Match
   */
  const executeMatchStep = async (id) => {
    setStepStatus((prev) => ({
      ...prev,
      match: { status: 'running', error: null }
    }));
    setPipelineMessage('Step 1 of 4: Computing semantic embeddings and cosine similarity...');

    try {
      const res = await calculateSemanticMatch(id);
      if (res && typeof res.matchScore === 'number') {
        setMatchScore(res.matchScore);
        if (res.explanation) setMatchDescription(res.explanation);
        setSemanticDetails(res);
      }
      setStepStatus((prev) => ({
        ...prev,
        match: { status: 'success', error: null }
      }));
      return true;
    } catch (err) {
      console.error('Semantic match step error:', err);
      const errorObj = parseApiError(err, 'Semantic matching failed.');
      setStepStatus((prev) => ({
        ...prev,
        match: { status: 'error', error: errorObj.message }
      }));
      setPipelineMessage(`Step 1 Failed: ${errorObj.message}`);
      return false;
    }
  };

  /**
   * Step 2: Technical Skill Gap Extraction
   */
  const executeSkillsStep = async (id) => {
    setStepStatus((prev) => ({
      ...prev,
      skills: { status: 'running', error: null }
    }));
    setPipelineMessage('Step 2 of 4: Extracting technical skills and identifying gaps...');

    try {
      const res = await analyzeSkillGap(id);
      if (res && res.skillNames) {
        setMatchedSkills(Array.isArray(res.skillNames.matched) ? res.skillNames.matched : []);
        setMissingSkills(Array.isArray(res.skillNames.missing) ? res.skillNames.missing : []);
        setAdditionalSkills(Array.isArray(res.skillNames.additional) ? res.skillNames.additional : []);
        setSkillGapDetails(res);
      }
      setStepStatus((prev) => ({
        ...prev,
        skills: { status: 'success', error: null }
      }));
      return true;
    } catch (err) {
      console.error('Skill gap step error:', err);
      const errorObj = parseApiError(err, 'Skill gap analysis failed.');
      setStepStatus((prev) => ({
        ...prev,
        skills: { status: 'error', error: errorObj.message }
      }));
      setPipelineMessage(`Step 2 Failed: ${errorObj.message}`);
      return false;
    }
  };

  /**
   * Step 3: ATS Readiness Scoring
   */
  const executeAtsStep = async (id) => {
    setStepStatus((prev) => ({
      ...prev,
      ats: { status: 'running', error: null }
    }));
    setPipelineMessage('Step 3 of 4: Evaluating ATS section headings and layout format...');

    try {
      const res = await calculateAtsScore(id);
      if (res && typeof res.atsScore === 'number') {
        setAtsScore(res.atsScore);
        if (Array.isArray(res.categoryBreakdown)) {
          setAtsCategories(res.categoryBreakdown);
        }
        if (res.disclaimer) {
          setAtsDescription(res.disclaimer);
        }
        setAtsDetails(res);
      }
      setStepStatus((prev) => ({
        ...prev,
        ats: { status: 'success', error: null }
      }));
      return true;
    } catch (err) {
      console.error('ATS scoring step error:', err);
      const errorObj = parseApiError(err, 'ATS evaluation failed.');
      setStepStatus((prev) => ({
        ...prev,
        ats: { status: 'error', error: errorObj.message }
      }));
      setPipelineMessage(`Step 3 Failed: ${errorObj.message}`);
      return false;
    }
  };

  /**
   * Step 4: AI Personalized Improvement Suggestions
   */
  const executeSuggestionsStep = async (id) => {
    setStepStatus((prev) => ({
      ...prev,
      suggestions: { status: 'running', error: null }
    }));
    setPipelineMessage('Step 4 of 4: Generating personalized AI improvement suggestions with Gemini...');

    try {
      const res = await generateImprovementSuggestions(id);
      if (res && Array.isArray(res.suggestions)) {
        setSuggestions(res.suggestions);
        if (res.summary) {
          setSuggestionSummary(res.summary);
        }
      }
      setStepStatus((prev) => ({
        ...prev,
        suggestions: { status: 'success', error: null }
      }));
      setPipelineMessage('Analysis pipeline complete! All results verified and saved.');
      return true;
    } catch (err) {
      console.error('AI suggestions step error:', err);
      const errorObj = parseApiError(err, 'AI suggestions generation failed.');
      setStepStatus((prev) => ({
        ...prev,
        suggestions: { status: 'error', error: errorObj.message }
      }));
      setPipelineMessage(`Step 4 Failed: ${errorObj.message}`);
      return false;
    }
  };

  /**
   * Runs the remaining pipeline steps sequentially from a starting point
   */
  const runSequentialPipeline = useCallback(
    async (id, startStep = 'match') => {
      if (isExecutingRef.current) return;
      isExecutingRef.current = true;
      setIsPipelineRunning(true);

      try {
        let ok = true;

        if (startStep === 'match' || stepStatus.match.status !== 'success') {
          ok = await executeMatchStep(id);
          if (!ok) return;
        }

        if (startStep === 'match' || startStep === 'skills' || stepStatus.skills.status !== 'success') {
          ok = await executeSkillsStep(id);
          if (!ok) return;
        }

        if (
          startStep === 'match' ||
          startStep === 'skills' ||
          startStep === 'ats' ||
          stepStatus.ats.status !== 'success'
        ) {
          ok = await executeAtsStep(id);
          if (!ok) return;
        }

        if (
          startStep === 'match' ||
          startStep === 'skills' ||
          startStep === 'ats' ||
          startStep === 'suggestions' ||
          stepStatus.suggestions.status !== 'success'
        ) {
          await executeSuggestionsStep(id);
        }
      } finally {
        isExecutingRef.current = false;
        setIsPipelineRunning(false);
      }
    },
    [stepStatus]
  );

  /**
   * Load existing analysis on mount and run any pending steps in order
   */
  useEffect(() => {
    if (!activeAnalysisId) {
      setIsInitialLoading(false);
      return;
    }

    let isMounted = true;

    const loadAndExecute = async () => {
      setIsInitialLoading(true);
      setInitialFetchError(null);

      let record = null;
      try {
        const response = await getJobAnalysisById(activeAnalysisId);
        record = response?.analysis || null;
      } catch (err) {
        console.warn('Could not fetch existing record from DB:', err.message);
        const parsed = parseApiError(err, 'Could not retrieve analysis details.');
        setInitialFetchError(parsed.message);
        setIsInitialLoading(false);
        return;
      }

      if (!record) {
        setInitialFetchError(`Analysis record #${activeAnalysisId} was not found or has been removed.`);
        setIsInitialLoading(false);
        return;
      }

      if (!isMounted) return;

      let hasMatch = false;
      let hasSkills = false;
      let hasAts = false;
      let hasSuggestions = false;

      if (record) {
        const title = record.jobTitle || record.job_title;
        if (title) setJobTitle(title);
        const filename = record.originalFilename || record.original_filename || record.resumeFilename || record.resume_filename;
        if (filename) setResumeFileName(filename);

        // Preload completed results from MySQL (support both camelCase and snake_case)
        const savedMatch = record.matchScore !== undefined && record.matchScore !== null ? record.matchScore : record.match_score;
        if (savedMatch !== null && savedMatch !== undefined) {
          const numScore = Number(savedMatch);
          setMatchScore(numScore);
          hasMatch = true;
          setStepStatus((prev) => ({ ...prev, match: { status: 'success', error: null } }));
        }

        const savedMatchedSkills = record.matchedSkills || record.matched_skills;
        const savedMissingSkills = record.missingSkills || record.missing_skills;
        const savedAdditionalSkills = record.additionalSkills || record.additional_skills;
        if (savedMatchedSkills || savedMissingSkills) {
          const parsedMatched = safeJsonParse(savedMatchedSkills);
          const parsedMissing = safeJsonParse(savedMissingSkills);
          const parsedAdditional = safeJsonParse(savedAdditionalSkills);
          setMatchedSkills(parsedMatched);
          setMissingSkills(parsedMissing);
          setAdditionalSkills(parsedAdditional);
          hasSkills = true;
          setStepStatus((prev) => ({ ...prev, skills: { status: 'success', error: null } }));
        }

        const savedAts = record.atsScore !== undefined && record.atsScore !== null ? record.atsScore : record.ats_score;
        if (savedAts !== null && savedAts !== undefined) {
          const numAts = Number(savedAts);
          setAtsScore(numAts);
          const savedBreakdown = record.atsBreakdown || record.ats_breakdown;
          if (savedBreakdown) {
            setAtsCategories(safeJsonParse(savedBreakdown));
          }
          hasAts = true;
          setStepStatus((prev) => ({ ...prev, ats: { status: 'success', error: null } }));
        }

        const savedSuggestions = record.improvementSuggestions || record.improvement_suggestions;
        if (savedSuggestions) {
          const parsedSuggestions = safeJsonParse(savedSuggestions);
          if (Array.isArray(parsedSuggestions) && parsedSuggestions.length > 0) {
            setSuggestions(parsedSuggestions);
            hasSuggestions = true;
            setStepStatus((prev) => ({ ...prev, suggestions: { status: 'success', error: null } }));
          }
        }
      }

      setIsInitialLoading(false);

      // Determine first pending step in order: match -> skills -> ats -> suggestions
      if (!hasMatch) {
        await runSequentialPipeline(activeAnalysisId, 'match');
      } else if (!hasSkills) {
        await runSequentialPipeline(activeAnalysisId, 'skills');
      } else if (!hasAts) {
        await runSequentialPipeline(activeAnalysisId, 'ats');
      } else if (!hasSuggestions) {
        await runSequentialPipeline(activeAnalysisId, 'suggestions');
      } else {
        setPipelineMessage('Analysis pipeline completed previously. Loaded verified results from database.');
      }
    };

    loadAndExecute();

    return () => {
      isMounted = false;
    };
  }, [activeAnalysisId]);

  /**
   * Manual retry for individual failed steps
   */
  const handleRetryStep = async (stepName) => {
    if (!activeAnalysisId || isPipelineRunning) return;
    await runSequentialPipeline(activeAnalysisId, stepName);
  };

  // Calculate completed progress percentage
  const completedStepsCount = [
    stepStatus.match.status === 'success',
    stepStatus.skills.status === 'success',
    stepStatus.ats.status === 'success',
    stepStatus.suggestions.status === 'success'
  ].filter(Boolean).length;

  const progressPercent = Math.round((completedStepsCount / 4) * 100);

  // Consolidated record reflecting active analysis state for PDF export
  const activeRecord = {
    ...sampleAnalysisResult,
    id: activeAnalysisId,
    jobTitle: jobTitle,
    resumeFileName: resumeFileName,
    matchScore: typeof matchScore === 'number' ? matchScore : 0,
    atsScore: typeof atsScore === 'number' ? atsScore : 0,
    atsCategories: atsCategories || [],
    matchedSkills: matchedSkills || [],
    missingSkills: missingSkills || [],
    additionalSkills: additionalSkills || [],
    suggestions: suggestions || [],
    date: passedState.date || new Date().toISOString().split('T')[0]
  };

  // Preview Mode State (no active analysis ID passed)
  const isPreviewMode = !activeAnalysisId;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/analyze"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Resume Upload
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {/* PDF Report Export */}
          <DownloadReportButton
            analysis={activeRecord}
            analysisId={activeAnalysisId}
            label="Download PDF Report"
            variant="primary"
            size="sm"
          />

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Print
          </button>

          <button
            type="button"
            onClick={() => navigate('/analyze')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            New Scan
          </button>
        </div>
      </div>

      {/* Access Denied or Fatal Record Error */}
      {initialFetchError && (
        <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 space-y-3">
          <div className="flex items-center gap-2 font-bold text-base">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <span>Unable to Access Analysis Record</span>
          </div>
          <p className="text-sm">{initialFetchError}</p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Your Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeAnalysisId ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-transparent dark:border-blue-800">
              <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Live Analysis &bull; Record #{activeAnalysisId}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-transparent dark:border-amber-800">
              <Info className="w-3.5 h-3.5" />
              Sample Preview Mode
            </span>
          )}

          {isPipelineRunning && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
              Pipeline Running...
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Analysis Results &amp; Match Report
        </h1>

        {/* Target role & resume file details banner */}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
          <div className="flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Target Role:</span>
            <strong className="text-slate-900 dark:text-white">{jobTitle}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Analyzed Resume:</span>
            <strong className="text-slate-900 dark:text-white">{resumeFileName}</strong>
          </div>
        </div>
      </div>

      {/* Preview Mode Notification Banner */}
      {isPreviewMode && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Demonstration Preview Mode Active</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                No active resume analysis is selected. Upload your resume and paste a job description to execute the full live analysis pipeline with genuine embeddings and ATS checks.
              </p>
            </div>
          </div>
          <Link
            to="/analyze"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs whitespace-nowrap cursor-pointer"
          >
            <span>Upload Resume Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Live Pipeline Stepper & Progress Card (Active for real analyses) */}
      {activeAnalysisId && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Backend Analysis Pipeline Status
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {pipelineMessage || 'Executes the 4 analysis endpoints sequentially using verified server data.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {progressPercent}% Complete ({completedStepsCount}/4)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 4 Steps Indicators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Step 1: Semantic Match */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                stepStatus.match.status === 'success'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                  : stepStatus.match.status === 'running'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                  : stepStatus.match.status === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">1. Semantic Match</span>
                {stepStatus.match.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {stepStatus.match.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                {stepStatus.match.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              </div>
              <p className="text-[11px] mt-1 opacity-85">
                {stepStatus.match.status === 'success'
                  ? `Computed (${matchScore}%)`
                  : stepStatus.match.status === 'running'
                  ? 'Calculating embeddings...'
                  : stepStatus.match.status === 'error'
                  ? 'Step failed'
                  : 'Pending'}
              </p>
              {stepStatus.match.status === 'error' && (
                <button
                  type="button"
                  onClick={() => handleRetryStep('match')}
                  disabled={isPipelineRunning}
                  className="mt-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline hover:no-underline cursor-pointer"
                >
                  Retry Step 1
                </button>
              )}
            </div>

            {/* Step 2: Skill Gap Analysis */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                stepStatus.skills.status === 'success'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                  : stepStatus.skills.status === 'running'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                  : stepStatus.skills.status === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">2. Skill Gap</span>
                {stepStatus.skills.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {stepStatus.skills.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                {stepStatus.skills.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              </div>
              <p className="text-[11px] mt-1 opacity-85">
                {stepStatus.skills.status === 'success'
                  ? `${matchedSkills?.length || 0} matched skills`
                  : stepStatus.skills.status === 'running'
                  ? 'Extracting technical skills...'
                  : stepStatus.skills.status === 'error'
                  ? 'Step failed'
                  : 'Pending'}
              </p>
              {stepStatus.skills.status === 'error' && (
                <button
                  type="button"
                  onClick={() => handleRetryStep('skills')}
                  disabled={isPipelineRunning}
                  className="mt-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline hover:no-underline cursor-pointer"
                >
                  Retry Step 2
                </button>
              )}
            </div>

            {/* Step 3: ATS Score */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                stepStatus.ats.status === 'success'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                  : stepStatus.ats.status === 'running'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                  : stepStatus.ats.status === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">3. ATS Readiness</span>
                {stepStatus.ats.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {stepStatus.ats.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                {stepStatus.ats.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              </div>
              <p className="text-[11px] mt-1 opacity-85">
                {stepStatus.ats.status === 'success'
                  ? `Evaluated (${atsScore}/100)`
                  : stepStatus.ats.status === 'running'
                  ? 'Parsing layout headers...'
                  : stepStatus.ats.status === 'error'
                  ? 'Step failed'
                  : 'Pending'}
              </p>
              {stepStatus.ats.status === 'error' && (
                <button
                  type="button"
                  onClick={() => handleRetryStep('ats')}
                  disabled={isPipelineRunning}
                  className="mt-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline hover:no-underline cursor-pointer"
                >
                  Retry Step 3
                </button>
              )}
            </div>

            {/* Step 4: AI Suggestions */}
            <div
              className={`p-3.5 rounded-2xl border transition ${
                stepStatus.suggestions.status === 'success'
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                  : stepStatus.suggestions.status === 'running'
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                  : stepStatus.suggestions.status === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">4. AI Suggestions</span>
                {stepStatus.suggestions.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {stepStatus.suggestions.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                {stepStatus.suggestions.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              </div>
              <p className="text-[11px] mt-1 opacity-85">
                {stepStatus.suggestions.status === 'success'
                  ? `${suggestions?.length || 0} personalized tips`
                  : stepStatus.suggestions.status === 'running'
                  ? 'Generating with Gemini...'
                  : stepStatus.suggestions.status === 'error'
                  ? 'Step failed'
                  : 'Pending'}
              </p>
              {stepStatus.suggestions.status === 'error' && (
                <button
                  type="button"
                  onClick={() => handleRetryStep('suggestions')}
                  disabled={isPipelineRunning}
                  className="mt-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline hover:no-underline cursor-pointer"
                >
                  Retry Step 4
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Semantic Embeddings Diagnostic Drawer */}
      {semanticDetails && (
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Dense Embeddings Vector Diagnostics (Task 24)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cosine Similarity:</span>
              <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm">{semanticDetails.rawSimilarity}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Calibrated Score:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{semanticDetails.matchScore}%</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Embedding Model:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 truncate block text-[11px]" title={semanticDetails.embeddingModel}>
                {semanticDetails.embeddingModel}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Vector Dimensions:</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm">{semanticDetails.embeddingDimension || 768} dims</strong>
            </div>
          </div>
        </div>
      )}

      {/* 1 & 2. Score Cards Grid (Overall Match & ATS Readiness) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Semantic Match Score */}
        {activeAnalysisId && stepStatus.match.status === 'running' ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Computing Semantic Match...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Calculating high-dimensional embeddings for resume text and job requirements.
            </p>
          </div>
        ) : activeAnalysisId && stepStatus.match.status === 'error' ? (
          <div className="p-8 rounded-3xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
            <AlertCircle className="w-8 h-8 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Semantic Matching Failed</h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-xs">
              {stepStatus.match.error || 'Failed to compute similarity score.'}
            </p>
            <button
              type="button"
              onClick={() => handleRetryStep('match')}
              disabled={isPipelineRunning}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Retry Step 1
            </button>
          </div>
        ) : (
          <MatchScore
            score={typeof matchScore === 'number' ? matchScore : isPreviewMode ? sampleAnalysisResult.matchScore : 0}
            description={matchDescription || sampleAnalysisResult.matchScoreDescription}
            isSample={isPreviewMode}
          />
        )}

        {/* Card 2: ATS Readiness Score */}
        {activeAnalysisId && stepStatus.ats.status === 'running' ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Evaluating ATS Readiness...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Analyzing contact info, standard headings, experience, education, and readability.
            </p>
          </div>
        ) : activeAnalysisId && stepStatus.ats.status === 'error' ? (
          <div className="p-8 rounded-3xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 shadow-sm flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
            <AlertCircle className="w-8 h-8 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">ATS Evaluation Failed</h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-xs">
              {stepStatus.ats.error || 'Failed to evaluate ATS readability.'}
            </p>
            <button
              type="button"
              onClick={() => handleRetryStep('ats')}
              disabled={isPipelineRunning}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Retry Step 3
            </button>
          </div>
        ) : (
          <ATSReadinessScore
            score={typeof atsScore === 'number' ? atsScore : isPreviewMode ? sampleAnalysisResult.atsScore : 0}
            categories={atsCategories || (isPreviewMode ? sampleAnalysisResult.atsCategories : [])}
            description={atsDescription || sampleAnalysisResult.atsScoreDescription}
            warnings={atsDetails?.warnings}
            isSample={isPreviewMode}
          />
        )}

      </div>

      {/* 3. Skill Gap Analysis Component */}
      {activeAnalysisId && stepStatus.skills.status === 'running' ? (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Extracting &amp; Comparing Technical Skills...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Comparing programming languages, frameworks, databases, and tools between your resume and the job description.
          </p>
        </div>
      ) : activeAnalysisId && stepStatus.skills.status === 'error' ? (
        <div className="p-8 rounded-3xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Skill Gap Analysis Failed</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
            {stepStatus.skills.error || 'Unable to complete skill gap extraction.'}
          </p>
          <button
            type="button"
            onClick={() => handleRetryStep('skills')}
            disabled={isPipelineRunning}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Retry Step 2
          </button>
        </div>
      ) : (
        <SkillGapAnalysis
          matchedSkills={matchedSkills || (isPreviewMode ? sampleAnalysisResult.matchedSkills : [])}
          missingSkills={missingSkills || (isPreviewMode ? sampleAnalysisResult.missingSkills : [])}
          additionalSkills={additionalSkills || []}
        />
      )}

      {/* 4. Improvement Suggestions Component */}
      {activeAnalysisId && stepStatus.suggestions.status === 'running' ? (
        <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Generating AI Resume Improvement Suggestions...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Gemini is reviewing summary impact, quantifiable project metrics, missing skills, and role alignment.
          </p>
        </div>
      ) : activeAnalysisId && stepStatus.suggestions.status === 'error' ? (
        <div className="p-8 rounded-3xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">AI Suggestions Generation Failed</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
            {stepStatus.suggestions.error || 'Failed to generate tailored suggestions.'}
          </p>
          <button
            type="button"
            onClick={() => handleRetryStep('suggestions')}
            disabled={isPipelineRunning}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Retry Step 4
          </button>
        </div>
      ) : (
        <ImprovementSuggestions
          suggestions={suggestions || (isPreviewMode ? sampleAnalysisResult.suggestions : [])}
          matchedSkills={matchedSkills || (isPreviewMode ? sampleAnalysisResult.matchedSkills : [])}
          missingSkills={missingSkills || (isPreviewMode ? sampleAnalysisResult.missingSkills : [])}
        />
      )}

      {/* Navigation Actions Footer */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-transparent dark:border-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 transition-colors">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold">What would you like to do next?</h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Compare your resume with another job description or return to the dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
          <DownloadReportButton
            analysis={activeRecord}
            analysisId={activeAnalysisId}
            label="Download PDF Report"
            variant="outline"
            size="md"
            className="w-full sm:w-auto !bg-slate-850 hover:!bg-slate-750 !text-white !border-slate-700"
          />

          <Link
            to="/analyze"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 shadow transition"
          >
            <RotateCcw className="w-4 h-4 text-blue-600" />
            Analyze Another Resume
          </Link>

          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            Go to Dashboard
          </Link>
        </div>
      </div>

    </div>
  );
}
