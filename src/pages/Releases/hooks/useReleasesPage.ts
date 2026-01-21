import { useState, type FormEvent } from 'react';
import { useReleasesQuery } from '@/hooks/queries';
import {
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
  useCloseRelease,
  useReopenRelease,
  useArchiveRelease,
} from '@/hooks/mutations';
import { useRelease } from '@/context/ReleaseContext';
import type { Release } from '@/types/entities';

interface ReleaseFilters {
  search: string;
  status: string;
  from_date: string;
  to_date: string;
}

interface ReleaseFormData {
  release_number: string;
  description: string;
  notes: string;
}

interface DeleteConfirmState {
  open: boolean;
  id: number | null;
}

type ReleaseAction = 'close' | 'reopen' | 'archive';

export function useReleasesPage() {
  const { refreshReleases } = useRelease();

  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [filters, setFilters] = useState<ReleaseFilters>({
    search: '',
    status: '',
    from_date: '',
    to_date: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false, id: null });
  const [form, setForm] = useState<ReleaseFormData>({
    release_number: '',
    description: '',
    notes: '',
  });

  const queryParams = {
    page: pagination.page,
    limit: pagination.limit,
    ...filters,
  };

  const { data: queryData, isLoading, isError, refetch: _refetch } = useReleasesQuery(queryParams);

  const releases = queryData?.data || [];
  const paginationData = queryData?.pagination || {
    page: pagination.page,
    limit: pagination.limit,
    total: 0,
    pages: 0,
  };

  const createMutation = useCreateRelease();
  const updateMutation = useUpdateRelease();
  const deleteMutation = useDeleteRelease();
  const closeMutation = useCloseRelease();
  const reopenMutation = useReopenRelease();
  const archiveMutation = useArchiveRelease();

  function openCreateModal() {
    setEditingRelease(null);
    setForm({ release_number: '', description: '', notes: '' });
    setIsModalOpen(true);
  }

  function openEditModal(release: Release) {
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

  async function handleSubmit(e: FormEvent) {
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
      const error = err as Error;
      alert(error.message);
    }
  }

  async function handleAction(id: number, action: ReleaseAction) {
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
      const error = err as Error;
      alert(error.message);
    }
  }

  async function handleDelete() {
    if (deleteConfirm.id === null) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
      await refreshReleases();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }

  async function handleNoteSave(id: number, notes: string) {
    try {
      await updateMutation.mutateAsync({ id, data: { notes } });
    } catch (err) {
      console.error('Failed to save note', err);
    }
  }

  function applyFilters() {
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function resetFilters() {
    setFilters({ search: '', status: '', from_date: '', to_date: '' });
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function updateFilter(key: keyof ReleaseFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function updateFormField(key: keyof ReleaseFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setPage(page: number) {
    setPagination((p) => ({ ...p, page }));
  }

  function openDeleteConfirm(id: number) {
    setDeleteConfirm({ open: true, id });
  }

  function closeDeleteConfirm() {
    setDeleteConfirm({ open: false, id: null });
  }

  return {
    releases,
    pagination: paginationData,
    filters,
    form,
    isLoading,
    isError,
    isModalOpen,
    editingRelease,
    deleteConfirm,
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
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useReleasesPage;
