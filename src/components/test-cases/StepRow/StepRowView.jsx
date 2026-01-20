/**
 * StepRowView - Pure presentation component
 * No hooks, no state - just renders based on props
 */
import ActionResultCell from '../ActionResultCell';

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
  dragHandleProps,
  isDragging,
}) {
  return (
    <>
      {/* Drag Handle */}
      <td>
        <button
          className="drag-handle"
          {...dragHandleProps}
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
          </svg>
        </button>
      </td>

      {/* Step Definition */}
      <td>
        <input
          className="cell-input"
          value={localValues.step_definition}
          onChange={(e) => onLocalChange('step_definition', e.target.value)}
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
            onChange={(e) => onTypeChange(e.target.value)}
          >
            <option value="">-- Select --</option>
            {config.types.map(t => (
              <option key={t.key} value={t.key}>{t.display_name}</option>
            ))}
          </select>
          <button
            className="pencil-btn"
            onClick={() => onOpenTypeConfig('type')}
            title="Edit types"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      </td>

      {/* Element ID */}
      <td>
        <input
          className="cell-input"
          value={localValues.element_id}
          onChange={(e) => onLocalChange('element_id', e.target.value)}
          onBlur={() => onLocalBlur('element_id')}
          onKeyDown={onKeyDown}
        />
      </td>

      {/* Action */}
      <td>
        <select
          className="custom-select"
          value={step.action || ''}
          onChange={(e) => onActionChange(e.target.value)}
        >
          <option value="">-- Select --</option>
          {actionOptions.map(a => (
            <option key={a.key} value={a.key}>{a.label}</option>
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
        />
      </td>

      {/* Required */}
      <td>
        <input
          type="checkbox"
          className="ml-4"
          checked={step.required === 'true' || step.required === true}
          onChange={(e) => onRequiredChange(e.target.checked)}
        />
      </td>

      {/* Expected Results */}
      <td>
        <input
          className="cell-input"
          value={localValues.expected_results}
          onChange={(e) => onLocalChange('expected_results', e.target.value)}
          onBlur={() => onLocalBlur('expected_results')}
          onKeyDown={onKeyDown}
        />
      </td>

      {/* Delete */}
      <td>
        <button
          className="trash-btn"
          onClick={() => onDeleteStep(step.id)}
          title="Delete Step"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </>
  );
}

export default StepRowView;
