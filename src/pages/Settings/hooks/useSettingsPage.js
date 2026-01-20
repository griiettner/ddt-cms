/**
 * Settings Page Hook
 * Manages all data and logic for the Settings page
 */
import { useState } from 'react';
import { useTypesQuery, useActionsQuery } from '../../../hooks/queries';
import {
  useCreateType,
  useCreateAction,
  useDeleteConfig,
} from '../../../hooks/mutations';
import { useRelease } from '../../../context/ReleaseContext';

export function useSettingsPage() {
  const { selectedReleaseId } = useRelease();

  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState('type');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [form, setForm] = useState({ key: '', display_name: '', result_type: '' });
  const [autoKey, setAutoKey] = useState(true);

  // Queries
  const {
    data: types = [],
    isLoading: typesLoading,
  } = useTypesQuery(selectedReleaseId);

  const {
    data: actions = [],
    isLoading: actionsLoading,
  } = useActionsQuery(selectedReleaseId);

  const isLoading = typesLoading || actionsLoading;

  // Mutations
  const createTypeMutation = useCreateType(selectedReleaseId);
  const createActionMutation = useCreateAction(selectedReleaseId);
  const deleteMutation = useDeleteConfig(selectedReleaseId);

  // Modal handlers
  function openAddModal(category) {
    setModalCategory(category);
    setForm({ key: '', display_name: '', result_type: '' });
    setAutoKey(true);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  // Form handlers
  async function handleSubmit(e) {
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
          result_type: form.result_type || null,
        });
      }
      closeModal();
    } catch (err) {
      alert('Failed to save option: ' + err.message);
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
    } catch (err) {
      alert(err.message);
    }
  }

  function handleDisplayNameChange(value) {
    setForm(f => ({ ...f, display_name: value }));
    if (autoKey) {
      const slug = value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
      setForm(f => ({ ...f, key: slug }));
    }
  }

  function handleKeyChange(value) {
    setForm(f => ({ ...f, key: value }));
    setAutoKey(false);
  }

  function updateFormField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function openDeleteConfirm(id) {
    setDeleteConfirm({ open: true, id });
  }

  function closeDeleteConfirm() {
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
