import { LoadingSpinner, ConfirmModal } from '@/components/common';
import { useReleasesPage } from './hooks/useReleasesPage';
import { ReleasesHeader, ReleasesFilters, ReleasesTable, ReleaseFormModal } from './components';

function Releases(): JSX.Element {
  const {
    releases,
    pagination,
    filters,
    form,
    isLoading,
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
    isSubmitting,
    isDeleting,
  } = useReleasesPage();

  return (
    <div className="mx-auto max-w-7xl p-8">
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
