import { useState, useCallback } from 'react';

interface UseApiReturn<T> {
  loading: boolean;
  error: string | null;
  execute: (apiCall: () => Promise<T>) => Promise<T>;
  clearError: () => void;
}

/**
 * Hook for making API calls with loading and error states
 */
export function useApi<T = unknown>(): UseApiReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, execute, clearError };
}

export default useApi;
