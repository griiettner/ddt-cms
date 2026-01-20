/**
 * TanStack Query hook for test steps
 */
import { useQuery } from '@tanstack/react-query';
import { testStepsApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch all steps for a scenario
 */
export function useStepsQuery(releaseId, scenarioId) {
  return useQuery({
    queryKey: queryKeys.steps.list(releaseId, scenarioId),
    queryFn: async () => {
      const res = await testStepsApi.list(releaseId, { scenarioId });
      return res.data;
    },
    enabled: !!releaseId && !!scenarioId,
    staleTime: 10 * 1000, // 10 seconds for steps (frequently edited)
  });
}

export default useStepsQuery;
