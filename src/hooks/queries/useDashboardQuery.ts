/**
 * TanStack Query hook for dashboard data
 */
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, exportApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { DashboardData, ExportData } from '@/types/api';

/**
 * Fetch dashboard stats for a release
 */
export function useDashboardQuery(releaseId: number | string | undefined | null) {
  const id = releaseId ? Number(releaseId) : 0;
  return useQuery({
    queryKey: queryKeys.dashboard.stats(id),
    queryFn: async (): Promise<DashboardData> => {
      const res = await dashboardApi.get(id);
      if (!res.data) throw new Error('Dashboard data not found');
      return res.data;
    },
    enabled: !!releaseId,
    staleTime: 30 * 1000,
  });
}

interface ExportQueryOptions {
  enabled?: boolean;
}

/**
 * Fetch export data for a release
 */
export function useExportQuery(
  releaseId: number | string | undefined | null,
  options: ExportQueryOptions = {}
) {
  const id = releaseId ? Number(releaseId) : 0;
  return useQuery({
    queryKey: queryKeys.export.all(id),
    queryFn: async (): Promise<ExportData> => {
      const res = await exportApi.get(id);
      if (!res.data) throw new Error('Export data not found');
      return res.data;
    },
    enabled: !!releaseId && options.enabled !== false,
    staleTime: 0, // Always fetch fresh for exports
  });
}

export default useDashboardQuery;
