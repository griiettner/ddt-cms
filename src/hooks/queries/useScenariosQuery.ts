/**
 * TanStack Query hook for scenarios
 */
import { useQuery } from '@tanstack/react-query';
import { testCasesApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { TestScenario, TestCase } from '@/types/entities';

/**
 * Fetch all scenarios for a test set
 */
export function useScenariosQuery(
  releaseId: number | string | undefined | null,
  testSetId: number | string | undefined | null
) {
  const relId = releaseId ? Number(releaseId) : 0;
  const tsId = testSetId ? Number(testSetId) : 0;

  return useQuery({
    queryKey: queryKeys.scenarios.all(relId, tsId),
    queryFn: async (): Promise<TestScenario[]> => {
      const res = await testCasesApi.getAllScenarios(relId, { testSetId: tsId });
      return res.data ?? [];
    },
    enabled: !!releaseId && !!testSetId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch all test cases for a release and test set
 */
export function useTestCasesQuery(
  releaseId: number | string | undefined | null,
  testSetId: number | string | undefined | null
) {
  const relId = releaseId ? Number(releaseId) : 0;
  const tsId = testSetId ? Number(testSetId) : 0;

  return useQuery({
    queryKey: queryKeys.testCases.list(relId, { testSetId: tsId }),
    queryFn: async (): Promise<TestCase[]> => {
      const res = await testCasesApi.list(relId, { testSetId: tsId });
      return res.data ?? [];
    },
    enabled: !!releaseId && !!testSetId,
    staleTime: 30 * 1000,
  });
}

export default useScenariosQuery;
