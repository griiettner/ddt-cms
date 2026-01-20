import { memo, useCallback } from 'react';

/**
 * ActionResultCell - Renders the appropriate input based on action type
 * Uses internal state to prevent data loss
 */
function ActionResultCell({ 
  step, 
  selectConfigs, 
  matchConfigs, 
  onFieldChange,
  onOpenSelectConfig,
  onOpenMatchConfig 
}) {
  const actionKey = step.action || '';

  const handleCheckboxChange = useCallback((e) => {
    onFieldChange(step.id, 'action_result', e.target.checked ? 'true' : 'false');
  }, [step.id, onFieldChange]);

  const handleTextChange = useCallback((e) => {
    onFieldChange(step.id, 'action_result', e.target.value, false);
  }, [step.id, onFieldChange]);

  const handleTextBlur = useCallback((e) => {
    onFieldChange(step.id, 'action_result', e.target.value);
  }, [step.id, onFieldChange]);

  const handleSelectChange = useCallback((e) => {
    onFieldChange(step.id, 'action_result', e.target.value);
  }, [step.id, onFieldChange]);

  switch (actionKey) {
    case 'active':
    case 'visible': {
      const isChecked = step.action_result === 'true' || step.action_result === true || step.action_result === '1';
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
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        />
      );

    case 'click':
      return <input className="cell-input bg-co-gray-50 cursor-not-allowed" disabled value="N/A" />;

    case 'custom_select':
    case 'url': {
      // Ensure numeric comparison for config id
      const selectConfigId = step.select_config_id ? Number(step.select_config_id) : null;
      const configItem = selectConfigs.find(c => c.id === selectConfigId);
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
              <option key={`${o}-${idx}`} value={o}>{o}</option>
            ))}
          </select>
          <button
            className="select-config-btn"
            onClick={() => onOpenSelectConfig(step.id, actionKey)}
            title="Manage dropdown options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      );
    }

    case 'options_match': {
      // Ensure numeric comparison for config id
      const matchConfigId = step.match_config_id ? Number(step.match_config_id) : null;
      const matchConfig = matchConfigs.find(c => c.id === matchConfigId);
      const options = matchConfig?.options || [];
      return (
        <div className="select-container">
          <input
            className="cell-input bg-co-gray-50 cursor-pointer"
            readOnly
            value={step.action_result || '[]'}
            title={`Options: ${JSON.stringify(options)}`}
          />
          <button
            className="match-config-btn"
            onClick={() => onOpenMatchConfig(step.id)}
            title="Manage match options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      );
    }

    default:
      return (
        <input
          className="cell-input bg-co-gray-50 cursor-not-allowed"
          disabled
          value=""
          placeholder="Select an action first"
        />
      );
  }
}

export default memo(ActionResultCell);
