import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Briefcase,
  Printer,
  RotateCcw,
  LayoutDashboard,
  AlertTriangle,
  Loader2,
  Layers,
  Sparkles
} from 'lucide-react';
import MatchScore from '../components/MatchScore';
import ATSReadinessScore from '../components/ATSReadinessScore';
import SkillGapAnalysis from '../components/SkillGapAnalysis';
import ImprovementSuggestions from '../components/ImprovementSuggestions';
import DownloadReportButton from '../components/DownloadReportButton';
import { getJobAnalysisById } from '../services/analysisService';
import { parseApiError } from '../utils/apiErrorHandler';

export default function MatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAnalysis = async () => {
      if (!id) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getJobAnalysisById(id);
        if (isMounted) {
          setAnalysis(response?.analysis || null);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Could not load analysis details:', err.message);
          const parsed = parseApiError(err, 'Failed to retrieve analysis details.');
          setErrorMessage(parsed.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAnalysis();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Loading Analysis Details...
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Retrieving saved scores, skill gaps, and AI improvement suggestions.
        </p>
      </div>
    );
  }

  // Error / 404 / Access Denied State
  if (errorMessage || !analysis) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Record Unavailable
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Analysis Record Not Found
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            {errorMessage || `No saved resume analysis was found with ID "${id}".`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Return to Dashboard
          </Link>

          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-md shadow-blue-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            Analyze New Resume
          </Link>
        </div>
      </div>
    );
  }

  // Format record data
  const dateFormatted = analysis.createdAt || analysis.created_at
    ? new Date(analysis.createdAt || analysis.created_at).toISOString().split('T')[0]
    : 'Recently';

  const recordForExport = {
    id: analysis.id,
    jobTitle: analysis.jobTitle || analysis.job_title || 'Untitled Role',
    resumeFileName: analysis.originalFilename || analysis.original_filename || analysis.resumeFilename || analysis.resume_filename || 'Uploaded Resume',
    matchScore: typeof analysis.matchScore === 'number' ? analysis.matchScore : 0,
    atsScore: typeof analysis.atsScore === 'number' ? analysis.atsScore : 0,
    atsCategories: analysis.atsBreakdown || analysis.ats_breakdown || [],
    matchedSkills: analysis.matchedSkills || analysis.matched_skills || [],
    missingSkills: analysis.missingSkills || analysis.missing_skills || [],
    additionalSkills: analysis.additionalSkills || analysis.additional_skills || [],
    suggestions: analysis.improvementSuggestions || analysis.improvement_suggestions || [],
    date: dateFormatted
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard History
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <DownloadReportButton
            analysis={recordForExport}
            analysisId={analysis.id}
            label="Download PDF Report"
            variant="primary"
            size="sm"
          />

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Print
          </button>

          <Link
            to="/analyze"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            New Scan
          </Link>
        </div>
      </div>

      {/* Header and Record Metadata */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-transparent dark:border-blue-800">
            <Layers className="w-3.5 h-3.5" />
            Verified Record #{analysis.id}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {analysis.jobTitle || analysis.job_title}
        </h1>

        {/* Scan metadata row */}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>Analysis Date:</span>
            <strong className="text-slate-900 dark:text-white">{dateFormatted}</strong>
          </div>
          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Resume Document:</span>
            <strong className="text-slate-900 dark:text-white">
              {analysis.originalFilename || analysis.original_filename || analysis.resumeFilename || analysis.resume_filename}
            </strong>
          </div>
        </div>

        {/* Target job description excerpt if available */}
        {analysis.jobDescription && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 mt-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Target Job Requirements:</span>
            </div>
            <p className="line-clamp-3 leading-relaxed text-slate-600 dark:text-slate-400">
              {analysis.jobDescription}
            </p>
          </div>
        )}
      </div>

      {/* 1. Score Cards Grid (Match Score & ATS Readiness Score) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MatchScore
          score={typeof analysis.matchScore === 'number' ? analysis.matchScore : 0}
          description={
            typeof analysis.matchScore === 'number'
              ? `Verified semantic match score computed against target job description.`
              : 'Match score pending calculation.'
          }
          isSample={false}
        />

        <ATSReadinessScore
          score={typeof analysis.atsScore === 'number' ? analysis.atsScore : 0}
          categories={analysis.atsBreakdown || analysis.ats_breakdown || []}
          description="Structural ATS readiness evaluated against industry standard parser guidelines."
          isSample={false}
        />
      </div>

      {/* 2. Skill Gap Analysis Component */}
      <SkillGapAnalysis
        matchedSkills={analysis.matchedSkills || analysis.matched_skills || []}
        missingSkills={analysis.missingSkills || analysis.missing_skills || []}
        additionalSkills={analysis.additionalSkills || analysis.additional_skills || []}
      />

      {/* 3. Resume Improvement Suggestions Component */}
      <ImprovementSuggestions
        suggestions={analysis.improvementSuggestions || analysis.improvement_suggestions || []}
        matchedSkills={analysis.matchedSkills || analysis.matched_skills || []}
        missingSkills={analysis.missingSkills || analysis.missing_skills || []}
      />

      {/* Bottom Action Bar */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-transparent dark:border-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 transition-colors">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold">Review Complete for {analysis.jobTitle || analysis.job_title}</h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Return to your dashboard history or run an analysis on another job description.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
          <DownloadReportButton
            analysis={recordForExport}
            label="Download PDF Report"
            variant="outline"
            size="md"
            className="w-full sm:w-auto !bg-slate-850 hover:!bg-slate-750 !text-white !border-slate-700"
          />

          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 shadow transition"
          >
            <LayoutDashboard className="w-4 h-4 text-blue-600" />
            Back to Dashboard
          </Link>

          <Link
            to="/analyze"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4 text-indigo-400" />
            Analyze Another Resume
          </Link>
        </div>
      </div>

    </div>
  );
}
