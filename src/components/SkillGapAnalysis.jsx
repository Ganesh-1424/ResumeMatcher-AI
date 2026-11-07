import { CheckCircle2, AlertCircle, Sparkles, Layers, Info, Check } from 'lucide-react';

/**
 * Reusable SkillGapAnalysis component.
 * Displays matched skills and missing skill gaps with dynamic count statistics,
 * deduplication, empty state handling, and context explanations.
 *
 * @param {object} props
 * @param {string[]} [props.matchedSkills=[]] - Skills found in both resume and job description
 * @param {object} props
 * @param {string[]} [props.matchedSkills=[]] - Skills found in both resume and job description
 * @param {string[]} [props.missingSkills=[]] - Skills required by job description not detected in resume
 * @param {string[]} [props.additionalSkills=[]] - Skills detected in resume not listed in job description
 */
export default function SkillGapAnalysis({
  matchedSkills = [],
  missingSkills = [],
  additionalSkills = []
}) {
  const safeMatched = Array.isArray(matchedSkills)
    ? [...new Set(matchedSkills.filter((s) => typeof s === 'string' && s.trim().length > 0))]
    : [];

  const safeMissing = Array.isArray(missingSkills)
    ? [...new Set(missingSkills.filter((s) => typeof s === 'string' && s.trim().length > 0))]
    : [];

  const safeAdditional = Array.isArray(additionalSkills)
    ? [...new Set(additionalSkills.filter((s) => typeof s === 'string' && s.trim().length > 0))]
    : [];

  const matchedCount = safeMatched.length;
  const missingCount = safeMissing.length;
  const additionalCount = safeAdditional.length;
  const totalIdentifiedRequirements = matchedCount + missingCount;

  const coveragePercentage =
    totalIdentifiedRequirements > 0
      ? Math.round((matchedCount / totalIdentifiedRequirements) * 100)
      : 0;

  return (
    <section className="space-y-6" aria-label="Skill Gap Analysis">
      
      {/* 1. Skill Summary Metric Cards */}
      <div className="bg-slate-100/90 dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Skill Gap &amp; Requirements Summary
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 w-fit tabular-nums">
            Overall Skill Coverage: <strong className="text-blue-600 dark:text-blue-400">{coveragePercentage}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Matched */}
          <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-emerald-700 dark:text-emerald-400">
                Matched Skills
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{matchedCount}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Found in your resume</div>
          </div>

          {/* Total Missing */}
          <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-rose-700 dark:text-rose-400">
                Missing Skills
              </span>
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{missingCount}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Omitted or not detected</div>
          </div>

          {/* Total Identified Requirements */}
          <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-blue-700 dark:text-blue-400">
                Total Requirements
              </span>
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{totalIdentifiedRequirements}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Extracted from job posting</div>
          </div>
        </div>
      </div>

      {/* 2. Skills Grid (Matched vs Missing) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Matched Skills Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Matched Skills</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Present in both resume and target job</p>
                </div>
              </div>

              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {matchedCount} Matched
              </span>
            </div>

            {/* List of Matched Skills Badges */}
            <div className="pt-3">
              {matchedCount > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {safeMatched.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                  No direct skill matches detected between the resume and job description.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>These skills directly reinforce your candidacy for this role.</span>
          </div>
        </div>

        {/* Missing Skills Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Missing Skills (Skill Gaps)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Required by job but not detected in resume</p>
                </div>
              </div>

              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                {missingCount} Missing
              </span>
            </div>

            {/* List of Missing Skills Badges */}
            <div className="pt-3">
              {missingCount > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {safeMissing.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  &check; No skill gaps detected! Your resume covers all required competencies.
                </div>
              )}
            </div>
          </div>

          {/* Contextual Notice Requirement */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-300 flex items-start gap-1.5 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Note:</strong> A missing skill indicates it was not detected in the resume text. If you possess these abilities from personal projects or courses, consider adding them to your resume.
            </span>
          </div>
        </div>

      </div>

      {/* 3. Additional Candidate Skills (Detected in Resume beyond Job Description) */}
      {additionalCount > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Additional Candidate Skills</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Detected in your resume beyond the job requirements</p>
              </div>
            </div>

            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {additionalCount} Bonus Skills
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {safeAdditional.map((skill, index) => (
              <span
                key={`add-${skill}-${index}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
              >
                <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {skill}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            These bonus proficiencies give you an edge and showcase additional breadth in complementary technologies.
          </p>
        </div>
      )}

    </section>
  );
}
