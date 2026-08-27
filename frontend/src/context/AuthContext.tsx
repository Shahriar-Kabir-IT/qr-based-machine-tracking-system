import { createContext, useContext, useState, type ReactNode } from 'react';
import api from '../api/client';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user' | 'line_chief' | 'mechanic' | 'system_admin' | 'security';
  facility?: string;
  floor?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isLineChief: boolean;
  isMechanic: boolean;
  isSystemAdmin: boolean;
  isSecurity: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    setToken(res.data.access_token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.access_token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isUser = user?.role === 'user';
  const isLineChief = user?.role === 'line_chief';
  const isMechanic = user?.role === 'mechanic';
  const isSystemAdmin = user?.role === 'system_admin';
  const isSecurity = user?.role === 'security';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isSuperAdmin, isAdmin, isUser, isLineChief, isMechanic, isSystemAdmin, isSecurity }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
