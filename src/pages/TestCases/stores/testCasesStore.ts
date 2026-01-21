/**
 * TestCases Store - TanStack Store
 * Manages local UI state for the TestCases page
 */
import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';

// Modal State Interfaces
export interface CaseModalState {
  open: boolean;
  name: string;
  saveAsReusable: boolean;
}

export interface ScenarioModalState {
  open: boolean;
  name: string;
  testCaseId: string;
}

export interface TypeConfigModalState {
  open: boolean;
  category: string;
  options: string;
}

export interface SelectConfigModalState {
  open: boolean;
  stepId: number | null;
  configType: string;
  selectedId: string;
  name: string;
  options: string;
}

export interface MatchConfigModalState {
  open: boolean;
  stepId: number | null;
  selectedId: string;
  name: string;
  options: string;
}

interface DeleteConfirmState {
  open: boolean;
}

interface DeleteCaseConfirmState {
  open: boolean;
  caseId: number | null;
  caseName: string;
}

interface DeleteStepConfirmState {
  open: boolean;
  stepId: number | null;
}

export type TestRunStatus = 'idle' | 'running' | 'complete';

export interface TestRunScenarioResult {
  scenarioId: number;
  scenarioName: string;
  caseName: string;
  steps: TestRunStepResult[];
}

export interface TestRunStepResult {
  stepId: number;
  stepDefinition: string;
  status: 'passed' | 'failed';
  error?: string;
}

export interface TestRunResults {
  totalScenarios: number;
  totalSteps: number;
  passed: number;
  failed: number;
  scenarios: TestRunScenarioResult[];
  duration: number;
}

interface TestRunModalState {
  open: boolean;
  status: TestRunStatus;
  currentScenario: number;
  totalScenarios: number;
  scenarioName: string;
  caseName: string;
  currentStep: number;
  totalSteps: number;
  stepDefinition: string;
  results: TestRunResults | null;
}

export interface TestRunProgress {
  currentScenario: number;
  totalScenarios: number;
  scenarioName: string;
  caseName: string;
  currentStep: number;
  totalSteps: number;
  stepDefinition: string;
}

interface ModalsState {
  case: CaseModalState;
  scenario: ScenarioModalState;
  typeConfig: TypeConfigModalState;
  selectConfig: SelectConfigModalState;
  matchConfig: MatchConfigModalState;
  deleteConfirm: DeleteConfirmState;
  deleteCaseConfirm: DeleteCaseConfirmState;
  deleteStepConfirm: DeleteStepConfirmState;
  testRun: TestRunModalState;
}

interface TestCasesStoreState {
  selectedScenarioId: number | null;
  openCases: Set<string>;
  modals: ModalsState;
}

// Initial state
const initialState: TestCasesStoreState = {
  selectedScenarioId: null,
  openCases: new Set(),
  modals: {
    case: { open: false, name: '', saveAsReusable: false },
    scenario: { open: false, name: '', testCaseId: '' },
    typeConfig: { open: false, category: '', options: '' },
    selectConfig: {
      open: false,
      stepId: null,
      configType: 'custom_select',
      selectedId: '',
      name: '',
      options: '',
    },
    matchConfig: {
      open: false,
      stepId: null,
      selectedId: '',
      name: '',
      options: '',
    },
    deleteConfirm: { open: false },
    deleteCaseConfirm: { open: false, caseId: null, caseName: '' },
    deleteStepConfirm: { open: false, stepId: null },
    testRun: {
      open: false,
      status: 'idle',
      currentScenario: 0,
      totalScenarios: 0,
      scenarioName: '',
      caseName: '',
      currentStep: 0,
      totalSteps: 0,
      stepDefinition: '',
      results: null,
    },
  },
};

// Create the store
export const testCasesStore = new Store<TestCasesStoreState>(initialState);

