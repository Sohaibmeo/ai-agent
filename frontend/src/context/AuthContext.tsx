import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, fetchMe } from '../api/auth';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('chef_token'));
  const [loading, setLoading] = useState<boolean>(!!token);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const me = await fetchMe(token);
        setUser(me);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('chef_token');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const setAuth = (t: string, u: AuthUser) => {
    setToken(t);
    setUser(u);
    localStorage.setItem('chef_token', t);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('chef_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
