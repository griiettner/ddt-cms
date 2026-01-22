/**
 * TanStack Query hooks for environment configurations
 */
import { useQuery } from '@tanstack/react-query';
import { environmentsApi, type EnvironmentConfig } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Fetch environment configurations for a release
 */
export function useEnvironmentsQuery(releaseId: number | string | undefined | null) {
  const id = releaseId ? String(releaseId) : '0';
  return useQuery({
    queryKey: queryKeys.environments.list(id),
    queryFn: async (): Promise<EnvironmentConfig[]> => {
      const res = await environmentsApi.list(id);
      return res.data ?? [];
    },
    enabled: !!releaseId,
    staleTime: 60 * 1000,
  });
}

export default useEnvironmentsQuery;
