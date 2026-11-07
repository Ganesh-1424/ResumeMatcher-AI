import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogIn,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/apiErrorHandler';
import GoogleSignInButton from '../components/GoogleSignInButton';

/**
 * Login page component connected to Express.js backend (POST /api/auth/login and POST /api/auth/google).
 * Authenticates user credentials, stores JWT token & user details in localStorage,
 * and redirects to the Dashboard upon success.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();

  // If redirected from Signup with state
  const registeredEmail = location.state?.registeredEmail || '';
  const fromRegistration = location.state?.registrationSuccess || false;

  const [formData, setFormData] = useState({
    email: registeredEmail,
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [collisionNotice, setCollisionNotice] = useState(null);
  const [successNotice, setSuccessNotice] = useState(
    fromRegistration
      ? {
          title: 'Registration Complete!',
          message: 'Your account was created successfully in MySQL. Please enter your password to log in.'
        }
      : null
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = (name, value) => {
    let error = '';
    const trimmedVal = (value || '').trim();

    if (name === 'email') {
      if (!trimmedVal) {
        error = 'Email address is required.';
      } else if (!emailRegex.test(trimmedVal)) {
        error = 'Please enter a valid email address (e.g., alex@example.com).';
      }
    }

    if (name === 'password') {
      if (!value) {
        error = 'Password is required.';
      }
    }

    return error;
  };

  const validateForm = () => {
    const newErrors = {};

    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validateField('password', formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (apiError) setApiError(null);
    if (successNotice && !fromRegistration) setSuccessNotice(null);

    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true
    }));

    const fieldError = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      email: true,
      password: true
    });

    if (!validateForm()) {
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setApiError(null);

    try {
      // POST /api/auth/login with email and password
      const result = await login(formData.email.trim(), formData.password);

      if (result.success) {
        setSuccessNotice({
          title: 'Login Successful!',
          message: `Welcome back, ${result.user?.name || 'User'}! Redirecting to Dashboard...`
        });

        // Redirect to Dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      const parsed = parseApiError(error, 'Invalid email or password. Please try again.');
      setApiError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential, activeClientId = null) => {
    setIsGoogleLoading(true);
    setApiError(null);
    setCollisionNotice(null);

    try {
      const result = await loginWithGoogle(credential, activeClientId);
      if (result.success) {
        setSuccessNotice({
          title: 'Google Sign-In Successful!',
          message: `Welcome, ${result.user?.name || 'User'}! Redirecting to Dashboard...`
        });

        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error.response?.data?.code === 'EMAIL_COLLISION_PASSWORD_EXISTS' || error.response?.status === 409) {
        setCollisionNotice(
          error.response?.data?.message ||
          'An account with this email address already exists using password authentication. Please sign in with your email and password below.'
        );
      } else {
        const parsed = parseApiError(error, 'Google sign-in failed. Please try again.');
        setApiError(parsed.message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    setApiError(err?.message || 'Google authentication encountered an issue.');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white dark:bg-slate-900 p-7 sm:p-9 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-13 h-13 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-blue-100 dark:border-blue-900/60">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign In to Your Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Access your saved resume analysis reports and ATS score history
          </p>
        </div>

        {/* Success Notice Banner */}
        {successNotice && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-3 animate-fade-in"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-emerald-950 dark:text-white block">
                {successNotice.title}
              </strong>
              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {successNotice.message}
              </p>
            </div>
          </div>
        )}

        {/* Backend API Error Banner */}
        {apiError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-start gap-3 animate-fade-in"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-rose-950 dark:text-white block">
                Sign In Failed
              </strong>
              <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                {apiError}
              </p>
            </div>
          </div>
        )}

        {/* Account Collision Warning Banner */}
        {collisionNotice && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 animate-fade-in"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-amber-950 dark:text-white block">
                Existing Password Account
              </strong>
              <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                {collisionNotice}
              </p>
            </div>
          </div>
        )}

        {/* Google Authentication */}
        <div className="space-y-4">
          <GoogleSignInButton
            label="Continue with Google"
            isLoading={isGoogleLoading}
            disabled={isLoading || isGoogleLoading}
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />

          <div className="relative flex items-center justify-center pt-1">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold whitespace-nowrap">
              or continue with email
            </span>
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4.5">
          
          {/* Email Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                placeholder="student@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-slate-800/80 transition focus:outline-none focus:bg-white dark:focus:bg-slate-800 ${
                  errors.email
                    ? 'border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            {errors.email && (
              <p
                id="login-email-error"
                role="alert"
                className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-0.5 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
              >
                Password <span className="text-rose-500">*</span>
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                placeholder="Enter your account password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-slate-800/80 transition focus:outline-none focus:bg-white dark:focus:bg-slate-800 ${
                  errors.password
                    ? 'border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-0.5 rounded transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="login-password-error"
                role="alert"
                className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-0.5 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials with MySQL...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Link to Signup */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <p>
            Don&apos;t have an account yet?{' '}
            <Link
              to="/signup"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 transition"
            >
              <span>Create an account</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Secure JWT authentication &bull; Express + MySQL</span>
          </div>
        </div>

      </div>
    </div>
  );
}
