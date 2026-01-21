/**
 * Hook for ReusableCaseEditor page
 * Manages state and actions for editing a reusable case
 */
import { useState, useCallback } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reusableCasesApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAllConfigQuery } from '@/hooks/queries';
import { useRelease } from '@/context/ReleaseContext';
import { useUpdateTypes, useSaveSelectConfig, useSaveMatchConfig } from '@/hooks/mutations';
import type {
  ReusableCase,
  ReusableCaseStep,
  ConfigOption,
  SelectConfig,
  MatchConfig,
  ParsedSelectConfig,
  ParsedMatchConfig,
} from '@/types/entities';
import type { ActionType } from '@/utils/constants';

// Local step type for editing (may have temp IDs)
// Extends TestStep structure but allows string IDs for temp steps
interface LocalStep {
  id: number | string;
  test_scenario_id?: number; // Optional for reusable case steps
  step_definition: string;
  type: string | null;
  element_id: string | null;
  action: string | null;
  action_result: string | null;
  required: boolean;
  expected_results: string | null;
  order_index: number;
  select_config_id: number | null;
  match_config_id: number | null;
  created_at?: string;
  updated_at?: string;
}

// Delete confirmation state
interface DeleteConfirmState {
  open: boolean;
  stepId: number | string | null;
}

// Type config modal state
interface TypeConfigModalState {
  open: boolean;
  category: string;
  options: string;
}

// Select config modal state
interface SelectConfigModalState {
  open: boolean;
  stepId: number | string | null;
  configType: string;
  selectedId: string;
  name: string;
  options: string;
}

// Match config modal state
interface MatchConfigModalState {
  open: boolean;
  stepId: number | string | null;
  selectedId: string;
  name: string;
  options: string;
}

// Return type for the hook
export interface UseReusableCaseEditorReturn {
  // Route params
  releaseId: string | undefined;
  reusableCaseId: string | undefined;
  isNew: boolean;

  // Data
  caseName: string;
  setCaseName: (name: string) => void;
  caseDescription: string;
  setCaseDescription: (description: string) => void;
  steps: LocalStep[];
  config: {
    types: ConfigOption[];
    actions: ConfigOption[];
  };
  selectConfigs: ParsedSelectConfig[];
  matchConfigs: ParsedMatchConfig[];
  rawSelectConfigs: SelectConfig[];
  rawMatchConfigs: MatchConfig[];
  actionOptions: ActionType[];
  isLoading: boolean;
  isSaving: boolean;

  // Delete confirmation
  deleteConfirm: DeleteConfirmState;
  closeDeleteConfirm: () => void;
  confirmDeleteStep: () => Promise<void>;

  // Actions
  handleSave: () => Promise<void>;
  handleBack: () => void;
  handleAddStep: () => void;
  handleUpdateStepField: (stepId: number | string, field: string, value: unknown) => Promise<void>;
  handleDeleteStep: (stepId: number | string) => void;
  handleReorderSteps: (reorderedSteps: LocalStep[]) => void;

  // Type Config Modal
  typeConfigModal: TypeConfigModalState;
  handleOpenTypeConfigModal: (category: string) => void;
  handleSaveTypeConfig: () => Promise<void>;
  closeTypeConfigModal: () => void;
  setTypeConfigOptions: (options: string) => void;

  // Select Config Modal
  selectConfigModal: SelectConfigModalState;
  handleOpenSelectConfigModal: (stepId: number | string, configType: string) => void;
  handleSaveSelectConfig: () => Promise<void>;
  closeSelectConfigModal: () => void;
  setSelectConfigField: (field: keyof SelectConfigModalState, value: string) => void;
  handleSelectConfigChange: (selectedId: string) => void;

  // Match Config Modal
  matchConfigModal: MatchConfigModalState;
  handleOpenMatchConfigModal: (stepId: number | string) => void;
  handleSaveMatchConfig: () => Promise<void>;
  closeMatchConfigModal: () => void;
  setMatchConfigField: (field: keyof MatchConfigModalState, value: string) => void;
  handleMatchConfigChange: (selectedId: string) => void;
}

