import { useState } from 'react';
import {
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileEdit,
  SlidersHorizontal,
  BookmarkCheck,
  Check
} from 'lucide-react';

/**
 * Returns priority badge colors for high, medium, and low impact suggestions.
 * @param {string} priority
 * @returns {object} badge class and label
 */
export function getPriorityBadge(priority) {
  const norm = (priority || '').toLowerCase();
  if (norm === 'high') {
    return {
      label: 'High Priority',
      badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    };
  }
  if (norm === 'medium') {
    return {
      label: 'Medium Priority',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    };
  }
  return {
    label: 'Refinement',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  };
}

/**
 * Reusable ImprovementSuggestions component.
 * Displays prioritized, actionable recommendations to improve resume relevance
 * and presentation based on resume-job match findings.
 *
 * @param {object} props
 * @param {Array} [props.suggestions=[]] - List of suggestion objects [{ id, title, category, priority, description, action }]
 * @param {string[]} [props.matchedSkills=[]] - Optional matched skills context
 * @param {string[]} [props.missingSkills=[]] - Optional missing skills context
 */
export default function ImprovementSuggestions({
  suggestions = [],
  matchedSkills = [],
  missingSkills = []
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

  const categories = [
    'All',
    ...new Set(safeSuggestions.map((s) => s.category).filter(Boolean))
  ];

  const filteredSuggestions =
    selectedCategory === 'All'
      ? safeSuggestions
      : safeSuggestions.filter((s) => s.category === selectedCategory);

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors" aria-label="Resume Improvement Suggestions">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Actionable Resume Improvement Suggestions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Practical recommendations to optimize your experience, keyword density, and section layout.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 text-xs font-semibold rounded-full w-fit border border-transparent dark:border-purple-800">
          AI Recommendations
        </span>
      </div>

      {/* Skills Context Notice Banner */}
      {(matchedSkills.length > 0 || missingSkills.length > 0) && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Analysis Context for Engineering Applications:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] sm:text-xs">
            {matchedSkills.length > 0 && (
              <div className="flex items-start gap-1.5">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Highlight Strengths:</strong> Your resume demonstrates confirmed alignment in{' '}
                  <strong className="text-slate-900 dark:text-white">{matchedSkills.slice(0, 3).join(', ')}</strong>. Emphasize these in top projects.
                </span>
              </div>
            )}
            {missingSkills.length > 0 && (
              <div className="flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Review Omissions:</strong> The employer expects{' '}
                  <strong className="text-slate-900 dark:text-white">{missingSkills.slice(0, 3).join(', ')}</strong>. If you have coursework in these, add them to your text.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Filter Tabs */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-medium mr-1 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Suggestions Cards Grid */}
      {filteredSuggestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSuggestions.map((item, index) => {
            const priorityBadge = getPriorityBadge(item.priority);
            const titleText = item.title || item.issue || 'Optimization Area';
            const descText = item.description || item.explanation || item.recommendation || '';
            const actionText = item.action || (item.title ? item.action : item.recommendation) || null;
            const uniqueKey = item.id || `sugg-${item.category}-${index}`;

            return (
              <div
                key={uniqueKey}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-sm transition group flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-2">
                  {/* Category and Priority Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      {item.category}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityBadge.badgeClass}`}
                    >
                      {priorityBadge.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-950 dark:group-hover:text-purple-300 transition">
                    {titleText}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {descText}
                  </p>
                </div>

                {/* Practical Action Box */}
                {actionText && (
                  <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-100/80 dark:border-purple-900/50 text-xs text-purple-950 dark:text-purple-200 flex items-start gap-2">
                    <BookmarkCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-purple-900 dark:text-purple-300 font-semibold">Practical Recommendation: </strong>
                      <span>{actionText}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Specific Improvement Suggestions Needed
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Your resume content satisfies all key guidelines for this category. Ready for submission.
          </p>
        </div>
      )}

      {/* AI Pipeline Reference Footer */}
      <div className="pt-2 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>Structure: Tailored candidate recommendations</span>
        <span>Generated from resume content and job alignment analysis</span>
      </div>

    </section>
  );
}
