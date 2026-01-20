/**
 * TestCases Store - TanStack Store
 * Manages local UI state for the TestCases page
 */
import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';

// Create the store
export const testCasesStore = new Store({
  selectedScenarioId: null,
  openCases: new Set(),
  modals: {
    case: { open: false, name: '' },
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
      status: 'idle', // idle, running, complete
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
});

// Actions
export const testCasesActions = {
  selectScenario: (id, caseName) => {
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

  clearScenario: () => {
    testCasesStore.setState((state) => ({
      ...state,
      selectedScenarioId: null,
    }));
  },

  toggleCase: (caseName) => {
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
  openCaseModal: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        case: { open: true, name: '' },
      },
    }));
  },

  closeCaseModal: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        case: { open: false, name: '' },
      },
    }));
  },

  setCaseModalName: (name) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        case: { ...state.modals.case, name },
      },
    }));
  },

  // Scenario Modal
  openScenarioModal: (testCaseId = '') => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { open: true, name: '', testCaseId },
      },
    }));
  },

  closeScenarioModal: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { open: false, name: '', testCaseId: '' },
      },
    }));
  },

  setScenarioModalName: (name) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { ...state.modals.scenario, name },
      },
    }));
  },

  setScenarioModalTestCaseId: (testCaseId) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        scenario: { ...state.modals.scenario, testCaseId },
      },
    }));
  },

  // Type Config Modal
  openTypeConfigModal: (category, options) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        typeConfig: { open: true, category, options },
      },
    }));
  },

  closeTypeConfigModal: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        typeConfig: { open: false, category: '', options: '' },
      },
    }));
  },

  setTypeConfigOptions: (options) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        typeConfig: { ...state.modals.typeConfig, options },
      },
    }));
  },

  // Select Config Modal
  openSelectConfigModal: (data) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        selectConfig: { open: true, ...data },
      },
    }));
  },

  closeSelectConfigModal: () => {
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

  setSelectConfigField: (field, value) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        selectConfig: { ...state.modals.selectConfig, [field]: value },
      },
    }));
  },

  // Match Config Modal
  openMatchConfigModal: (data) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        matchConfig: { open: true, ...data },
      },
    }));
  },

  closeMatchConfigModal: () => {
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

  setMatchConfigField: (field, value) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        matchConfig: { ...state.modals.matchConfig, [field]: value },
      },
    }));
  },

  // Delete Confirm Modal
  openDeleteConfirm: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteConfirm: { open: true },
      },
    }));
  },

  closeDeleteConfirm: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteConfirm: { open: false },
      },
    }));
  },

  // Delete Case Confirm Modal
  openDeleteCaseConfirm: (caseId, caseName) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteCaseConfirm: { open: true, caseId, caseName },
      },
    }));
  },

  closeDeleteCaseConfirm: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteCaseConfirm: { open: false, caseId: null, caseName: '' },
      },
    }));
  },

  // Delete Step Confirm Modal
  openDeleteStepConfirm: (stepId) => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteStepConfirm: { open: true, stepId },
      },
    }));
  },

  closeDeleteStepConfirm: () => {
    testCasesStore.setState((state) => ({
      ...state,
      modals: {
        ...state.modals,
        deleteStepConfirm: { open: false, stepId: null },
      },
    }));
  },

  // Test Run Modal
  openTestRunModal: (totalScenarios) => {
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

  updateTestRunProgress: (progress) => {
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

  setTestRunResults: (results) => {
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

  closeTestRunModal: () => {
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
  reset: () => {
    testCasesStore.setState({
      selectedScenarioId: null,
      openCases: new Set(),
      modals: {
        case: { open: false, name: '' },
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
    });
  },
};

// React hook to use the store
export function useTestCasesStore() {
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
