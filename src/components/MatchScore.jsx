import { Target, Info } from 'lucide-react';

/**
 * Returns descriptive category, colors, and contextual interpretation
 * based on the 0-100 score threshold guidelines:
 * - 0–39: Low match
 * - 40–69: Moderate match
 * - 70–84: Good match
 * - 85–100: Strong match
 *
 * @param {number} score
 * @returns {object} interpretation config
 */
export function getScoreInterpretation(score) {
  if (score >= 85) {
    return {
      label: 'Strong match',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800',
      strokeColor: '#10b981', // emerald-500
      barGradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      summary: 'Exceptional qualification alignment with target role requirements.'
    };
  }
  if (score >= 70) {
    return {
      label: 'Good match',
      textColor: 'text-blue-600 dark:text-blue-400',
      badgeBg: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-transparent dark:border-blue-800',
      strokeColor: '#3b82f6', // blue-500
      barGradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      summary: 'Solid qualification alignment with a few addressable skill gaps.'
    };
  }
  if (score >= 40) {
    return {
      label: 'Moderate match',
      textColor: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-transparent dark:border-amber-800',
      strokeColor: '#f59e0b', // amber-500
      barGradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      summary: 'Partial overlap; notable skill gaps exist between resume and job posting.'
    };
  }
  return {
    label: 'Low match',
    textColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-transparent dark:border-rose-800',
    strokeColor: '#f43f5e', // rose-500
    barGradient: 'from-rose-500 to-red-600',
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
    summary: 'Substantial skill gaps detected; resume requires tailoring for this role.'
  };
}

/**
 * Reusable MatchScore visualization component.
 * Features a circular SVG progress ring, prominent percentage readout,
 * linear progress bar, category interpretation, and accessibility tags.
 *
 * @param {object} props
 * @param {number} props.score - Score between 0 and 100
 * @param {string} [props.description] - Optional custom explanation
 * @param {boolean} [props.showCardWrapper=true] - Whether to render with full card styling
 */
export default function MatchScore({
  score,
  description,
  showCardWrapper = true,
  isSample = false
}) {
  const numericScore = typeof score === 'number' && !isNaN(score) ? score : 0;
  const clampedScore = Math.max(0, Math.min(100, Math.round(numericScore)));

  const interpretation = getScoreInterpretation(clampedScore);

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const content = (
    <div className="space-y-6">
      {/* Header with Title and Category Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl ${interpretation.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Overall Match Score</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {isSample ? 'Semantic Relevance (Sample)' : 'Semantic AI Relevance'}
            </span>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold ${interpretation.badgeBg} transition-colors`}>
          {interpretation.label}
        </span>
      </div>

      {/* Visual Ring and Primary Metric */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
        
        {/* Circular Progress Gauge */}
        <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
            role="progressbar"
            aria-valuenow={clampedScore}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Resume match score: ${clampedScore}%`}
          >
            {/* Background Track Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="9"
              fill="transparent"
              className="text-slate-100 dark:text-slate-800"
            />
            {/* Animated Active Score Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={interpretation.strokeColor}
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Centered Percentage Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={`text-2xl font-black ${interpretation.textColor} tracking-tight leading-none tabular-nums`}>
              {clampedScore}%
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
              Match
            </span>
          </div>
        </div>

        {/* Narrative & Linear Progress Indicator */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Similarity Progress</span>
            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 font-semibold">{clampedScore} / 100</span>
          </div>

          {/* Linear Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`bg-gradient-to-r ${interpretation.barGradient} h-3 rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${clampedScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>0% (Low)</span>
            <span>40% (Moderate)</span>
            <span>70% (Good)</span>
            <span>100% (Strong)</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
            {interpretation.summary}
          </p>
        </div>
      </div>

      {/* Description & Transparency Footnote */}
      <div className="space-y-2">
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {description ||
            'Represents the semantic relevance and qualification overlap between your resume content and the provided job description.'}
        </p>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
          *Note: These labels are only descriptive categories, not scientifically validated hiring thresholds.
        </p>
      </div>

      {/* Bottom Status Footnote */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Score calculation: Vector similarity</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">Classification: {interpretation.label}</span>
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition hover:shadow-md">
      {content}
    </div>
  );
}
