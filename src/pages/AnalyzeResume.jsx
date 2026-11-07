import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Briefcase,
  UploadCloud,
  Loader2,
  Eye,
  Cpu,
  RefreshCw,
  LogIn,
  KeyRound
} from 'lucide-react';
import ResumeUpload, { formatFileSize, getDocumentType } from '../components/ResumeUpload';
import JobDescriptionInput from '../components/JobDescriptionInput';
import { uploadResumeFile } from '../services/resumeService';
import { createJobAnalysis } from '../services/analysisService';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/apiErrorHandler';

export default function AnalyzeResume() {
  const navigate = useNavigate();
  const { user, token, sessionNotice, clearSessionNotice, clearStaleSession } = useAuth();

  const [resumeFile, setResumeFile] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [jobDescriptionError, setJobDescriptionError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isAuthError, setIsAuthError] = useState(false);
  const [isVerifiedAndReady, setIsVerifiedAndReady] = useState(false);

  // Upload status states
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingAnalysis, setIsSubmittingAnalysis] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedResponse, setUploadedResponse] = useState(null);

  const handleFileSelect = (file) => {
    setResumeFile(file);
    setGeneralError('');
    setIsAuthError(false);
    setIsVerifiedAndReady(false);
    setUploadedResponse(null);
  };

  const handleFileRemove = () => {
    setResumeFile(null);
    setIsVerifiedAndReady(false);
    setUploadedResponse(null);
  };

  const handleJobTitleChange = (val) => {
    setJobTitle(val);
    setIsVerifiedAndReady(false);
  };

  const handleJobDescriptionChange = (val) => {
    const text = typeof val === 'string' ? val : (val?.target?.value ?? '');
    setJobDescription(text);
    if (text.trim().length > 10000) {
      setJobDescriptionError('Job description cannot exceed 10,000 characters.');
    } else if (text.trim().length > 0) {
      setJobDescriptionError('');
    }
    setIsVerifiedAndReady(false);
  };

  const handleClearJobDescription = () => {
    setJobDescription('');
    setJobDescriptionError('');
    setIsVerifiedAndReady(false);
  };

  const handleClearStaleSessionAndLogin = () => {
    clearStaleSession();
    navigate('/login', { state: { from: '/analyze' } });
  };

  /**
   * Dispatches the resume file to the Express.js POST /api/resumes/upload API endpoint
   */
  const handleUploadResumeToBackend = async () => {
    if (!resumeFile) {
      setGeneralError('Please select a PDF or DOCX resume before uploading.');
      setIsAuthError(false);
      return;
    }

    if (!token) {
      setGeneralError('Your login session is missing or expired. Please sign in to upload your resume.');
      setIsAuthError(true);
      return;
    }

    setIsUploading(true);
    setGeneralError('');
    setIsAuthError(false);
    setUploadProgress(15);

    try {
      const response = await uploadResumeFile(
        resumeFile,
        {
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
        },
        (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      );

      setUploadProgress(100);
      setUploadedResponse(response);
      setIsVerifiedAndReady(true);
    } catch (err) {
      console.error('Resume upload error:', err);
      const isAuthIssue =
        err.response?.status === 401 ||
        err.response?.data?.message?.toLowerCase().includes('token') ||
        err.response?.data?.code === 'TOKEN_INVALID' ||
        err.response?.data?.code === 'TOKEN_EXPIRED';

      if (isAuthIssue) {
        setIsAuthError(true);
        setGeneralError('Your login session has expired or is invalid. Please sign in again to continue.');
      } else {
        setIsAuthError(false);
        const parsed = parseApiError(err, 'Failed to upload resume to the server.');
        setGeneralError(parsed.message);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinueToAnalysis = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Prevent duplicate submission
    if (isSubmittingAnalysis || isUploading) return;

    // 1. Validate Resume presence
    if (!resumeFile) {
      setGeneralError('A valid resume (PDF or DOCX) is required. Please upload your file in Step 1.');
      setIsAuthError(false);
      return;
    }

    // 2. Validate Job Description presence (trimmed)
    const trimmedDesc = jobDescription.trim();
    if (trimmedDesc.length === 0) {
      setJobDescriptionError('Job description cannot be empty. Please paste the job requirements.');
      return;
    } else if (trimmedDesc.length < 20) {
      setJobDescriptionError('Job description is too brief. Please paste more details for meaningful matching (at least 20 characters).');
      return;
    } else if (trimmedDesc.length > 10000) {
      setJobDescriptionError('Job description cannot exceed 10,000 characters. Please shorten your text.');
      return;
    }

    // 3. Validate Authentication Session
    if (!token) {
      setGeneralError('Your login session is missing or expired. Please sign in to proceed with resume analysis.');
      setIsAuthError(true);
      return;
    }

    try {
      setIsSubmittingAnalysis(true);
      setGeneralError('');
      setIsAuthError(false);

      // Step A: Ensure resume is uploaded to Express backend (POST /api/resumes/upload)
      let currentResumeRecord = uploadedResponse;
      if (!currentResumeRecord?.analysisId) {
        setIsUploading(true);
        setUploadProgress(20);
        currentResumeRecord = await uploadResumeFile(
          resumeFile,
          {
            jobTitle: jobTitle.trim(),
            jobDescription: trimmedDesc,
          },
          (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
            }
          }
        );
        setUploadProgress(100);
        setUploadedResponse(currentResumeRecord);
        setIsUploading(false);
      }

      const resumeIdToUse = currentResumeRecord?.analysisId;
      if (!resumeIdToUse) {
        throw new Error('Could not obtain an uploaded resume reference from backend.');
      }

      // Step B: Submit Job Analysis record (POST /api/analyses)
      const analysisData = await createJobAnalysis({
        resumeId: resumeIdToUse,
        jobTitle: jobTitle.trim() || 'Software Engineer',
        jobDescription: trimmedDesc
      });

      const newAnalysis = analysisData?.analysis;
      const targetAnalysisId = newAnalysis?.id || resumeIdToUse;

      // Keep analysis ID in sessionStorage so page refreshes retain actual state
      sessionStorage.setItem('lastAnalysisId', String(targetAnalysisId));

      setIsVerifiedAndReady(true);
      navigate(`/results?id=${targetAnalysisId}`, {
        state: {
          resumeFileName: resumeFile.name,
          uploadedFilename: currentResumeRecord?.file?.savedFilename || null,
          jobTitle: newAnalysis?.jobTitle || jobTitle.trim() || 'Target Role',
          analysisId: targetAnalysisId,
          analysisRecord: newAnalysis
        },
      });

    } catch (err) {
      console.error('Analysis submission error:', err);
      const isAuthIssue =
        err.response?.status === 401 ||
        err.response?.data?.message?.toLowerCase().includes('token') ||
        err.response?.data?.code === 'TOKEN_INVALID' ||
        err.response?.data?.code === 'TOKEN_EXPIRED';

      if (isAuthIssue) {
        setIsAuthError(true);
        setGeneralError('Your login session has expired or is invalid. Please sign in again to continue.');
      } else {
        setIsAuthError(false);
        const parsed = parseApiError(err, 'Failed to create analysis. Please check your connection and try again.');
        setGeneralError(parsed.message);
      }
    } finally {
      setIsSubmittingAnalysis(false);
      setIsUploading(false);
    }
  };

  const getPreparedFormDataSummary = () => {
    if (!resumeFile) return null;
    return {
      fileName: resumeFile.name,
      fileSize: formatFileSize(resumeFile.size),
      fileType: getDocumentType(resumeFile),
      targetTitle: jobTitle.trim() || 'Not specified',
      descriptionLength: jobDescription.trim().length,
      approxWords: jobDescription.trim().split(/\s+/).filter(Boolean).length,
    };
  };

  const summary = getPreparedFormDataSummary();
  const isFormComplete = Boolean(
    resumeFile &&
    jobDescription.trim().length >= 20 &&
    jobDescription.trim().length <= 10000
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 mb-2">
            <span>AI Resume &amp; Job Matcher</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Analyze Resume &amp; Match Job
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            Upload your resume, enter the target role, and paste the job description to calculate ATS readiness and skill compatibility.
          </p>
        </div>

        <Link
          to="/results"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 shadow-sm transition w-fit cursor-pointer"
        >
          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Preview Results UI
        </Link>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Step 1 Status */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
            resumeFile
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              resumeFile ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            {resumeFile ? '✓' : '1'}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Step 1</div>
            <div className="text-sm font-semibold">
              {resumeFile ? 'Resume Uploaded' : 'Upload Resume'}
            </div>
          </div>
        </div>

        {/* Step 2 Status */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
            jobDescription.trim().length >= 20
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : resumeFile
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              jobDescription.trim().length >= 20
                ? 'bg-emerald-600 text-white'
                : resumeFile
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {jobDescription.trim().length >= 20 ? '✓' : '2'}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Step 2</div>
            <div className="text-sm font-semibold">
              {jobDescription.trim().length >= 20 ? 'Description Ready' : 'Job Requirements'}
            </div>
          </div>
        </div>

        {/* Step 3 Status */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${
            isVerifiedAndReady
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-80'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              isVerifiedAndReady ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {isVerifiedAndReady ? '✓' : '3'}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">Step 3</div>
            <div className="text-sm font-semibold">
              {isVerifiedAndReady ? 'Ready for Analysis' : 'Review Match & ATS'}
            </div>
          </div>
        </div>
      </div>

      {/* Global Session Expiry Alert from AuthContext */}
      {sessionNotice && (
        <div className="p-4.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-200 text-sm animate-fadeIn">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-100">Authentication Required</p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">{sessionNotice}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              state={{ from: '/analyze' }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
            <button
              type="button"
              onClick={clearSessionNotice}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* General Error Notice / Authentication Recovery Banner */}
      {generalError && (
        <div className="p-4.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-rose-800 dark:text-rose-200 text-sm animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-rose-950 dark:text-rose-100">
                {isAuthError ? 'Authentication Required:' : 'Notice:'}
              </span>
              <p className="text-xs text-rose-800 dark:text-rose-300">{generalError}</p>
              {isAuthError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">
                  Resumes and job analyses are securely linked to your account. Please log in to complete your match report.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            {isAuthError && (
              <button
                type="button"
                onClick={handleClearStaleSessionAndLogin}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In Again</span>
              </button>
            )}
            <button
              onClick={() => {
                setGeneralError('');
                setIsAuthError(false);
              }}
              className="px-2 py-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 font-bold text-sm cursor-pointer"
              title="Dismiss notice"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Server Upload Success Alert */}
      {uploadedResponse && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-start gap-3 text-emerald-900 dark:text-emerald-200 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <span className="font-semibold">Backend Server Upload Success:</span>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Resume <strong className="font-mono">{uploadedResponse.file?.originalName}</strong> safely stored on backend disk as{' '}
              <span className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                {uploadedResponse.file?.savedFilename}
              </span>
              . Size: {formatFileSize(uploadedResponse.file?.size || 0)}.
            </p>
          </div>
          <button
            onClick={() => setUploadedResponse(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Single-Column Vertical Form Layout */}
      <div className="flex flex-col gap-6 w-full">
        {/* Card 1: Upload Resume (full-width card at the top) */}
        <section className="w-full bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              1. Upload Resume
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md font-medium border border-transparent dark:border-slate-700">
              PDF / DOCX (Max 5MB)
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upload your resume document. Files are checked locally and validated securely on the Express.js server using binary magic signatures.
          </p>

          <ResumeUpload
            selectedFile={resumeFile}
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
          />

          {/* Quick Backend Upload Action */}
          {resumeFile && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleUploadResumeToBackend}
                disabled={isUploading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-xs transition disabled:opacity-60 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Uploading to Express Server... ({uploadProgress}%)</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Upload to Backend Server (/api/resumes/upload)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Card 2: Target Job Title (full-width card directly below resume upload) */}
        <section className="w-full bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              2. Target Job Title
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md font-medium border border-transparent dark:border-slate-700">
              Optional
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Specify the job designation or role title you are targeting (e.g., Senior Full Stack Developer, Data Analyst).
          </p>

          <div>
            <label
              htmlFor="target-job-title"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
            >
              Job Title
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="target-job-title"
                type="text"
                value={jobTitle}
                onChange={(e) => handleJobTitleChange(e.target.value)}
                placeholder="e.g. Full Stack Developer, Software Engineer, Cloud Architect"
                className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </section>

        {/* Card 3: Job Description (full-width card directly below job title) */}
        <section className="w-full bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              3. Job Description
            </h2>
            <span className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 px-2.5 py-1 rounded-md font-medium">
              Required
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Paste the complete job description, requirements, responsibilities, and qualifications for similarity comparison and ATS scoring.
          </p>

          <JobDescriptionInput
            jobDescription={jobDescription}
            onJobDescriptionChange={handleJobDescriptionChange}
            onClear={handleClearJobDescription}
            attachedResumeName={resumeFile ? resumeFile.name : null}
            errorMessage={jobDescriptionError}
          />
        </section>

        {/* Verification & Ready Confirmation Card (when staged) */}
        {isVerifiedAndReady && summary && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-blue-950/30 border-2 border-emerald-400/40 dark:border-emerald-600/40 rounded-2xl p-6 shadow-sm space-y-4 animate-fadeIn transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Inputs Verified &amp; Staged for Analysis!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Both the resume document and job description are validated and held in state.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-semibold border border-transparent dark:border-emerald-800">
                Ready for Backend API
              </span>
            </div>

            {/* Staged Data Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified Resume</div>
                <div className="text-sm font-bold text-slate-800 dark:text-white truncate mt-0.5">{summary.fileName}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {summary.fileType} &bull; {summary.fileSize}
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Target Job Title</div>
                <div className="text-sm font-bold text-slate-800 dark:text-white truncate mt-0.5">{summary.targetTitle}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Role Designation</div>
              </div>

              <div className="bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Job Requirements</div>
                <div className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                  {summary.approxWords} words ({summary.descriptionLength} chars)
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  &check; Content Depth Validated
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-850 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/60 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Next Feature Pipeline:</strong> Dispatches payload to Express.js server (<code className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">POST /api/resumes/upload</code>) for parsing, embeddings, and ATS scoring.
              </span>
            </div>
          </div>
        )}

        {/* Card 4: Continue to Analysis (full-width button below all three sections) */}
        <section className="w-full pt-2">
          <button
            type="button"
            onClick={handleContinueToAnalysis}
            disabled={!isFormComplete || isSubmittingAnalysis}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition active:scale-[0.99] shadow-md cursor-pointer ${
              isFormComplete && !isSubmittingAnalysis
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-75'
            }`}
          >
            {isSubmittingAnalysis ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Analysis &amp; Matching Requirements...</span>
              </>
            ) : (
              <>
                <span>Continue to Analysis</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2.5">
            {!resumeFile && 'Please upload your resume in Step 1 to proceed.'}
            {resumeFile && jobDescription.trim().length === 0 && 'Please enter or paste the target job description in Step 3.'}
            {resumeFile && jobDescription.trim().length > 0 && jobDescription.trim().length < 20 && 'Job description must be at least 20 characters.'}
            {isFormComplete && !isSubmittingAnalysis && 'Ready! Click above to calculate ATS readiness and semantic skill match.'}
          </p>
        </section>
      </div>
    </div>
  );
}
