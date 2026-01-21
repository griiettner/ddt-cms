/**
 * Settings Page Hook
 * Manages all data and logic for the Settings page
 */
import { useState, type FormEvent } from 'react';
import { useTypesQuery, useActionsQuery } from '@/hooks/queries';
import { useCreateType, useCreateAction, useDeleteConfig } from '@/hooks/mutations';
import { useRelease } from '@/context/ReleaseContext';
import type { ConfigOption, ConfigCategory } from '@/types/entities';

export interface SettingsFormData {
  key: string;
  display_name: string;
  result_type: string;
}

export interface DeleteConfirmState {
  open: boolean;
  id: number | null;
}

export interface UseSettingsPageReturn {
  // Data
  types: ConfigOption[];
  actions: ConfigOption[];
  isLoading: boolean;
  selectedReleaseId: string;

  // Modal state
  isModalOpen: boolean;
  modalCategory: ConfigCategory;
  deleteConfirm: DeleteConfirmState;
  form: SettingsFormData;

  // Actions
  openAddModal: (category: ConfigCategory) => void;
  closeModal: () => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  handleDelete: () => Promise<void>;
  handleDisplayNameChange: (value: string) => void;
  handleKeyChange: (value: string) => void;
  updateFormField: (key: keyof SettingsFormData, value: string) => void;
  openDeleteConfirm: (id: number) => void;
  closeDeleteConfirm: () => void;

  // Mutation states
  isSubmitting: boolean;
  isDeleting: boolean;
}

export function useSettingsPage(): UseSettingsPageReturn {
  const { selectedReleaseId } = useRelease();

  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<ConfigCategory>('type');
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false, id: null });
  const [form, setForm] = useState<SettingsFormData>({
    key: '',
    display_name: '',
    result_type: '',
  });
  const [autoKey, setAutoKey] = useState(true);

  // Queries
  const { data: types = [], isLoading: typesLoading } = useTypesQuery(selectedReleaseId);

  const { data: actions = [], isLoading: actionsLoading } = useActionsQuery(selectedReleaseId);

  const isLoading = typesLoading || actionsLoading;

  // Mutations
  const createTypeMutation = useCreateType(selectedReleaseId);
  const createActionMutation = useCreateAction(selectedReleaseId);
  const deleteMutation = useDeleteConfig(selectedReleaseId);

  // Modal handlers
  function openAddModal(category: ConfigCategory): void {
    setModalCategory(category);
    setForm({ key: '', display_name: '', result_type: '' });
    setAutoKey(true);
    setIsModalOpen(true);
  }

  function closeModal(): void {
    setIsModalOpen(false);
  }

  // Form handlers
  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    try {
      if (modalCategory === 'type') {
        await createTypeMutation.mutateAsync({
          key: form.key,
          display_name: form.display_name,
        });
      } else {
        await createActionMutation.mutateAsync({
          key: form.key,
          display_name: form.display_name,
          result_type: form.result_type || undefined,
        });
      }
      closeModal();
    } catch (err) {
      const error = err as Error;
      alert('Failed to save option: ' + error.message);
    }
  }

  async function handleDelete(): Promise<void> {
    if (deleteConfirm.id === null) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }

  function handleDisplayNameChange(value: string): void {
    setForm((f) => ({ ...f, display_name: value }));
    if (autoKey) {
      const slug = value
        .toLowerCase()
        .replace(/ /g, '_')
        .replace(/[^a-z0-9_]/g, '');
      setForm((f) => ({ ...f, key: slug }));
    }
  }

  function handleKeyChange(value: string): void {
    setForm((f) => ({ ...f, key: value }));
    setAutoKey(false);
  }

  function updateFormField(key: keyof SettingsFormData, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openDeleteConfirm(id: number): void {
    setDeleteConfirm({ open: true, id });
  }

  function closeDeleteConfirm(): void {
    setDeleteConfirm({ open: false, id: null });
  }

  return {
    // Data
    types,
    actions,
    isLoading,
    selectedReleaseId,

    // Modal state
    isModalOpen,
    modalCategory,
    deleteConfirm,
    form,

    // Actions
    openAddModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleDisplayNameChange,
    handleKeyChange,
    updateFormField,
    openDeleteConfirm,
    closeDeleteConfirm,

    // Mutation states
    isSubmitting: createTypeMutation.isPending || createActionMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useSettingsPage;
