import { memo } from 'react';
import { useStepField } from '../../hooks/useStepField';

/**
 * A single text input cell that manages its own local state
 * to prevent data loss during parent re-renders
 */
function TextInputCell({ value, field, onSave }) {
  const fieldState = useStepField(
    value,
    (newValue) => onSave(field, newValue),
    null // No immediate onChange callback needed
  );

  return (
    <input
      className="cell-input"
      {...fieldState.handlers}
    />
  );
}

export default memo(TextInputCell);
