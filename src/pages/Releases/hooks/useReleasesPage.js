/**
 * Releases Page Hook
 * Manages all data and logic for the Releases page
 */
import { useState, useCallback } from 'react';
import { useReleasesQuery } from '../../../hooks/queries';
import {
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
  useCloseRelease,
  useReopenRelease,
  useArchiveRelease,
} from '../../../hooks/mutations';
import { useRelease } from '../../../context/ReleaseContext';

export function useReleasesPage() {
  const { refreshReleases } = useRelease();

  // Local UI state
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [filters, setFilters] = useState({ search: '', status: '', from_date: '', to_date: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [form, setForm] = useState({ release_number: '', description: '', notes: '' });

  // Build query params with pagination and filters
  const queryParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...filters,
  };

  // Query with server-side pagination
  const {
    data: queryData,
    isLoading,
    isError,
    refetch,
  } = useReleasesQuery(queryParams);

  // Extract data and pagination from API response
  const releases = queryData?.data || [];
  const paginationData = queryData?.pagination || {
    page: pagination.page,
    limit: pagination.limit,
    total: 0,
    pages: 0,
  };

  // Mutations
  const createMutation = useCreateRelease();
  const updateMutation = useUpdateRelease();
  const deleteMutation = useDeleteRelease();
  const closeMutation = useCloseRelease();
  const reopenMutation = useReopenRelease();
  const archiveMutation = useArchiveRelease();

  // Modal handlers
  function openCreateModal() {
    setEditingRelease(null);
    setForm({ release_number: '', description: '', notes: '' });
    setIsModalOpen(true);
  }

  function openEditModal(release) {
    setEditingRelease(release);
    setForm({
      release_number: release.release_number,
      description: release.description || '',
      notes: release.notes || '',
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingRelease(null);
  }

  // Form handlers
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingRelease) {
        await updateMutation.mutateAsync({ id: editingRelease.id, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      closeModal();
      await refreshReleases();
    } catch (err) {
      alert(err.message);
    }
  }

  // Action handlers
  async function handleAction(id, action) {
    try {
      switch (action) {
        case 'close':
          await closeMutation.mutateAsync(id);
          break;
        case 'reopen':
          await reopenMutation.mutateAsync(id);
          break;
        case 'archive':
          await archiveMutation.mutateAsync(id);
          break;
      }
      await refreshReleases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
      await refreshReleases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleNoteSave(id, notes) {
    try {
      await updateMutation.mutateAsync({ id, data: { notes } });
    } catch (err) {
      console.error('Failed to save note', err);
    }
  }

  // Filter handlers
  function applyFilters() {
    setPagination(p => ({ ...p, page: 1 }));
  }

  function resetFilters() {
    setFilters({ search: '', status: '', from_date: '', to_date: '' });
    setPagination(p => ({ ...p, page: 1 }));
  }

  function updateFilter(key, value) {
    setFilters(f => ({ ...f, [key]: value }));
  }

  function updateFormField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setPage(page) {
    setPagination(p => ({ ...p, page }));
  }

  function openDeleteConfirm(id) {
    setDeleteConfirm({ open: true, id });
  }

  function closeDeleteConfirm() {
    setDeleteConfirm({ open: false, id: null });
  }

  return {
    // Data
    releases,
    pagination: paginationData,
    filters,
    form,
    isLoading,
    isError,

    // Modal state
    isModalOpen,
    editingRelease,
    deleteConfirm,

    // Actions
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleAction,
    handleDelete,
    handleNoteSave,
    applyFilters,
    resetFilters,
    updateFilter,
    updateFormField,
    setPage,
    openDeleteConfirm,
    closeDeleteConfirm,

    // Mutation states
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useReleasesPage;
