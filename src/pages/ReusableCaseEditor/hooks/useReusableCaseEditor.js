/**
 * Hook for ReusableCaseEditor page
 * Manages state and actions for editing a reusable case
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reusableCasesApi } from '../../../services/api';
import { queryKeys } from '../../../lib/queryKeys';
import { useAllConfigQuery } from '../../../hooks/queries';
import { useRelease } from '../../../context/ReleaseContext';
import {
  useUpdateTypes,
  useSaveSelectConfig,
  useSaveMatchConfig,
} from '../../../hooks/mutations';

export function useReusableCaseEditor() {
  const { releaseId, reusableCaseId } = useParams({ strict: false });
  const { selectedReleaseId } = useRelease();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Treat undefined, 'new', or empty string as a new case
  const isNew = !reusableCaseId || reusableCaseId === 'new';

  // Local state
  const [caseName, setCaseName] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [steps, setSteps] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, stepId: null });

  // Config modal states
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

  // Fetch reusable case data
  const { data: reusableCase, isLoading: caseLoading } = useQuery({
    queryKey: queryKeys.reusableCases.detail(reusableCaseId),
    queryFn: async () => {
      const res = await reusableCasesApi.get(reusableCaseId);
      return res.data;
    },
    enabled: !isNew && !!reusableCaseId,
    onSuccess: (data) => {
      if (!isInitialized) {
        setCaseName(data.name || '');
        setCaseDescription(data.description || '');
        setSteps(data.steps || []);
        setIsInitialized(true);
      }
    },
  });

  // Initialize state when data loads
  if (reusableCase && !isInitialized) {
    setCaseName(reusableCase.name || '');
    setCaseDescription(reusableCase.description || '');
    setSteps(reusableCase.steps || []);
    setIsInitialized(true);
  }

  // Fetch config for dropdowns
  const {
    config,
    selectConfigs,
    matchConfigs,
    actionOptions,
    isLoading: configLoading,
  } = useAllConfigQuery(selectedReleaseId);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => reusableCasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => reusableCasesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.detail(reusableCaseId) });
    },
  });

  // Sync steps mutation
  const syncStepsMutation = useMutation({
    mutationFn: ({ id, steps }) => reusableCasesApi.syncSteps(id, steps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.detail(reusableCaseId) });
    },
  });

  // Update step mutation
  const updateStepMutation = useMutation({
    mutationFn: ({ id, stepId, data }) => reusableCasesApi.updateStep(id, stepId, data),
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: ({ id, stepId }) => reusableCasesApi.deleteStep(id, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.detail(reusableCaseId) });
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
          id: reusableCaseId,
          data: { name: caseName, description: caseDescription },
        });
        // Sync steps
        await syncStepsMutation.mutateAsync({
          id: reusableCaseId,
          steps: steps.map((s, i) => ({ ...s, order_index: i })),
        });
      }
      // Navigate back to the Reusable Cases list
      navigate({
        to: '/$releaseId/settings',
        params: { releaseId },
        search: { tab: 'reusable' },
      });
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  }, [isNew, caseName, caseDescription, steps, reusableCaseId, releaseId, navigate, createMutation, updateMutation, syncStepsMutation]);

  const handleBack = useCallback(() => {
    navigate({
      to: '/$releaseId/settings',
      params: { releaseId },
      search: { tab: 'reusable' },
    });
  }, [navigate, releaseId]);

  const handleAddStep = useCallback(() => {
    const newStep = {
      id: `temp-${Date.now()}`,
      step_definition: '',
      type: '',
      element_id: '',
      action: '',
      action_result: '',
      required: false,
      expected_results: '',
      order_index: steps.length,
    };
    setSteps((prev) => [...prev, newStep]);
  }, [steps.length]);

  const handleUpdateStepField = useCallback(async (stepId, field, value) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s))
    );

    // If not a new case and step has a real ID, update on server
    if (!isNew && !String(stepId).startsWith('temp-')) {
      try {
        await updateStepMutation.mutateAsync({
          id: reusableCaseId,
          stepId,
          data: { [field]: value },
        });
      } catch (err) {
        console.error('Failed to update step:', err);
      }
    }
  }, [isNew, reusableCaseId, updateStepMutation]);

  const handleDeleteStep = useCallback((stepId) => {
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
          id: reusableCaseId,
          stepId,
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

  const handleReorderSteps = useCallback((reorderedSteps) => {
    setSteps(reorderedSteps);
  }, []);

  // Type Config Modal handlers
  const handleOpenTypeConfigModal = useCallback((category) => {
    const options = config[category + 's']?.map(o => o.display_name).join('\n') || '';
    setTypeConfigModal({ open: true, category, options });
  }, [config]);

  const handleSaveTypeConfig = useCallback(async () => {
    const lines = typeConfigModal.options.split('\n').filter(l => l.trim());
    const optionsArray = lines.map(l => ({ display_name: l.trim() }));
    try {
      await updateTypesMutation.mutateAsync(optionsArray);
      setTypeConfigModal({ open: false, category: '', options: '' });
    } catch (err) {
      alert(err.message);
    }
  }, [typeConfigModal.options, updateTypesMutation]);

  const closeTypeConfigModal = useCallback(() => {
    setTypeConfigModal({ open: false, category: '', options: '' });
  }, []);

  const setTypeConfigOptions = useCallback((options) => {
    setTypeConfigModal(prev => ({ ...prev, options }));
  }, []);

  // Select Config Modal handlers
  const handleOpenSelectConfigModal = useCallback((stepId, configType) => {
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
  }, [steps, selectConfigs]);

  const handleSaveSelectConfig = useCallback(async () => {
    try {
      const { stepId, selectedId, name, options, configType } = selectConfigModal;
      const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);

      const configResult = await saveSelectConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
        configType,
      });

      // Update the step with the new config ID
      handleUpdateStepField(stepId, 'select_config_id', configResult.id);
      setSelectConfigModal({
        open: false,
        stepId: null,
        configType: 'custom_select',
        selectedId: '',
        name: '',
        options: '',
      });
    } catch (err) {
      alert(err.message);
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

  const setSelectConfigField = useCallback((field, value) => {
    setSelectConfigModal(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectConfigChange = useCallback((selectedId) => {
    const cfg = selectConfigs.find(c => c.id === Number(selectedId));
    setSelectConfigModal(prev => ({
      ...prev,
      selectedId,
      name: cfg?.name || '',
      options: cfg?.options.join('\n') || '',
    }));
  }, [selectConfigs]);

  // Match Config Modal handlers
  const handleOpenMatchConfigModal = useCallback((stepId) => {
    const step = steps.find(s => s.id === stepId);
    const existing = matchConfigs.find(c => c.id === step?.match_config_id);

    setMatchConfigModal({
      open: true,
      stepId,
      selectedId: existing?.id || '',
      name: existing?.name || '',
      options: existing?.options.join('\n') || '',
    });
  }, [steps, matchConfigs]);

  const handleSaveMatchConfig = useCallback(async () => {
    try {
      const { stepId, selectedId, name, options } = matchConfigModal;
      const optionsList = options.split('\n').map(l => l.trim()).filter(l => l);

      const configResult = await saveMatchConfigMutation.mutateAsync({
        selectedId: selectedId || null,
        name,
        options: optionsList,
      });

      // Update the step with the new config ID and action_result
      handleUpdateStepField(stepId, 'match_config_id', configResult.id);
      handleUpdateStepField(stepId, 'action_result', JSON.stringify(optionsList));
      setMatchConfigModal({
        open: false,
        stepId: null,
        selectedId: '',
        name: '',
        options: '',
      });
    } catch (err) {
      alert(err.message);
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

  const setMatchConfigField = useCallback((field, value) => {
    setMatchConfigModal(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMatchConfigChange = useCallback((selectedId) => {
    const cfg = matchConfigs.find(c => c.id === Number(selectedId));
    setMatchConfigModal(prev => ({
      ...prev,
      selectedId,
      name: cfg?.name || '',
      options: cfg?.options.join('\n') || '',
    }));
  }, [matchConfigs]);

  const isLoading = caseLoading || configLoading;
  const isSaving = createMutation.isPending || updateMutation.isPending || syncStepsMutation.isPending;

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
