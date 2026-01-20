/**
 * TestSets Page Hook
 * Manages all data and logic for the TestSets page
 */
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTestSetsQuery } from '../../../hooks/queries';
import {
  useCreateTestSet,
  useUpdateTestSet,
  useDeleteTestSet,
} from '../../../hooks/mutations';
import { useRelease } from '../../../context/ReleaseContext';

export function useTestSetsPage() {
  const navigate = useNavigate();
  const { selectedReleaseId, releaseSlug } = useRelease();

  // Local UI state
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [filters, setFilters] = useState({ search: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTestSet, setEditingTestSet] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [form, setForm] = useState({ name: '', description: '' });

  // Query with filters
  const queryFilters = {
    page: pagination.page,
    limit: pagination.limit,
    search: filters.search,
  };

  const {
    data: queryData,
    isLoading,
    isError,
    refetch,
  } = useTestSetsQuery(selectedReleaseId, queryFilters);

  // Extract data and pagination from query response
  const testSets = queryData?.data || [];
  const paginationData = queryData?.pagination || {
    page: pagination.page,
    limit: pagination.limit,
    total: 0,
    pages: 1,
  };

  // Mutations
  const createMutation = useCreateTestSet(selectedReleaseId);
  const updateMutation = useUpdateTestSet(selectedReleaseId);
  const deleteMutation = useDeleteTestSet(selectedReleaseId);

  // Navigation
  function navigateToTestCases(testSetId) {
    navigate({
      to: '/$releaseId/test-cases',
      params: { releaseId: releaseSlug },
      search: { testSetId },
    });
  }

  // Modal handlers
  function openCreateModal() {
    setEditingTestSet(null);
    setForm({ name: '', description: '' });
    setIsModalOpen(true);
  }

  function openEditModal(testSet) {
    setEditingTestSet(testSet);
    setForm({
      name: testSet.name,
      description: testSet.description || '',
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTestSet(null);
  }

  // Form handlers
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingTestSet) {
        await updateMutation.mutateAsync({ id: editingTestSet.id, data: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      closeModal();
    } catch (err) {
      alert(err.message);
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

  // Filter handlers
  function applyFilters() {
    setPagination(p => ({ ...p, page: 1 }));
  }

  function resetFilters() {
    setFilters({ search: '' });
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

  function handleFilterKeyDown(e) {
    if (e.key === 'Enter') {
      applyFilters();
    }
  }

  return {
    // Data
    testSets,
    pagination: paginationData,
    filters,
    form,
    isLoading,
    isError,
    selectedReleaseId,

    // Modal state
    isModalOpen,
    editingTestSet,
    deleteConfirm,

    // Actions
    navigateToTestCases,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    applyFilters,
    resetFilters,
    updateFilter,
    updateFormField,
    setPage,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleFilterKeyDown,

    // Mutation states
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useTestSetsPage;
