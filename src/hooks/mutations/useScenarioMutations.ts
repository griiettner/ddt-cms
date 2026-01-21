/**
 * TanStack Query mutation hooks for scenarios
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testCasesApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type {
  CreateTestCaseData,
  UpdateTestCaseData,
  CreateScenarioData,
  UpdateScenarioData,
} from '@/types/api';
import type { TestScenario } from '@/types/entities';

/**
 * Create a new test case
 */
export function useCreateTestCase(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (data: CreateTestCaseData) => testCasesApi.create(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scenarios.all(id, variables.testSetId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.testCases.all(id),
      });
    },
  });
}

/**
 * Update a test case
 */
export function useUpdateTestCase(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: ({ id: caseId, data }: { id: number; data: UpdateTestCaseData }) =>
      testCasesApi.update(id, caseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', id],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.testCases.all(id),
      });
    },
  });
}

/**
 * Delete a test case and all its scenarios/steps
 */
export function useDeleteTestCase(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (caseId: number) => testCasesApi.delete(id, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', id],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.testCases.all(id),
      });
    },
  });
}

/**
 * Create a new scenario
 */
export function useCreateScenario(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (data: CreateScenarioData) => testCasesApi.createScenario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', id],
      });
    },
  });
}

/**
 * Update a scenario
 */
export function useUpdateScenario(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: ({ scenarioId, data }: { scenarioId: number; data: UpdateScenarioData }) =>
      testCasesApi.updateScenario(id, scenarioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', id],
      });
    },
    onMutate: async ({ scenarioId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['scenarios', id] });

      const previousScenarios = queryClient.getQueriesData<TestScenario[]>({
        queryKey: ['scenarios', id],
      });

      queryClient.setQueriesData<TestScenario[]>({ queryKey: ['scenarios', id] }, (old) => {
        if (!old) return old;
        return old.map((s) => (s.id === scenarioId ? { ...s, ...data } : s));
      });

      return { previousScenarios };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousScenarios) {
        context.previousScenarios.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
  });
}

/**
 * Delete a scenario
 */
export function useDeleteScenario(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (scenarioId: number) => testCasesApi.deleteScenario(id, scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', id],
      });
    },
  });
}

export default {
  useCreateTestCase,
  useUpdateTestCase,
  useDeleteTestCase,
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
};
