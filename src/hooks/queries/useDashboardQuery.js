/**
 * TanStack Query hook for dashboard data
 */
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, exportApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch dashboard stats for a release
 */
export function useDashboardQuery(releaseId) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(releaseId),
    queryFn: async () => {
      const res = await dashboardApi.get(releaseId);
      return res.data;
    },
    enabled: !!releaseId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch export data for a release
 */
export function useExportQuery(releaseId, options = {}) {
  return useQuery({
    queryKey: queryKeys.export.all(releaseId),
    queryFn: async () => {
      const res = await exportApi.get(releaseId);
      return res.data;
    },
    enabled: !!releaseId && options.enabled !== false,
    staleTime: 0, // Always fetch fresh for exports
  });
}

export default useDashboardQuery;
