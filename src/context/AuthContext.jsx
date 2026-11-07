import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getCleanToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => getCleanToken());
  const [isLoading, setIsLoading] = useState(false);
  const [sessionNotice, setSessionNotice] = useState(null);

  /**
   * Synchronize state and persist authenticated session to localStorage
   */
  const saveAuthSession = useCallback((newToken, newUser) => {
    let cleanToken = null;
    if (newToken) {
      let t = String(newToken).trim();
      // Strip quotes if present
      if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        t = t.slice(1, -1).trim();
      }
      // Strip any Bearer prefixes
      t = t.replace(/^(?:Bearer\s+)+/i, '').trim();
      if (t && t !== 'null' && t !== 'undefined' && t !== '[object Object]' && t.length >= 10) {
        cleanToken = t;
      }
    }

    setToken(cleanToken);
    setUser(newUser || null);
    setSessionNotice(null);

    if (cleanToken) {
      localStorage.setItem('token', cleanToken);
    } else {
      localStorage.removeItem('token');
    }

    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const clearStaleSession = useCallback(() => {
    logout();
    setSessionNotice(null);
  }, [logout]);

  const clearSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  // Listen for global 401 unauthorized events from Axios interceptor
  useEffect(() => {
    const handleUnauthorized = (e) => {
      logout();
      const message =
        e?.detail?.message ||
        'Your session has expired or is invalid. Please sign in again.';
      setSessionNotice(message);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [logout]);

  // Login handler
  const login = useCallback(
    async (email, password) => {
      setIsLoading(true);
      setSessionNotice(null);
      try {
        const response = await api.post('/auth/login', { email, password });
        if (response.data && response.data.token) {
          saveAuthSession(response.data.token, response.data.user);
          return { success: true, user: response.data.user, token: response.data.token };
        }
        throw new Error(response.data?.message || 'Login failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [saveAuthSession]
  );

  // Signup handler
  const signup = useCallback(
    async (name, email, password) => {
      setIsLoading(true);
      setSessionNotice(null);
      try {
        const response = await api.post('/auth/signup', { name, email, password });
        if (response.data && response.data.token) {
          saveAuthSession(response.data.token, response.data.user);
        }
        return { success: true, data: response.data };
      } finally {
        setIsLoading(false);
      }
    },
    [saveAuthSession]
  );

  // Google Login handler (OpenID Connect ID Token exchanged for app JWT)
  const loginWithGoogle = useCallback(
    async (credential, clientId = null) => {
      setIsLoading(true);
      setSessionNotice(null);
      try {
        const payload = { credential };
        if (clientId) {
          payload.clientId = clientId;
        }
        const response = await api.post('/auth/google', payload);
        if (response.data && response.data.token) {
          saveAuthSession(response.data.token, response.data.user);
          return { success: true, user: response.data.user, token: response.data.token };
        }
        throw new Error(response.data?.message || 'Google sign-in failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [saveAuthSession]
  );

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      try {
        localStorage.setItem('user', JSON.stringify(merged));
      } catch (_) {}
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        sessionNotice,
        login,
        signup,
        loginWithGoogle,
        logout,
        updateUser,
        clearStaleSession,
        clearSessionNotice,
        saveAuthSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