// Actions
export const testCasesActions = {
  selectScenario: (id: number, caseName?: string): void => {
    testCasesStore.setState((state) => {
      const newOpenCases = new Set(state.openCases);
      if (caseName) {
        newOpenCases.add(caseName);
      }
      return {
        ...state,
        selectedScenarioId: id,
        openCases: newOpenCases,
      };
    });
  },

  clearScenario: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      selectedScenarioId: null,
    }));
  },

  toggleCase: (caseName: string): void => {
    testCasesStore.setState((state) => {
      const newOpenCases = new Set(state.openCases);
      if (newOpenCases.has(caseName)) {
        newOpenCases.delete(caseName);
      } else {
        newOpenCases.add(caseName);
      }
      return {
        ...state,
        openCases: newOpenCases,
      };
    });
  },

  // Case Modal
  openCaseModal: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        case: { open: true, name: '', saveAsReusable: false },
      },
    }));
  },

  closeCaseModal: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        case: { open: false, name: '', saveAsReusable: false },
      },
    }));
  },

  setCaseModalName: (name: string): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        case: { ...state.modals.case, name },
      },
    }));
  },

  setCaseModalSaveAsReusable: (saveAsReusable: boolean): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        case: { ...state.modals.case, saveAsReusable },
      },
    }));
  },

  // Scenario Modal
  openScenarioModal: (testCaseId = ''): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { open: true, name: '', testCaseId },
      },
    }));
  },

  closeScenarioModal: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { open: false, name: '', testCaseId: '' },
      },
    }));
  },

  setScenarioModalName: (name: string): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { ...state.modals.scenario, name },
      },
    }));
  },

  setScenarioModalTestCaseId: (testCaseId: string): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { ...state.modals.scenario, testCaseId },
      },
    }));
  },

  // Type Config Modal
  openTypeConfigModal: (category: string, options: string): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        typeConfig: { open: true, category, options },
      },
    }));
  },

  closeTypeConfigModal: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        typeConfig: { open: false, category: '', options: '' },
      },
    }));
  },

  setTypeConfigOptions: (options: string): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        typeConfig: { ...state.modals.typeConfig, options },
      },
    }));
  },

  // Select Config Modal
  openSelectConfigModal: (data: Omit<SelectConfigModalState, 'open'>): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        selectConfig: { open: true, ...data },
      },
    }));
  },

  closeSelectConfigModal: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        selectConfig: {
          open: false,
          stepId: null,
          configType: 'custom_select',
          selectedId: '',
          name: '',
          options: '',
        },
      },
    }));
  },

  setSelectConfigField: <K extends keyof Omit<SelectConfigModalState, 'open'>>(
    field: K,
    value: SelectConfigModalState[K]
  ): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        selectConfig: { ...state.modals.selectConfig, [field]: value },
      },
    }));
  },

  // Match Config Modal
  openMatchConfigModal: (data: Omit<MatchConfigModalState, 'open'>): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        matchConfig: { open: true, ...data },
      },
    }));
  },

  closeMatchConfigModal: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        matchConfig: {
          open: false,
          stepId: null,
          selectedId: '',
          name: '',
          options: '',
        },
      },
    }));
  },

  setMatchConfigField: <K extends keyof Omit<MatchConfigModalState, 'open'>>(
    field: K,
    value: MatchConfigModalState[K]
  ): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        matchConfig: { ...state.modals.matchConfig, [field]: value },
      },
    }));
  },

  // Delete Confirm Modal
  openDeleteConfirm: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteConfirm: { open: true },
      },
    }));
  },

  closeDeleteConfirm: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteConfirm: { open: false },
      },
    }));
  },

  // Delete Case Confirm Modal
  openDeleteCaseConfirm: (caseId: number, caseName: string): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteCaseConfirm: { open: true, caseId, caseName },
      },
    }));
  },

  closeDeleteCaseConfirm: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteCaseConfirm: { open: false, caseId: null, caseName: '' },
      },
    }));
  },

  // Delete Step Confirm Modal
  openDeleteStepConfirm: (stepId: number): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteStepConfirm: { open: true, stepId },
      },
    }));
  },

  closeDeleteStepConfirm: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteStepConfirm: { open: false, stepId: null },
      },
    }));
  },

  // Test Run Modal
  openTestRunModal: (totalScenarios: number): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        testRun: {
          open: true,
          status: 'running',
          currentScenario: 0,
          totalScenarios,
          scenarioName: '',
          caseName: '',
          currentStep: 0,
          totalSteps: 0,
          stepDefinition: '',
          results: null,
        },
      },
    }));
  },

  updateTestRunProgress: (progress: TestRunProgress): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        testRun: {
          ...state.modals.testRun,
          currentScenario: progress.currentScenario,
          totalScenarios: progress.totalScenarios,
          scenarioName: progress.scenarioName,
          caseName: progress.caseName,
          currentStep: progress.currentStep,
          totalSteps: progress.totalSteps,
          stepDefinition: progress.stepDefinition,
        },
      },
    }));
  },

  setTestRunResults: (results: TestRunResults): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        testRun: {
          ...state.modals.testRun,
          status: 'complete',
          results,
        },
      },
    }));
  },

  closeTestRunModal: (): void => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        testRun: {
          open: false,
          status: 'idle',
          currentScenario: 0,
          totalScenarios: 0,
          scenarioName: '',
          caseName: '',
          currentStep: 0,
          totalSteps: 0,
          stepDefinition: '',
          results: null,
        },
      },
    }));
  },

  // Reset store
  reset: (): void => {
    testCasesStore.setState(initialState);
  },
};

