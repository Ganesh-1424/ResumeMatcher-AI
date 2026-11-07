import { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

/**
 * Maps an ATS category status string to visual badges, icons, and colors.
 * Supported statuses:
 * - 'Meets guideline'
 * - 'Needs improvement'
 * - 'Low match'
 * - 'Not detected'
 * - 'Not evaluated'
 *
 * @param {string} status
 * @returns {object} status styling config
 */
export function getCategoryStatusConfig(status) {
  const normalized = (status || '').trim().toLowerCase();

  if (normalized === 'meets guideline') {
    return {
      label: 'Meets guideline',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
    };
  }
  if (normalized === 'needs improvement') {
    return {
      label: 'Needs improvement',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
    };
  }
  if (normalized === 'low match') {
    return {
      label: 'Low match',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
    };
  }
  if (normalized === 'not detected') {
    return {
      label: 'Not detected',
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icon: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
    };
  }
  if (normalized === 'not evaluated' || normalized.includes('not evaluated') || normalized.includes('job description required')) {
    return {
      label: 'Not evaluated',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      icon: <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
    };
  }

  // Fallback for custom or unassessed criteria
  return {
    label: status || 'Unassessed',
    badgeClass: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    icon: <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
  };
}

/**
 * Returns overall tier classification for the 0-100 ATS score.
 * @param {number} score 
 * @returns {object} tier information
 */
export function getATSScoreTier(score) {
  if (score >= 80) {
    return {
      label: 'ATS Friendly',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800',
      barGradient: 'from-emerald-500 to-teal-600',
      summary: 'High parsability with standard section headings and clear text layout.'
    };
  }
  if (score >= 60) {
    return {
      label: 'Moderate Parsability',
      textColor: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-transparent dark:border-amber-800',
      barGradient: 'from-amber-500 to-orange-500',
      summary: 'Acceptable formatting, but a few structural elements need improvement.'
    };
  }
  return {
    label: 'Needs Formatting Review',
    textColor: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-transparent dark:border-rose-800',
    barGradient: 'from-rose-500 to-red-600',
    summary: 'Significant formatting or structural issues may hinder automated parsers.'
  };
}

/**
 * Reusable ATSReadinessScore component.
 * Displays overall ATS readiness score and an itemized breakdown across key structural categories.
 *
 * @param {object} props
 * @param {number} [props.score=0] - ATS readiness score (0-100)
 * @param {Array} [props.categories=[]] - Category items [{ name, status, detail, earnedPoints, maxPoints }]
 * @param {string} [props.description] - Custom explanation
 * @param {Array} [props.warnings=[]] - Readability and formatting warnings
 * @param {boolean} [props.standaloneMode=false] - Whether evaluation is standalone
 */
export default function ATSReadinessScore({
  score = 0,
  categories = [],
  description,
  warnings = [],
  standaloneMode = false,
  isSample = false
}) {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(true);

  const numericScore = typeof score === 'number' && !isNaN(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, Math.round(numericScore)));

  const tier = getATSScoreTier(clampedScore);
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeWarnings = Array.isArray(warnings) ? warnings : [];

  const meetsCount = safeCategories.filter(
    (c) => (c.status || '').toLowerCase() === 'meets guideline'
  ).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between hover:shadow-md transition">
      
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">ATS Readiness Score</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {isSample
                  ? 'Format & Parsing Filter (Sample)'
                  : standaloneMode
                  ? 'Standalone Structural Evaluation'
                  : 'Format & Keyword Match Analysis'}
              </span>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-xs font-bold ${tier.badgeClass}`}>
            {tier.label}
          </span>
        </div>

        {/* Score Readout and Progress Bar */}
        <div className="my-6">
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl sm:text-5xl font-black ${tier.textColor} tracking-tight tabular-nums`}>
                {clampedScore}
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-slate-400 dark:text-slate-500 tabular-nums">/100</span>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Benchmark Target: &ge; 80/100
            </span>
          </div>

          {/* Linear Progress Bar */}
          <div
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden shadow-inner"
            role="progressbar"
            aria-valuenow={clampedScore}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`ATS readiness score: ${clampedScore} out of 100`}
          >
            <div
              className={`bg-gradient-to-r ${tier.barGradient} h-3.5 rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${clampedScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
            <span>0 (Low)</span>
            <span>60 (Moderate)</span>
            <span>80 (Passing Target)</span>
            <span>100</span>
          </div>
        </div>

        {/* Short Explanation */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {description ||
            (standaloneMode
              ? 'Evaluates resume section headings, contact details, formatting indicators, and text readability to estimate automated parsing compliance.'
              : 'Evaluates resume section headings, job keyword placement, text readability, and file structure to estimate automated screening clearance.')}
        </p>

        {/* Warnings Alert Banner (if any formatting/stuffing issues detected) */}
        {safeWarnings.length > 0 && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>Formatting & Readability Warnings ({safeWarnings.length}):</span>
            </div>
            <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-200 list-disc list-inside">
              {safeWarnings.map((warn, wIdx) => (
                <li key={wIdx} className="leading-relaxed">
                  {warn}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Categories Breakdown Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Evaluation Categories Breakdown ({safeCategories.length})
              </h3>
            </div>

            {safeCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <span>{showDetailedBreakdown ? 'Collapse' : 'Expand'}</span>
                {showDetailedBreakdown ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {safeCategories.length > 0 ? (
            showDetailedBreakdown && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                {safeCategories.map((cat, idx) => {
                  const statusConfig = getCategoryStatusConfig(cat.status);
                  const isPointsAvailable = cat.earnedPoints !== undefined && cat.maxPoints !== undefined;
                  return (
                    <div
                      key={cat.id || idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="mt-0.5">{statusConfig.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {cat.name}
                            </span>
                            {isPointsAvailable && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {cat.id === 'keywords' && !cat.available
                                  ? 'Job desc required'
                                  : `${cat.earnedPoints}/${cat.maxPoints} pts`}
                              </span>
                            )}
                          </div>
                          {cat.detail && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {cat.detail}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${statusConfig.badgeClass} self-start sm:self-center flex-shrink-0`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
              No category breakdown data available.
            </div>
          )}
        </div>
      </div>

      {/* Disclaimers & Ethics Notice */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>Important ATS Assessment Notice:</span>
          </div>
          <p className="leading-relaxed">
            This ATS readiness score is an automated estimation based on standard structural headings, contact details, and textual readability. Plain-text parsing cannot evaluate physical visual design, custom fonts, multi-column tables, margins, or proprietary commercial ATS screening filters.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>
            Guidelines met: <strong className="text-emerald-700 dark:text-emerald-400">{meetsCount} / {safeCategories.length}</strong>
          </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            {clampedScore >= 80 ? '✓ High Parsability' : clampedScore >= 60 ? '⚡ Moderate Parsability' : '⚠️ Review Recommended'}
          </span>
        </div>
      </div>

    </div>
  );
}
