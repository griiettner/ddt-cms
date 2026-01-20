/**
 * TestCases Page Hook
 * Combines TanStack Query with local store state
 */
import { useEffect, useCallback, useMemo } from 'react';
import { useSearch } from '@tanstack/react-router';
import {
  useScenariosQuery,
  useTestCasesQuery,
  useStepsQuery,
  useAllConfigQuery,
  useTestSetQuery,
} from '../../../hooks/queries';
import {
  useCreateTestCase,
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
  useUpdateStepField,
  useAddStep,
  useUpdateTypes,
  useSaveSelectConfig,
  useSaveMatchConfig,
} from '../../../hooks/mutations';
import { useRelease } from '../../../context/ReleaseContext';
import { useTestCasesStore } from '../stores/testCasesStore';

export function useTestCasesPage() {
  const { testSetId } = useSearch({ strict: false });
  const { selectedReleaseId } = useRelease();

  // Store state and actions
  const {
    selectedScenarioId,
    openCases,
    modals,
    selectScenario,
    clearScenario,
    toggleCase,
    openCaseModal,
    closeCaseModal,
    setCaseModalName,
    openScenarioModal,
    closeScenarioModal,
    setScenarioModalName,
    setScenarioModalTestCaseId,
    openTypeConfigModal,
    closeTypeConfigModal,
    setTypeConfigOptions,
    openSelectConfigModal,
    closeSelectConfigModal,
    setSelectConfigField,
    openMatchConfigModal,
    closeMatchConfigModal,
    setMatchConfigField,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useTestCasesStore();

  // Queries
  const {
    data: scenarios = [],
    isLoading: scenariosLoading,
  } = useScenariosQuery(selectedReleaseId, testSetId);

  const {
    data: testCases = [],
    refetch: refetchTestCases,
  } = useTestCasesQuery(selectedReleaseId, testSetId);

  const {
    data: testSetInfo,
  } = useTestSetQuery(selectedReleaseId, testSetId);

  const {
    data: steps = [],
    isLoading: stepsLoading,
  } = useStepsQuery(selectedReleaseId, selectedScenarioId);

  const {
    config,
    selectConfigs,
    matchConfigs,
    actionOptions,
    isLoading: configLoading,
  } = useAllConfigQuery(selectedReleaseId);

  // Mutations
  const createCaseMutation = useCreateTestCase(selectedReleaseId);
  const createScenarioMutation = useCreateScenario(selectedReleaseId);
  const updateScenarioMutation = useUpdateScenario(selectedReleaseId);
  const deleteScenarioMutation = useDeleteScenario(selectedReleaseId);
  const updateStepMutation = useUpdateStepField(selectedReleaseId, selectedScenarioId);
  const addStepMutation = useAddStep(selectedReleaseId);
  const updateTypesMutation = useUpdateTypes(selectedReleaseId);
  const saveSelectConfigMutation = useSaveSelectConfig();
  const saveMatchConfigMutation = useSaveMatchConfig();

  // Computed values
  const selectedScenario = useMemo(() => {
    return scenarios.find(s => s.id === selectedScenarioId);
  }, [scenarios, selectedScenarioId]);

  const groupedScenarios = useMemo(() => {
    const groups = {};
    scenarios.forEach(s => {
      if (!groups[s.case_name]) groups[s.case_name] = [];
      groups[s.case_name].push(s);
    });
    return groups;
  }, [scenarios]);

  const testSetName = testSetInfo?.name || 'Loading...';
  const isLoading = scenariosLoading || stepsLoading || configLoading;

  // Handle scenario selection with case auto-open
  const handleSelectScenario = useCallback((id) => {
    const scenario = scenarios.find(s => s.id === id);
    selectScenario(id, scenario?.case_name);
  }, [scenarios, selectScenario]);

  // Case Modal Handlers
  const handleOpenCaseModal = () => openCaseModal();

  const handleSubmitCase = async (e) => {
    e.preventDefault();
    try {
      const res = await createCaseMutation.mutateAsync({
        testSetId,
        name: modals.case.name,
      });
      closeCaseModal();
      if (res.data?.scenarioId) {
        handleSelectScenario(res.data.scenarioId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Scenario Modal Handlers
  const handleOpenScenarioModal = async () => {
    const cases = await refetchTestCases();
    const casesList = cases.data || testCases;
    if (casesList.length === 0) {
      if (confirm('A Test Case is required to hold scenarios. Would you like to create one now?')) {
        handleOpenCaseModal();
      }
      return;
    }
    openScenarioModal(casesList[0]?.id || '');
  };

  const handleSubmitScenario = async (e) => {
    e.preventDefault();
    try {
      const res = await createScenarioMutation.mutateAsync({
        testCaseId: modals.scenario.testCaseId,
        name: modals.scenario.name,
      });
      closeScenarioModal();
      if (res.data?.id) {
        handleSelectScenario(res.data.id);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Scenario Name Update
  const handleUpdateScenarioName = async (scenarioId, name) => {
    try {
      await updateScenarioMutation.mutateAsync({ scenarioId, data: { name } });
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Scenario
  const handleDeleteScenario = async () => {
    try {
      await deleteScenarioMutation.mutateAsync(selectedScenarioId);
      closeDeleteConfirm();

      // Auto-select another scenario
      const remaining = scenarios.filter(s => s.id !== selectedScenarioId);
      if (remaining.length > 0) {
        handleSelectScenario(remaining[0].id);
      } else {
        clearScenario();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Step Field Update
  const handleUpdateStepField = useCallback(async (stepId, field, value) => {
    await updateStepMutation.mutateAsync({ stepId, field, value });
  }, [updateStepMutation]);

  // Add Step
  const handleAddStep = async () => {
    if (!selectedScenarioId) return;

    const tempId = `temp-${Date.now()}`;
    const newStep = {
      id: tempId,
      step_definition: '',
      type: '',
      element_id: '',
      action: '',
      action_result: '',
      required: false,
      expected_results: '',
      order_index: steps.length,
    };

    try {
      await addStepMutation.mutateAsync({
        scenarioId: selectedScenarioId,
        steps: [...steps, newStep],
      });
    } catch (err) {
      console.error('Failed to add step', err);
    }
  };

  // Select Config Modal
  const handleOpenSelectConfigModal = useCallback((stepId, configType) => {
    const step = steps.find(s => s.id === stepId);
    const filtered = selectConfigs.filter(c => c.config_type === configType);
    const existing = filtered.find(c => c.id === step?.select_config_id);

    openSelectConfigModal({
      stepId,
      configType,
      selectedId: existing?.id || '',
      name: existing?.name || '',
      options: existing?.options.join('\n') || '',
    });
  }, [steps, selectConfigs, openSelectConfigModal]);

  const handleSaveSelectConfig = async () => {
    try {
      const { stepId, selectedId, name, options, configType } = modals.selectConfig;
      const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);

      const configId = await saveSelectConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
        configType,
      });

      await handleUpdateStepField(stepId, 'select_config_id', configId);
      closeSelectConfigModal();
    } catch (err) {
      alert(err.message);
    }
  };

  // Match Config Modal
  const handleOpenMatchConfigModal = useCallback((stepId) => {
    const step = steps.find(s => s.id === stepId);
    const existing = matchConfigs.find(c => c.id === step?.match_config_id);

    openMatchConfigModal({
      stepId,
      selectedId: existing?.id || '',
      name: existing?.name || '',
      options: existing?.options.join('\n') || '',
    });
  }, [steps, matchConfigs, openMatchConfigModal]);

  const handleSaveMatchConfig = async () => {
    try {
      const { stepId, selectedId, name, options } = modals.matchConfig;
      const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);

      const configId = await saveMatchConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
      });

      await handleUpdateStepField(stepId, 'match_config_id', configId);
      await handleUpdateStepField(stepId, 'action_result', JSON.stringify(optionsList));
      closeMatchConfigModal();
    } catch (err) {
      alert(err.message);
    }
  };

  // Type Config Modal
  const handleOpenTypeConfigModal = useCallback((category) => {
    const options = config[category + 's']?.map(o => o.display_name).join('\n') || '';
    openTypeConfigModal(category, options);
  }, [config, openTypeConfigModal]);

  const handleSaveTypeConfig = async () => {
    const lines = modals.typeConfig.options.split('\n').filter(l => l.trim());
    const optionsArray = lines.map(l => ({ display_name: l.trim() }));
    try {
      await updateTypesMutation.mutateAsync(optionsArray);
      closeTypeConfigModal();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle select config dropdown change
  const handleSelectConfigChange = (selectedId) => {
    const cfg = selectConfigs.find(c => c.id === Number(selectedId));
    setSelectConfigField('selectedId', selectedId);
    setSelectConfigField('name', cfg?.name || '');
    setSelectConfigField('options', cfg?.options.join('\n') || '');
  };

  // Handle match config dropdown change
  const handleMatchConfigChange = (selectedId) => {
    const cfg = matchConfigs.find(c => c.id === Number(selectedId));
    setMatchConfigField('selectedId', selectedId);
    setMatchConfigField('name', cfg?.name || '');
    setMatchConfigField('options', cfg?.options.join('\n') || '');
  };

  return {
    // Route params
    testSetId,
    selectedReleaseId,

    // Data
    scenarios,
    selectedScenarioId,
    selectedScenario,
    testSetName,
    openCases,
    testCases,
    groupedScenarios,
    steps,
    config,
    selectConfigs,
    matchConfigs,
    actionOptions,
    isLoading,

    // Modal states
    modals,

    // Scenario actions
    handleSelectScenario,
    toggleCase,
    handleUpdateScenarioName,

    // Case modal
    handleOpenCaseModal,
    handleSubmitCase,
    closeCaseModal,
    setCaseModalName,

    // Scenario modal
    handleOpenScenarioModal,
    handleSubmitScenario,
    closeScenarioModal,
    setScenarioModalName,
    setScenarioModalTestCaseId,

    // Delete modal
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDeleteScenario,

    // Step actions
    handleUpdateStepField,
    handleAddStep,

    // Select config modal
    handleOpenSelectConfigModal,
    handleSaveSelectConfig,
    closeSelectConfigModal,
    setSelectConfigField,
    handleSelectConfigChange,

    // Match config modal
    handleOpenMatchConfigModal,
    handleSaveMatchConfig,
    closeMatchConfigModal,
    setMatchConfigField,
    handleMatchConfigChange,

    // Type config modal
    handleOpenTypeConfigModal,
    handleSaveTypeConfig,
    closeTypeConfigModal,
    setTypeConfigOptions,
  };
}

export default useTestCasesPage;
