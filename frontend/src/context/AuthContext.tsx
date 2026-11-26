import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

export type Role = 'ADMIN' | 'LANDLORD' | 'TENANT';

export interface User {
  id: string;
  name: string;
  fullName?: string;
  role: Role;
  email?: string;
  phone?: string;
  idCard?: string;
  roomNumber?: string;
  roomId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

// Automatically attach Bearer JWT from localStorage on every axios request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User, jwtToken: string) => {
    const normalizedUser: User = {
      ...userData,
      name: userData.name || userData.fullName || 'Người dùng',
    };
    setUser(normalizedUser);
    setToken(jwtToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('token', jwtToken);
    axios.defaults.headers.common.Authorization = `Bearer ${jwtToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
