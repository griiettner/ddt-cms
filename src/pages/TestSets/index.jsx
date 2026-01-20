/**
 * TestSets Page
 * Smart hooks + dumb components architecture
 */
import { LoadingSpinner, ConfirmModal } from '../../components/common';
import { useTestSetsPage } from './hooks/useTestSetsPage';
import {
  TestSetsHeader,
  TestSetsTable,
  TestSetFormModal,
  CategoryTree,
  CategoryFormModal,
} from './components';

function TestSets() {
  const {
    // Data
    testSets,
    pagination,
    filters,
    form,
    isLoading,

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
    isSubmitting,
    isDeleting,
    isCategorySubmitting,
    isCategoryDeleting,
  } = useTestSetsPage();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <TestSetsHeader onCreateClick={openCreateModal} />

      {/* Tabs */}
      <div className="border-b border-co-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'list'
                ? 'border-co-blue-500 text-co-blue-600'
                : 'border-transparent text-co-gray-500 hover:text-co-gray-700 hover:border-co-gray-300'
            }`}
          >
            Test Sets
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'categories'
                ? 'border-co-blue-500 text-co-blue-600'
                : 'border-transparent text-co-gray-500 hover:text-co-gray-700 hover:border-co-gray-300'
            }`}
          >
            Categories
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* Filters */}
          <div className="card mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="form-label text-xs">Search</label>
                <input
                  type="text"
                  placeholder="Search test sets..."
                  className="form-input"
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  onKeyDown={handleFilterKeyDown}
                />
              </div>
              <div className="w-64">
                <label className="form-label text-xs">Categories</label>
                <select
                  multiple
                  className="form-input h-[38px]"
                  value={filters.category_ids.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, opt => parseInt(opt.value));
                    updateFilter('category_ids', selected);
                  }}
                >
                  {categoriesFlat.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={applyFilters} className="btn-primary btn-sm h-[38px]">
                Apply
              </button>
              <button onClick={resetFilters} className="btn-outline btn-sm h-[38px]">
                Reset
              </button>
            </div>
            {filters.category_ids.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {filters.category_ids.map((id) => {
                  const cat = categoriesFlat.find(c => c.id === id);
                  return cat ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-co-blue-100 text-co-blue-700 rounded text-sm"
                    >
                      {cat.name}
                      <button
                        onClick={() => updateFilter('category_ids', filters.category_ids.filter(cid => cid !== id))}
                        className="hover:text-co-blue-900"
                      >
                        &times;
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {isLoading ? (
            <LoadingSpinner className="py-20" />
          ) : (
            <TestSetsTable
              testSets={testSets}
              pagination={pagination}
              onPageChange={setPage}
              onEditClick={openEditModal}
              onDeleteClick={openDeleteConfirm}
              onNavigate={navigateToTestCases}
            />
          )}
        </>
      ) : (
        <div className="card">
          {isCategoriesLoading ? (
            <LoadingSpinner className="py-20" />
          ) : (
            <CategoryTree
              tree={categoriesTree}
              onEdit={openEditCategoryModal}
              onDelete={openCategoryDeleteConfirm}
              onAddChild={openCreateCategoryModal}
              onCreateRoot={() => openCreateCategoryModal(null)}
            />
          )}
        </div>
      )}

      <TestSetFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        form={form}
        onFormChange={updateFormField}
        categoriesFlat={categoriesFlat}
        isEditing={!!editingTestSet}
        isSubmitting={isSubmitting}
      />

      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        onSubmit={handleCategorySubmit}
        form={categoryForm}
        onFormChange={updateCategoryFormField}
        categoriesFlat={categoriesFlat}
        isEditing={!!editingCategory}
        isSubmitting={isCategorySubmitting}
        parentCategory={parentCategory}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Test Set?"
        message="Are you sure you want to delete this test set and all associated cases/steps? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete Test Set'}
      />

      <ConfirmModal
        isOpen={categoryDeleteConfirm.open}
        onClose={closeCategoryDeleteConfirm}
        onConfirm={handleCategoryDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete "${categoryDeleteConfirm.category?.name}"? This action cannot be undone.`}
        confirmText={isCategoryDeleting ? 'Deleting...' : 'Delete Category'}
      />
    </div>
  );
}

export default TestSets;
