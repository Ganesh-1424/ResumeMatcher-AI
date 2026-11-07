import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Search,
  ArrowUpDown,
  Calendar,
  BarChart3,
  Target,
  ArrowRight,
  Plus,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Layers,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { getScoreInterpretation } from '../components/MatchScore';
import DownloadReportButton from '../components/DownloadReportButton';
import { getJobAnalyses, getDashboardStatistics } from '../services/analysisService';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/apiErrorHandler';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  // Statistics State
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    averageMatchScore: null,
    averageAtsScore: null,
    analysesLast30Days: 0,
    recentAnalysis: null,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // History State
  const [analyses, setAnalyses] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('desc'); // 'desc' | 'asc'
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search query input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Dashboard Statistics (GET /api/analyses/dashboard/stats)
  const fetchStats = useCallback(async () => {
    if (!token) {
      setIsStatsLoading(false);
      return;
    }

    setIsStatsLoading(true);
    setStatsError(null);

    try {
      const res = await getDashboardStatistics();
      if (res && res.success) {
        setStats({
          totalAnalyses: Number(res.totalAnalyses ?? res.stats?.totalAnalyses ?? 0),
          averageMatchScore: res.averageMatchScore ?? res.stats?.averageMatchScore ?? null,
          averageAtsScore: res.averageAtsScore ?? res.stats?.averageAtsScore ?? null,
          analysesLast30Days: Number(res.analysesLast30Days ?? res.stats?.analysesLast30Days ?? 0),
          recentAnalysis: res.recentAnalysis ?? res.stats?.recentAnalysis ?? null,
        });
      }
    } catch (err) {
      console.warn('Dashboard stats fetch error:', err.message);
      const parsed = parseApiError(err, 'Unable to load summary statistics.');
      setStatsError(parsed.message);
    } finally {
      setIsStatsLoading(false);
    }
  }, [token]);

  // Fetch Paginated Analysis History (GET /api/analyses?page=...&limit=...&search=...&sort=...)
  const fetchHistory = useCallback(async () => {
    if (!token) {
      setIsHistoryLoading(false);
      return;
    }

    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await getJobAnalyses({
        page: currentPage,
        limit: 10,
        search: debouncedSearch,
        sort: sortBy,
      });

      if (res && Array.isArray(res.analyses)) {
        setAnalyses(res.analyses);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Dashboard history fetch error:', err.message);
      const parsed = parseApiError(err, 'Unable to load analysis history from server.');
      setHistoryError(parsed.message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, currentPage, debouncedSearch, sortBy]);

  // Initial and reactive data fetching
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchHistory();
  };

  // Optional client-side score bracket filter on the current page records
  const filteredAnalyses = useMemo(() => {
    if (scoreFilter === 'ALL') return analyses;
    return analyses.filter((item) => {
      const score = item.matchScore !== null && item.matchScore !== undefined ? item.matchScore : 0;
      if (scoreFilter === 'STRONG') return score >= 85;
      if (scoreFilter === 'GOOD') return score >= 70 && score < 85;
      if (scoreFilter === 'MODERATE') return score >= 40 && score < 70;
      if (scoreFilter === 'LOW') return score < 40;
      return true;
    });
  }, [analyses, scoreFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Page Header and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 mb-2">
            <span>AI Resume &amp; Job Matcher</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Resume Analysis Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-0.5">
            Monitor real-time job compatibility, observe ATS readiness trends, and review verified evaluations.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isStatsLoading || isHistoryLoading || !token}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs disabled:opacity-50 cursor-pointer"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isStatsLoading || isHistoryLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Analyze New Resume
          </Link>
        </div>
      </div>

      {/* 1. Summary Cards Grid (Live Data from GET /api/analyses/dashboard/stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Analyses */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Analyses Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {isStatsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            ) : (
              stats.totalAnalyses
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.totalAnalyses > 0
              ? `${stats.analysesLast30Days} scan${stats.analysesLast30Days === 1 ? '' : 's'} in last 30 days`
              : 'No resume analyses yet'}
          </p>
        </div>

        {/* Card 2: Average Match Score */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Average Match
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {isStatsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            ) : stats.averageMatchScore !== null ? (
              `${stats.averageMatchScore}%`
            ) : (
              '--'
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.averageMatchScore !== null
              ? 'Completed semantic matches'
              : 'Awaiting match calculations'}
          </p>
        </div>

        {/* Card 3: Average ATS Readiness Score */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Average ATS Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {isStatsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            ) : stats.averageAtsScore !== null ? (
              `${stats.averageAtsScore}/100`
            ) : (
              '--'
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.averageAtsScore !== null
              ? 'Parser compliance average'
              : 'Awaiting ATS evaluations'}
          </p>
        </div>

        {/* Card 4: Most Recent Scan */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recent Target Role
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate" title={stats.recentAnalysis?.jobTitle || 'No scans yet'}>
            {isStatsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            ) : stats.recentAnalysis ? (
              stats.recentAnalysis.jobTitle
            ) : (
              'None'
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {stats.recentAnalysis
              ? `${stats.recentAnalysis.matchScore !== null ? stats.recentAnalysis.matchScore + '% Match' : 'Analysis saved'}`
              : 'Ready for initial scan'}
          </p>
        </div>

      </div>

      {/* 2. Search, Filter, and Sorting Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 transition-colors">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box (Server-side via debounced query) */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search analyses by job title (e.g. Software Engineer, React, Full Stack)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Sort Order Selector (Server-side sort) */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>

            {/* Score Range Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Score:</span>
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <option value="ALL">All Scores</option>
                <option value="STRONG">Strong Match (&ge; 85%)</option>
                <option value="GOOD">Good Match (70–84%)</option>
                <option value="MODERATE">Moderate Match (40–69%)</option>
                <option value="LOW">Low Match (&lt; 40%)</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {(searchQuery || scoreFilter !== 'ALL' || sortBy !== 'desc') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setScoreFilter('ALL');
                  setSortBy('desc');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 3. Analysis History List / Responsive Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        
        {/* Table Header / Title */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Saved Resume Scans
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {pagination.total > 0
                ? `Showing page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total recorded analyses)`
                : 'No saved analyses'}
            </p>
          </div>

          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified User History
          </span>
        </div>

        {/* History Records Content */}
        {isHistoryLoading ? (
          <div className="p-12 sm:p-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Loading Your Analysis Records...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fetching your saved job matches and ATS evaluations from the database.
            </p>
          </div>
        ) : historyError ? (
          <div className="p-8 sm:p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200">
              Unable to Load Analyses
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-300 max-w-md mx-auto">
              {historyError}
            </p>
            <button
              type="button"
              onClick={fetchHistory}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredAnalyses.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAnalyses.map((item) => {
              const hasMatchScore = typeof item.matchScore === 'number';
              const interpretation = hasMatchScore ? getScoreInterpretation(item.matchScore) : null;
              const dateString = item.createdAt
                ? new Date(item.createdAt).toISOString().split('T')[0]
                : 'Recent';

              return (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Job Title & Metadata */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {item.jobTitle}
                      </h3>
                      {hasMatchScore && interpretation && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${interpretation.badgeBg}`}
                        >
                          {item.matchScore}% Match &bull; {interpretation.label}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Scan #{item.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {dateString}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {item.resumeFilename}
                      </span>
                      {typeof item.atsScore === 'number' && (
                        <>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ATS Score: <strong>{item.atsScore}/100</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center flex-shrink-0">
                    <DownloadReportButton
                      analysis={{
                        id: item.id,
                        jobTitle: item.jobTitle,
                        resumeFileName: item.resumeFilename,
                        matchScore: typeof item.matchScore === 'number' ? item.matchScore : 0,
                        atsScore: typeof item.atsScore === 'number' ? item.atsScore : 0,
                        date: dateString,
                      }}
                      analysisId={item.id}
                      label="PDF"
                      variant="outline"
                      size="sm"
                    />

                    <Link
                      to={`/results?id=${item.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition shadow-2xs"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State Display */
          <div className="p-12 sm:p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
              <LayoutDashboard className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                {analyses.length === 0
                  ? 'No Resume Analyses Found'
                  : 'No Matches for Current Score Filter'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {analyses.length === 0
                  ? searchQuery
                    ? `No analysis records match the title "${searchQuery}". Try a different keyword.`
                    : 'You have not uploaded or analyzed any resumes yet. Start your first analysis to see detailed match scores and ATS breakdowns.'
                  : 'No analyses on this page match the selected score threshold. Try selecting "All Scores".'}
              </p>
            </div>

            <div className="pt-2">
              {analyses.length === 0 && !searchQuery ? (
                <Link
                  to="/analyze"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  Analyze Your First Resume
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setScoreFilter('ALL');
                    setSortBy('desc');
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} items total)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage || isHistoryLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <span className="px-3 py-1 font-semibold text-slate-800 dark:text-slate-200">
                {pagination.page}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage || isHistoryLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
