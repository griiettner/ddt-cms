/**
 * Dashboard Page Hook
 * Manages all data and logic for the Dashboard page
 */
import { useState, useCallback } from 'react';
import { useDashboardQuery } from '../../../hooks/queries';
import { useCreateRelease } from '../../../hooks/mutations';
import { useRelease } from '../../../context/ReleaseContext';
import { exportApi } from '../../../services/api';

const INITIAL_FORM = {
  release_number: '',
  description: '',
  notes: '',
};

export function useDashboardPage() {
  const { selectedReleaseId, selectedRelease, refreshReleases } = useRelease();

  // TanStack Query for dashboard data
  const {
    data: stats,
    isLoading,
    isError,
    refetch,
  } = useDashboardQuery(selectedReleaseId);

  // Create release mutation
  const createReleaseMutation = useCreateRelease();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  /**
   * Handle JSON export
   */
  async function handleExport() {
    if (!selectedReleaseId) {
      alert('Please select a release first.');
      return;
    }
    try {
      const res = await exportApi.get(selectedReleaseId);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `cms_export_release_${selectedReleaseId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  /**
   * Open create release modal
   */
  const openCreateModal = useCallback(() => {
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  }, []);

  /**
   * Close modal
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
  }, []);

  /**
   * Update form field
   */
  const updateFormField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createReleaseMutation.mutateAsync(form);
      await refreshReleases();
      closeModal();
    } catch (err) {
      alert('Error creating release: ' + err.message);
    }
  }

  return {
    // State
    stats,
    isLoading,
    isError,
    selectedRelease,
    selectedReleaseId,

    // Modal state
    isModalOpen,
    form,

    // Actions
    handleExport,
    openCreateModal,
    closeModal,
    handleSubmit,
    updateFormField,
    refetch,

    // Mutation state
    isSubmitting: createReleaseMutation.isPending,
  };
}

export default useDashboardPage;