export function useReusableCaseEditor(): UseReusableCaseEditorReturn {
  const { releaseId, reusableCaseId } = useParams({ strict: false }) as {
    releaseId?: string;
    reusableCaseId?: string;
  };
  const { selectedReleaseId } = useRelease();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Treat undefined, 'new', or empty string as a new case
  const isNew = !reusableCaseId || reusableCaseId === 'new';

  // Local state
  const [caseName, setCaseName] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [steps, setSteps] = useState<LocalStep[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    stepId: null,
  });

  // Config modal states
  const [typeConfigModal, setTypeConfigModal] = useState<TypeConfigModalState>({
    open: false,
    category: '',
    options: '',
  });
  const [selectConfigModal, setSelectConfigModal] = useState<SelectConfigModalState>({
    open: false,
    stepId: null,
    configType: 'custom_select',
    selectedId: '',
    name: '',
    options: '',
  });
  const [matchConfigModal, setMatchConfigModal] = useState<MatchConfigModalState>({
    open: false,
    stepId: null,
    selectedId: '',
    name: '',
    options: '',
  });

  // Fetch reusable case data
  const { data: reusableCase, isLoading: caseLoading } = useQuery({
    queryKey: queryKeys.reusableCases.detail(Number(reusableCaseId)),
    queryFn: async (): Promise<ReusableCase> => {
      const res = await reusableCasesApi.get(Number(reusableCaseId));
      if (!res.data) throw new Error('Reusable case not found');
      return res.data;
    },
    enabled: !isNew && !!reusableCaseId,
  });

  // Initialize state when data loads
  if (reusableCase && !isInitialized) {
    setCaseName(reusableCase.name || '');
    setCaseDescription(reusableCase.description || '');
    const loadedSteps: LocalStep[] = (reusableCase.steps || []).map((s: ReusableCaseStep) => ({
      id: s.id,
      step_definition: s.step_definition || '',
      type: s.type,
      element_id: s.element_id,
      action: s.action,
      action_result: s.action_result,
      required: s.required || false,
      expected_results: s.expected_results,
      order_index: s.order_index,
      select_config_id: s.select_config_id,
      match_config_id: s.match_config_id,
      created_at: s.created_at,
    }));
    setSteps(loadedSteps);
    setIsInitialized(true);
  }

  // Fetch config for dropdowns
  const {
    config,
    selectConfigs: rawSelectConfigs,
    matchConfigs: rawMatchConfigs,
    actionOptions,
    isLoading: configLoading,
  } = useAllConfigQuery(selectedReleaseId);

  // Parse configs to convert JSON string options to arrays
  const selectConfigs: ParsedSelectConfig[] = rawSelectConfigs.map((c: SelectConfig) => {
    let parsedOptions: string[] = [];
    if (c.options) {
      try {
        parsedOptions = typeof c.options === 'string' ? JSON.parse(c.options) : c.options;
      } catch {
        parsedOptions = [];
      }
    }
    return {
      id: c.id,
      name: c.name,
      options: parsedOptions,
      config_type: c.config_type,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  });

  const matchConfigs: ParsedMatchConfig[] = rawMatchConfigs.map((c: MatchConfig) => {
    let parsedOptions: string[] = [];
    if (c.options) {
      try {
        parsedOptions = typeof c.options === 'string' ? JSON.parse(c.options) : c.options;
      } catch {
        parsedOptions = [];
      }
    }
    return {
      id: c.id,
      name: c.name,
      options: parsedOptions,
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; steps: LocalStep[] }) =>
      reusableCasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description: string } }) =>
      reusableCasesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.reusableCases.detail(Number(reusableCaseId)),
      });
    },
  });

  // Sync steps mutation
  const syncStepsMutation = useMutation({
    mutationFn: ({ id, steps }: { id: number; steps: LocalStep[] }) =>
      reusableCasesApi.syncSteps(id, steps),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reusableCases.detail(Number(reusableCaseId)),
      });
    },
  });

  // Update step mutation
  const updateStepMutation = useMutation({
    mutationFn: ({
      id,
      stepId,
      data,
    }: {
      id: number;
      stepId: number;
      data: Record<string, unknown>;
    }) => reusableCasesApi.updateStep(id, stepId, data),
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: ({ id, stepId }: { id: number; stepId: number }) =>
      reusableCasesApi.deleteStep(id, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reusableCases.detail(Number(reusableCaseId)),
      });
    },
  });

  // Config mutations
  const updateTypesMutation = useUpdateTypes(selectedReleaseId);
  const saveSelectConfigMutation = useSaveSelectConfig();
  const saveMatchConfigMutation = useSaveMatchConfig();

  // Handlers
  const handleSave = useCallback(async () => {
    try {
      if (isNew) {
        // Create new reusable case with steps
        await createMutation.mutateAsync({
          name: caseName,
          description: caseDescription,
          steps: steps.map((s, i) => ({ ...s, order_index: i })),
        });
      } else {
        // Update existing case
        await updateMutation.mutateAsync({
          id: Number(reusableCaseId),
          data: { name: caseName, description: caseDescription },
        });
        // Sync steps
        await syncStepsMutation.mutateAsync({
          id: Number(reusableCaseId),
          steps: steps.map((s, i) => ({ ...s, order_index: i })),
        });
      }
      // Navigate back to the Reusable Cases list
      if (!releaseId) throw new Error('Release ID is required');
      navigate({
        to: '/$releaseId/settings',
        params: { releaseId },
        search: { tab: 'reusable' },
      });
    } catch (err) {
      const error = err as Error;
      alert(`Failed to save: ${error.message}`);
    }
  }, [
    isNew,
    caseName,
    caseDescription,
    steps,
    reusableCaseId,
    releaseId,
    navigate,
    createMutation,
    updateMutation,
    syncStepsMutation,
  ]);

  const handleBack = useCallback(() => {
    if (!releaseId) return;
    navigate({
      to: '/$releaseId/settings',
      params: { releaseId },
      search: { tab: 'reusable' },
    });
  }, [navigate, releaseId]);

  const handleAddStep = useCallback(() => {
    const newStep: LocalStep = {
      id: `temp-${Date.now()}`,
      step_definition: '',
      type: null,
      element_id: null,
      action: null,
      action_result: null,
      required: false,
      expected_results: null,
      order_index: steps.length,
      select_config_id: null,
      match_config_id: null,
    };
    setSteps((prev) => [...prev, newStep]);
  }, [steps.length]);

  const handleUpdateStepField = useCallback(
    async (stepId: number | string, field: string, value: unknown) => {
      setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s)));

      // If not a new case and step has a real ID, update on server
      if (!isNew && !String(stepId).startsWith('temp-')) {
        try {
          await updateStepMutation.mutateAsync({
            id: Number(reusableCaseId),
            stepId: Number(stepId),
            data: { [field]: value },
          });
        } catch (err) {
          console.error('Failed to update step:', err);
        }
      }
    },
    [isNew, reusableCaseId, updateStepMutation]
  );

  const handleDeleteStep = useCallback((stepId: number | string) => {
    setDeleteConfirm({ open: true, stepId });
  }, []);

  const confirmDeleteStep = useCallback(async () => {
    const { stepId } = deleteConfirm;
    if (!stepId) return;

    // Remove from local state
    setSteps((prev) => prev.filter((s) => s.id !== stepId));

    // If not a new case and step has a real ID, delete on server
    if (!isNew && !String(stepId).startsWith('temp-')) {
      try {
        await deleteStepMutation.mutateAsync({
          id: Number(reusableCaseId),
          stepId: Number(stepId),
        });
      } catch (err) {
        console.error('Failed to delete step:', err);
      }
    }

    setDeleteConfirm({ open: false, stepId: null });
  }, [deleteConfirm, isNew, reusableCaseId, deleteStepMutation]);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ open: false, stepId: null });
  }, []);

  const handleReorderSteps = useCallback((reorderedSteps: LocalStep[]) => {
    setSteps(reorderedSteps);
  }, []);

  // Type Config Modal handlers
  const handleOpenTypeConfigModal = useCallback(
    (category: string) => {
      const configKey = (category + 's') as 'types' | 'actions';
      const options = config[configKey]?.map((o: ConfigOption) => o.display_name).join('\n') || '';
      setTypeConfigModal({ open: true, category, options });
    },
    [config]
  );

  const handleSaveTypeConfig = useCallback(async () => {
    const lines = typeConfigModal.options.split('\n').filter((l: string) => l.trim());
    const optionsArray = lines.map((l: string) => {
      const displayName = l.trim();
      return {
        key: displayName.toLowerCase().replace(/\s+/g, '_'),
        display_name: displayName,
      };
    });
    try {
      await updateTypesMutation.mutateAsync(optionsArray);
      setTypeConfigModal({ open: false, category: '', options: '' });
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }, [typeConfigModal.options, updateTypesMutation]);

  const closeTypeConfigModal = useCallback(() => {
    setTypeConfigModal({ open: false, category: '', options: '' });
  }, []);

  const setTypeConfigOptions = useCallback((options: string) => {
    setTypeConfigModal((prev) => ({ ...prev, options }));
  }, []);

  // Select Config Modal handlers
  const handleOpenSelectConfigModal = useCallback(
    (stepId: number | string, configType: string) => {
      const step = steps.find((s) => s.id === stepId);
      const filtered = rawSelectConfigs.filter((c: SelectConfig) => c.config_type === configType);
      const existing = filtered.find((c: SelectConfig) => c.id === step?.select_config_id);

      // Parse options from SelectConfig - options is a JSON string
      let optionsStr = '';
      if (existing?.options) {
        try {
          const parsed =
            typeof existing.options === 'string' ? JSON.parse(existing.options) : existing.options;
          optionsStr = Array.isArray(parsed) ? parsed.join('\n') : '';
        } catch {
          optionsStr = '';
        }
      }

      setSelectConfigModal({
        open: true,
        stepId,
        configType,
        selectedId: existing?.id?.toString() || '',
        name: existing?.name || '',
        options: optionsStr,
      });
    },
    [steps, rawSelectConfigs]
  );

  const handleSaveSelectConfig = useCallback(async () => {
    try {
      const { stepId, selectedId, name, options, configType } = selectConfigModal;
      const optionsList = options
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l);

      const configResult = await saveSelectConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
        configType,
      });

      // Update the step with the new config ID
      if (stepId) {
        handleUpdateStepField(stepId, 'select_config_id', configResult.id);
      }
      setSelectConfigModal({
        open: false,
        stepId: null,
        configType: 'custom_select',
        selectedId: '',
        name: '',
        options: '',
      });
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }, [selectConfigModal, saveSelectConfigMutation, handleUpdateStepField]);

  const closeSelectConfigModal = useCallback(() => {
    setSelectConfigModal({
      open: false,
      stepId: null,
      configType: 'custom_select',
      selectedId: '',
      name: '',
      options: '',
    });
  }, []);

  const setSelectConfigField = useCallback((field: keyof SelectConfigModalState, value: string) => {
    setSelectConfigModal((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectConfigChange = useCallback(
    (selectedId: string) => {
      const cfg = rawSelectConfigs.find((c: SelectConfig) => c.id === Number(selectedId));
      let optionsStr = '';
      if (cfg?.options) {
        try {
          const parsed = typeof cfg.options === 'string' ? JSON.parse(cfg.options) : cfg.options;
          optionsStr = Array.isArray(parsed) ? parsed.join('\n') : '';
        } catch {
          optionsStr = '';
        }
      }
      setSelectConfigModal((prev) => ({
        ...prev,
        selectedId,
        name: cfg?.name || '',
        options: optionsStr,
      }));
    },
    [rawSelectConfigs]
  );

  // Match Config Modal handlers
  const handleOpenMatchConfigModal = useCallback(
    (stepId: number | string) => {
      const step = steps.find((s) => s.id === stepId);
      const existing = rawMatchConfigs.find((c: MatchConfig) => c.id === step?.match_config_id);

      // Parse options from MatchConfig - options is a JSON string
      let optionsStr = '';
      if (existing?.options) {
        try {
          const parsed =
            typeof existing.options === 'string' ? JSON.parse(existing.options) : existing.options;
          optionsStr = Array.isArray(parsed) ? parsed.join('\n') : '';
        } catch {
          optionsStr = '';
        }
      }

      setMatchConfigModal({
        open: true,
        stepId,
        selectedId: existing?.id?.toString() || '',
        name: existing?.name || '',
        options: optionsStr,
      });
    },
    [steps, rawMatchConfigs]
  );

  const handleSaveMatchConfig = useCallback(async () => {
    try {
      const { stepId, selectedId, name, options } = matchConfigModal;
      const optionsList = options
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l);

      const configResult = await saveMatchConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
      });

      // Update the step with the new config ID and action_result
      if (stepId) {
        handleUpdateStepField(stepId, 'match_config_id', configResult.id);
        handleUpdateStepField(stepId, 'action_result', JSON.stringify(optionsList));
      }
      setMatchConfigModal({
        open: false,
        stepId: null,
        selectedId: '',
        name: '',
        options: '',
      });
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }, [matchConfigModal, saveMatchConfigMutation, handleUpdateStepField]);

  const closeMatchConfigModal = useCallback(() => {
    setMatchConfigModal({
      open: false,
      stepId: null,
      selectedId: '',
      name: '',
      options: '',
    });
  }, []);

  const setMatchConfigField = useCallback((field: keyof MatchConfigModalState, value: string) => {
    setMatchConfigModal((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleMatchConfigChange = useCallback(
    (selectedId: string) => {
      const cfg = rawMatchConfigs.find((c: MatchConfig) => c.id === Number(selectedId));
      let optionsStr = '';
      if (cfg?.options) {
        try {
          const parsed = typeof cfg.options === 'string' ? JSON.parse(cfg.options) : cfg.options;
          optionsStr = Array.isArray(parsed) ? parsed.join('\n') : '';
        } catch {
          optionsStr = '';
        }
      }
      setMatchConfigModal((prev) => ({
        ...prev,
        selectedId,
        name: cfg?.name || '',
        options: optionsStr,
      }));
    },
    [rawMatchConfigs]
  );

  const isLoading = caseLoading || configLoading;
  const isSaving =
    createMutation.isPending || updateMutation.isPending || syncStepsMutation.isPending;

  return {
    // Route params
    releaseId,
    reusableCaseId,
    isNew,

    // Data
    caseName,
    setCaseName,
    caseDescription,
    setCaseDescription,
    steps,
    config,
    selectConfigs,
    matchConfigs,
    rawSelectConfigs,
    rawMatchConfigs,
    actionOptions,
    isLoading,
    isSaving,

    // Delete confirmation
    deleteConfirm,
    closeDeleteConfirm,
    confirmDeleteStep,

    // Actions
    handleSave,
    handleBack,
    handleAddStep,
    handleUpdateStepField,
    handleDeleteStep,
    handleReorderSteps,

    // Type Config Modal
    typeConfigModal,
    handleOpenTypeConfigModal,
    handleSaveTypeConfig,
    closeTypeConfigModal,
    setTypeConfigOptions,

    // Select Config Modal
    selectConfigModal,
    handleOpenSelectConfigModal,
    handleSaveSelectConfig,
    closeSelectConfigModal,
    setSelectConfigField,
    handleSelectConfigChange,

    // Match Config Modal
    matchConfigModal,
    handleOpenMatchConfigModal,
    handleSaveMatchConfig,
    closeMatchConfigModal,
    setMatchConfigField,
    handleMatchConfigChange,
  };
}

export default useReusableCaseEditor;
