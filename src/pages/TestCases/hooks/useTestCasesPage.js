/**
 * TestCases Page Hook
 * Combines TanStack Query with local store state
 */
import { useCallback, useMemo } from 'react';
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
  useUpdateTestCase,
  useDeleteTestCase,
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
  useUpdateStepField,
  useAddStep,
  useDeleteStep,
  useReorderSteps,
  useUpdateTypes,
  useSaveSelectConfig,
  useSaveMatchConfig,
  useCopyReusableCase,
  useCreateReusableCaseFromCase,
} from '../../../hooks/mutations';
import { useRelease } from '../../../context/ReleaseContext';
import { useTestCasesStore } from '../stores/testCasesStore';
import { runAllScenarios } from '../../../../temp/testRunner';
import { testStepsApi, testRunsApi } from '../../../services/api';

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
    openDeleteCaseConfirm,
    closeDeleteCaseConfirm,
    openDeleteStepConfirm,
    closeDeleteStepConfirm,
    openTestRunModal,
    updateTestRunProgress,
    setTestRunResults,
    closeTestRunModal,
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
  const updateCaseMutation = useUpdateTestCase(selectedReleaseId);
  const deleteCaseMutation = useDeleteTestCase(selectedReleaseId);
  const createScenarioMutation = useCreateScenario(selectedReleaseId);
  const updateScenarioMutation = useUpdateScenario(selectedReleaseId);
  const deleteScenarioMutation = useDeleteScenario(selectedReleaseId);
  const updateStepMutation = useUpdateStepField(selectedReleaseId, selectedScenarioId);
  const addStepMutation = useAddStep(selectedReleaseId);
  const deleteStepMutation = useDeleteStep(selectedReleaseId, selectedScenarioId);
  const reorderStepsMutation = useReorderSteps(selectedReleaseId, selectedScenarioId);
  const updateTypesMutation = useUpdateTypes(selectedReleaseId);
  const saveSelectConfigMutation = useSaveSelectConfig();
  const saveMatchConfigMutation = useSaveMatchConfig();
  const copyReusableCaseMutation = useCopyReusableCase();
  const createReusableCaseFromCaseMutation = useCreateReusableCaseFromCase();

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

  // Handle using a reusable case (copy it to current test set)
  const handleUseReusableCase = async (reusableCaseId) => {
    try {
      const res = await copyReusableCaseMutation.mutateAsync({
        reusableCaseId,
        releaseId: selectedReleaseId,
        testSetId,
      });
      closeCaseModal();
      // Select the newly created scenario if available
      if (res.data?.scenarioId) {
        handleSelectScenario(res.data.scenarioId);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Save an existing test case as a reusable case
  const handleSaveAsReusable = async (caseId, caseName) => {
    try {
      const res = await createReusableCaseFromCaseMutation.mutateAsync({
        caseId,
        releaseId: selectedReleaseId,
        name: caseName,
      });
      alert(`"${caseName}" has been saved as a reusable case with ${res.data?.stepsCopied || 0} steps.`);
    } catch (err) {
      alert(`Failed to save as reusable: ${err.message}`);
    }
  };

  // Edit test case name
  const handleEditCase = async (caseId, newName) => {
    try {
      await updateCaseMutation.mutateAsync({
        id: caseId,
        data: { name: newName },
      });
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete test case - opens confirmation modal
  const handleDeleteCase = (caseId, caseName) => {
    openDeleteCaseConfirm(caseId, caseName);
  };

  // Confirm delete test case - called from modal
  const confirmDeleteCase = async () => {
    const { caseId } = modals.deleteCaseConfirm;
    if (!caseId) return;

    try {
      await deleteCaseMutation.mutateAsync(caseId);
      closeDeleteCaseConfirm();
      clearScenario();
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

  // Delete Step - opens confirmation modal
  const handleDeleteStep = (stepId) => {
    openDeleteStepConfirm(stepId);
  };

  // Confirm delete step - called from modal
  const confirmDeleteStep = async () => {
    const { stepId } = modals.deleteStepConfirm;
    if (!stepId) return;

    try {
      await deleteStepMutation.mutateAsync(stepId);
      closeDeleteStepConfirm();
    } catch (err) {
      alert(err.message);
    }
  };

  // Reorder steps after drag and drop
  const handleReorderSteps = useCallback(async (reorderedSteps) => {
    try {
      await reorderStepsMutation.mutateAsync(reorderedSteps);
    } catch (err) {
      console.error('Failed to reorder steps', err);
    }
  }, [reorderStepsMutation]);

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

      const config = await saveSelectConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
        configType,
      });

      await handleUpdateStepField(stepId, 'select_config_id', config.id);
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

      const config = await saveMatchConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
      });

      await handleUpdateStepField(stepId, 'match_config_id', config.id);
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

  // Run test simulation for all cases and scenarios
  const handleRunTest = useCallback(async () => {
    if (scenarios.length === 0) {
      alert('No scenarios to run. Please create at least one scenario with steps.');
      return;
    }

    openTestRunModal(scenarios.length);

    try {
      // Fetch steps for all scenarios
      const scenariosWithSteps = await Promise.all(
        scenarios.map(async (scenario) => {
          try {
            const res = await testStepsApi.list(selectedReleaseId, { scenarioId: scenario.id });
            return {
              ...scenario,
              steps: res.data || [],
            };
          } catch (err) {
            console.error(`Failed to fetch steps for scenario ${scenario.id}`, err);
            return {
              ...scenario,
              steps: [],
            };
          }
        })
      );

      // Run all scenarios
      const results = await runAllScenarios(scenariosWithSteps, (progress) => {
        updateTestRunProgress(progress);
      });
      setTestRunResults(results);

      // Save test run to database
      const failedDetails = results.scenarios?.flatMap(s =>
        s.steps?.filter(step => step.status === 'failed').map(step => ({
          stepId: step.stepId,
          stepDefinition: step.stepDefinition,
          scenarioName: s.scenarioName,
          caseName: s.caseName,
          error: step.error,
        })) || []
      ) || [];

      try {
        await testRunsApi.create({
          releaseId: selectedReleaseId,
          testSetId: testSetId,
          testSetName: testSetName,
          status: results.failed > 0 ? 'failed' : 'passed',
          durationMs: results.duration,
          totalScenarios: results.totalScenarios,
          totalSteps: results.totalSteps,
          passedSteps: results.passed,
          failedSteps: results.failed,
          failedDetails: failedDetails,
        });
      } catch (saveErr) {
        console.error('Failed to save test run', saveErr);
      }
    } catch (err) {
      console.error('Test run failed', err);
      setTestRunResults({
        totalScenarios: scenarios.length,
        totalSteps: 0,
        passed: 0,
        failed: 0,
        scenarios: [],
        duration: 0,
      });
    }
  }, [scenarios, selectedReleaseId, testSetId, testSetName, openTestRunModal, updateTestRunProgress, setTestRunResults]);

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
    handleUseReusableCase,
    closeCaseModal,
    setCaseModalName,

    // Case edit/delete
    handleEditCase,
    handleDeleteCase,
    handleSaveAsReusable,
    confirmDeleteCase,
    closeDeleteCaseConfirm,

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
    handleDeleteStep,
    confirmDeleteStep,
    closeDeleteStepConfirm,
    handleReorderSteps,

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

    // Test run
    handleRunTest,
    closeTestRunModal,
  };
}

export default useTestCasesPage;
