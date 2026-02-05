/**
 * useStepRow Hook
 * Manages local state and handlers for a step row
 */
import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import type { TestStep } from '@/types/entities';

// Flexible step type that works with both TestStep and LocalStep (from reusable case editor)
type FlexibleStep = Omit<TestStep, 'id' | 'test_scenario_id' | 'created_at' | 'updated_at'> & {
  id: number | string;
  test_scenario_id?: number;
  created_at?: string;
  updated_at?: string;
};

type EditableField = 'step_definition' | 'element_id' | 'expected_results';

interface LocalValues {
  step_definition: string;
  element_id: string;
  expected_results: string;
}

interface EditingState {
  step_definition: boolean;
  element_id: boolean;
  expected_results: boolean;
}

interface UseStepRowReturn {
  localValues: LocalValues;
  handleLocalChange: (field: EditableField, value: string) => void;
  handleLocalBlur: (field: EditableField) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleActionChange: (value: string) => void;
  handleTypeChange: (value: string) => void;
  handleRequiredChange: (checked: boolean) => void;
}

export function useStepRow(
  step: FlexibleStep,
  onFieldChange: (stepId: number | string, field: string, value: string | boolean) => void
): UseStepRowReturn {
  // Local state for text inputs to prevent loss during parent re-renders
  const [localValues, setLocalValues] = useState<LocalValues>({
    step_definition: step.step_definition || '',
    element_id: step.element_id || '',
    expected_results: step.expected_results || '',
  });

  // Track if user is actively editing
  const isEditing = useRef<EditingState>({
    step_definition: false,
    element_id: false,
    expected_results: false,
  });

  // Sync with props only if not editing
  useEffect(() => {
    setLocalValues((prev) => ({
      step_definition: isEditing.current.step_definition
        ? prev.step_definition
        : step.step_definition || '',
      element_id: isEditing.current.element_id ? prev.element_id : step.element_id || '',
      expected_results: isEditing.current.expected_results
        ? prev.expected_results
        : step.expected_results || '',
    }));
  }, [step.step_definition, step.element_id, step.expected_results]);

  const handleLocalChange = useCallback((field: EditableField, value: string) => {
    isEditing.current[field] = true;
    setLocalValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLocalBlur = useCallback(
    (field: EditableField) => {
      isEditing.current[field] = false;
      onFieldChange(step.id, field, localValues[field]);
    },
    [step.id, localValues, onFieldChange]
  );

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  const handleActionChange = useCallback(
    (value: string) => {
      // Update action and clear action_result
      onFieldChange(step.id, 'action', value);
      onFieldChange(step.id, 'action_result', '');
    },
    [step.id, onFieldChange]
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      onFieldChange(step.id, 'type', value);
    },
    [step.id, onFieldChange]
  );

  const handleRequiredChange = useCallback(
    (checked: boolean) => {
      onFieldChange(step.id, 'required', checked ? 'true' : 'false');
    },
    [step.id, onFieldChange]
  );

  return {
    localValues,
    handleLocalChange,
    handleLocalBlur,
    handleKeyDown,
    handleActionChange,
    handleTypeChange,
    handleRequiredChange,
  };
}

export default useStepRow;
