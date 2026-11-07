import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Sparkles,
  LayoutDashboard,
  LogIn,
  UserPlus,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  User,
  ShieldCheck,
  Wand2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toggleTheme, isDark } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 font-semibold'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/25 group-hover:scale-[1.02] transition">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              ResumeMatch<span className="text-blue-600 dark:text-blue-400">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/analyze" className={navLinkClass}>
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Analyze Resume
            </NavLink>
            <NavLink to="/ats-checker" className={navLinkClass}>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ATS Checker
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Dashboard
            </NavLink>
            <NavLink to="/builder" className={navLinkClass}>
              <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              Resume Builder
            </NavLink>
          </nav>

          {/* Desktop Actions (Theme Toggle + Auth Buttons) */}
          <div className="hidden md:flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400 animate-fade-in" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 animate-fade-in" />
              )}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 transition cursor-pointer group"
                  title="View My Profile"
                >
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform" />
                  <span className="max-w-[140px] truncate">
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  <LogIn className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Right Controls: Theme Toggle + Menu Button */}
          <div className="md:hidden flex items-center gap-1.5">
            {/* Theme Toggle on mobile header */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            <button
              onClick={toggleMobileMenu}
              type="button"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-5 space-y-2">
          <NavLink to="/" onClick={closeMobileMenu} className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/analyze" onClick={closeMobileMenu} className={navLinkClass}>
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Analyze Resume
          </NavLink>
          <NavLink to="/ats-checker" onClick={closeMobileMenu} className={navLinkClass}>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ATS Checker
          </NavLink>
          <NavLink to="/dashboard" onClick={closeMobileMenu} className={navLinkClass}>
            <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Dashboard
          </NavLink>
          <NavLink to="/builder" onClick={closeMobileMenu} className={navLinkClass}>
            <Wand2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Resume Builder
          </NavLink>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {isAuthenticated ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                  title="View My Profile"
                >
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Signed in as: <strong className="underline underline-offset-2">{user?.name || user?.email}</strong></span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
