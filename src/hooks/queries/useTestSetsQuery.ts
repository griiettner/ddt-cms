/**
 * TanStack Query hook for test sets
 */
import { useQuery } from '@tanstack/react-query';
import { testSetsApi } from '@/services/api';
import { queryKeys, type TestSetFilters } from '@/lib/queryKeys';
import type { TestSet, Pagination } from '@/types';

interface TestSetsData {
  data: TestSet[];
  pagination: Pagination;
}

/**
 * Fetch all test sets for a release with pagination and filters
 */
export function useTestSetsQuery(
  releaseId: number | string | undefined | null,
  filters: TestSetFilters = {}
) {
  const id = releaseId ? Number(releaseId) : 0;

  return useQuery({
    queryKey: queryKeys.testSets.list(id, filters),
    queryFn: async (): Promise<TestSetsData> => {
      const res = await testSetsApi.list(id, filters);
      return {
        data: res.data ?? [],
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
export function useTestSetQuery(
  releaseId: number | string | undefined | null,
  id: number | string | undefined | null
) {
  const relId = releaseId ? Number(releaseId) : 0;
  const tsId = id ? Number(id) : 0;

  return useQuery({
    queryKey: queryKeys.testSets.detail(relId, tsId),
    queryFn: async (): Promise<TestSet> => {
      const res = await testSetsApi.get(relId, tsId);
      if (!res.data) throw new Error('Test set not found');
      return res.data;
    },
    enabled: !!releaseId && !!id,
  });
}

export default useTestSetsQuery;
