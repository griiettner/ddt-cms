/**
 * Releases Page
 * Smart hooks + dumb components architecture
 */
import { LoadingSpinner, ConfirmModal } from '../../components/common';
import { useReleasesPage } from './hooks/useReleasesPage';
import {
  ReleasesHeader,
  ReleasesFilters,
  ReleasesTable,
  ReleaseFormModal,
} from './components';

function Releases() {
  const {
    // Data
    releases,
    pagination,
    filters,
    form,
    isLoading,

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
    isSubmitting,
    isDeleting,
  } = useReleasesPage();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ReleasesHeader onCreateClick={openCreateModal} />

      <ReleasesFilters
        filters={filters}
        onFilterChange={updateFilter}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <ReleasesTable
          releases={releases}
          pagination={pagination}
          onPageChange={setPage}
          onEditClick={openEditModal}
          onActionClick={handleAction}
          onDeleteClick={openDeleteConfirm}
          onNoteSave={handleNoteSave}
        />
      )}

      <ReleaseFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        form={form}
        onFormChange={updateFormField}
        isEditing={!!editingRelease}
        isSubmitting={isSubmitting}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Release?"
        message="EXTREME DANGER: This will permanently delete ALL test data, sets, cases, scenarios, and steps for this release. This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete Release'}
      />
    </div>
  );
}

export default Releases;
