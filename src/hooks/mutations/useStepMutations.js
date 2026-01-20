/**
 * TanStack Query mutation hooks for test steps
 * Includes optimistic updates for better UX
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testStepsApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Update a single field on a step with optimistic update
 */
export function useUpdateStepField(releaseId, scenarioId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, field, value }) => {
      // Skip temp IDs
      if (String(stepId).startsWith('temp')) {
        return { success: true };
      }
      return testStepsApi.update(releaseId, stepId, { [field]: value });
    },
    // Optimistic update
    onMutate: async ({ stepId, field, value }) => {
      const queryKey = queryKeys.steps.list(releaseId, scenarioId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousSteps = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return old.map(step =>
          step.id === stepId ? { ...step, [field]: value } : step
        );
      });

      return { previousSteps };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSteps) {
        const queryKey = queryKeys.steps.list(releaseId, scenarioId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
  });
}

/**
 * Update multiple fields on a step
 */
export function useUpdateStepFields(releaseId, scenarioId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, updates }) => {
      if (String(stepId).startsWith('temp')) {
        return { success: true };
      }
      return testStepsApi.update(releaseId, stepId, updates);
    },
    onMutate: async ({ stepId, updates }) => {
      const queryKey = queryKeys.steps.list(releaseId, scenarioId);

      await queryClient.cancelQueries({ queryKey });
      const previousSteps = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return old.map(step =>
          step.id === stepId ? { ...step, ...updates } : step
        );
      });

      return { previousSteps };
    },
    onError: (err, variables, context) => {
      if (context?.previousSteps) {
        const queryKey = queryKeys.steps.list(releaseId, scenarioId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
  });
}

/**
 * Add a new step with optimistic update
 */
export function useAddStep(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scenarioId, steps }) => {
      const stepsToSync = steps.map(s => {
        const { id, ...rest } = s;
        return String(id).startsWith('temp') ? { step_definition: '', ...rest } : s;
      });

      await testStepsApi.sync(releaseId, { scenarioId, steps: stepsToSync });

      // Get fresh data with real IDs
      const freshRes = await testStepsApi.list(releaseId, { scenarioId });
      return freshRes.data;
    },
    onMutate: async ({ scenarioId, steps }) => {
      const queryKey = queryKeys.steps.list(releaseId, scenarioId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousSteps = queryClient.getQueryData(queryKey);

      // Optimistically update with the new steps array
      queryClient.setQueryData(queryKey, steps);

      return { previousSteps, scenarioId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSteps) {
        const queryKey = queryKeys.steps.list(releaseId, context.scenarioId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
    onSuccess: (newSteps, { scenarioId }) => {
      const queryKey = queryKeys.steps.list(releaseId, scenarioId);
      // Merge new steps, preserving existing data where possible
      queryClient.setQueryData(queryKey, (oldSteps) => {
        if (!oldSteps) return newSteps;
        // Map new steps, keeping existing step data for steps that haven't changed
        return newSteps.map(newStep => {
          const existingStep = oldSteps.find(s =>
            s.id === newStep.id ||
            (String(s.id).startsWith('temp') && s.order_index === newStep.order_index)
          );
          if (existingStep && !String(existingStep.id).startsWith('temp')) {
            // Keep existing step data if IDs match and it's not a temp step
            return { ...existingStep, ...newStep };
          }
          return newStep;
        });
      });
    },
  });
}

/**
 * Sync all steps (used when adding new steps)
 */
export function useSyncSteps(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scenarioId, steps }) => {
      return testStepsApi.sync(releaseId, { scenarioId, steps });
    },
    onSuccess: (_, { scenarioId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.steps.list(releaseId, scenarioId)
      });
    },
  });
}

/**
 * Reorder steps with optimistic update
 */
export function useReorderSteps(releaseId, scenarioId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reorderedSteps) => {
      const stepsToSync = reorderedSteps.map((s, index) => ({
        ...s,
        order_index: index,
      }));
      return testStepsApi.sync(releaseId, { scenarioId, steps: stepsToSync });
    },
    onMutate: async (reorderedSteps) => {
      const queryKey = queryKeys.steps.list(releaseId, scenarioId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousSteps = queryClient.getQueryData(queryKey);

      // Optimistically update with new order
      queryClient.setQueryData(queryKey, reorderedSteps.map((s, index) => ({
        ...s,
        order_index: index,
      })));

      return { previousSteps };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSteps) {
        const queryKey = queryKeys.steps.list(releaseId, scenarioId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
    // No onSuccess invalidation needed - optimistic update is sufficient
  });
}

/**
 * Delete a step
 */
export function useDeleteStep(releaseId, scenarioId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stepId) => {
      // Skip temp IDs
      if (String(stepId).startsWith('temp')) {
        return { success: true };
      }
      return testStepsApi.delete(releaseId, stepId);
    },
    onSuccess: () => {
      // Invalidate and refetch steps
      queryClient.invalidateQueries({
        queryKey: queryKeys.steps.list(releaseId, scenarioId)
      });
    },
  });
}

export default {
  useUpdateStepField,
  useUpdateStepFields,
  useAddStep,
  useSyncSteps,
  useReorderSteps,
  useDeleteStep,
};
