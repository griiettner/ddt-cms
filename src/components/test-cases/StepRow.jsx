import { memo, useCallback, useState, useRef, useEffect } from 'react';
import ActionResultCell from './ActionResultCell';

/**
 * StepRow - A single row in the steps table
 * Manages its own local state for text inputs to prevent data loss
 */
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
  // Local state for text inputs to prevent loss during parent re-renders
  const [localValues, setLocalValues] = useState({
    step_definition: step.step_definition || '',
    element_id: step.element_id || '',
    expected_results: step.expected_results || '',
  });

  // Track if user is actively editing
  const isEditing = useRef({
    step_definition: false,
    element_id: false,
    expected_results: false,
  });

  // Sync with props only if not editing
  useEffect(() => {
    setLocalValues(prev => ({
      step_definition: isEditing.current.step_definition ? prev.step_definition : (step.step_definition || ''),
      element_id: isEditing.current.element_id ? prev.element_id : (step.element_id || ''),
      expected_results: isEditing.current.expected_results ? prev.expected_results : (step.expected_results || ''),
    }));
  }, [step.step_definition, step.element_id, step.expected_results]);

  const handleLocalChange = useCallback((field, value) => {
    isEditing.current[field] = true;
    setLocalValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleLocalBlur = useCallback((field) => {
    isEditing.current[field] = false;
    onFieldChange(step.id, field, localValues[field]);
  }, [step.id, localValues, onFieldChange]);

  const handleKeyDown = useCallback((e, field) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  }, []);

  const handleActionChange = useCallback((e) => {
    const newAction = e.target.value;
    // Update action and clear action_result
    onFieldChange(step.id, 'action', newAction);
    onFieldChange(step.id, 'action_result', '');
  }, [step.id, onFieldChange]);

  const handleTypeChange = useCallback((e) => {
    onFieldChange(step.id, 'type', e.target.value);
  }, [step.id, onFieldChange]);

  const handleRequiredChange = useCallback((e) => {
    onFieldChange(step.id, 'required', e.target.checked ? 'true' : 'false');
  }, [step.id, onFieldChange]);

  return (
    <tr data-id={step.id}>
      {/* Step Definition */}
      <td>
        <input
          className="cell-input"
          value={localValues.step_definition}
          onChange={(e) => handleLocalChange('step_definition', e.target.value)}
          onBlur={() => handleLocalBlur('step_definition')}
          onKeyDown={(e) => handleKeyDown(e, 'step_definition')}
        />
      </td>

      {/* Type */}
      <td>
        <div className="select-container">
          <select
            className="custom-select"
            value={step.type || ''}
            onChange={handleTypeChange}
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
          onChange={(e) => handleLocalChange('element_id', e.target.value)}
          onBlur={() => handleLocalBlur('element_id')}
          onKeyDown={(e) => handleKeyDown(e, 'element_id')}
        />
      </td>

      {/* Action */}
      <td>
        <select
          className="custom-select"
          value={step.action || ''}
          onChange={handleActionChange}
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
          onChange={handleRequiredChange}
        />
      </td>

      {/* Expected Results */}
      <td>
        <input
          className="cell-input"
          value={localValues.expected_results}
          onChange={(e) => handleLocalChange('expected_results', e.target.value)}
          onBlur={() => handleLocalBlur('expected_results')}
          onKeyDown={(e) => handleKeyDown(e, 'expected_results')}
        />
      </td>
    </tr>
  );
}

export default memo(StepRow);
