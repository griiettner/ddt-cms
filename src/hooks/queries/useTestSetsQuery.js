/**
 * TanStack Query hook for test sets
 */
import { useQuery } from '@tanstack/react-query';
import { testSetsApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch all test sets for a release with pagination and filters
 */
export function useTestSetsQuery(releaseId, filters = {}) {
  return useQuery({
    queryKey: queryKeys.testSets.list(releaseId, filters),
    queryFn: async () => {
      const res = await testSetsApi.list(releaseId, filters);
      return {
        data: res.data,
        pagination: res.pagination,
      };
    },
    enabled: !!releaseId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch a single test set by ID
 */
export function useTestSetQuery(releaseId, id) {
  return useQuery({
    queryKey: queryKeys.testSets.detail(releaseId, id),
    queryFn: async () => {
      const res = await testSetsApi.get(releaseId, id);
      return res.data;
    },
    enabled: !!releaseId && !!id,
  });
}

export default useTestSetsQuery;
