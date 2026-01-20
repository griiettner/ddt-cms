/**
 * useStepRow Hook
 * Manages local state and handlers for a step row
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { debounce } from '../../../lib/debounce';

export function useStepRow(step, onFieldChange) {
  // Local state for text inputs to prevent loss during parent re-renders
  const [localValues, setLocalValues] = useState({
    step_definition: step.step_definition || '',
    element_id: step.element_id || '',
    expected_results: step.expected_results || '',
  });

  // Track if user is actively editing
  const isEditing = useRef({
    step_definition: false,
    element_id: false,
    expected_results: false,
  });

  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce((stepId, field, value) => {
      onFieldChange(stepId, field, value);
    }, 300),
    [onFieldChange]
  );

  // Sync with props only if not editing
  useEffect(() => {
    setLocalValues(prev => ({
      step_definition: isEditing.current.step_definition ? prev.step_definition : (step.step_definition || ''),
      element_id: isEditing.current.element_id ? prev.element_id : (step.element_id || ''),
      expected_results: isEditing.current.expected_results ? prev.expected_results : (step.expected_results || ''),
    }));
  }, [step.step_definition, step.element_id, step.expected_results]);

  const handleLocalChange = useCallback((field, value) => {
    isEditing.current[field] = true;
    setLocalValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleLocalBlur = useCallback((field) => {
    isEditing.current[field] = false;
    onFieldChange(step.id, field, localValues[field]);
  }, [step.id, localValues, onFieldChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }, []);

  const handleActionChange = useCallback((value) => {
    // Update action and clear action_result
    onFieldChange(step.id, 'action', value);
    onFieldChange(step.id, 'action_result', '');
  }, [step.id, onFieldChange]);

  const handleTypeChange = useCallback((value) => {
    onFieldChange(step.id, 'type', value);
  }, [step.id, onFieldChange]);

  const handleRequiredChange = useCallback((checked) => {
    onFieldChange(step.id, 'required', checked ? 'true' : 'false');
  }, [step.id, onFieldChange]);

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
