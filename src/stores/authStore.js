/**
 * Auth Store - TanStack Store
 * Manages user authentication state
 */
import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';
import { healthApi } from '../services/api';

// Create the auth store
export const authStore = new Store({
  user: null,
  loading: true,
  error: null,
});

// Actions
export const authActions = {
  setUser: (user) => {
    authStore.setState((state) => ({
      ...state,
      user,
      loading: false,
      error: null,
    }));
  },

  setLoading: (loading) => {
    authStore.setState((state) => ({
      ...state,
      loading,
    }));
  },

  setError: (error) => {
    authStore.setState((state) => ({
      ...state,
      error,
      loading: false,
    }));
  },

  loadUser: async () => {
    authStore.setState((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const data = await healthApi.check();
      authStore.setState((state) => ({
        ...state,
        user: data.user,
        loading: false,
      }));
      return data.user;
    } catch (err) {
      console.error('Failed to load user info', err);
      authStore.setState((state) => ({
        ...state,
        error: err.message,
        loading: false,
      }));
      return null;
    }
  },
};

// Selectors
export const authSelectors = {
  getUser: () => authStore.state.user,
  isLoading: () => authStore.state.loading,
  getError: () => authStore.state.error,
};

// React hook to use auth store
export function useAuth() {
  const user = useStore(authStore, (state) => state.user);
  const loading = useStore(authStore, (state) => state.loading);
  const error = useStore(authStore, (state) => state.error);

  return {
    user,
    loading,
    error,
    refreshUser: authActions.loadUser,
  };
}

// Initialize user on app load
export async function initializeAuth() {
  await authActions.loadUser();
}

export default authStore;
