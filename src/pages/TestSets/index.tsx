import { LoadingSpinner, ConfirmModal } from '@/components/common';
import { useTestSetsPage } from './hooks/useTestSetsPage';
import {
  TestSetsHeader,
  TestSetsTable,
  TestSetFormModal,
  CategoryTree,
  CategoryFormModal,
} from './components';

function TestSets(): JSX.Element {
  const {
    testSets,
    pagination,
    filters,
    form,
    isLoading,
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
    isSubmitting,
    isDeleting,
    isCategorySubmitting,
    isCategoryDeleting,
  } = useTestSetsPage();

  return (
    <div className="mx-auto max-w-7xl p-8">
      <TestSetsHeader onCreateClick={openCreateModal} />

      <div className="mb-6 border-b border-co-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'border-co-blue-500 text-co-blue-600'
                : 'border-transparent text-co-gray-500 hover:border-co-gray-300 hover:text-co-gray-700'
            }`}
          >
            Test Sets
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'categories'
                ? 'border-co-blue-500 text-co-blue-600'
                : 'border-transparent text-co-gray-500 hover:border-co-gray-300 hover:text-co-gray-700'
            }`}
          >
            Categories
          </button>
        </nav>
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="card mb-6">
            <div className="flex items-end gap-4">
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
                    const selected = Array.from(e.target.selectedOptions, (opt) =>
                      parseInt(opt.value)
                    );
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
                  const cat = categoriesFlat.find((c) => c.id === id);
                  return cat ? (
                    <span
                      key={id}
                      className="bg-co-blue-100 text-co-blue-700 inline-flex items-center gap-1 rounded px-2 py-1 text-sm"
                    >
                      {cat.name}
                      <button
                        onClick={() =>
                          updateFilter(
                            'category_ids',
                            filters.category_ids.filter((cid) => cid !== id)
                          )
                        }
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
