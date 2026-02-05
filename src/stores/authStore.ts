/**
 * Auth Store - TanStack Store
 * Manages user authentication state
 */
import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';
import { healthApi } from '@/services/api';
import type { User } from '@/types/entities';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Create the auth store
export const authStore = new Store<AuthState>({
  user: null,
  loading: true,
  error: null,
});

// Actions
export const authActions = {
  setUser: (user: User | null): void => {
    authStore.setState((state) => ({
      ...state,
      user,
      loading: false,
      error: null,
    }));
  },

  setLoading: (loading: boolean): void => {
    authStore.setState((state) => ({
      ...state,
      loading,
    }));
  },

  setError: (error: string | null): void => {
    authStore.setState((state) => ({
      ...state,
      error,
      loading: false,
    }));
  },

  loadUser: async (): Promise<User | null> => {
    authStore.setState((state) => ({
      ...state,
      loading: true,
      error: null,
    }));

    try {
      const data = await healthApi.check();
      const user = (data as { user?: User }).user ?? null;
      authStore.setState((state) => ({
        ...state,
        user,
        loading: false,
      }));
      return user;
    } catch (err) {
      console.error('Failed to load user info', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      authStore.setState((state) => ({
        ...state,
        error: errorMessage,
        loading: false,
      }));
      return null;
    }
  },
};

// Selectors
export const authSelectors = {
  getUser: (): User | null => authStore.state.user,
  isLoading: (): boolean => authStore.state.loading,
  getError: (): string | null => authStore.state.error,
};

// React hook to use auth store
export function useAuth(): {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<User | null>;
} {
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
export async function initializeAuth(): Promise<void> {
  await authActions.loadUser();
}

export default authStore;
