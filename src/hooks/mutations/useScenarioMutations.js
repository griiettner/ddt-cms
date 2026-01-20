/**
 * TanStack Query mutation hooks for scenarios
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testCasesApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Create a new test case
 */
export function useCreateTestCase(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => testCasesApi.create(releaseId, data),
    onSuccess: (_, variables) => {
      // Invalidate scenarios for the test set
      queryClient.invalidateQueries({
        queryKey: queryKeys.scenarios.all(releaseId, variables.testSetId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.testCases.all(releaseId)
      });
    },
  });
}

/**
 * Update a test case
 */
export function useUpdateTestCase(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => testCasesApi.update(releaseId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', releaseId]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.testCases.all(releaseId)
      });
    },
  });
}

/**
 * Delete a test case and all its scenarios/steps
 */
export function useDeleteTestCase(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => testCasesApi.delete(releaseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', releaseId]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.testCases.all(releaseId)
      });
    },
  });
}

/**
 * Create a new scenario
 */
export function useCreateScenario(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => testCasesApi.createScenario(releaseId, data),
    onSuccess: () => {
      // Invalidate all scenarios queries for this release
      queryClient.invalidateQueries({
        queryKey: ['scenarios', releaseId]
      });
    },
  });
}

/**
 * Update a scenario
 */
export function useUpdateScenario(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scenarioId, data }) => testCasesApi.updateScenario(releaseId, scenarioId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', releaseId]
      });
    },
    // Optimistic update for name changes
    onMutate: async ({ scenarioId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['scenarios', releaseId] });

      // Snapshot previous value
      const previousScenarios = queryClient.getQueriesData({ queryKey: ['scenarios', releaseId] });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: ['scenarios', releaseId] },
        (old) => {
          if (!old) return old;
          return old.map(s => s.id === scenarioId ? { ...s, ...data } : s);
        }
      );

      return { previousScenarios };
    },
    onError: (err, variables, context) => {
      // Rollback on error
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
export function useDeleteScenario(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scenarioId) => testCasesApi.deleteScenario(releaseId, scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scenarios', releaseId]
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
