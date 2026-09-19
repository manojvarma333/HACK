import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setToken, getToken, type AuthUser } from '@/services/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirm_password: string;
    shop_name: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      confirm_password: string;
      shop_name: string;
    }) => {
      const res = await api.auth.register(payload);
      setToken(res.access_token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    api.auth.logout().catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: !!user, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
