import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';

interface StepFieldHandlers {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

interface UseStepFieldReturn {
  value: string;
  isDirty: boolean;
  handlers: StepFieldHandlers;
  reset: () => void;
}

/**
 * Custom hook for managing a single input field's local state
 * Prevents loss of input value during parent re-renders
 */
export function useStepField(
  initialValue: string | null | undefined,
  onSave?: (value: string) => void,
  onChange?: (value: string) => void
): UseStepFieldReturn {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for controlled input sync
      setLocalValue(initialValue ?? '');
    }
  }, [initialValue, isDirty]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setLocalValue(value);
      setIsDirty(true);

      // Call onChange for immediate feedback (doesn't save)
      if (onChange) {
        onChange(value);
      }
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    if (isDirty && onSave) {
      onSave(localValue);
      setIsDirty(false);
    }
  }, [isDirty, localValue, onSave]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement | HTMLTextAreaElement).blur();
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
