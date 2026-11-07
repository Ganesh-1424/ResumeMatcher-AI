import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Loader2,
  Key,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

/**
 * Official Google 4-color SVG logo
 */
export function GoogleIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.58H1.25a11.98 11.98 0 0 0 0 10.84l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
}

const isPlaceholder = (id) => {
  if (!id || typeof id !== 'string') return true;
  const lower = id.toLowerCase().trim();
  return (
    lower === 'your_google_client_id_here.apps.googleusercontent.com' ||
    lower === 'your_google_client_id.apps.googleusercontent.com' ||
    lower.startsWith('your_') ||
    lower.includes('placeholder')
  );
};

/**
 * GoogleSignInButton Component
 * 
 * Embeds Google Identity Services (GIS) with OpenID Connect for real Google sign-in.
 * 
 * - When configured with a real Google Client ID, renders Google's official GIS button.
 * - When clicked, launches Google's genuine account chooser popup.
 * - If not yet configured, provides an interactive setup dialog with step-by-step
 *   instructions and instant Client ID connection.
 */
export default function GoogleSignInButton({
  onSuccess,
  onError,
  isLoading = false,
  label = 'Continue with Google',
  disabled = false
}) {
  const [gisLoaded, setGisLoaded] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customClientId, setCustomClientId] = useState(() => {
    try {
      return localStorage.getItem('VITE_GOOGLE_CLIENT_ID') || '';
    } catch {
      return '';
    }
  });
  const [inputVal, setInputVal] = useState('');
  const [configError, setConfigError] = useState(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState(false);
  const googleBtnContainerRef = useRef(null);

  // Resolve active Google Client ID
  const envClientId = typeof import.meta.env.VITE_GOOGLE_CLIENT_ID === 'string'
    ? import.meta.env.VITE_GOOGLE_CLIENT_ID.trim()
    : '';

  const activeClientId = (!isPlaceholder(customClientId) ? customClientId.trim() : null)
    || (!isPlaceholder(envClientId) ? envClientId : '');

  const isConfigured = Boolean(activeClientId && !isPlaceholder(activeClientId));

  // Current origin for Authorized JavaScript Origins
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Load Google Identity Services script
  useEffect(() => {
    const checkGsi = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        setGisLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGsi()) return;

    let script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => setGisLoaded(true));

    const interval = setInterval(() => {
      if (checkGsi()) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Initialize GIS and render official button when configured
  const renderGoogleButton = useCallback(() => {
    if (!gisLoaded || !isConfigured || !window.google?.accounts?.id || !googleBtnContainerRef.current) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: activeClientId,
        callback: (response) => {
          if (response?.credential) {
            onSuccess(response.credential, activeClientId);
          } else {
            if (onError) onError(new Error('No Google credential returned from Google Identity Services.'));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      googleBtnContainerRef.current.innerHTML = '';
      const isDark = document.documentElement.classList.contains('dark');
      const containerWidth = Math.min(400, Math.max(260, googleBtnContainerRef.current.offsetWidth || 380));

      window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
        type: 'standard',
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: containerWidth,
      });

      // Optional: prompt One Tap if available
      try {
        window.google.accounts.id.prompt();
      } catch (_) {}

    } catch (err) {
      console.warn('[GoogleSignInButton] GIS initialization notice:', err);
    }
  }, [gisLoaded, isConfigured, activeClientId, onSuccess, onError]);

  useEffect(() => {
    renderGoogleButton();
  }, [renderGoogleButton]);

  const handleOpenSetup = () => {
    setInputVal(activeClientId || '');
    setConfigError(null);
    setShowConfigModal(true);
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    const clean = (inputVal || '').trim();

    if (!clean) {
      setConfigError('Please enter your Google OAuth Client ID.');
      return;
    }

    if (!clean.includes('.apps.googleusercontent.com') && !clean.includes('googleusercontent')) {
      setConfigError('Invalid format. A Google Client ID typically ends with ".apps.googleusercontent.com".');
      return;
    }

    try {
      localStorage.setItem('VITE_GOOGLE_CLIENT_ID', clean);
      setCustomClientId(clean);
      setShowConfigModal(false);
      setConfigError(null);
    } catch (err) {
      console.error('Failed to store client ID:', err);
    }
  };

  const handleResetClientId = () => {
    try {
      localStorage.removeItem('VITE_GOOGLE_CLIENT_ID');
      setCustomClientId('');
      setInputVal('');
      setShowConfigModal(false);
    } catch (_) {}
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'origin') {
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    } else {
      setCopiedLocal(true);
      setTimeout(() => setCopiedLocal(false), 2000);
    }
  };

  return (
    <div className="w-full space-y-2">
      {/* If Google Client ID is configured, render official GIS button */}
      {isConfigured ? (
        <div className="space-y-1.5">
          <div className="flex justify-center w-full min-h-[44px]">
            <div ref={googleBtnContainerRef} className="w-full flex justify-center" />
          </div>

          {/* Discreet configuration gear link */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleOpenSetup}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3 h-3" />
              <span>OAuth Client: {activeClientId.slice(0, 14)}...</span>
            </button>
          </div>
        </div>
      ) : (
        /* Actionable Google Sign-In button that guides user through one-time configuration */
        <button
          type="button"
          onClick={handleOpenSetup}
          disabled={disabled || isLoading}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-3 transition shadow-xs active:scale-[0.99] cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <GoogleIcon className="w-4.5 h-4.5" />
              <span>{label}</span>
            </>
          )}
        </button>
      )}

      {/* Google OAuth Setup & Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Google Identity Services Setup
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    One-time Google Cloud OAuth 2.0 configuration
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>3 Simple Steps in Google Cloud Console:</span>
              </div>

              <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                <li>
                  Open{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Google Cloud Credentials <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  and click <strong>Create Credentials → OAuth Client ID</strong>.
                </li>
                <li>
                  Select Application type: <strong>Web application</strong>.
                </li>
                <li>
                  Under <strong>Authorized JavaScript origins</strong>, add your active URLs:
                  
                  {/* Origin 1: Current Application URL */}
                  <div className="mt-1.5 flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    <span className="truncate">{currentOrigin}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentOrigin, 'origin')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition text-[10px] cursor-pointer flex-shrink-0"
                    >
                      {copiedOrigin ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOrigin ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Origin 2: Localhost */}
                  <div className="mt-1 flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    <span>http://localhost:3000</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('http://localhost:3000', 'local')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition text-[10px] cursor-pointer flex-shrink-0"
                    >
                      {copiedLocal ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedLocal ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </li>
              </ol>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSaveClientId} className="space-y-3">
              <div>
                <label
                  htmlFor="google-client-id-input"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Your Google Client ID:
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="google-client-id-input"
                    type="text"
                    value={inputVal}
                    onChange={(e) => {
                      setInputVal(e.target.value);
                      if (configError) setConfigError(null);
                    }}
                    placeholder="123456789-abcdefg.apps.googleusercontent.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                {configError && (
                  <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{configError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                {customClientId ? (
                  <button
                    type="button"
                    onClick={handleResetClientId}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Reset to default
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Also set <code className="font-mono text-slate-600 dark:text-slate-300">VITE_GOOGLE_CLIENT_ID</code> in <code className="font-mono">.env</code>
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Connect &amp; Sign In</span>
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
