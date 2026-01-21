import { memo } from 'react';
import { useStepField } from '@/hooks/useStepField';

interface TextInputCellProps {
  value: string | null | undefined;
  field: string;
  onSave: (field: string, value: string) => void;
}

function TextInputCell({ value, field, onSave }: TextInputCellProps): JSX.Element {
  const fieldState = useStepField(value, (newValue) => onSave(field, newValue));

  return <input className="cell-input" {...fieldState.handlers} />;
}

export default memo(TextInputCell);
