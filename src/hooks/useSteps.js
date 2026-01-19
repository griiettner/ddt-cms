import { useState, useCallback, useRef } from 'react';
import { testStepsApi } from '../services/api';

/**
 * Custom hook to manage test steps with optimistic updates
 * Prevents re-renders from affecting other rows' local state
 */
export function useSteps(releaseId) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Track pending saves to prevent race conditions
  const pendingSaves = useRef(new Map());

  /**
   * Load steps for a scenario
   */
  const loadSteps = useCallback(async (scenarioId) => {
    if (!scenarioId || !releaseId) return;
    setLoading(true);
    try {
      const res = await testStepsApi.list(releaseId, { scenarioId });
      setSteps(res.data);
    } catch (err) {
      console.error('Failed to load steps', err);
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  /**
   * Update a single field on a step - optimistic update without causing re-renders
   * that would affect other rows
   */
  const updateStepField = useCallback(async (stepId, field, value, shouldSave = true) => {
    // Update local state immediately (optimistic)
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, [field]: value } : s
    ));

    // Save to server if requested and not a temp ID
    if (shouldSave && !String(stepId).startsWith('temp')) {
      try {
        await testStepsApi.update(releaseId, stepId, { [field]: value });
      } catch (err) {
        console.error('Failed to save field', err);
      }
    }
  }, [releaseId]);

  /**
   * Update multiple fields on a step at once
   */
  const updateStepFields = useCallback(async (stepId, updates, shouldSave = true) => {
    // Update local state immediately
    setSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, ...updates } : s
    ));

    // Save to server
    if (shouldSave && !String(stepId).startsWith('temp')) {
      try {
        await testStepsApi.update(releaseId, stepId, updates);
      } catch (err) {
        console.error('Failed to save fields', err);
      }
    }
  }, [releaseId]);

  /**
   * Add a new step
   */
  const addStep = useCallback(async (scenarioId) => {
    if (!scenarioId || !releaseId) return;

    const tempId = `temp-${Date.now()}`;
    const newStep = {
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
    setSteps(prev => [...prev, newStep]);

    try {
      // Sync with server
      const stepsToSync = [...steps, newStep].map(s => {
        const { id, ...rest } = s;
        return String(id).startsWith('temp') ? { step_definition: '', ...rest } : s;
      });

      await testStepsApi.sync(releaseId, {
        scenarioId,
        steps: stepsToSync,
      });

      // Get fresh IDs from server WITHOUT triggering full re-render
      const freshRes = await testStepsApi.list(releaseId, { scenarioId });
      
      // Update only the IDs, preserving local state
      setSteps(prev => {
        return prev.map((step, idx) => {
          if (String(step.id).startsWith('temp') && freshRes.data[idx]) {
            return { ...step, id: freshRes.data[idx].id };
          }
          return step;
        });
      });

      return tempId;
    } catch (err) {
      console.error('Failed to add step', err);
      // Rollback on error
      setSteps(prev => prev.filter(s => s.id !== tempId));
      return null;
    }
  }, [releaseId, steps]);

  /**
   * Get a specific step by ID
   */
  const getStep = useCallback((stepId) => {
    return steps.find(s => s.id === stepId);
  }, [steps]);

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
