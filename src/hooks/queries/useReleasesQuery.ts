/**
 * TanStack Query hook for releases
 */
import { useQuery } from '@tanstack/react-query';
import { releasesApi } from '@/services/api';
import { queryKeys, type ReleaseFilters } from '@/lib/queryKeys';
import type { Release, Pagination } from '@/types';

interface ReleasesData {
  data: Release[];
  pagination: Pagination;
}

/**
 * Fetch releases with pagination and filters
 */
export function useReleasesQuery(filters: ReleaseFilters = {}) {
  return useQuery({
    queryKey: queryKeys.releases.list(filters),
    queryFn: async (): Promise<ReleasesData> => {
      const res = await releasesApi.list(filters);
      return {
        data: res.data ?? [],
        pagination: res.pagination,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single release by ID
 */
export function useReleaseQuery(id: number | undefined | null) {
  return useQuery({
    queryKey: queryKeys.releases.detail(id ?? 0),
    queryFn: async (): Promise<Release> => {
      if (!id) throw new Error('Release ID is required');
      const res = await releasesApi.get(id);
      return res.data as Release;
    },
    enabled: !!id,
  });
}

export default useReleasesQuery;
