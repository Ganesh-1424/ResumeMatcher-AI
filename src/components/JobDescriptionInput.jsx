import { useRef } from 'react';
import { FileText, Briefcase, Trash2, AlertCircle, Paperclip } from 'lucide-react';

/**
 * Maximum character limit for the job description textarea
 */
export const MAX_DESCRIPTION_LENGTH = 10000;

/**
 * JobDescriptionInput component allows users to input the target job description
 * with real-time character count and validation.
 * Textarea is 100% native: supports standard Ctrl + V on Windows / Cmd + V on macOS,
 * right-click -> Paste, selection, cut (Ctrl + X), copy (Ctrl + C), and normal typing.
 * No custom paste button or synthetic clipboard intercepts.
 */
export default function JobDescriptionInput({
  jobTitle = '',
  onJobTitleChange,
  jobDescription = '',
  onJobDescriptionChange,
  onClear,
  attachedResumeName,
  errorMessage,
  disabled = false,
  showTitle = false
}) {
  const textareaRef = useRef(null);
  const currentLength = (jobDescription || '').length;
  const isNearLimit = currentLength > MAX_DESCRIPTION_LENGTH * 0.9;

  /**
   * Standard controlled text change handler.
   * Handles both normal typing and native browser paste (Ctrl + V, right-click -> Paste).
   * Gracefully truncates to MAX_DESCRIPTION_LENGTH (10,000 chars) so large pastes
   * insert smoothly up to the limit without being rejected or dropped by the browser.
   */
  const handleTextChange = (e) => {
    const rawVal = e.target.value ?? '';
    const boundedVal = rawVal.length > MAX_DESCRIPTION_LENGTH ? rawVal.slice(0, MAX_DESCRIPTION_LENGTH) : rawVal;
    if (typeof onJobDescriptionChange === 'function') {
      onJobDescriptionChange(boundedVal);
    }
  };

  return (
    <div className="space-y-4">
      {/* Attached Resume Indicator */}
      {attachedResumeName ? (
        <div className="flex items-center gap-2.5 p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-800 dark:text-blue-300 transition-colors">
          <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="font-medium text-slate-600 dark:text-slate-400">Attached Resume:</span>
          <span className="font-semibold text-blue-900 dark:text-blue-200 truncate">{attachedResumeName}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 transition-colors">
          <Paperclip className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span>No resume attached yet (upload in Step 1 above)</span>
        </div>
      )}

      {/* Optional Embedded Job Title (when showTitle is true) */}
      {showTitle && (
        <div>
          <label
            htmlFor="job-title-input"
            className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1.5"
          >
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Target Job Title <span className="text-slate-400 dark:text-slate-500 normal-case font-normal">(Optional)</span>
            </span>
          </label>
          <input
            id="job-title-input"
            type="text"
            value={jobTitle}
            onChange={(e) => onJobTitleChange && onJobTitleChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g. Full Stack Developer, Data Analyst, Software Engineer"
            className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {/* Job Description Textarea Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="job-description-input"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Job Requirements &amp; Description <span className="text-rose-500">*</span>
          </label>

          {/* Action Button: Clear (when text exists) */}
          {jobDescription ? (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium flex items-center gap-1.5 transition px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              title="Clear job description"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          ) : null}
        </div>

        {/* Textarea: Native input and paste support (Ctrl + V, right-click -> Paste, selection, cut, typing) */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="job-description-input"
            name="jobDescription"
            rows={8}
            value={jobDescription || ''}
            onChange={handleTextChange}
            disabled={disabled}
            spellCheck="true"
            autoComplete="off"
            placeholder="Paste the full job description here (up to 10,000 characters), including responsibilities, required qualifications, technical skills, and tools (e.g., React, Node.js, Express, MySQL)..."
            className={`w-full p-4 text-sm bg-white dark:bg-slate-900 rounded-xl border focus:outline-none focus:ring-2 transition resize-y min-h-[200px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
              errorMessage
                ? 'border-rose-300 dark:border-rose-900/60 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
                : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        </div>

        {/* Bottom Bar: Validation Error / Helper Text & Character Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
          {errorMessage ? (
            <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500">
              Paste complete job requirements, qualifications, and tech stack (supports up to 10,000 characters).
            </div>
          )}

          {/* Working Character Counter formatted e.g. 250 / 10,000 characters */}
          <div
            className={`text-xs text-right font-mono tabular-nums transition-colors ${
              isNearLimit ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {currentLength.toLocaleString()} / {MAX_DESCRIPTION_LENGTH.toLocaleString()} characters
          </div>
        </div>
      </div>
    </div>
  );
}
