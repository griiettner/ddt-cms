/**
 * TestCases Page Hook
 * Combines TanStack Query with local store state
 */
import { useCallback, useMemo, type FormEvent } from 'react';
import { useSearch } from '@tanstack/react-router';
import {
  useScenariosQuery,
  useTestCasesQuery,
  useStepsQuery,
  useAllConfigQuery,
  useTestSetQuery,
} from '@/hooks/queries';
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
} from '@/hooks/mutations';
import { useRelease } from '@/context/ReleaseContext';
import {
  useTestCasesStore,
  type TestRunProgress,
  type TestRunResults,
  type SelectConfigModalState,
  type MatchConfigModalState,
} from '../stores/testCasesStore';
// @ts-expect-error - testRunner.js is a JS file without type declarations
import { runAllScenarios } from '../../../../temp/testRunner';
import { testStepsApi, testRunsApi } from '@/services/api';
import type {
  TestScenario,
  TestCase,
  TestStep,
  ConfigOption,
  SelectConfig,
  MatchConfig,
} from '@/types/entities';
import type { ActionType } from '@/utils/constants';

// Helper to parse JSON options string to array
function parseOptionsToArray(options: string | string[] | undefined): string[] {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Search params interface
interface TestCasesSearchParams {
  testSetId?: number;
}

// Grouped scenarios type
type GroupedScenarios = Record<string, TestScenario[]>;

// Config data returned from useAllConfigQuery
interface ConfigData {
  types?: ConfigOption[];
  actions?: ConfigOption[];
  [key: string]: ConfigOption[] | undefined;
}

// Parsed SelectConfig with options as array
interface ParsedSelectConfig extends Omit<SelectConfig, 'options'> {
  options: string[];
}

// Parsed MatchConfig with options as array
interface ParsedMatchConfig extends Omit<MatchConfig, 'options'> {
  options: string[];
}

// Return type for the hook
export interface UseTestCasesPageReturn {
  // Route params
  testSetId: number | undefined;
  selectedReleaseId: string;

  // Data
  scenarios: TestScenario[];
  selectedScenarioId: number | null;
  selectedScenario: TestScenario | undefined;
  testSetName: string;
  openCases: Set<string>;
  testCases: TestCase[];
  groupedScenarios: GroupedScenarios;
  steps: TestStep[];
  config: ConfigData;
  selectConfigs: ParsedSelectConfig[];
  matchConfigs: ParsedMatchConfig[];
  rawSelectConfigs: SelectConfig[];
  rawMatchConfigs: MatchConfig[];
  actionOptions: ActionType[];
  isLoading: boolean;

  // Modal states
  modals: ReturnType<typeof useTestCasesStore>['modals'];

  // Scenario actions
  handleSelectScenario: (id: number) => void;
  toggleCase: (caseName: string) => void;
  handleUpdateScenarioName: (scenarioId: number, name: string) => Promise<void>;

  // Case modal
  handleOpenCaseModal: () => void;
  handleSubmitCase: (e: FormEvent) => Promise<void>;
  handleUseReusableCase: (reusableCaseId: number) => Promise<void>;
  closeCaseModal: () => void;
  setCaseModalName: (name: string) => void;

  // Case edit/delete
  handleEditCase: (caseId: number, newName: string) => Promise<void>;
  handleDeleteCase: (caseId: number, caseName: string) => void;
  handleSaveAsReusable: (caseId: number, caseName: string) => Promise<void>;
  confirmDeleteCase: () => Promise<void>;
  closeDeleteCaseConfirm: () => void;

  // Scenario modal
  handleOpenScenarioModal: () => Promise<void>;
  handleSubmitScenario: (e: FormEvent) => Promise<void>;
  closeScenarioModal: () => void;
  setScenarioModalName: (name: string) => void;
  setScenarioModalTestCaseId: (testCaseId: string) => void;

  // Delete modal
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  handleDeleteScenario: () => Promise<void>;

  // Step actions
  handleUpdateStepField: (stepId: number | string, field: string, value: unknown) => Promise<void>;
  handleAddStep: () => Promise<void>;
  handleDeleteStep: (stepId: number | string) => void;
  confirmDeleteStep: () => Promise<void>;
  closeDeleteStepConfirm: () => void;
  handleReorderSteps: (reorderedSteps: TestStep[]) => Promise<void>;

  // Select config modal
  handleOpenSelectConfigModal: (stepId: number | string, configType: string) => void;
  handleSaveSelectConfig: () => Promise<void>;
  closeSelectConfigModal: () => void;
  setSelectConfigField: <K extends keyof Omit<SelectConfigModalState, 'open'>>(
    field: K,
    value: SelectConfigModalState[K]
  ) => void;
  handleSelectConfigChange: (selectedId: string) => void;

  // Match config modal
  handleOpenMatchConfigModal: (stepId: number | string) => void;
  handleSaveMatchConfig: () => Promise<void>;
  closeMatchConfigModal: () => void;
  setMatchConfigField: <K extends keyof Omit<MatchConfigModalState, 'open'>>(
    field: K,
    value: MatchConfigModalState[K]
  ) => void;
  handleMatchConfigChange: (selectedId: string) => void;

  // Type config modal
  handleOpenTypeConfigModal: (category: string) => void;
  handleSaveTypeConfig: () => Promise<void>;
  closeTypeConfigModal: () => void;
  setTypeConfigOptions: (options: string) => void;

  // Test run
  handleRunTest: () => Promise<void>;
  closeTestRunModal: () => void;
}

export function useTestCasesPage(): UseTestCasesPageReturn {
  const { testSetId } = useSearch({ strict: false }) as TestCasesSearchParams;
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
  const { data: scenarios = [], isLoading: scenariosLoading } = useScenariosQuery(
    selectedReleaseId,
    testSetId
  );

  const { data: testCases = [], refetch: refetchTestCases } = useTestCasesQuery(
    selectedReleaseId,
    testSetId
  );

  const { data: testSetInfo } = useTestSetQuery(selectedReleaseId, testSetId);

  const { data: steps = [], isLoading: stepsLoading } = useStepsQuery(
    selectedReleaseId,
    selectedScenarioId ?? undefined
  );

  const {
    config,
    selectConfigs: rawSelectConfigs,
    matchConfigs: rawMatchConfigs,
    actionOptions,
    isLoading: configLoading,
  } = useAllConfigQuery(selectedReleaseId);

  // Transform configs to have parsed options arrays
  const selectConfigs = useMemo((): ParsedSelectConfig[] => {
    return rawSelectConfigs.map((c) => ({
      ...c,
      options: parseOptionsToArray(c.options),
    }));
  }, [rawSelectConfigs]);

  const matchConfigs = useMemo((): ParsedMatchConfig[] => {
    return rawMatchConfigs.map((c) => ({
      ...c,
      options: parseOptionsToArray(c.options),
    }));
  }, [rawMatchConfigs]);

  // Mutations
  const createCaseMutation = useCreateTestCase(selectedReleaseId);
  const updateCaseMutation = useUpdateTestCase(selectedReleaseId);
  const deleteCaseMutation = useDeleteTestCase(selectedReleaseId);
  const createScenarioMutation = useCreateScenario(selectedReleaseId);
  const updateScenarioMutation = useUpdateScenario(selectedReleaseId);
  const deleteScenarioMutation = useDeleteScenario(selectedReleaseId);
  const updateStepMutation = useUpdateStepField(selectedReleaseId, selectedScenarioId ?? 0);
  const addStepMutation = useAddStep(selectedReleaseId);
  const deleteStepMutation = useDeleteStep(selectedReleaseId, selectedScenarioId ?? 0);
  const reorderStepsMutation = useReorderSteps(selectedReleaseId, selectedScenarioId ?? 0);
  const updateTypesMutation = useUpdateTypes(selectedReleaseId);
  const saveSelectConfigMutation = useSaveSelectConfig();
  const saveMatchConfigMutation = useSaveMatchConfig();
  const copyReusableCaseMutation = useCopyReusableCase();
  const createReusableCaseFromCaseMutation = useCreateReusableCaseFromCase();

  // Computed values
  const selectedScenario = useMemo(() => {
    return scenarios.find((s) => s.id === selectedScenarioId);
  }, [scenarios, selectedScenarioId]);

  const groupedScenarios = useMemo(() => {
    const groups: GroupedScenarios = {};
    scenarios.forEach((s) => {
      const caseName = s.case_name || 'Uncategorized';
      if (!groups[caseName]) groups[caseName] = [];
      groups[caseName].push(s);
    });
    return groups;
  }, [scenarios]);

  const testSetName = testSetInfo?.name || 'Loading...';
  const isLoading = scenariosLoading || stepsLoading || configLoading;

  // Handle scenario selection with case auto-open
  const handleSelectScenario = useCallback(
    (id: number) => {
      const scenario = scenarios.find((s) => s.id === id);
      selectScenario(id, scenario?.case_name);
    },
    [scenarios, selectScenario]
  );

  // Case Modal Handlers
  const handleOpenCaseModal = (): void => openCaseModal();

  const handleSubmitCase = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!testSetId) return;
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
      const error = err as Error;
      alert(error.message);
    }
  };

  // Handle using a reusable case (copy it to current test set)
  const handleUseReusableCase = async (reusableCaseId: number): Promise<void> => {
    if (!testSetId) return;
    try {
      const res = await copyReusableCaseMutation.mutateAsync({
        reusableCaseId,
        releaseId: Number(selectedReleaseId),
        testSetId,
      });
      closeCaseModal();
      // Select the newly created scenario if available
      const data = res.data as { scenarioId?: number } | undefined;
      if (data?.scenarioId) {
        handleSelectScenario(data.scenarioId);
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Save an existing test case as a reusable case
  const handleSaveAsReusable = async (caseId: number, caseName: string): Promise<void> => {
    try {
      const res = await createReusableCaseFromCaseMutation.mutateAsync({
        caseId,
        releaseId: Number(selectedReleaseId),
        name: caseName,
      });
      const data = res.data as { stepsCopied?: number } | undefined;
      alert(
        `"${caseName}" has been saved as a reusable case with ${data?.stepsCopied || 0} steps.`
      );
    } catch (err) {
      const error = err as Error;
      alert(`Failed to save as reusable: ${error.message}`);
    }
  };

  // Edit test case name
  const handleEditCase = async (caseId: number, newName: string): Promise<void> => {
    try {
      await updateCaseMutation.mutateAsync({
        id: caseId,
        data: { name: newName },
      });
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Delete test case - opens confirmation modal
  const handleDeleteCase = (caseId: number, caseName: string): void => {
    openDeleteCaseConfirm(caseId, caseName);
  };

  // Confirm delete test case - called from modal
  const confirmDeleteCase = async (): Promise<void> => {
    const { caseId } = modals.deleteCaseConfirm;
    if (!caseId) return;

    try {
      await deleteCaseMutation.mutateAsync(caseId);
      closeDeleteCaseConfirm();
      clearScenario();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Scenario Modal Handlers
  const handleOpenScenarioModal = async (): Promise<void> => {
    const cases = await refetchTestCases();
    const casesList = cases.data || testCases;
    if (casesList.length === 0) {
      if (confirm('A Test Case is required to hold scenarios. Would you like to create one now?')) {
        handleOpenCaseModal();
      }
      return;
    }
    openScenarioModal(casesList[0]?.id?.toString() || '');
  };

  const handleSubmitScenario = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      const res = await createScenarioMutation.mutateAsync({
        testCaseId: parseInt(modals.scenario.testCaseId, 10),
        name: modals.scenario.name,
      });
      closeScenarioModal();
      if (res.data?.id) {
        handleSelectScenario(res.data.id);
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Scenario Name Update
  const handleUpdateScenarioName = async (scenarioId: number, name: string): Promise<void> => {
    try {
      await updateScenarioMutation.mutateAsync({ scenarioId, data: { name } });
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Delete Scenario
  const handleDeleteScenario = async (): Promise<void> => {
    if (!selectedScenarioId) return;

    try {
      await deleteScenarioMutation.mutateAsync(selectedScenarioId);
      closeDeleteConfirm();

      // Auto-select another scenario
      const remaining = scenarios.filter((s) => s.id !== selectedScenarioId);
      if (remaining.length > 0) {
        handleSelectScenario(remaining[0].id);
      } else {
        clearScenario();
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Step Field Update
  const handleUpdateStepField = useCallback(
    async (stepId: number | string, field: string, value: unknown): Promise<void> => {
      // Only update if it's an existing step (has numeric ID)
      if (typeof stepId === 'number') {
        await updateStepMutation.mutateAsync({ stepId, field: field as keyof TestStep, value });
      }
    },
    [updateStepMutation]
  );

  // Add Step
  const handleAddStep = async (): Promise<void> => {
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
        steps: [...steps, newStep as unknown as TestStep],
      });
    } catch (err) {
      console.error('Failed to add step', err);
    }
  };

  // Delete Step - opens confirmation modal
  const handleDeleteStep = (stepId: number | string): void => {
    // Only delete existing steps (with numeric IDs)
    if (typeof stepId === 'number') {
      openDeleteStepConfirm(stepId);
    }
  };

  // Confirm delete step - called from modal
  const confirmDeleteStep = async (): Promise<void> => {
    const { stepId } = modals.deleteStepConfirm;
    if (!stepId) return;

    try {
      await deleteStepMutation.mutateAsync(stepId);
      closeDeleteStepConfirm();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Reorder steps after drag and drop
  const handleReorderSteps = useCallback(
    async (reorderedSteps: TestStep[]): Promise<void> => {
      try {
        await reorderStepsMutation.mutateAsync(reorderedSteps);
      } catch (err) {
        console.error('Failed to reorder steps', err);
      }
    },
    [reorderStepsMutation]
  );

  // Select Config Modal
  const handleOpenSelectConfigModal = useCallback(
    (stepId: number | string, configType: string): void => {
      const step = steps.find((s) => s.id === stepId);
      const filtered = selectConfigs.filter((c) => c.config_type === configType);
      const existing = filtered.find((c) => c.id === step?.select_config_id);

      openSelectConfigModal({
        stepId: typeof stepId === 'number' ? stepId : null,
        configType,
        selectedId: existing?.id?.toString() || '',
        name: existing?.name || '',
        options: existing?.options.join('\n') || '',
      });
    },
    [steps, selectConfigs, openSelectConfigModal]
  );

  const handleSaveSelectConfig = async (): Promise<void> => {
    try {
      const { stepId, selectedId, name, options, configType } = modals.selectConfig;
      const optionsList = options
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      const savedConfig = await saveSelectConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
        configType,
      });

      if (stepId) {
        await handleUpdateStepField(stepId, 'select_config_id', savedConfig.id);
      }
      closeSelectConfigModal();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Match Config Modal
  const handleOpenMatchConfigModal = useCallback(
    (stepId: number | string): void => {
      const step = steps.find((s) => s.id === stepId);
      const existing = matchConfigs.find((c) => c.id === step?.match_config_id);

      openMatchConfigModal({
        stepId: typeof stepId === 'number' ? stepId : null,
        selectedId: existing?.id?.toString() || '',
        name: existing?.name || '',
        options: existing?.options.join('\n') || '',
      });
    },
    [steps, matchConfigs, openMatchConfigModal]
  );

  const handleSaveMatchConfig = async (): Promise<void> => {
    try {
      const { stepId, selectedId, name, options } = modals.matchConfig;
      const optionsList = options
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      const savedConfig = await saveMatchConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
      });

      if (stepId) {
        await handleUpdateStepField(stepId, 'match_config_id', savedConfig.id);
        await handleUpdateStepField(stepId, 'action_result', JSON.stringify(optionsList));
      }
      closeMatchConfigModal();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Type Config Modal
  const handleOpenTypeConfigModal = useCallback(
    (category: string): void => {
      const categoryKey = category + 's';
      const options =
        (config as ConfigData)[categoryKey]?.map((o) => o.display_name).join('\n') || '';
      openTypeConfigModal(category, options);
    },
    [config, openTypeConfigModal]
  );

  const handleSaveTypeConfig = async (): Promise<void> => {
    const lines = modals.typeConfig.options.split('\n').filter((l) => l.trim());
    const optionsArray = lines.map((l) => {
      const trimmed = l.trim();
      return {
        key: trimmed.toLowerCase().replace(/\s+/g, '_'),
        display_name: trimmed,
      };
    });
    try {
      await updateTypesMutation.mutateAsync(optionsArray);
      closeTypeConfigModal();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  };

  // Handle select config dropdown change
  const handleSelectConfigChange = (selectedId: string): void => {
    const cfg = selectConfigs.find((c) => c.id === Number(selectedId));
    setSelectConfigField('selectedId', selectedId);
    setSelectConfigField('name', cfg?.name || '');
    setSelectConfigField('options', cfg?.options.join('\n') || '');
  };

  // Handle match config dropdown change
  const handleMatchConfigChange = (selectedId: string): void => {
    const cfg = matchConfigs.find((c) => c.id === Number(selectedId));
    setMatchConfigField('selectedId', selectedId);
    setMatchConfigField('name', cfg?.name || '');
    setMatchConfigField('options', cfg?.options.join('\n') || '');
  };

  // Run test simulation for all cases and scenarios
  const handleRunTest = useCallback(async (): Promise<void> => {
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
            const res = await testStepsApi.list(Number(selectedReleaseId), {
              scenarioId: scenario.id,
            });
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
      const results = await runAllScenarios(scenariosWithSteps, (progress: TestRunProgress) => {
        updateTestRunProgress(progress);
      });
      setTestRunResults(results as TestRunResults);

      // Save test run to database
      const failedDetails =
        results.scenarios?.flatMap(
          (s: {
            scenarioName: string;
            caseName: string;
            steps?: { status: string; stepId: number; stepDefinition: string; error?: string }[];
          }) =>
            s.steps
              ?.filter((step) => step.status === 'failed')
              .map((step) => ({
                stepId: step.stepId,
                stepDefinition: step.stepDefinition,
                scenarioName: s.scenarioName,
                caseName: s.caseName,
                error: step.error,
              })) || []
        ) || [];

      try {
        if (!testSetId) throw new Error('Test set ID is required');
        await testRunsApi.create({
          releaseId: Number(selectedReleaseId),
          testSetId,
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
  }, [
    scenarios,
    selectedReleaseId,
    testSetId,
    testSetName,
    openTestRunModal,
    updateTestRunProgress,
    setTestRunResults,
  ]);

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
    config: config as ConfigData,
    selectConfigs,
    matchConfigs,
    rawSelectConfigs,
    rawMatchConfigs,
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
