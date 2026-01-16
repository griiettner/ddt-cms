import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useRelease } from '../context/ReleaseContext';
import {
  testCasesApi,
  testStepsApi,
  testSetsApi,
  configApi,
  selectConfigsApi,
  matchConfigsApi,
} from '../services/api';
import { Modal, ConfirmModal, LoadingSpinner } from '../components/common';

// Sidebar component
function ScenarioSidebar({
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  openCases,
  toggleCase,
  onAddCase,
  onAddScenario,
}) {
  // Group scenarios by case
  const groups = useMemo(() => {
    const g = {};
    scenarios.forEach(s => {
      if (!g[s.case_name]) g[s.case_name] = [];
      g[s.case_name].push(s);
    });
    return g;
  }, [scenarios]);

  return (
    <div className="sidebar-tabs">
      <div className="sidebar-header">
        <h3 className="text-xs font-bold uppercase text-co-gray-500 tracking-widest mb-4">
          Structure
        </h3>
        <div className="combo-buttons">
          <button
            onClick={onAddCase}
            className="bg-white border border-co-blue text-co-blue font-bold rounded hover:bg-co-blue/5 transition-colors"
          >
            + New Case
          </button>
          <button onClick={onAddScenario} className="btn-primary font-bold rounded">
            + New Scenario
          </button>
        </div>
      </div>

      {Object.entries(groups).length === 0 ? (
        <div className="p-10 text-center text-co-gray-400 text-sm italic">
          No scenarios found. Create a test case to get started.
        </div>
      ) : (
        Object.entries(groups).map(([caseName, caseScenarios]) => (
          <div key={caseName} className={`case-accordion ${openCases.has(caseName) ? 'open' : ''}`}>
            <div className="case-header" onClick={() => toggleCase(caseName)}>
              <span className="case-title">{caseName}</span>
              <svg
                className={`w-4 h-4 text-co-gray-500 transition-transform ${openCases.has(caseName) ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {openCases.has(caseName) && (
              <div className="bg-co-gray-50">
                {caseScenarios.map(s => (
                  <div
                    key={s.id}
                    className={`scenario-tab ${selectedScenarioId === s.id ? 'active' : ''}`}
                    onClick={() => onSelectScenario(s.id)}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Steps table row component
function StepRow({ step, config, selectConfigs, matchConfigs, onFieldChange, onOpenSelectConfig, onOpenMatchConfig, onOpenTypeConfig }) {
  const renderActionResultCell = () => {
    const actionKey = step.action || '';

    switch (actionKey) {
      case 'active':
      case 'visible': {
        const isChecked = step.action_result === 'true' || step.action_result === true || step.action_result === '1';
        return (
          <input
            type="checkbox"
            className="ml-4"
            checked={isChecked}
            onChange={(e) => onFieldChange(step.id, 'action_result', e.target.checked ? 'true' : 'false')}
          />
        );
      }

      case 'text_match':
      case 'text_plain':
        return (
          <input
            className="cell-input"
            value={step.action_result || ''}
            onChange={(e) => onFieldChange(step.id, 'action_result', e.target.value, false)}
            onBlur={(e) => onFieldChange(step.id, 'action_result', e.target.value)}
          />
        );

      case 'click':
        return <input className="cell-input bg-co-gray-50 cursor-not-allowed" disabled value="N/A" />;

      case 'custom_select':
      case 'url': {
        const configItem = selectConfigs.find(c => c.id === step.select_config_id);
        const options = configItem?.options || [];
        return (
          <div className="select-container">
            <select
              className="custom-select"
              value={step.action_result || ''}
              onChange={(e) => onFieldChange(step.id, 'action_result', e.target.value)}
            >
              <option value="">-- Select --</option>
              {options.map(o => (
                <option key={o} value={o}>{o}</option>
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
        const matchConfig = matchConfigs.find(c => c.id === step.match_config_id);
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
  };

  const actions = [
    { key: 'active', label: 'Active' },
    { key: 'click', label: 'Click' },
    { key: 'custom_select', label: 'Custom Select' },
    { key: 'options_match', label: 'Options Match' },
    { key: 'text_match', label: 'Text Match' },
    { key: 'text_plain', label: 'Text Plain' },
    { key: 'url', label: 'URL' },
    { key: 'visible', label: 'Visible' },
  ];

  return (
    <tr data-id={step.id}>
      <td>
        <input
          className="cell-input"
          value={step.step_definition || ''}
          onChange={(e) => onFieldChange(step.id, 'step_definition', e.target.value, false)}
          onBlur={(e) => onFieldChange(step.id, 'step_definition', e.target.value)}
        />
      </td>
      <td>
        <div className="select-container">
          <select
            className="custom-select"
            value={step.type || ''}
            onChange={(e) => onFieldChange(step.id, 'type', e.target.value)}
          >
            <option value="">-- Select --</option>
            {config.types.map(t => (
              <option key={t.key} value={t.key}>{t.display_name}</option>
            ))}
          </select>
          <button className="pencil-btn" onClick={() => onOpenTypeConfig('type')} title="Edit types">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </div>
      </td>
      <td>
        <input
          className="cell-input"
          value={step.element_id || ''}
          onChange={(e) => onFieldChange(step.id, 'element_id', e.target.value, false)}
          onBlur={(e) => onFieldChange(step.id, 'element_id', e.target.value)}
        />
      </td>
      <td>
        <select
          className="custom-select"
          value={step.action || ''}
          onChange={(e) => {
            onFieldChange(step.id, 'action', e.target.value);
            onFieldChange(step.id, 'action_result', '');
          }}
        >
          <option value="">-- Select --</option>
          {actions.map(a => (
            <option key={a.key} value={a.key}>{a.label}</option>
          ))}
        </select>
      </td>
      <td>{renderActionResultCell()}</td>
      <td>
        <input
          type="checkbox"
          className="ml-4"
          checked={step.required === 'true' || step.required === true}
          onChange={(e) => onFieldChange(step.id, 'required', e.target.checked ? 'true' : 'false')}
        />
      </td>
      <td>
        <input
          className="cell-input"
          value={step.expected_results || ''}
          onChange={(e) => onFieldChange(step.id, 'expected_results', e.target.value, false)}
          onBlur={(e) => onFieldChange(step.id, 'expected_results', e.target.value)}
        />
      </td>
    </tr>
  );
}

function TestCases() {
  const [searchParams] = useSearchParams();
  const testSetId = searchParams.get('testSetId');
  const { selectedReleaseId } = useRelease();

  const [testSetName, setTestSetName] = useState('Loading...');
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [steps, setSteps] = useState([]);
  const [config, setConfig] = useState({ types: [], actions: [] });
  const [selectConfigs, setSelectConfigs] = useState([]);
  const [matchConfigs, setMatchConfigs] = useState([]);
  const [openCases, setOpenCases] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Modals
  const [caseModal, setCaseModal] = useState({ open: false, name: '' });
  const [scenarioModal, setScenarioModal] = useState({ open: false, name: '', testCaseId: '' });
  const [typeConfigModal, setTypeConfigModal] = useState({ open: false, category: '', options: '' });
  const [selectConfigModal, setSelectConfigModal] = useState({
    open: false,
    stepId: null,
    configType: 'custom_select',
    selectedId: '',
    name: '',
    options: '',
  });
  const [matchConfigModal, setMatchConfigModal] = useState({
    open: false,
    stepId: null,
    selectedId: '',
    name: '',
    options: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false });
  const [testCases, setTestCases] = useState([]);

  // Load initial data
  useEffect(() => {
    if (!selectedReleaseId || !testSetId) return;
    loadAllData();
  }, [selectedReleaseId, testSetId]);

  async function loadAllData() {
    setLoading(true);
    try {
      await Promise.all([loadConfig(), loadTestSetInfo(), loadScenarios()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    try {
      const [typesRes, actionsRes, selectRes, matchRes] = await Promise.all([
        configApi.getTypes(selectedReleaseId),
        configApi.getActions(selectedReleaseId),
        selectConfigsApi.list(),
        matchConfigsApi.list(),
      ]);
      setConfig({ types: typesRes.data, actions: actionsRes.data });
      setSelectConfigs(selectRes.data);
      setMatchConfigs(matchRes.data);
    } catch (err) {
      console.error('Failed to load config', err);
    }
  }

  async function loadTestSetInfo() {
    try {
      const res = await testSetsApi.get(selectedReleaseId, testSetId);
      setTestSetName(res.data.name);
    } catch (err) {
      console.error('Failed to load test set info', err);
    }
  }

  async function loadScenarios() {
    try {
      const res = await testCasesApi.getAllScenarios(selectedReleaseId, { testSetId });
      setScenarios(res.data);

      // Auto-select first scenario
      if (res.data.length > 0 && !selectedScenarioId) {
        selectScenario(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load scenarios', err);
    }
  }

  async function loadSteps() {
    if (!selectedScenarioId) return;
    try {
      const res = await testStepsApi.list(selectedReleaseId, { scenarioId: selectedScenarioId });
      setSteps(res.data);
    } catch (err) {
      console.error('Failed to load steps', err);
    }
  }

  async function selectScenario(id) {
    setSelectedScenarioId(id);
    const scenario = scenarios.find(s => s.id === id);
    if (scenario) {
      setOpenCases(prev => new Set([...prev, scenario.case_name]));
    }
  }

  useEffect(() => {
    if (selectedScenarioId) {
      loadSteps();
    }
  }, [selectedScenarioId]);

  function toggleCase(caseName) {
    setOpenCases(prev => {
      const next = new Set(prev);
      if (next.has(caseName)) {
        next.delete(caseName);
      } else {
        next.add(caseName);
      }
      return next;
    });
  }

  // Field change handlers
  const handleFieldChange = useCallback(async (stepId, field, value, shouldSave = true) => {
    // Update local state immediately
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, [field]: value } : s));

    // Save to server if requested
    if (shouldSave && !String(stepId).startsWith('temp')) {
      try {
        await testStepsApi.update(selectedReleaseId, stepId, { [field]: value });
      } catch (err) {
        console.error('Failed to save field', err);
      }
    }
  }, [selectedReleaseId]);

  // Add new step
  async function handleAddStep() {
    if (!selectedScenarioId) return;

    const tempId = `temp-${Date.now()}`;
    const newStep = {
      id: tempId,
      step_definition: '',
      order_index: steps.length,
    };

    setSteps(prev => [...prev, newStep]);

    try {
      await testStepsApi.sync(selectedReleaseId, {
        scenarioId: selectedScenarioId,
        steps: [...steps, newStep].map(s => {
          const { id, ...rest } = s;
          return String(id).startsWith('temp') ? { step_definition: '', ...rest } : s;
        }),
      });
      await loadSteps();
    } catch (err) {
      console.error('Failed to sync steps', err);
    }
  }

  // Create case
  async function handleCreateCase(e) {
    e.preventDefault();
    try {
      const res = await testCasesApi.create(selectedReleaseId, {
        testSetId,
        name: caseModal.name,
      });
      setCaseModal({ open: false, name: '' });
      await loadScenarios();
      if (res.data.scenarioId) {
        selectScenario(res.data.scenarioId);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Create scenario
  async function handleCreateScenario(e) {
    e.preventDefault();
    try {
      const res = await testCasesApi.createScenario(selectedReleaseId, {
        testCaseId: scenarioModal.testCaseId,
        name: scenarioModal.name,
      });
      setScenarioModal({ open: false, name: '', testCaseId: '' });
      await loadScenarios();
      if (res.data.id) {
        selectScenario(res.data.id);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Delete scenario
  async function handleDeleteScenario() {
    try {
      await testCasesApi.deleteScenario(selectedReleaseId, selectedScenarioId);
      await loadScenarios();

      if (scenarios.length > 1) {
        const remaining = scenarios.filter(s => s.id !== selectedScenarioId);
        if (remaining.length > 0) {
          selectScenario(remaining[0].id);
        }
      } else {
        setSelectedScenarioId(null);
        setSteps([]);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  // Update scenario title
  async function handleScenarioTitleBlur(e) {
    const newName = e.currentTarget.textContent.trim();
    if (!newName || !selectedScenarioId) return;

    try {
      await testCasesApi.updateScenario(selectedReleaseId, selectedScenarioId, { name: newName });
      setScenarios(prev => prev.map(s => s.id === selectedScenarioId ? { ...s, name: newName } : s));
    } catch (err) {
      console.error('Failed to save scenario title', err);
    }
  }

  // Open scenario modal with test cases
  async function openScenarioModal() {
    try {
      const res = await testCasesApi.list(selectedReleaseId, { testSetId });
      if (res.data.length === 0) {
        if (confirm('A Test Case is required to hold scenarios. Would you like to create one now?')) {
          setCaseModal({ open: true, name: '' });
        }
        return;
      }
      setTestCases(res.data);
      setScenarioModal({ open: true, name: '', testCaseId: res.data[0]?.id || '' });
    } catch (err) {
      alert(err.message);
    }
  }

  // Type config modal handlers
  async function handleSaveTypeConfig() {
    const lines = typeConfigModal.options.split('\n').filter(l => l.trim());
    const options = lines.map(l => ({ display_name: l.trim() }));

    try {
      await configApi.bulkUpdateTypes(selectedReleaseId, options);
      setTypeConfigModal({ open: false, category: '', options: '' });
      await loadConfig();
    } catch (err) {
      alert(err.message);
    }
  }

  // Select config modal handlers
  async function handleSaveSelectConfig() {
    const { stepId, selectedId, name, options, configType } = selectConfigModal;
    const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);

    if (!name) {
      alert('Please enter a name for the dropdown configuration.');
      return;
    }

    try {
      let configId = selectedId;

      if (selectedId) {
        await selectConfigsApi.update(selectedId, { name, options: optionsList });
      } else {
        const res = await selectConfigsApi.create({ name, options: optionsList, config_type: configType });
        configId = res.data.id;
      }

      await testStepsApi.update(selectedReleaseId, stepId, { select_config_id: configId });
      setSelectConfigModal({ open: false, stepId: null, configType: 'custom_select', selectedId: '', name: '', options: '' });
      await loadConfig();
      await loadSteps();
    } catch (err) {
      alert(err.message);
    }
  }

  // Match config modal handlers
  async function handleSaveMatchConfig() {
    const { stepId, selectedId, name, options } = matchConfigModal;
    const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);

    if (!name) {
      alert('Please enter a name for the match configuration.');
      return;
    }

    try {
      let configId = selectedId;

      if (selectedId) {
        await matchConfigsApi.update(selectedId, { name, options: optionsList });
      } else {
        const res = await matchConfigsApi.create({ name, options: optionsList });
        configId = res.data.id;
      }

      await testStepsApi.update(selectedReleaseId, stepId, {
        match_config_id: configId,
        action_result: JSON.stringify(optionsList),
      });
      setMatchConfigModal({ open: false, stepId: null, selectedId: '', name: '', options: '' });
      await loadConfig();
      await loadSteps();
    } catch (err) {
      alert(err.message);
    }
  }

  // Open select config modal
  function openSelectConfigModal(stepId, configType) {
    const step = steps.find(s => s.id === stepId);
    const filtered = selectConfigs.filter(c => c.config_type === configType);
    const existing = filtered.find(c => c.id === step?.select_config_id);

    setSelectConfigModal({
      open: true,
      stepId,
      configType,
      selectedId: existing?.id || '',
      name: existing?.name || '',
      options: existing?.options.join('\n') || '',
    });
  }

  // Open match config modal
  function openMatchConfigModal(stepId) {
    const step = steps.find(s => s.id === stepId);
    const existing = matchConfigs.find(c => c.id === step?.match_config_id);

    setMatchConfigModal({
      open: true,
      stepId,
      selectedId: existing?.id || '',
      name: existing?.name || '',
      options: existing?.options.join('\n') || '',
    });
  }

  // Open type config modal
  function openTypeConfigModal(category) {
    const options = config[category + 's']?.map(o => o.display_name).join('\n') || '';
    setTypeConfigModal({ open: true, category, options });
  }

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  if (!testSetId || !selectedReleaseId) {
    return (
      <div className="p-8 text-center">
        <p className="text-co-gray-500">Missing Release ID or Test Set ID</p>
        <Link to="/test-sets" className="btn-primary mt-4 inline-block">
          Go to Test Suites
        </Link>
      </div>
    );
  }

  return (
    <div className="editor-container">
      {/* Sidebar */}
      <ScenarioSidebar
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={selectScenario}
        openCases={openCases}
        toggleCase={toggleCase}
        onAddCase={() => setCaseModal({ open: true, name: '' })}
        onAddScenario={openScenarioModal}
      />

      {/* Main Editor */}
      <div className="main-editor">
        <div className="editor-header">
          <div className="flex items-center gap-2">
            <h2
              className="text-xl font-bold text-co-blue editable-title"
              contentEditable
              suppressContentEditableWarning
              onBlur={handleScenarioTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            >
              {selectedScenario?.name || 'Select a scenario'}
            </h2>
            {selectedScenarioId && (
              <button
                className="trash-btn"
                onClick={() => setDeleteConfirm({ open: true })}
                title="Delete Scenario"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Link to="/test-sets" className="btn-outline btn-sm">
              Back to Suites
            </Link>
            <button onClick={handleAddStep} className="btn-primary btn-sm">
              Add Step
            </button>
          </div>
        </div>

        <div className="steps-wrapper">
          {loading ? (
            <LoadingSpinner className="py-20" />
          ) : (
            <>
              {/* Empty state */}
              {steps.length === 0 && selectedScenarioId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-white/70 to-white z-10 pointer-events-none">
                  <div className="text-center -mt-10">
                    <div className="text-4xl mb-4">&#10024;</div>
                    <h3 className="text-2xl font-bold text-co-blue mb-2">Zero steps? No problem.</h3>
                    <p className="text-co-gray-500">This scenario is a blank canvas. Let's add your first test step.</p>
                  </div>
                </div>
              )}

              <table className="steps-table">
                <thead>
                  <tr>
                    <th style={{ width: 250 }}>Step Definition</th>
                    <th style={{ width: 150 }}>Type</th>
                    <th style={{ width: 150 }}>ID</th>
                    <th style={{ width: 150 }}>Action</th>
                    <th style={{ width: 180 }}>Action Result</th>
                    <th style={{ width: 80 }}>Req</th>
                    <th>Expected Results</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.length === 0 && !selectedScenarioId ? (
                    <tr>
                      <td colSpan="7" className="text-center text-co-gray-400 italic py-20">
                        Select a scenario from the left to view steps.
                      </td>
                    </tr>
                  ) : (
                    steps.map(step => (
                      <StepRow
                        key={step.id}
                        step={step}
                        config={config}
                        selectConfigs={selectConfigs}
                        matchConfigs={matchConfigs}
                        onFieldChange={handleFieldChange}
                        onOpenSelectConfig={openSelectConfigModal}
                        onOpenMatchConfig={openMatchConfigModal}
                        onOpenTypeConfig={openTypeConfigModal}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Case Modal */}
      <Modal
        isOpen={caseModal.open}
        onClose={() => setCaseModal({ open: false, name: '' })}
        title="New Test Case"
      >
        <form onSubmit={handleCreateCase}>
          <div className="mb-4">
            <label className="form-label">Case Name (e.g., User Login)</label>
            <input
              type="text"
              className="form-input"
              value={caseModal.name}
              onChange={(e) => setCaseModal(m => ({ ...m, name: e.target.value }))}
              placeholder="Enter case name..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setCaseModal({ open: false, name: '' })} className="px-4 py-2 text-co-gray-700 font-medium">
              Cancel
            </button>
            <button type="submit" className="btn-primary">Create Case</button>
          </div>
        </form>
      </Modal>

      {/* Scenario Modal */}
      <Modal
        isOpen={scenarioModal.open}
        onClose={() => setScenarioModal({ open: false, name: '', testCaseId: '' })}
        title="Create New Scenario"
      >
        <form onSubmit={handleCreateScenario}>
          <div className="mb-4">
            <label className="form-label">Scenario Name</label>
            <input
              type="text"
              className="form-input"
              value={scenarioModal.name}
              onChange={(e) => setScenarioModal(m => ({ ...m, name: e.target.value }))}
              placeholder="e.g., Happy Path"
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Related Test Case</label>
            <select
              className="form-input"
              value={scenarioModal.testCaseId}
              onChange={(e) => setScenarioModal(m => ({ ...m, testCaseId: e.target.value }))}
              required
            >
              <option value="">-- Select Case --</option>
              {testCases.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setScenarioModal({ open: false, name: '', testCaseId: '' })} className="px-4 py-2 text-co-gray-700 font-medium">
              Cancel
            </button>
            <button type="submit" className="btn-primary">Create Scenario</button>
          </div>
        </form>
      </Modal>

      {/* Type Config Modal */}
      <Modal
        isOpen={typeConfigModal.open}
        onClose={() => setTypeConfigModal({ open: false, category: '', options: '' })}
        title={`Edit ${typeConfigModal.category?.toUpperCase()} Options`}
      >
        <p className="text-xs text-co-gray-500 mb-3 uppercase font-bold">One option per line</p>
        <textarea
          className="textarea-full"
          value={typeConfigModal.options}
          onChange={(e) => setTypeConfigModal(m => ({ ...m, options: e.target.value }))}
          placeholder="option1&#10;option2"
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setTypeConfigModal({ open: false, category: '', options: '' })} className="px-4 py-2 text-co-gray-700 font-medium">
            Cancel
          </button>
          <button onClick={handleSaveTypeConfig} className="btn-primary">Save Options</button>
        </div>
      </Modal>

      {/* Select Config Modal */}
      <Modal
        isOpen={selectConfigModal.open}
        onClose={() => setSelectConfigModal({ open: false, stepId: null, configType: 'custom_select', selectedId: '', name: '', options: '' })}
        title={selectConfigModal.configType === 'url' ? 'Manage URL Options' : 'Manage Select Options'}
      >
        <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Choose Existing Dropdown</p>
        <select
          className="form-input mb-4"
          value={selectConfigModal.selectedId}
          onChange={(e) => {
            const id = e.target.value;
            const config = selectConfigs.find(c => c.id === Number(id));
            setSelectConfigModal(m => ({
              ...m,
              selectedId: id,
              name: config?.name || '',
              options: config?.options.join('\n') || '',
            }));
          }}
        >
          <option value="">-- Create New --</option>
          {selectConfigs.filter(c => c.config_type === selectConfigModal.configType).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Dropdown Name</p>
        <input
          className="form-input mb-4"
          value={selectConfigModal.name}
          onChange={(e) => setSelectConfigModal(m => ({ ...m, name: e.target.value }))}
          placeholder="e.g., Countries, Statuses..."
        />

        <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Options (one per line)</p>
        <textarea
          className="textarea-full"
          value={selectConfigModal.options}
          onChange={(e) => setSelectConfigModal(m => ({ ...m, options: e.target.value }))}
          placeholder="Option 1&#10;Option 2&#10;Option 3"
        />

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setSelectConfigModal({ open: false, stepId: null, configType: 'custom_select', selectedId: '', name: '', options: '' })} className="px-4 py-2 text-co-gray-700 font-medium">
            Cancel
          </button>
          <button onClick={handleSaveSelectConfig} className="btn-primary">Save & Apply</button>
        </div>
      </Modal>

      {/* Match Config Modal */}
      <Modal
        isOpen={matchConfigModal.open}
        onClose={() => setMatchConfigModal({ open: false, stepId: null, selectedId: '', name: '', options: '' })}
        title="Manage Match Options"
      >
        <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Choose Existing Match Set</p>
        <select
          className="form-input mb-4"
          value={matchConfigModal.selectedId}
          onChange={(e) => {
            const id = e.target.value;
            const config = matchConfigs.find(c => c.id === Number(id));
            setMatchConfigModal(m => ({
              ...m,
              selectedId: id,
              name: config?.name || '',
              options: config?.options.join('\n') || '',
            }));
          }}
        >
          <option value="">-- Create New --</option>
          {matchConfigs.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Match Set Name</p>
        <input
          className="form-input mb-4"
          value={matchConfigModal.name}
          onChange={(e) => setMatchConfigModal(m => ({ ...m, name: e.target.value }))}
          placeholder="e.g., Expected Status Values..."
        />

        <p className="text-xs text-co-gray-500 mb-2 uppercase font-bold">Options (one per line)</p>
        <textarea
          className="textarea-full"
          value={matchConfigModal.options}
          onChange={(e) => setMatchConfigModal(m => ({ ...m, options: e.target.value }))}
          placeholder="Option 1&#10;Option 2&#10;Option 3"
        />

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setMatchConfigModal({ open: false, stepId: null, selectedId: '', name: '', options: '' })} className="px-4 py-2 text-co-gray-700 font-medium">
            Cancel
          </button>
          <button onClick={handleSaveMatchConfig} className="btn-primary">Save & Apply</button>
        </div>
      </Modal>

      {/* Delete Scenario Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false })}
        onConfirm={handleDeleteScenario}
        title="Delete Scenario?"
        message={`Are you sure you want to delete "${selectedScenario?.name}"? This will permanently remove all associated test steps.`}
        confirmText="Delete Scenario"
      />
    </div>
  );
}

export default TestCases;
