import { memo, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import type { TestStep, ParsedSelectConfig, ParsedMatchConfig } from '@/types/entities';

// Flexible step type that works with both TestStep and LocalStep (from reusable case editor)
type FlexibleStep = Omit<TestStep, 'id' | 'test_scenario_id' | 'created_at' | 'updated_at'> & {
  id: number | string;
  test_scenario_id?: number;
  created_at?: string;
  updated_at?: string;
};

interface ActionResultCellProps {
  step: FlexibleStep;
  selectConfigs: ParsedSelectConfig[];
  matchConfigs: ParsedMatchConfig[];
  onFieldChange: (
    stepId: number | string,
    field: string,
    value: string,
    shouldSave?: boolean
  ) => void;
  onOpenSelectConfig: (stepId: number | string, actionType: string) => void;
  onOpenMatchConfig: (stepId: number | string) => void;
  showConfigButtons?: boolean;
}

function ActionResultCell({
  step,
  selectConfigs,
  matchConfigs,
  onFieldChange,
  onOpenSelectConfig,
  onOpenMatchConfig,
  showConfigButtons = true,
}: ActionResultCellProps): JSX.Element {
  const actionKey = step.action || '';

  const handleCheckboxChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onFieldChange(step.id, 'action_result', e.target.checked ? 'true' : 'false');
    },
    [step.id, onFieldChange]
  );

  const handleTextBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onFieldChange(step.id, 'action_result', e.target.value);
    },
    [step.id, onFieldChange]
  );

  const handleSelectChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onFieldChange(step.id, 'action_result', e.target.value);
    },
    [step.id, onFieldChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  switch (actionKey) {
    case 'active':
    case 'visible': {
      const isChecked = step.action_result === 'true' || step.action_result === '1';
      return (
        <input
          type="checkbox"
          className="ml-4"
          checked={isChecked}
          onChange={handleCheckboxChange}
        />
      );
    }

    case 'text_match':
    case 'text_plain':
      return (
        <input
          className="cell-input"
          defaultValue={step.action_result || ''}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
        />
      );

    case 'password':
      return (
        <input
          type="password"
          className="cell-input"
          defaultValue={step.action_result || ''}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          placeholder="••••••••"
        />
      );

    case 'click':
      return <input className="cell-input cursor-not-allowed bg-co-gray-50" disabled value="N/A" />;

    case 'custom_select':
    case 'url': {
      const selectConfigId = step.select_config_id ? Number(step.select_config_id) : null;
      const configItem = selectConfigs.find((c) => c.id === selectConfigId);
      const options = configItem?.options || [];
      return (
        <div className="select-container">
          <select
            className="custom-select"
            value={step.action_result || ''}
            onChange={handleSelectChange}
          >
            <option value="">-- Select --</option>
            {options.map((o, idx) => (
              <option key={`${o}-${idx}`} value={o}>
                {o}
              </option>
            ))}
          </select>
          {showConfigButtons && (
            <button
              className="select-config-btn"
              onClick={() => onOpenSelectConfig(step.id, actionKey)}
              title="Manage dropdown options"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      );
    }

    case 'options_match': {
      const matchConfigId = step.match_config_id ? Number(step.match_config_id) : null;
      const matchConfig = matchConfigs.find((c) => c.id === matchConfigId);
      const options = matchConfig?.options || [];
      return (
        <div className="select-container">
          <input
            className="cell-input cursor-pointer bg-co-gray-50"
            readOnly
            value={step.action_result || '[]'}
            title={`Options: ${JSON.stringify(options)}`}
          />
          {showConfigButtons && (
            <button
              className="match-config-btn"
              onClick={() => onOpenMatchConfig(step.id)}
              title="Manage match options"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      );
    }

    default:
      return (
        <input
          className="cell-input cursor-not-allowed bg-co-gray-50"
          disabled
          value=""
          placeholder="Select an action first"
        />
      );
  }
}

export default memo(ActionResultCell);
