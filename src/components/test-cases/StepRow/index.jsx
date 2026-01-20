/**
 * StepRow - Container component
 * Thin wrapper connecting hook to view
 */
import { memo } from 'react';
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
  onOpenTypeConfig
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

  return (
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
    />
  );
}

export default memo(StepRow);
