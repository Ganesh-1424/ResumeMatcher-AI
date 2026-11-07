import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  RotateCcw,
  History,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Loader2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { checkAtsResume, getAtsHistory, downloadAtsReport } from '../services/atsService';
import { getATSScoreTier, getCategoryStatusConfig } from '../components/ATSReadinessScore';
import { useAuth } from '../context/AuthContext';

export default function AtsChecker() {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);

  // Upload & File State
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Result State
  const [result, setResult] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // History State
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Category Accordion State
  const [expandedCategories, setExpandedCategories] = useState({});

  // Fetch history when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    }
  }, [isAuthenticated]);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await getAtsHistory();
      if (res && res.success) {
        setHistory(res.history || []);
      }
    } catch (_) {
      // Non-blocking history load
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setErrorMessage(null);
    const validExtensions = ['.pdf', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      setErrorMessage('Please upload a PDF (.pdf) or Word document (.docx).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5 MB limit. Please choose a smaller file.');
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a resume file to evaluate.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const data = await checkAtsResume(selectedFile);
      if (data && data.success) {
        setResult(data);
        // Refresh history
        if (isAuthenticated) {
          loadHistory();
        }
      } else {
        setErrorMessage(data?.message || 'Failed to complete ATS evaluation.');
      }
    } catch (err) {
      console.error('ATS check failed:', err);
      const msg = err.response?.data?.message || err.message || 'Error communicating with ATS scoring service.';
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPdf = async (checkId) => {
    if (!checkId) return;
    try {
      setIsDownloading(true);
      const blob = await downloadAtsReport(checkId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ats-report-${checkId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Unable to download PDF report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleCategory = (id) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tier = result ? getATSScoreTier(result.atsScore) : null;

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>ATS Engine v2.0 • Standalone Structural Audit</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ATS Resume Checker
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Upload your resume for an instant, deep-parsing structural evaluation, section detection, and automated applicant tracking readiness score. No job description required.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-start gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Upload Card (shown when no result or re-evaluating) */}
        {!result && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Upload Resume Document
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Supports PDF and Word (.docx) files up to 5 MB.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Click to browse or drag and drop your resume here
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    PDF or DOCX format (Max 5 MB)
                  </p>
                </div>
              </div>
            </div>

            {/* File Selected Card */}
            {selectedFile && (
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for evaluation
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  title="Remove file"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Analyze Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
                >
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Past Checks ({history.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm shadow-blue-600/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Structure...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Evaluate ATS Readiness</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results View */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Score Summary Banner */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {/* Circular Score Callout */}
                <div className="relative w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border-4 border-slate-100 dark:border-slate-700/80 flex-shrink-0">
                  <div className="text-center">
                    <span className={`text-3xl font-black ${tier?.textColor} tabular-nums`}>
                      {result.atsScore}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      / 100
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      ATS Readiness Score
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tier?.badgeClass}`}>
                      {tier?.label}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                    {tier?.summary}
                  </p>
                  <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-2 pt-1">
                    <span>File: <strong className="text-slate-700 dark:text-slate-300">{result.resumeDetails?.originalName || result.resumeDetails?.filename}</strong></span>
                    <span>•</span>
                    <span>{result.documentStats?.wordCount} words</span>
                    <span>•</span>
                    <span>{result.documentStats?.sectionCount} sections detected</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(result.checkId || result.id)}
                  disabled={isDownloading}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download Report (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Check Another</span>
                </button>
              </div>
            </div>

            {/* Readability & Formatting Warnings Banner (if any) */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800/60 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <span>Formatting & Readability Alerts ({result.warnings.length})</span>
                </div>
                <ul className="space-y-1 text-xs sm:text-sm text-amber-950 dark:text-amber-200 list-disc list-inside">
                  {result.warnings.map((warn, wIdx) => (
                    <li key={wIdx} className="leading-relaxed">
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detected Sections vs Missing Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Detected Sections */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Detected Resume Sections ({result.detectedSections?.length || 0})</span>
                </div>
                {result.detectedSections && result.detectedSections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.detectedSections.map((sec, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      >
                        ✓ {sec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No standard sections clearly detected.</p>
                )}
              </div>

              {/* Missing or Weak Sections */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Missing or Weak Sections ({result.missingSections?.length || 0})</span>
                </div>
                {result.missingSections && result.missingSections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.missingSections.map((sec, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      >
                        ✕ {sec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">All essential core sections detected!</p>
                )}
              </div>
            </div>

            {/* 9-Category Breakdown Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Detailed Category Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluation across all 9 structural dimensions based on transparent rule-based checks.
                  </p>
                </div>

                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
                  {result.rawPoints !== undefined ? `${result.rawPoints}/${result.maxPossiblePoints} Points` : ''}
                </span>
              </div>

              {/* Category Rows */}
              <div className="space-y-3">
                {result.categoryBreakdown?.map((cat) => {
                  const statusConfig = getCategoryStatusConfig(cat.status);
                  const isExpanded = expandedCategories[cat.id];
                  const isNotEvaluated = cat.status === 'Not evaluated';

                  return (
                    <div
                      key={cat.id}
                      className="border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className="w-full p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition flex items-center justify-between gap-3 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {statusConfig.icon}
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {cat.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                              {isNotEvaluated ? '(Requires Job Description)' : `(${cat.earnedPoints}/${cat.maxPoints} pts)`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${statusConfig.badgeClass}`}>
                            {statusConfig.label}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2">
                          <p className="leading-relaxed">{cat.detail}</p>
                          {cat.explanation && cat.explanation !== cat.detail && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                              {cat.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Actionable Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  Key Strengths
                </h3>
                {result.strengths && result.strengths.length > 0 ? (
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {result.strengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">Review recommendations below to strengthen your resume structure.</p>
                )}
              </div>

              {/* Actionable Recommendations */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  Actionable Recommendations
                </h3>
                {result.improvements && result.improvements.length > 0 ? (
                  <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    {result.improvements.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">Your resume satisfies all primary structural criteria!</p>
                )}
              </div>
            </div>

            {/* Disclaimer Card */}
            <div className="p-5 rounded-3xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>Transparent Plain-Text Evaluation Boundary:</span>
              </div>
              <p className="leading-relaxed">
                {result.disclaimer}
              </p>
            </div>

          </div>
        )}

        {/* History Modal / Drawer */}
        {showHistory && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                Previous ATS Evaluations
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Close
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading history...</div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No previous ATS checks found.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.filename}
                      </div>
                      <div className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{item.isStandalone ? 'Standalone' : 'Job Match'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.atsScore !== null ? `${Math.round(item.atsScore)}/100` : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(item.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                        title="Download PDF Report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
