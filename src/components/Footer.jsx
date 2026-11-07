import { Link } from 'react-router-dom';
import { Sparkles, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 border-t border-slate-800 dark:border-slate-800/80 mt-auto transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">ResumeMatch AI</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              Intelligent career intelligence platform for resume parsing, job description matching, ATS compatibility scoring, and skill gap identification.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-blue-400 border border-slate-700 font-medium">React + Vite</span>
              <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-indigo-400 border border-slate-700 font-medium">Node.js / Express</span>
              <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-emerald-400 border border-slate-700 font-medium">MySQL</span>
              <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-purple-400 border border-slate-700 font-medium">Tailwind CSS</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition">Home</Link>
              </li>
              <li>
                <Link to="/analyze" className="hover:text-white transition">Analyze Resume</Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition">Dashboard</Link>
              </li>
            </ul>
          </div>

          {/* Account & Auth */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">User Access</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-white transition">Login</Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-white transition">Sign Up</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {currentYear} ResumeMatch AI. Intelligent career analytics &amp; ATS optimization.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Secure Full-Stack Architecture
          </p>
        </div>
      </div>
    </footer>
  );
}