// React hook return type
export interface UseTestCasesStoreReturn {
  selectedScenarioId: number | null;
  openCases: Set<string>;
  modals: ModalsState;
  selectScenario: (id: number, caseName?: string) => void;
  clearScenario: () => void;
  toggleCase: (caseName: string) => void;
  openCaseModal: () => void;
  closeCaseModal: () => void;
  setCaseModalName: (name: string) => void;
  setCaseModalSaveAsReusable: (saveAsReusable: boolean) => void;
  openScenarioModal: (testCaseId?: string) => void;
  closeScenarioModal: () => void;
  setScenarioModalName: (name: string) => void;
  setScenarioModalTestCaseId: (testCaseId: string) => void;
  openTypeConfigModal: (category: string, options: string) => void;
  closeTypeConfigModal: () => void;
  setTypeConfigOptions: (options: string) => void;
  openSelectConfigModal: (data: Omit<SelectConfigModalState, 'open'>) => void;
  closeSelectConfigModal: () => void;
  setSelectConfigField: <K extends keyof Omit<SelectConfigModalState, 'open'>>(
    field: K,
    value: SelectConfigModalState[K]
  ) => void;
  openMatchConfigModal: (data: Omit<MatchConfigModalState, 'open'>) => void;
  closeMatchConfigModal: () => void;
  setMatchConfigField: <K extends keyof Omit<MatchConfigModalState, 'open'>>(
    field: K,
    value: MatchConfigModalState[K]
  ) => void;
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  openDeleteCaseConfirm: (caseId: number, caseName: string) => void;
  closeDeleteCaseConfirm: () => void;
  openDeleteStepConfirm: (stepId: number) => void;
  closeDeleteStepConfirm: () => void;
  openTestRunModal: (totalScenarios: number) => void;
  updateTestRunProgress: (progress: TestRunProgress) => void;
  setTestRunResults: (results: TestRunResults) => void;
  closeTestRunModal: () => void;
  reset: () => void;
}

// React hook to use the store
export function useTestCasesStore(): UseTestCasesStoreReturn {
  const selectedScenarioId = useStore(testCasesStore, (state) => state.selectedScenarioId);
  const openCases = useStore(testCasesStore, (state) => state.openCases);
  const modals = useStore(testCasesStore, (state) => state.modals);

  return {
    selectedScenarioId,
    openCases,
    modals,
    ...testCasesActions,
  };
}

export default testCasesStore;
