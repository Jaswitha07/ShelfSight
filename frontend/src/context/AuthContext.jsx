import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('shelfsight_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('shelfsight_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const savedToken = localStorage.getItem('shelfsight_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          if (res.user) {
            setUser(res.user);
            localStorage.setItem('shelfsight_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Auth token verification failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('shelfsight_token', res.token);
      localStorage.setItem('shelfsight_user', JSON.stringify(res.user));
      return { success: true, user: res.user };
    }
    throw new Error('Invalid response from server.');
  };

  const register = async (username, email, password) => {
    const res = await authApi.register(username, email, password);
    if (res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('shelfsight_token', res.token);
      localStorage.setItem('shelfsight_user', JSON.stringify(res.user));
      return { success: true, user: res.user };
    }
    throw new Error('Invalid response from server.');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('shelfsight_token');
    localStorage.removeItem('shelfsight_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: Boolean(token), login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
