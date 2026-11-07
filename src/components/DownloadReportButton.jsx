import { useState } from 'react';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { downloadAnalysisReport } from '../services/analysisService';
import { generatePdfReport } from '../utils/generatePdfReport';

/**
 * Reusable DownloadReportButton component.
 * Implements Task 30: Connect the React frontend
 * - Calls GET /api/analyses/:id/report using the Axios instance and JWT auth
 * - Downloads the returned PDF using a browser Blob URL
 * - Shows loading state while generating the report
 * - Displays a helpful error message if the request fails
 * - Releases the Blob URL after download completes
 * - Responsive and compatible with dark mode
 * 
 * @param {object} props
 * @param {object} [props.analysis] - The analysis record object
 * @param {object} [props.analysisResult] - Alias for analysis object
 * @param {number|string} [props.analysisId] - Direct ID of the analysis record
 * @param {string} [props.label="Download PDF Report"] - Button text label
 * @param {string} [props.className=""] - Additional custom Tailwind CSS classes
 * @param {'primary' | 'secondary' | 'outline'} [props.variant="primary"] - Button visual style
 * @param {'sm' | 'md' | 'lg'} [props.size="md"] - Button size
 */
export default function DownloadReportButton({
  analysis,
  analysisResult,
  analysisId,
  label = 'Download PDF Report',
  className = '',
  variant = 'primary',
  size = 'md'
}) {
  const activeRecord = analysis || analysisResult;
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // Resolve target analysis ID
  const targetId =
    analysisId ||
    activeRecord?.id ||
    activeRecord?.analysisId ||
    (typeof activeRecord === 'number' ? activeRecord : null);

  const handleDownload = async () => {
    if (!activeRecord && !targetId) {
      setStatusMessage({
        type: 'error',
        text: 'Cannot generate PDF: No analysis record or ID was provided.'
      });
      return;
    }

    if (isGenerating) return;

    setIsGenerating(true);
    setStatusMessage(null);

    let blobUrl = null;

    try {
      let downloadedFileName = `analysis-report-${targetId || 'summary'}.pdf`;

      // 1. Primary path: Fetch real backend PDF report from MySQL data via API
      if (targetId) {
        const pdfBlob = await downloadAnalysisReport(targetId);

        // Ensure we received a valid Blob object
        if (!(pdfBlob instanceof Blob)) {
          throw new Error('Invalid response received from server. Expected PDF file blob.');
        }

        // Create browser Blob URL for download
        blobUrl = window.URL.createObjectURL(
          new Blob([pdfBlob], { type: 'application/pdf' })
        );

        // Trigger safe programmatic browser download
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.setAttribute('download', downloadedFileName);
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

      } else {
        // 2. Fallback path for demonstration / sample preview mode
        downloadedFileName = await generatePdfReport(activeRecord);
      }

      setStatusMessage({
        type: 'success',
        text: `Downloaded ${downloadedFileName}`
      });

      // Automatically clear success message after 4 seconds
      setTimeout(() => {
        setStatusMessage((current) => (current?.type === 'success' ? null : current));
      }, 4000);

    } catch (err) {
      console.error('Failed to generate or download PDF report:', err);

      let userError = 'Failed to generate PDF report. Please try again.';

      // Extract specific server error if returned inside response Blob
      if (err?.response?.data instanceof Blob) {
        try {
          const rawText = await err.response.data.text();
          const parsed = JSON.parse(rawText);
          userError = parsed.message || parsed.error || userError;
        } catch (_) {
          userError = `Server returned error (${err.response.status}).`;
        }
      } else if (err?.response?.data?.message) {
        userError = err.response.data.message;
      } else if (err?.response?.status === 404) {
        userError = 'Analysis report not found or does not belong to your account.';
      } else if (err?.response?.status === 401) {
        userError = 'Your session has expired. Please log in to download reports.';
      } else if (err?.message) {
        userError = err.message;
      }

      setStatusMessage({
        type: 'error',
        text: userError
      });

    } finally {
      // Release Blob URL object after download to avoid browser memory leaks
      if (blobUrl) {
        setTimeout(() => {
          try {
            window.URL.revokeObjectURL(blobUrl);
          } catch (_) {}
        }, 1500);
      }

      setIsGenerating(false);
    }
  };

  // Variant styling configs (dark-mode compatible)
  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow active:scale-[0.98] focus:ring-blue-500',
    secondary:
      'bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-sm active:scale-[0.98] focus:ring-slate-400',
    outline:
      'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs active:scale-[0.98] focus:ring-slate-400'
  };

  // Size styling configs
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-xs sm:text-sm font-semibold gap-2 rounded-xl',
    lg: 'px-5 py-2.5 text-sm sm:text-base font-bold gap-2.5 rounded-xl'
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isGenerating || (!activeRecord && !targetId)}
        aria-label={label}
        className={`inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
          variantStyles[variant] || variantStyles.primary
        } ${sizeStyles[size] || sizeStyles.md} ${className}`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" />
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4 text-current flex-shrink-0" />
            <span>{label}</span>
          </>
        )}
      </button>

      {/* Status Notice / Error Tooltip */}
      {statusMessage && (
        <div
          role="status"
          className={`flex items-center gap-1.5 text-[11px] font-medium animate-fadeIn pt-0.5 ${
            statusMessage.type === 'error'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span className="truncate max-w-xs">{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
