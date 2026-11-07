import { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileType,
  FileCheck
} from 'lucide-react';

/**
 * Maximum allowed file size in bytes: 5 MB
 * (5 * 1024 * 1024 = 5,242,880 bytes)
 */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Format file size into human-readable format (KB or MB).
 * @param {number} bytes 
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Determine document type label based on file name or MIME type.
 * @param {File} file 
 * @returns {string} 'PDF Document' | 'DOCX Document' | 'Document'
 */
export function getDocumentType(file) {
  if (!file) return '';
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'pdf' || file.type === 'application/pdf') {
    return 'PDF Document';
  }
  if (
    extension === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'DOCX Document';
  }
  return 'Document';
}

/**
 * ResumeUpload component handles PDF and DOCX file selection,
 * drag-and-drop interactions, and file size/type validation.
 */
export default function ResumeUpload({ selectedFile, onFileSelect, onFileRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  /**
   * Validates the uploaded file for supported extensions and size limits.
   * @param {File} file
   * @returns {boolean} True if valid, false otherwise
   */
  const validateFile = (file) => {
    if (!file) {
      setErrorMessage('Please select a file.');
      return false;
    }

    // 1. File Type Validation (.pdf or .docx)
    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isDocx =
      fileName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isPdf && !isDocx) {
      setErrorMessage('Invalid file format. Please upload a PDF (.pdf) or Word document (.docx).');
      return false;
    }

    // 2. File Size Validation (Max 5 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File size (${formatFileSize(file.size)}) exceeds the maximum limit of 5 MB. Please choose a smaller file.`
      );
      return false;
    }

    setErrorMessage('');
    return true;
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (validateFile(file)) {
        onFileSelect(file);
      } else {
        onFileRemove();
      }
    }
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const file = droppedFiles[0];
      if (validateFile(file)) {
        onFileSelect(file);
      } else {
        onFileRemove();
      }
    }
  };

  const openFileBrowser = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = () => {
    setErrorMessage('');
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Hidden file input supporting PDF and DOCX only */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        id="resume-file-input"
        aria-label="Upload resume in PDF or DOCX format"
      />

      {/* Validation Error Message Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs sm:text-sm animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Validation Error: </span>
            {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-bold px-1"
            title="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* When NO file is selected: Display Dropzone Area */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileBrowser}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFileBrowser();
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 dark:border-blue-400 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/80 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              isDragging
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
            }`}
          >
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
            {isDragging ? 'Drop your resume file here' : 'Drag & drop your resume here'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            Supports <strong className="text-slate-700 dark:text-slate-200">PDF (.pdf)</strong> and{' '}
            <strong className="text-slate-700 dark:text-slate-200">Word (.docx)</strong> files up to{' '}
            <strong className="text-slate-700 dark:text-slate-200">5 MB</strong>.
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openFileBrowser();
            }}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Browse from Computer
          </button>
        </div>
      ) : (
        /* When a VALID file is selected: Display File Details Card */
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-sm bg-gradient-to-b from-emerald-50/20 to-white dark:from-emerald-950/20 dark:to-slate-900 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* File Info */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded-md border border-transparent dark:border-blue-800/60">
                    {getDocumentType(selectedFile)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>Size: <strong className="text-slate-700 dark:text-slate-200">{formatFileSize(selectedFile.size)}</strong></span>
                  <span>&bull;</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Valid &amp; Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Remove and Change */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={openFileBrowser}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                Change File
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-white dark:hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                title="Remove selected file"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
