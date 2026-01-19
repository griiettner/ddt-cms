import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useRelease } from '../context/ReleaseContext';
import {
  useSteps,
  useConfig,
  useScenarios
} from '../hooks';
import {
  StepRow,
  ScenarioSidebar,
  CaseModal,
  ScenarioModal,
  TypeConfigModal,
  SelectConfigModal,
  MatchConfigModal
} from '../components/test-cases';
import { ConfirmModal, LoadingSpinner } from '../components/common';

function TestCases() {
  const [searchParams] = useSearchParams();
  const testSetId = searchParams.get('testSetId');
  const { selectedReleaseId } = useRelease();

  // Custom Hooks for state management and logic
  const {
    scenarios,
    selectedScenarioId,
    selectedScenario,
    testSetName,
    openCases,
    testCases,
    groupedScenarios,
    loading: scenariosLoading,
    loadTestSetInfo,
    loadScenarios,
    selectScenario,
    toggleCase,
    createCase,
    loadTestCases,
    createScenario,
    deleteScenario,
    updateScenarioName,
  } = useScenarios(selectedReleaseId, testSetId);

  const {
    steps,
    loading: stepsLoading,
    loadSteps,
    updateStepField,
    addStep,
  } = useSteps(selectedReleaseId);

  const {
    config,
    selectConfigs,
    matchConfigs,
    actionOptions,
    loadConfig,
    updateTypes,
    saveSelectConfig,
    saveMatchConfig,
    getSelectConfigsByType,
  } = useConfig(selectedReleaseId);

  // Local UI State for Modals
  const [caseModalState, setCaseModalState] = useState({ open: false, name: '' });
  const [scenarioModalState, setScenarioModalState] = useState({ open: false, name: '', testCaseId: '' });
  const [typeConfigModalState, setTypeConfigModalState] = useState({ open: false, category: '', options: '' });
  const [selectConfigModalState, setSelectConfigModalState] = useState({
    open: false,
    stepId: null,
    configType: 'custom_select',
    selectedId: '',
    name: '',
    options: '',
  });
  const [matchConfigModalState, setMatchConfigModalState] = useState({
    open: false,
    stepId: null,
    selectedId: '',
    name: '',
    options: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false });

  // Load initial data
  useEffect(() => {
    if (!selectedReleaseId || !testSetId) return;
    
    const init = async () => {
      await Promise.all([
        loadConfig(),
        loadTestSetInfo(),
        loadScenarios()
      ]);
    };
    init();
  }, [selectedReleaseId, testSetId, loadConfig, loadTestSetInfo, loadScenarios]);

  // Load steps when scenario changes
  useEffect(() => {
    if (selectedScenarioId) {
      loadSteps(selectedScenarioId);
    }
  }, [selectedScenarioId, loadSteps]);

  // Modal Handlers
  const handleOpenCaseModal = () => setCaseModalState({ open: true, name: '' });
  
  const handleOpenScenarioModal = async () => {
    try {
      const cases = await loadTestCases();
      if (cases.length === 0) {
        if (confirm('A Test Case is required to hold scenarios. Would you like to create one now?')) {
          handleOpenCaseModal();
        }
        return;
      }
      setScenarioModalState({ open: true, name: '', testCaseId: cases[0]?.id || '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenSelectConfigModal = useCallback((stepId, configType) => {
    const step = steps.find(s => s.id === stepId);
    const filtered = selectConfigs.filter(c => c.config_type === configType);
    const existing = filtered.find(c => c.id === step?.select_config_id);

    setSelectConfigModalState({
      open: true,
      stepId,
      configType,
      selectedId: existing?.id || '',
      name: existing?.name || '',
      options: existing?.options.join('\n') || '',
    });
  }, [steps, selectConfigs]);

  const handleOpenMatchConfigModal = useCallback((stepId) => {
    const step = steps.find(s => s.id === stepId);
    const existing = matchConfigs.find(c => c.id === step?.match_config_id);

    setMatchConfigModalState({
      open: true,
      stepId,
      selectedId: existing?.id || '',
      name: existing?.name || '',
      options: existing?.options.join('\n') || '',
    });
  }, [steps, matchConfigs]);

  const handleOpenTypeConfigModal = useCallback((category) => {
    const options = config[category + 's']?.map(o => o.display_name).join('\n') || '';
    setTypeConfigModalState({ open: true, category, options });
  }, [config]);

  // Submit Handlers
  const onSubmitCase = async (e) => {
    e.preventDefault();
    try {
      const res = await createCase(caseModalState.name);
      setCaseModalState({ open: false, name: '' });
      if (res.scenarioId) {
        selectScenario(res.scenarioId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const onSubmitScenario = async (e) => {
    e.preventDefault();
    try {
      const res = await createScenario(scenarioModalState.testCaseId, scenarioModalState.name);
      setScenarioModalState({ open: false, name: '', testCaseId: '' });
      if (res.id) {
        selectScenario(res.id);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const onSaveSelectConfig = async () => {
    try {
      const { stepId, selectedId, name, options, configType } = selectConfigModalState;
      const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);
      
      const configId = await saveSelectConfig({ 
        stepId, selectedId, name, options: optionsList, configType 
      });
      
      // Update the step with the new config ID
      await updateStepField(stepId, 'select_config_id', configId);
      
      setSelectConfigModalState({ open: false, stepId: null, configType: 'custom_select', selectedId: '', name: '', options: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const onSaveMatchConfig = async () => {
    try {
      const { stepId, selectedId, name, options } = matchConfigModalState;
      const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);
      
      const configId = await saveMatchConfig({ 
        selectedId, name, options: optionsList 
      });
      
      // Update the step
      await updateStepField(stepId, 'match_config_id', configId);
      await updateStepField(stepId, 'action_result', JSON.stringify(optionsList));
      
      setMatchConfigModalState({ open: false, stepId: null, selectedId: '', name: '', options: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const onSaveTypeConfig = async () => {
    const lines = typeConfigModalState.options.split('\n').filter(l => l.trim());
    const optionsArray = lines.map(l => ({ display_name: l.trim() }));
    try {
      await updateTypes(optionsArray);
      setTypeConfigModalState({ open: false, category: '', options: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const onDeleteScenarioConfirm = async () => {
    try {
      await deleteScenario(selectedScenarioId);
      setDeleteConfirm({ open: false });
    } catch (err) {
      alert(err.message);
    }
  };

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

  const isLoading = scenariosLoading || stepsLoading;

  return (
    <div className="editor-container">
      <ScenarioSidebar
        scenarios={scenarios}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={selectScenario}
        openCases={openCases}
        toggleCase={toggleCase}
        onAddCase={handleOpenCaseModal}
        onAddScenario={handleOpenScenarioModal}
      />

      <div className="main-editor">
        <div className="editor-header">
          <div className="flex items-center gap-2">
            <h2
              className="text-xl font-bold text-co-blue editable-title"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateScenarioName(selectedScenarioId, e.currentTarget.textContent.trim())}
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
            <button onClick={() => addStep(selectedScenarioId)} className="btn-primary btn-sm">
              Add Step
            </button>
          </div>
        </div>

        <div className="steps-wrapper">
          {isLoading && steps.length === 0 ? (
            <LoadingSpinner className="py-20" />
          ) : (
            <>
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
                        actionOptions={actionOptions}
                        onFieldChange={updateStepField}
                        onOpenSelectConfig={handleOpenSelectConfigModal}
                        onOpenMatchConfig={handleOpenMatchConfigModal}
                        onOpenTypeConfig={handleOpenTypeConfigModal}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      <CaseModal
        isOpen={caseModalState.open}
        onClose={() => setCaseModalState(prev => ({ ...prev, open: false }))}
        onSubmit={onSubmitCase}
        name={caseModalState.name}
        setName={(name) => setCaseModalState(prev => ({ ...prev, name }))}
      />

      <ScenarioModal
        isOpen={scenarioModalState.open}
        onClose={() => setScenarioModalState(prev => ({ ...prev, open: false }))}
        onSubmit={onSubmitScenario}
        name={scenarioModalState.name}
        setName={(name) => setScenarioModalState(prev => ({ ...prev, name }))}
        testCaseId={scenarioModalState.testCaseId}
        setTestCaseId={(testCaseId) => setScenarioModalState(prev => ({ ...prev, testCaseId }))}
        testCases={testCases}
      />

      <TypeConfigModal
        isOpen={typeConfigModalState.open}
        onClose={() => setTypeConfigModalState(prev => ({ ...prev, open: false }))}
        onSave={onSaveTypeConfig}
        category={typeConfigModalState.category}
        options={typeConfigModalState.options}
        setOptions={(options) => setTypeConfigModalState(prev => ({ ...prev, options }))}
      />

      <SelectConfigModal
        isOpen={selectConfigModalState.open}
        onClose={() => setSelectConfigModalState(prev => ({ ...prev, open: false }))}
        onSave={onSaveSelectConfig}
        configType={selectConfigModalState.configType}
        selectedId={selectConfigModalState.selectedId}
        setSelectedId={(selectedId) => {
          const cfg = selectConfigs.find(c => c.id === Number(selectedId));
          setSelectConfigModalState(prev => ({
            ...prev,
            selectedId,
            name: cfg?.name || '',
            options: cfg?.options.join('\n') || '',
          }));
        }}
        name={selectConfigModalState.name}
        setName={(name) => setSelectConfigModalState(prev => ({ ...prev, name }))}
        options={selectConfigModalState.options}
        setOptions={(options) => setSelectConfigModalState(prev => ({ ...prev, options }))}
        allConfigs={selectConfigs}
      />

      <MatchConfigModal
        isOpen={matchConfigModalState.open}
        onClose={() => setMatchConfigModalState(prev => ({ ...prev, open: false }))}
        onSave={onSaveMatchConfig}
        selectedId={matchConfigModalState.selectedId}
        setSelectedId={(selectedId) => {
          const cfg = matchConfigs.find(c => c.id === Number(selectedId));
          setMatchConfigModalState(prev => ({
            ...prev,
            selectedId,
            name: cfg?.name || '',
            options: cfg?.options.join('\n') || '',
          }));
        }}
        name={matchConfigModalState.name}
        setName={(name) => setMatchConfigModalState(prev => ({ ...prev, name }))}
        options={matchConfigModalState.options}
        setOptions={(options) => setMatchConfigModalState(prev => ({ ...prev, options }))}
        allConfigs={matchConfigs}
      />

      {/* Delete Scenario Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false })}
        onConfirm={onDeleteScenarioConfirm}
        title="Delete Scenario?"
        message={`Are you sure you want to delete "${selectedScenario?.name}"? This will permanently remove all associated test steps.`}
        confirmText="Delete Scenario"
      />
    </div>
  );
}

export default TestCases;
