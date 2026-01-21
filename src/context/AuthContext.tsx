import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { healthApi } from '@/services/api';
import type { User } from '@/types/entities';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserInfo();
  }, []);

  async function loadUserInfo(): Promise<void> {
    try {
      const data = await healthApi.check();
      setUser((data as { user?: User }).user ?? null);
    } catch (err) {
      console.error('Failed to load user info', err);
    } finally {
      setLoading(false);
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    refreshUser: loadUserInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
