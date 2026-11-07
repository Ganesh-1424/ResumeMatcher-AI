import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import AnalyzeResume from './pages/AnalyzeResume';
import Results from './pages/Results';
import MatchDetails from './pages/MatchDetails';
import Dashboard from './pages/Dashboard';
import AtsChecker from './pages/AtsChecker';
import ResumeBuilder from './pages/ResumeBuilder';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';

/**
 * Main application component.
 * Sets up client-side routing using React Router DOM, AuthProvider, and ThemeProvider.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="analyze" element={<AnalyzeResume />} />
              <Route path="ats-checker" element={<AtsChecker />} />
              <Route path="ats" element={<AtsChecker />} />
              <Route path="builder" element={<ResumeBuilder />} />
              <Route path="resume-builder" element={<ResumeBuilder />} />
              <Route path="results" element={<Results />} />
              <Route path="matches/:id" element={<MatchDetails />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
