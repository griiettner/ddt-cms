import { createContext, useContext, useState, useEffect } from 'react';
import { healthApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserInfo();
  }, []);

  async function loadUserInfo() {
    try {
      const data = await healthApi.check();
      setUser(data.user);
    } catch (err) {
      console.error('Failed to load user info', err);
    } finally {
      setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    refreshUser: loadUserInfo,
  };

  return (
    <AuthContext.Provider value={value}>
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

export default AuthContext;
