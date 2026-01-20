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
} from './components';

function TestSets() {
  const {
    // Data
    testSets,
    pagination,
    filters,
    form,
    isLoading,

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
    isSubmitting,
    isDeleting,
  } = useTestSetsPage();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <TestSetsHeader onCreateClick={openCreateModal} />

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search test sets..."
            className="form-input flex-1"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            onKeyDown={handleFilterKeyDown}
          />
          <button onClick={applyFilters} className="btn-primary btn-sm">
            Apply
          </button>
          <button onClick={resetFilters} className="btn-outline btn-sm">
            Reset
          </button>
        </div>
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

      <TestSetFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        form={form}
        onFormChange={updateFormField}
        isEditing={!!editingTestSet}
        isSubmitting={isSubmitting}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Test Set?"
        message="Are you sure you want to delete this test set and all associated cases/steps? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete Test Set'}
      />
    </div>
  );
}

export default TestSets;
