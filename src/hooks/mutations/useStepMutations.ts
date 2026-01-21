/**
 * TanStack Query mutation hooks for test steps
 * Includes optimistic updates for better UX
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testStepsApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { TestStep } from '@/types/entities';

type StepField = keyof TestStep;

/**
 * Update a single field on a step with optimistic update
 */
export function useUpdateStepField(releaseId: number | string, scenarioId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);
  const scnId = Number(scenarioId);

  return useMutation({
    mutationFn: async ({
      stepId,
      field,
      value,
    }: {
      stepId: number | string;
      field: StepField;
      value: unknown;
    }) => {
      if (String(stepId).startsWith('temp')) {
        return { success: true };
      }
      return testStepsApi.update(relId, Number(stepId), { [field]: value });
    },
    onMutate: async ({ stepId, field, value }) => {
      const queryKey = queryKeys.steps.list(relId, scnId);

      await queryClient.cancelQueries({ queryKey });
      const previousSteps = queryClient.getQueryData<TestStep[]>(queryKey);

      queryClient.setQueryData<TestStep[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((step) =>
          step.id === stepId ? { ...step, [field]: value } : step
        ) as TestStep[];
      });

      return { previousSteps };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSteps) {
        const queryKey = queryKeys.steps.list(relId, scnId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
  });
}

/**
 * Update multiple fields on a step
 */
export function useUpdateStepFields(releaseId: number | string, scenarioId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);
  const scnId = Number(scenarioId);

  return useMutation({
    mutationFn: async ({
      stepId,
      updates,
    }: {
      stepId: number | string;
      updates: Partial<TestStep>;
    }) => {
      if (String(stepId).startsWith('temp')) {
        return { success: true };
      }
      return testStepsApi.update(relId, Number(stepId), updates);
    },
    onMutate: async ({ stepId, updates }) => {
      const queryKey = queryKeys.steps.list(relId, scnId);

      await queryClient.cancelQueries({ queryKey });
      const previousSteps = queryClient.getQueryData<TestStep[]>(queryKey);

      queryClient.setQueryData<TestStep[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((step) =>
          step.id === stepId ? { ...step, ...updates } : step
        ) as TestStep[];
      });

      return { previousSteps };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSteps) {
        const queryKey = queryKeys.steps.list(relId, scnId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
  });
}

interface StepToSync {
  id?: number | string;
  order_index: number;
  step_definition?: string;
  type?: string | null;
  element_id?: string | null;
  action?: string | null;
  action_result?: string | null;
  select_config_id?: number | null;
  match_config_id?: number | null;
  required?: boolean;
  expected_results?: string | null;
}

/**
 * Add a new step with optimistic update
 */
export function useAddStep(releaseId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);

  return useMutation({
    mutationFn: async ({
      scenarioId,
      steps,
    }: {
      scenarioId: number;
      steps: StepToSync[];
    }): Promise<TestStep[]> => {
      const stepsToSync = steps.map((s) => {
        const { id, ...rest } = s;
        const step_definition = rest.step_definition ?? '';
        if (String(id).startsWith('temp')) {
          return { ...rest, step_definition };
        }
        return { ...rest, step_definition, id: typeof id === 'number' ? id : undefined };
      });

      await testStepsApi.sync(relId, { scenarioId, steps: stepsToSync });

      const freshRes = await testStepsApi.list(relId, { scenarioId });
      return freshRes.data ?? [];
    },
    onMutate: async ({ scenarioId, steps }) => {
      const queryKey = queryKeys.steps.list(relId, scenarioId);

      await queryClient.cancelQueries({ queryKey });
      const previousSteps = queryClient.getQueryData<TestStep[]>(queryKey);

      queryClient.setQueryData(queryKey, steps);

      return { previousSteps, scenarioId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSteps && context?.scenarioId) {
        const queryKey = queryKeys.steps.list(relId, context.scenarioId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
    onSuccess: (newSteps, { scenarioId }) => {
      const queryKey = queryKeys.steps.list(relId, scenarioId);
      queryClient.setQueryData<TestStep[]>(queryKey, (oldSteps) => {
        if (!oldSteps) return newSteps;
        return newSteps.map((newStep) => {
          const existingStep = oldSteps.find(
            (s) =>
              s.id === newStep.id ||
              (String(s.id).startsWith('temp') && s.order_index === newStep.order_index)
          );
          if (existingStep && !String(existingStep.id).startsWith('temp')) {
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
export function useSyncSteps(releaseId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);

  return useMutation({
    mutationFn: async ({ scenarioId, steps }: { scenarioId: number; steps: StepToSync[] }) => {
      const stepsToSync = steps.map((s) => {
        const { id, ...rest } = s;
        const step_definition = rest.step_definition ?? '';
        if (String(id).startsWith('temp')) {
          return { ...rest, step_definition };
        }
        return { ...rest, step_definition, id: typeof id === 'number' ? id : undefined };
      });
      return testStepsApi.sync(relId, { scenarioId, steps: stepsToSync });
    },
    onSuccess: (_, { scenarioId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.steps.list(relId, scenarioId),
      });
    },
  });
}

/**
 * Reorder steps with optimistic update
 */
export function useReorderSteps(releaseId: number | string, scenarioId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);
  const scnId = Number(scenarioId);

  return useMutation({
    mutationFn: async (reorderedSteps: TestStep[]) => {
      const stepsToSync = reorderedSteps.map((s, index) => ({
        ...s,
        order_index: index,
      }));
      return testStepsApi.sync(relId, { scenarioId: scnId, steps: stepsToSync });
    },
    onMutate: async (reorderedSteps) => {
      const queryKey = queryKeys.steps.list(relId, scnId);

      await queryClient.cancelQueries({ queryKey });
      const previousSteps = queryClient.getQueryData<TestStep[]>(queryKey);

      queryClient.setQueryData<TestStep[]>(
        queryKey,
        reorderedSteps.map((s, index) => ({
          ...s,
          order_index: index,
        }))
      );

      return { previousSteps };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSteps) {
        const queryKey = queryKeys.steps.list(relId, scnId);
        queryClient.setQueryData(queryKey, context.previousSteps);
      }
    },
  });
}

/**
 * Delete a step
 */
export function useDeleteStep(releaseId: number | string, scenarioId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);
  const scnId = Number(scenarioId);

  return useMutation({
    mutationFn: async (stepId: number | string) => {
      if (String(stepId).startsWith('temp')) {
        return { success: true };
      }
      return testStepsApi.delete(relId, Number(stepId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.steps.list(relId, scnId),
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
