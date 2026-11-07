import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Shield,
  ShieldCheck,
  Key,
  Lock,
  LogOut,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Layers,
  Wand2,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, changeUserPassword } from '../services/profileService';
import { GoogleIcon } from '../components/GoogleSignInButton';

/**
 * Profile Page Component (Task 42)
 * 
 * Displays:
 * 1. Personal Information (photo/initials, full name, email, creation date, auth provider)
 * 2. Account Overview (Total resume analyses, ATS checks, builder resumes, recent activity)
 * 3. My Account Actions (edit name/avatar, change password for email accounts, logout)
 * 4. Responsive design with full dark-mode support and user isolation.
 */
export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, logout, updateUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Edit Profile Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState(null);

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState(null);

  // Logout confirmation modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [isAuthenticated, navigate]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getUserProfile();
      if (data && data.success && data.user) {
        setProfileData(data);
        setEditName(data.user.name || '');
        setEditAvatarUrl(data.user.avatarUrl || '');
        // Sync context user
        updateUser(data.user);
      } else {
        throw new Error(data?.message || 'Failed to load profile.');
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
      setLoadError(err.response?.data?.message || err.message || 'Unable to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName || editName.trim().length < 2) {
      setProfileErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    setIsUpdatingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const res = await updateUserProfile({
        name: editName.trim(),
        avatarUrl: editAvatarUrl.trim() || null
      });

      if (res && res.success && res.user) {
        setProfileData((prev) => ({
          ...prev,
          user: { ...prev.user, ...res.user }
        }));
        updateUser(res.user);
        setProfileSuccessMsg('Profile information updated successfully!');
        setIsEditingProfile(false);
        setTimeout(() => setProfileSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setProfileErrorMsg(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (profileData?.user?.hasPassword && !passwordForm.currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await changeUserPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res && res.success) {
        setPasswordSuccessMsg('Your password has been changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setProfileData((prev) => ({
          ...prev,
          user: { ...prev.user, hasPassword: true }
        }));
        setTimeout(() => setPasswordSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Change password error:', err);
      setPasswordErrorMsg(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const user = profileData?.user || authUser || {};
  const stats = profileData?.stats || { totalAnalyses: 0, totalAtsChecks: 0, totalBuilderResumes: 0 };
  const recentActivity = profileData?.recentActivity || [];

  // Initials generator for fallback avatar
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const formatActivityTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-8 sm:py-12 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <User className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>My Profile</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your personal information, credentials, and review account activity
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchProfile}
              disabled={isLoading}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Refresh profile data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/dashboard"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Global Loading State */}
        {isLoading && !profileData && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Loading your profile...
            </p>
          </div>
        )}

        {/* Global Error State */}
        {loadError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold block">Failed to load profile details</strong>
              <p className="text-xs text-rose-800 dark:text-rose-300">{loadError}</p>
              <button
                type="button"
                onClick={fetchProfile}
                className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300 underline underline-offset-2 cursor-pointer"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        {(!isLoading || profileData) && (
          <div className="space-y-8 animate-fade-in">
            
            {/* 1. PERSONAL INFORMATION CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                
                {/* Avatar & User Details */}
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || 'Profile Avatar'}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-md shadow-blue-500/20 border-2 border-white/20">
                        {getInitials(user.name || user.email)}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center" title="Active Account">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </span>
                  </div>

                  {/* Name, Email, & Metadata */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                        {user.name || 'ResumeMatch User'}
                      </h2>

                      {/* Authentication Method Badge */}
                      {user.authProvider === 'google' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <GoogleIcon className="w-3 h-3" />
                          <span>Google Account</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Email &amp; Password</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{user.email}</span>
                    </p>

                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 pt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Joined {formatDate(user.createdAt)}</span>
                    </p>
                  </div>
                </div>

                {/* Edit & Action Buttons */}
                <div className="flex items-center gap-2.5 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(!isEditingProfile);
                      setProfileErrorMsg(null);
                      setProfileSuccessMsg(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isEditingProfile ? 'Close Editor' : 'Edit Profile'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>

              {/* Inline Edit Profile Form Drawer */}
              {isEditingProfile && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                    Update Profile Information
                  </h3>
                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Avatar Image URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={editAvatarUrl}
                        onChange={(e) => setEditAvatarUrl(e.target.value)}
                        placeholder="https://example.com/my-photo.jpg"
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Provide a direct image URL or leave empty to use your personalized initials avatar.
                      </p>
                    </div>

                    {profileErrorMsg && (
                      <p className="text-xs text-rose-500 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{profileErrorMsg}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isUpdatingProfile}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingProfile ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Save Profile</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Profile Update Success Banner */}
              {profileSuccessMsg && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* 2. ACCOUNT OVERVIEW (METRICS & RECENT ACTIVITY) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Account Overview</span>
                </h2>
                <span className="text-xs text-slate-400 font-medium">Activity Statistics</span>
              </div>

              {/* 3 Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Metric 1: Resume Analyses */}
                <Link
                  to="/dashboard"
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Resume Analyses
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {stats.totalAnalyses}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      View all <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>

                {/* Metric 2: ATS Checks */}
                <Link
                  to="/ats-checker"
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      ATS Checks
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {stats.totalAtsChecks}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Run check <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>

                {/* Metric 3: Builder Resumes */}
                <Link
                  to="/builder"
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-violet-300 dark:hover:border-violet-700 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Builder Resumes
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Wand2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      {stats.totalBuilderResumes}
                    </span>
                    <span className="text-xs text-violet-600 dark:text-violet-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Open builder <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>

              </div>

              {/* Recent Activity List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Recent Activity</span>
                  </h3>
                  <span className="text-xs text-slate-400">Latest completed tasks</span>
                </div>

                {recentActivity.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            item.type === 'builder_resume'
                              ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                              : item.type === 'ats_check'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          }`}>
                            {item.type === 'builder_resume' ? (
                              <Wand2 className="w-4 h-4" />
                            ) : item.type === 'ats_check' ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span className="capitalize">{item.type.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{formatActivityTime(item.date)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {item.score !== null && item.score !== undefined && (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              item.score >= 80
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                : item.score >= 60
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                            }`}>
                              {item.score}%
                            </span>
                          )}
                          <Link
                            to={item.link}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Open item"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs sm:text-sm text-slate-400">
                      No recent activity recorded yet.
                    </p>
                    <div className="flex justify-center gap-2 pt-1">
                      <Link
                        to="/analyze"
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Analyze a Resume
                      </Link>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <Link
                        to="/builder"
                        className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        Build a Resume
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. MY ACCOUNT / SECURITY & PASSWORD */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>My Account &amp; Security</span>
                </h2>
                <span className="text-xs text-slate-400 font-medium">Authentication &amp; Credentials</span>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                
                {/* Case A: Google Authenticated Account */}
                {user.authProvider === 'google' ? (
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-2xs border border-blue-100 dark:border-blue-800">
                      <GoogleIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Google Identity Services Single Sign-On
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Your account is authenticated directly via Google OAuth 2.0 OpenID Connect. Password changes, multi-factor authentication, and credential security are securely managed by Google.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Case B: Email & Password Account - Change Password Form */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Change Password
                      </h3>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                      {user.hasPassword && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                            Current Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                            <input
                              type={showCurrentPw ? 'text' : 'password'}
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                              placeholder="••••••••"
                              className="w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPw(!showCurrentPw)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="At least 8 characters"
                            className="w-full pl-10 pr-10 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Confirm New Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            placeholder="Confirm new password"
                            className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {passwordErrorMsg && (
                        <p className="text-xs text-rose-500 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{passwordErrorMsg}</span>
                        </p>
                      )}

                      {passwordSuccessMsg && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>{passwordSuccessMsg}</span>
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5" />
                            <span>Update Password</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* Account Security Information Box */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Protected with salted bcrypt hashing and JWT token expiration.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer self-start sm:self-center"
                  >
                    Log out of account
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Sign Out
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to log out of your ResumeMatch AI account?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
