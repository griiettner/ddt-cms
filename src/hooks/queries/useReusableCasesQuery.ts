/**
 * TanStack Query hook for fetching reusable cases
 */
import { useQuery } from '@tanstack/react-query';
import { reusableCasesApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { ReusableCase } from '@/types/entities';

/**
 * Fetch all reusable cases
 */
export function useReusableCasesQuery() {
  return useQuery({
    queryKey: queryKeys.reusableCases.list(),
    queryFn: async (): Promise<ReusableCase[]> => {
      const res = await reusableCasesApi.list();
      return res.data || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch a single reusable case with its steps
 */
export function useReusableCaseQuery(id: number | string | undefined | null) {
  const caseId = id ? Number(id) : 0;

  return useQuery({
    queryKey: queryKeys.reusableCases.detail(caseId),
    queryFn: async (): Promise<ReusableCase> => {
      const res = await reusableCasesApi.get(caseId);
      if (!res.data) throw new Error('Reusable case not found');
      return res.data;
    },
    enabled: !!id,
  });
}

export default useReusableCasesQuery;
