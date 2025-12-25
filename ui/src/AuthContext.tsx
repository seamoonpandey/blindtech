import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_URL } from './config';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (userData: User, authToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // Try to get token from localStorage OR cookie
  const getTokenFromCookie = () => {
    const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
    return match ? match[2] : null;
  };

  const [token, setToken] = useState<string | null>(localStorage.getItem('token') || getTokenFromCookie());
  const [loading, setLoading] = useState(!!token);

    const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  };

  useEffect(() => {
    if (token) {
      console.log('Fetching /me with token:', token);
      fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      })
      .then(res => {
        console.log('/me response status:', res.status);
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then(data => {
        console.log('/me data:', data);
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('/me fetch failed:', err);
        logout();
        setLoading(false);
      });
    }
  }, [token]);



  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
