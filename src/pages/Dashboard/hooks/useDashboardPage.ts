import { useState, useCallback, type FormEvent } from 'react';
import { useDashboardQuery } from '@/hooks/queries';
import { useCreateRelease } from '@/hooks/mutations';
import { useRelease } from '@/context/ReleaseContext';
import { exportApi } from '@/services/api';

interface ReleaseFormData {
  release_number: string;
  description: string;
  notes: string;
}

const INITIAL_FORM: ReleaseFormData = {
  release_number: '',
  description: '',
  notes: '',
};

export function useDashboardPage() {
  const { selectedReleaseId, selectedRelease, refreshReleases } = useRelease();

  const { data: stats, isLoading, isError, refetch } = useDashboardQuery(selectedReleaseId);

  const createReleaseMutation = useCreateRelease();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ReleaseFormData>(INITIAL_FORM);

  async function handleExport() {
    if (!selectedReleaseId) {
      alert('Please select a release first.');
      return;
    }
    try {
      const res = await exportApi.get(Number(selectedReleaseId));
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `cms_export_release_${selectedReleaseId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      const error = err as Error;
      alert('Export failed: ' + error.message);
    }
  }

  const openCreateModal = useCallback(() => {
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setForm(INITIAL_FORM);
  }, []);

  const updateFormField = useCallback((field: keyof ReleaseFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await createReleaseMutation.mutateAsync(form);
      await refreshReleases();
      closeModal();
    } catch (err) {
      const error = err as Error;
      alert('Error creating release: ' + error.message);
    }
  }

  return {
    stats,
    isLoading,
    isError,
    selectedRelease,
    selectedReleaseId,
    isModalOpen,
    form,
    handleExport,
    openCreateModal,
    closeModal,
    handleSubmit,
    updateFormField,
    refetch,
    isSubmitting: createReleaseMutation.isPending,
  };
}

export default useDashboardPage;
