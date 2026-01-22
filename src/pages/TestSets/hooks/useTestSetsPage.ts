import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTestSetsQuery, useCategoriesQuery, useCategoriesFlatQuery } from '@/hooks/queries';
import { useCreateTestSet, useUpdateTestSet, useDeleteTestSet } from '@/hooks/mutations';
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/queries';
import { useRelease } from '@/context/ReleaseContext';
import type { TestSet, Category } from '@/types/entities';

interface TestSetFilters {
  search: string;
  category_ids: number[];
}

interface TestSetFormData {
  name: string;
  description: string;
  category_id: number | null;
}

interface CategoryFormData {
  id?: number;
  name: string;
  description: string;
  parent_id: number | null;
}

interface DeleteConfirmState {
  open: boolean;
  id: number | null;
}

interface CategoryDeleteConfirmState {
  open: boolean;
  category: Category | null;
}

type TabType = 'list' | 'categories';

export function useTestSetsPage() {
  const navigate = useNavigate();
  const { selectedReleaseId, releaseSlug } = useRelease();

  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [filters, setFilters] = useState<TestSetFilters>({ search: '', category_ids: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTestSet, setEditingTestSet] = useState<TestSet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({ open: false, id: null });
  const [form, setForm] = useState<TestSetFormData>({
    name: '',
    description: '',
    category_id: null,
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [categoryDeleteConfirm, setCategoryDeleteConfirm] = useState<CategoryDeleteConfirmState>({
    open: false,
    category: null,
  });
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: '',
    description: '',
    parent_id: null,
  });

  const queryFilters = {
    page: pagination.page,
    limit: pagination.limit,
    search: filters.search,
    category_ids: filters.category_ids.length > 0 ? filters.category_ids.join(',') : undefined,
  };

  const {
    data: queryData,
    isLoading,
    isError,
    refetch: _refetch,
  } = useTestSetsQuery(selectedReleaseId, queryFilters);

  const testSets = queryData?.data || [];
  const paginationData = queryData?.pagination || {
    page: pagination.page,
    limit: pagination.limit,
    total: 0,
    pages: 1,
  };

  const shouldFetchTree = activeTab === 'categories';
  const shouldFetchFlat = activeTab === 'list' || isModalOpen || isCategoryModalOpen;
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategoriesQuery(shouldFetchTree);
  const { data: categoriesFlat = [] } = useCategoriesFlatQuery(shouldFetchFlat);
  const categoriesTree = categoriesData?.tree || [];

  const createMutation = useCreateTestSet(selectedReleaseId);
  const updateMutation = useUpdateTestSet(selectedReleaseId);
  const deleteMutation = useDeleteTestSet(selectedReleaseId);

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  function navigateToTestCases(testSetId: number) {
    navigate({
      to: '/$releaseId/test-cases',
      params: { releaseId: releaseSlug || '' },
      search: { testSetId },
    });
  }

  function openCreateModal() {
    setEditingTestSet(null);
    setForm({ name: '', description: '', category_id: null });
    setIsModalOpen(true);
  }

  function openEditModal(testSet: TestSet) {
    setEditingTestSet(testSet);
    setForm({
      name: testSet.name,
      description: testSet.description || '',
      category_id: testSet.category_id || null,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTestSet(null);
  }

  function openCreateCategoryModal(parent: Category | null = null) {
    setEditingCategory(null);
    setParentCategory(parent);
    setCategoryForm({
      name: '',
      description: '',
      parent_id: parent?.id || null,
    });
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(category: Category) {
    setEditingCategory(category);
    setParentCategory(null);
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || null,
    });
    setIsCategoryModalOpen(true);
  }

  function closeCategoryModal() {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setParentCategory(null);
  }

  function updateCategoryFormField(key: keyof CategoryFormData, value: string | number | null) {
    setCategoryForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCategorySubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory.id,
          data: categoryForm,
        });
      } else {
        await createCategoryMutation.mutateAsync(categoryForm);
      }
      closeCategoryModal();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }

  function openCategoryDeleteConfirm(category: Category) {
    setCategoryDeleteConfirm({ open: true, category });
  }

  function closeCategoryDeleteConfirm() {
    setCategoryDeleteConfirm({ open: false, category: null });
  }

  async function handleCategoryDelete() {
    if (!categoryDeleteConfirm.category) return;
    try {
      await deleteCategoryMutation.mutateAsync(categoryDeleteConfirm.category.id);
      closeCategoryDeleteConfirm();
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Guard against invalid release ID (race condition when releases haven't loaded)
    if (!selectedReleaseId || Number(selectedReleaseId) === 0) {
      alert('Please wait for the release to load or refresh the page.');
      return;
    }

    try {
      if (editingTestSet) {
        await updateMutation.mutateAsync({ id: editingTestSet.id, data: form });
      } else {
        // Transform null to undefined for category_id to match CreateTestSetData type
        await createMutation.mutateAsync({
          name: form.name,
          description: form.description,
          category_id: form.category_id ?? undefined,
        });
      }
      closeModal();
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
    } catch (err) {
      const error = err as Error;
      alert(error.message);
    }
  }

  function applyFilters() {
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function resetFilters() {
    setFilters({ search: '', category_ids: [] });
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function updateFilter<K extends keyof TestSetFilters>(key: K, value: TestSetFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function updateFormField(key: keyof TestSetFormData, value: string | number | null) {
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

  function handleFilterKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      applyFilters();
    }
  }

  return {
    testSets,
    pagination: paginationData,
    filters,
    form,
    isLoading,
    isError,
    selectedReleaseId,
    activeTab,
    setActiveTab,
    categoriesTree,
    categoriesFlat,
    isCategoriesLoading,
    categoryForm,
    editingCategory,
    parentCategory,
    categoryDeleteConfirm,
    isModalOpen,
    editingTestSet,
    deleteConfirm,
    isCategoryModalOpen,
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
    openCreateCategoryModal,
    openEditCategoryModal,
    closeCategoryModal,
    updateCategoryFormField,
    handleCategorySubmit,
    openCategoryDeleteConfirm,
    closeCategoryDeleteConfirm,
    handleCategoryDelete,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCategorySubmitting: createCategoryMutation.isPending || updateCategoryMutation.isPending,
    isCategoryDeleting: deleteCategoryMutation.isPending,
  };
}

export default useTestSetsPage;
