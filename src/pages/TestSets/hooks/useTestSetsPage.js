/**
 * TestSets Page Hook
 * Manages all data and logic for the TestSets page
 */
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTestSetsQuery, useCategoriesQuery, useCategoriesFlatQuery } from '../../../hooks/queries';
import {
  useCreateTestSet,
  useUpdateTestSet,
  useDeleteTestSet,
} from '../../../hooks/mutations';
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../../hooks/queries';
import { useRelease } from '../../../context/ReleaseContext';

export function useTestSetsPage() {
  const navigate = useNavigate();
  const { selectedReleaseId, releaseSlug } = useRelease();

  // Tab state
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'categories'

  // Local UI state
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [filters, setFilters] = useState({ search: '', category_ids: [] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTestSet, setEditingTestSet] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [form, setForm] = useState({ name: '', description: '', category_id: null });

  // Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [categoryDeleteConfirm, setCategoryDeleteConfirm] = useState({ open: false, category: null });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', parent_id: null });

  // Query with filters
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

  // Categories queries - tree only when categories tab is active, flat for filter/modals
  const shouldFetchTree = activeTab === 'categories';
  const shouldFetchFlat = activeTab === 'list' || isModalOpen || isCategoryModalOpen;
  const { data: categoriesData, isLoading: isCategoriesLoading } = useCategoriesQuery(shouldFetchTree);
  const { data: categoriesFlat = [] } = useCategoriesFlatQuery(shouldFetchFlat);
  const categoriesTree = categoriesData?.tree || [];

  // Mutations
  const createMutation = useCreateTestSet(selectedReleaseId);
  const updateMutation = useUpdateTestSet(selectedReleaseId);
  const deleteMutation = useDeleteTestSet(selectedReleaseId);

  // Category mutations
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

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
    setForm({ name: '', description: '', category_id: null });
    setIsModalOpen(true);
  }

  function openEditModal(testSet) {
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

  // Category modal handlers
  function openCreateCategoryModal(parent = null) {
    setEditingCategory(null);
    setParentCategory(parent);
    setCategoryForm({
      name: '',
      description: '',
      parent_id: parent?.id || null,
    });
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(category) {
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

  function updateCategoryFormField(key, value) {
    setCategoryForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCategorySubmit(e) {
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
      alert(err.message);
    }
  }

  function openCategoryDeleteConfirm(category) {
    setCategoryDeleteConfirm({ open: true, category });
  }

  function closeCategoryDeleteConfirm() {
    setCategoryDeleteConfirm({ open: false, category: null });
  }

  async function handleCategoryDelete() {
    try {
      await deleteCategoryMutation.mutateAsync(categoryDeleteConfirm.category.id);
      closeCategoryDeleteConfirm();
    } catch (err) {
      alert(err.message);
    }
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
    setFilters({ search: '', category_ids: [] });
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

    // Tab state
    activeTab,
    setActiveTab,

    // Categories data
    categoriesTree,
    categoriesFlat,
    isCategoriesLoading,
    categoryForm,
    editingCategory,
    parentCategory,
    categoryDeleteConfirm,

    // Modal state
    isModalOpen,
    editingTestSet,
    deleteConfirm,
    isCategoryModalOpen,

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

    // Category actions
    openCreateCategoryModal,
    openEditCategoryModal,
    closeCategoryModal,
    updateCategoryFormField,
    handleCategorySubmit,
    openCategoryDeleteConfirm,
    closeCategoryDeleteConfirm,
    handleCategoryDelete,

    // Mutation states
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCategorySubmitting: createCategoryMutation.isPending || updateCategoryMutation.isPending,
    isCategoryDeleting: deleteCategoryMutation.isPending,
  };
}

export default useTestSetsPage;
