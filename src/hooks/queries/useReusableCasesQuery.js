/**
 * TanStack Query hook for fetching reusable cases
 */
import { useQuery } from '@tanstack/react-query';
import { reusableCasesApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch all reusable cases
 */
export function useReusableCasesQuery() {
  return useQuery({
    queryKey: queryKeys.reusableCases.list(),
    queryFn: async () => {
      const res = await reusableCasesApi.list();
      return res.data || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch a single reusable case with its steps
 */
export function useReusableCaseQuery(id) {
  return useQuery({
    queryKey: queryKeys.reusableCases.detail(id),
    queryFn: async () => {
      const res = await reusableCasesApi.get(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export default useReusableCasesQuery;
