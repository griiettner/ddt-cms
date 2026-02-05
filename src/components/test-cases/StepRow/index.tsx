/**
 * StepRow - Container component
 * Thin wrapper connecting hook to view with drag and drop support
 */
import { memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStepRow } from './useStepRow';
import StepRowView from './StepRowView';
import type {
  TestStep,
  ConfigOption,
  ParsedSelectConfig,
  ParsedMatchConfig,
} from '@/types/entities';

interface ActionOption {
  key: string;
  label: string;
}

interface Config {
  types: ConfigOption[];
  actions: ConfigOption[];
}

// Flexible step type that works with both TestStep and LocalStep (from reusable case editor)
type FlexibleStep = Omit<TestStep, 'id' | 'test_scenario_id' | 'created_at' | 'updated_at'> & {
  id: number | string;
  test_scenario_id?: number;
  created_at?: string;
  updated_at?: string;
};

interface StepRowProps {
  step: FlexibleStep;
  config: Config;
  selectConfigs: ParsedSelectConfig[];
  matchConfigs: ParsedMatchConfig[];
  actionOptions: ActionOption[];
  onFieldChange: (
    stepId: number | string,
    field: string,
    value: string,
    shouldSave?: boolean
  ) => void;
  onOpenSelectConfig: (stepId: number | string, actionType: string) => void;
  onOpenMatchConfig: (stepId: number | string) => void;
  onOpenTypeConfig: (category: string) => void;
  onDeleteStep: (stepId: number | string) => void;
  showConfigButtons?: boolean;
}

function StepRow({
  step,
  config,
  selectConfigs,
  matchConfigs,
  actionOptions,
  onFieldChange,
  onOpenSelectConfig,
  onOpenMatchConfig,
  onOpenTypeConfig,
  onDeleteStep,
  showConfigButtons = true,
}: StepRowProps): JSX.Element {
  // Adapter for useStepRow which expects a simpler callback signature
  const handleFieldChange = useCallback(
    (stepId: number | string, field: string, value: string | boolean) => {
      onFieldChange(stepId, field, String(value));
    },
    [onFieldChange]
  );

  const {
    localValues,
    handleLocalChange,
    handleLocalBlur,
    handleKeyDown,
    handleActionChange,
    handleTypeChange,
    handleRequiredChange,
  } = useStepRow(step, handleFieldChange);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={{ ...style, opacity: isDragging ? 0.5 : 1 }} data-id={step.id}>
      <StepRowView
        step={step}
        config={config}
        selectConfigs={selectConfigs}
        matchConfigs={matchConfigs}
        actionOptions={actionOptions}
        localValues={localValues}
        onLocalChange={handleLocalChange}
        onLocalBlur={handleLocalBlur}
        onKeyDown={handleKeyDown}
        onActionChange={handleActionChange}
        onTypeChange={handleTypeChange}
        onRequiredChange={handleRequiredChange}
        onFieldChange={onFieldChange}
        onOpenSelectConfig={onOpenSelectConfig}
        onOpenMatchConfig={onOpenMatchConfig}
        onOpenTypeConfig={onOpenTypeConfig}
        onDeleteStep={onDeleteStep}
        showConfigButtons={showConfigButtons}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </tr>
  );
}

export default memo(StepRow);
