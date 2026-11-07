import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/apiErrorHandler';
import GoogleSignInButton from '../components/GoogleSignInButton';

/**
 * Signup page component connected to Express.js backend (POST /api/auth/signup and POST /api/auth/google).
 * Handles form validation, submitting credentials to MySQL via API, and redirecting to login.
 */
export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [collisionNotice, setCollisionNotice] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateField = (name, value, currentFormData = formData) => {
    let error = '';
    const trimmedVal = (value || '').trim();

    if (name === 'fullName') {
      if (!trimmedVal) {
        error = 'Full name is required.';
      } else if (trimmedVal.length < 2) {
        error = 'Full name must be at least 2 characters.';
      }
    }

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
      } else if (value.length < 8) {
        error = 'Password must be at least 8 characters long.';
      }
    }

    if (name === 'confirmPassword') {
      if (!value) {
        error = 'Please confirm your password.';
      } else if (value !== currentFormData.password) {
        error = 'Passwords do not match.';
      }
    }

    return error;
  };

  const validateForm = () => {
    const newErrors = {};

    const fullNameError = validateField('fullName', formData.fullName, formData);
    if (fullNameError) newErrors.fullName = fullNameError;

    const emailError = validateField('email', formData.email, formData);
    if (emailError) newErrors.email = emailError;

    const passwordError = validateField('password', formData.password, formData);
    if (passwordError) newErrors.password = passwordError;

    const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword, formData);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = {
      ...formData,
      [name]: value
    };

    setFormData(updatedForm);

    if (apiError) setApiError(null);
    if (successNotice) setSuccessNotice(null);

    if (touched[name]) {
      const fieldError = validateField(name, value, updatedForm);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError
      }));
    }

    if (name === 'password' && touched.confirmPassword) {
      const matchError = validateField('confirmPassword', formData.confirmPassword, updatedForm);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: matchError
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true
    }));

    const fieldError = validateField(name, value, formData);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true
    });

    if (!validateForm()) {
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setApiError(null);
    setSuccessNotice(null);

    try {
      // POST to /api/auth/signup with trimmed name, email, and password
      const result = await signup(
        formData.fullName.trim(),
        formData.email.trim(),
        formData.password
      );

      if (result.success) {
        setSuccessNotice({
          title: 'Account Created Successfully!',
          message: 'Your account has been registered in the database. Redirecting you to login...'
        });

        // Reset form
        setFormData({
          fullName: '',
          email: '',
          password: '',
          confirmPassword: ''
        });
        setTouched({});
        setErrors({});

        // Redirect after brief delay so user sees confirmation
        setTimeout(() => {
          navigate('/login', {
            state: { registeredEmail: formData.email.trim(), registrationSuccess: true }
          });
        }, 1800);
      }
    } catch (error) {
      console.error('Signup error:', error);
      const parsed = parseApiError(error, 'An unexpected error occurred during registration. Please try again.');
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
      console.error('Google signup error:', error);
      if (error.response?.data?.code === 'EMAIL_COLLISION_PASSWORD_EXISTS' || error.response?.status === 409) {
        setCollisionNotice(
          error.response?.data?.message ||
          'An account with this email address already exists using password authentication. Please sign in with your email and password instead.'
        );
      } else {
        const parsed = parseApiError(error, 'Google registration failed. Please try again.');
        setApiError(parsed.message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    setApiError(err?.message || 'Google authentication encountered an issue.');
  };

  const hasMinLength = formData.password.length >= 8;
  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white dark:bg-slate-900 p-7 sm:p-9 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-13 h-13 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-2xs border border-blue-100 dark:border-blue-900/60">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Register to save resume match reports and track your ATS optimization
          </p>
        </div>

        {/* Success Feedback Banner */}
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
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium text-xs hover:bg-emerald-700 transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Go to Login Now</span>
                </Link>
              </div>
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
                Registration Failed
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
              <div className="pt-1">
                <Link
                  to="/login"
                  className="font-bold text-amber-900 dark:text-amber-200 hover:underline inline-flex items-center gap-1"
                >
                  <span>Go to Login page</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Google One-Click Registration */}
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
              or register with email
            </span>
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4.5">
          
          {/* Full Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-fullname"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                id="signup-fullname"
                name="fullName"
                type="text"
                autoComplete="name"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                placeholder="e.g. Alex Morgan"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'signup-fullname-error' : undefined}
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-slate-800/80 transition focus:outline-none focus:bg-white dark:focus:bg-slate-800 ${
                  errors.fullName
                    ? 'border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            {errors.fullName && (
              <p
                id="signup-fullname-error"
                role="alert"
                className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-0.5 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.fullName}</span>
              </p>
            )}
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                placeholder="student@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
                className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-slate-800/80 transition focus:outline-none focus:bg-white dark:focus:bg-slate-800 ${
                  errors.email
                    ? 'border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            {errors.email && (
              <p
                id="signup-email-error"
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
            <label
              htmlFor="signup-password"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                placeholder="Minimum 8 characters"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'signup-password-error' : undefined}
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
            {errors.password ? (
              <p
                id="signup-password-error"
                role="alert"
                className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-0.5 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.password}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Must be at least 8 characters long.
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-confirmpassword"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                id="signup-confirmpassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                placeholder="Re-enter your password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? 'signup-confirmpassword-error' : undefined}
                className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border bg-slate-50/50 dark:bg-slate-800/80 transition focus:outline-none focus:bg-white dark:focus:bg-slate-800 ${
                  errors.confirmPassword
                    ? 'border-rose-400 dark:border-rose-700 text-rose-900 dark:text-rose-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none p-0.5 rounded transition cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="signup-confirmpassword-error"
                role="alert"
                className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-0.5 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{errors.confirmPassword}</span>
              </p>
            )}
          </div>

          {/* Quick Real-Time Criteria Feedback */}
          {formData.password && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block">Password Criteria:</span>
              <div className="flex items-center gap-2">
                {hasMinLength ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                )}
                <span className={hasMinLength ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                  At least 8 characters
                </span>
              </div>
              {formData.confirmPassword && (
                <div className="flex items-center gap-2">
                  {passwordsMatch ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                  )}
                  <span className={passwordsMatch ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match yet'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account in MySQL...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Link to Login */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <p>
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 transition"
            >
              <span>Sign In here</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Secure account storage &bull; Passwords hashed with bcrypt</span>
          </div>
        </div>

      </div>
    </div>
  );
}
