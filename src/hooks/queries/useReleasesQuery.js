/**
 * TanStack Query hook for releases
 */
import { useQuery } from '@tanstack/react-query';
import { releasesApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch releases with pagination and filters
 * Returns { data: [], pagination: { total, page, limit, pages } }
 */
export function useReleasesQuery(filters = {}) {
  return useQuery({
    queryKey: queryKeys.releases.list(filters),
    queryFn: async () => {
      const res = await releasesApi.list(filters);
      return {
        data: res.data,
        pagination: res.pagination,
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch a single release by ID
 */
export function useReleaseQuery(id) {
  return useQuery({
    queryKey: queryKeys.releases.detail(id),
    queryFn: async () => {
      const res = await releasesApi.get(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export default useReleasesQuery;
