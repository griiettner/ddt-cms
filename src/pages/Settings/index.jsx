/**
 * Settings Page
 * Smart hooks + dumb components architecture
 */
import { LoadingSpinner, ConfirmModal } from '../../components/common';
import { useSettingsPage } from './hooks/useSettingsPage';
import {
  SettingsHeader,
  TypesSection,
  ActionsSection,
  ConfigModal,
} from './components';

function Settings() {
  const {
    // Data
    types,
    actions,
    isLoading,

    // Modal state
    isModalOpen,
    modalCategory,
    deleteConfirm,
    form,

    // Actions
    openAddModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleDisplayNameChange,
    handleKeyChange,
    updateFormField,
    openDeleteConfirm,
    closeDeleteConfirm,

    // Mutation states
    isSubmitting,
    isDeleting,
  } = useSettingsPage();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <SettingsHeader />

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <TypesSection
            types={types}
            onAddClick={openAddModal}
            onDeleteClick={openDeleteConfirm}
          />
          <ActionsSection
            actions={actions}
            onAddClick={openAddModal}
            onDeleteClick={openDeleteConfirm}
          />
        </div>
      )}

      <ConfigModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        category={modalCategory}
        form={form}
        onDisplayNameChange={handleDisplayNameChange}
        onKeyChange={handleKeyChange}
        onResultTypeChange={(value) => updateFormField('result_type', value)}
        isSubmitting={isSubmitting}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Remove Option?"
        message="Are you sure you want to remove this option? It might already be used in test steps."
        confirmText={isDeleting ? 'Removing...' : 'Remove'}
      />
    </div>
  );
}

export default Settings;
