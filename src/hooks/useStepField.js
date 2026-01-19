import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing a single input field's local state
 * Prevents loss of input value during parent re-renders
 * 
 * @param {string} initialValue - Initial value from props
 * @param {function} onSave - Callback to save the value (called on blur)
 * @param {function} onChange - Optional callback for immediate changes (without save)
 */
export function useStepField(initialValue, onSave, onChange) {
  const [localValue, setLocalValue] = useState(initialValue ?? '');
  const [isDirty, setIsDirty] = useState(false);
  const isFirstRender = useRef(true);

  // Sync with external value ONLY if we're not dirty (user hasn't edited)
  // This prevents losing typed content when parent re-renders
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Only sync if not dirty - user hasn't started typing
    if (!isDirty) {
      setLocalValue(initialValue ?? '');
    }
  }, [initialValue, isDirty]);

  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setLocalValue(value);
    setIsDirty(true);
    
    // Call onChange for immediate feedback (doesn't save)
    if (onChange) {
      onChange(value);
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    if (isDirty && onSave) {
      onSave(localValue);
      setIsDirty(false);
    }
  }, [isDirty, localValue, onSave]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }, []);

  // Reset dirty state when we want to accept external value
  const reset = useCallback(() => {
    setIsDirty(false);
    setLocalValue(initialValue ?? '');
  }, [initialValue]);

  return {
    value: localValue,
    isDirty,
    handlers: {
      value: localValue,
      onChange: handleChange,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    },
    reset,
  };
}

export default useStepField;
