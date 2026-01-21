import { useState, useCallback, useRef } from 'react';
import { testStepsApi } from '@/services/api';
import type { TestStep } from '@/types/entities';

interface NewStep {
  id: string | number;
  step_definition: string;
  type: string;
  element_id: string;
  action: string;
  action_result: string;
  required: boolean;
  expected_results: string;
  order_index: number;
  test_scenario_id?: number;
  select_config_id?: number | null;
  match_config_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface UseStepsReturn {
  steps: (TestStep | NewStep)[];
  loading: boolean;
  loadSteps: (scenarioId: number | string) => Promise<void>;
  updateStepField: (
    stepId: number | string,
    field: string,
    value: unknown,
    shouldSave?: boolean
  ) => Promise<void>;
  updateStepFields: (
    stepId: number | string,
    updates: Partial<TestStep>,
    shouldSave?: boolean
  ) => Promise<void>;
  addStep: (scenarioId: number | string) => Promise<string | number | null>;
  getStep: (stepId: number | string) => TestStep | NewStep | undefined;
  clearSteps: () => void;
  setSteps: React.Dispatch<React.SetStateAction<(TestStep | NewStep)[]>>;
}

/**
 * Custom hook to manage test steps with optimistic updates
 * Prevents re-renders from affecting other rows' local state
 */
export function useSteps(releaseId: number | string | undefined | null): UseStepsReturn {
  const [steps, setSteps] = useState<(TestStep | NewStep)[]>([]);
  const [loading, setLoading] = useState(false);

  // Track pending saves to prevent race conditions
  const _pendingSaves = useRef(new Map<string | number, Promise<unknown>>());

  const relId = releaseId ? Number(releaseId) : 0;

  /**
   * Load steps for a scenario
   */
  const loadSteps = useCallback(
    async (scenarioId: number | string) => {
      if (!scenarioId || !relId) return;
      setLoading(true);
      try {
        const res = await testStepsApi.list(relId, { scenarioId: Number(scenarioId) });
        setSteps(res.data ?? []);
      } catch (err) {
        console.error('Failed to load steps', err);
      } finally {
        setLoading(false);
      }
    },
    [relId]
  );

  /**
   * Update a single field on a step - optimistic update without causing re-renders
   * that would affect other rows
   */
  const updateStepField = useCallback(
    async (stepId: number | string, field: string, value: unknown, shouldSave = true) => {
      // Update local state immediately (optimistic)
      setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)));

      // Save to server if requested and not a temp ID
      if (shouldSave && !String(stepId).startsWith('temp')) {
        try {
          await testStepsApi.update(relId, Number(stepId), { [field]: value });
        } catch (err) {
          console.error('Failed to save field', err);
        }
      }
    },
    [relId]
  );

  /**
   * Update multiple fields on a step at once
   */
  const updateStepFields = useCallback(
    async (stepId: number | string, updates: Partial<TestStep>, shouldSave = true) => {
      // Update local state immediately
      setSteps(
        (prev) =>
          prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s)) as (TestStep | NewStep)[]
      );

      // Save to server
      if (shouldSave && !String(stepId).startsWith('temp')) {
        try {
          await testStepsApi.update(relId, Number(stepId), updates);
        } catch (err) {
          console.error('Failed to save fields', err);
        }
      }
    },
    [relId]
  );

  /**
   * Add a new step
   */
  const addStep = useCallback(
    async (scenarioId: number | string): Promise<string | number | null> => {
      if (!scenarioId || !relId) return null;

      const tempId = `temp-${Date.now()}`;
      const newStep: NewStep = {
        id: tempId,
        step_definition: '',
        type: '',
        element_id: '',
        action: '',
        action_result: '',
        required: false,
        expected_results: '',
        order_index: steps.length,
      };

      // Add optimistically
      setSteps((prev) => [...prev, newStep]);

      try {
        // Sync with server
        const stepsToSync = [...steps, newStep].map((s) => {
          const { id, ...rest } = s;
          if (String(id).startsWith('temp')) {
            return { ...rest, step_definition: rest.step_definition || '' };
          }
          return { ...rest, id: typeof id === 'number' ? id : undefined };
        });

        await testStepsApi.sync(relId, {
          scenarioId: Number(scenarioId),
          steps: stepsToSync,
        });

        // Get fresh IDs from server WITHOUT triggering full re-render
        const freshRes = await testStepsApi.list(relId, { scenarioId: Number(scenarioId) });

        // Update only the IDs, preserving local state
        setSteps((prev) => {
          return prev.map((step, idx) => {
            if (String(step.id).startsWith('temp') && freshRes.data?.[idx]) {
              return { ...step, id: freshRes.data[idx].id };
            }
            return step;
          });
        });

        return tempId;
      } catch (err) {
        console.error('Failed to add step', err);
        // Rollback on error
        setSteps((prev) => prev.filter((s) => s.id !== tempId));
        return null;
      }
    },
    [relId, steps]
  );

  /**
   * Get a specific step by ID
   */
  const getStep = useCallback(
    (stepId: number | string): TestStep | NewStep | undefined => {
      return steps.find((s) => s.id === stepId);
    },
    [steps]
  );

  /**
   * Clear all steps
   */
  const clearSteps = useCallback(() => {
    setSteps([]);
  }, []);

  return {
    steps,
    loading,
    loadSteps,
    updateStepField,
    updateStepFields,
    addStep,
    getStep,
    clearSteps,
    setSteps,
  };
}

export default useSteps;
