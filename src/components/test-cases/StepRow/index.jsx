/**
 * StepRow - Container component
 * Thin wrapper connecting hook to view with drag and drop support
 */
import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStepRow } from './useStepRow';
import StepRowView from './StepRowView';

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
}) {
  const {
    localValues,
    handleLocalChange,
    handleLocalBlur,
    handleKeyDown,
    handleActionChange,
    handleTypeChange,
    handleRequiredChange,
  } = useStepRow(step, onFieldChange);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

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
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </tr>
  );
}

export default memo(StepRow);
