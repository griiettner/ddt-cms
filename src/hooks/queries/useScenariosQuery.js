/**
 * TanStack Query hook for scenarios
 */
import { useQuery } from '@tanstack/react-query';
import { testCasesApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch all scenarios for a test set
 */
export function useScenariosQuery(releaseId, testSetId) {
  return useQuery({
    queryKey: queryKeys.scenarios.all(releaseId, testSetId),
    queryFn: async () => {
      const res = await testCasesApi.getAllScenarios(releaseId, { testSetId });
      return res.data;
    },
    enabled: !!releaseId && !!testSetId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch all test cases for a release and test set
 */
export function useTestCasesQuery(releaseId, testSetId) {
  return useQuery({
    queryKey: queryKeys.testCases.list(releaseId, { testSetId }),
    queryFn: async () => {
      const res = await testCasesApi.list(releaseId, { testSetId });
      return res.data;
    },
    enabled: !!releaseId && !!testSetId,
    staleTime: 30 * 1000,
  });
}

export default useScenariosQuery;
