/**
 * TanStack Query Client Configuration
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds
      staleTime: 30 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't retry on 4xx errors
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Don't retry mutations by default
      retry: false,
      // Show error notifications for failed mutations
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

export default queryClient;
