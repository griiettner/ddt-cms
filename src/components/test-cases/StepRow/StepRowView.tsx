/**
 * StepRowView - Pure presentation component
 * No hooks, no state - just renders based on props
 */
import type { KeyboardEvent, ChangeEvent } from 'react';
import ActionResultCell from '../ActionResultCell';
import type {
  TestStep,
  ConfigOption,
  ParsedSelectConfig,
  ParsedMatchConfig,
} from '@/types/entities';

// Flexible step type that works with both TestStep and LocalStep (from reusable case editor)
type FlexibleStep = Omit<TestStep, 'id' | 'test_scenario_id' | 'created_at' | 'updated_at'> & {
  id: number | string;
  test_scenario_id?: number;
  created_at?: string;
  updated_at?: string;
};

interface ActionOption {
  key: string;
  label: string;
}

interface LocalValues {
  step_definition: string;
  element_id: string;
  expected_results: string;
}

type DragHandleProps = Record<string, unknown>;

interface Config {
  types: ConfigOption[];
  actions: ConfigOption[];
}

interface StepRowViewProps {
  step: FlexibleStep;
  config: Config;
  selectConfigs: ParsedSelectConfig[];
  matchConfigs: ParsedMatchConfig[];
  actionOptions: ActionOption[];
  localValues: LocalValues;
  onLocalChange: (
    field: 'step_definition' | 'element_id' | 'expected_results',
    value: string
  ) => void;
  onLocalBlur: (field: 'step_definition' | 'element_id' | 'expected_results') => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onActionChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onRequiredChange: (checked: boolean) => void;
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
  dragHandleProps: DragHandleProps;
  isDragging: boolean;
}

function StepRowView({
  step,
  config,
  selectConfigs,
  matchConfigs,
  actionOptions,
  localValues,
  onLocalChange,
  onLocalBlur,
  onKeyDown,
  onActionChange,
  onTypeChange,
  onRequiredChange,
  onFieldChange,
  onOpenSelectConfig,
  onOpenMatchConfig,
  onOpenTypeConfig,
  onDeleteStep,
  showConfigButtons = true,
  dragHandleProps,
  isDragging: _isDragging,
}: StepRowViewProps): JSX.Element {
  return (
    <>
      {/* Drag Handle */}
      <td>
        <button className="drag-handle" {...dragHandleProps} title="Drag to reorder">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>
      </td>

      {/* Step Definition */}
      <td>
        <input
          className="cell-input"
          value={localValues.step_definition}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onLocalChange('step_definition', e.target.value)
          }
          onBlur={() => onLocalBlur('step_definition')}
          onKeyDown={onKeyDown}
        />
      </td>

      {/* Type */}
      <td>
        <div className="select-container">
          <select
            className="custom-select"
            value={step.type || ''}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onTypeChange(e.target.value)}
          >
            <option value="">-- Select --</option>
            {config.types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.display_name}
              </option>
            ))}
          </select>
          {showConfigButtons && (
            <button
              className="pencil-btn"
              onClick={() => onOpenTypeConfig('type')}
              title="Edit types"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}
        </div>
      </td>

      {/* Element ID */}
      <td>
        <input
          className="cell-input"
          value={localValues.element_id}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onLocalChange('element_id', e.target.value)
          }
          onBlur={() => onLocalBlur('element_id')}
          onKeyDown={onKeyDown}
        />
      </td>

      {/* Action */}
      <td>
        <select
          className="custom-select"
          value={step.action || ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onActionChange(e.target.value)}
        >
          <option value="">-- Select --</option>
          {actionOptions.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </td>

      {/* Action Result */}
      <td>
        <ActionResultCell
          step={step}
          selectConfigs={selectConfigs}
          matchConfigs={matchConfigs}
          onFieldChange={onFieldChange}
          onOpenSelectConfig={onOpenSelectConfig}
          onOpenMatchConfig={onOpenMatchConfig}
          showConfigButtons={showConfigButtons}
        />
      </td>

      {/* Required */}
      <td>
        <input
          type="checkbox"
          className="ml-4"
          checked={step.required === true || (step.required as unknown) === 'true'}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onRequiredChange(e.target.checked)}
        />
      </td>

      {/* Expected Results */}
      <td>
        <input
          className="cell-input"
          value={localValues.expected_results}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onLocalChange('expected_results', e.target.value)
          }
          onBlur={() => onLocalBlur('expected_results')}
          onKeyDown={onKeyDown}
        />
      </td>

      {/* Delete */}
      <td>
        <button className="trash-btn" onClick={() => onDeleteStep(step.id)} title="Delete Step">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </td>
    </>
  );
}

export default StepRowView;
