/**
 * TanStack Query hook for test steps
 */
import { useQuery } from '@tanstack/react-query';
import { testStepsApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { TestStep } from '@/types/entities';

/**
 * Fetch all steps for a scenario
 */
export function useStepsQuery(
  releaseId: number | string | undefined | null,
  scenarioId: number | string | undefined | null
) {
  const relId = releaseId ? Number(releaseId) : 0;
  const scnId = scenarioId ? Number(scenarioId) : 0;

  return useQuery({
    queryKey: queryKeys.steps.list(relId, scnId),
    queryFn: async (): Promise<TestStep[]> => {
      const res = await testStepsApi.list(relId, { scenarioId: scnId });
      return res.data ?? [];
    },
    enabled: !!releaseId && !!scenarioId,
    staleTime: 10 * 1000, // 10 seconds for steps (frequently edited)
  });
}

export default useStepsQuery;
