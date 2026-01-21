/**
 * Settings Page
 * Smart hooks + dumb components architecture
 */
import { useSearch, useNavigate, useParams } from '@tanstack/react-router';
import { LoadingSpinner, ConfirmModal } from '../../components/common';
import { useSettingsPage } from './hooks/useSettingsPage';
import {
  SettingsHeader,
  TypesSection,
  ActionsSection,
  ConfigModal,
  ReusableCasesManager,
} from './components';

function Settings() {
  const { tab: activeTab } = useSearch({ strict: false });
  const { releaseId } = useParams({ strict: false });
  const navigate = useNavigate();

  const setActiveTab = (tab) => {
    navigate({
      to: '/$releaseId/settings',
      params: { releaseId },
      search: { tab },
      replace: true,
    });
  };

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

      {/* Tabs */}
      <div className="border-b border-co-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'config'
                ? 'border-co-blue-500 text-co-blue-600'
                : 'border-transparent text-co-gray-500 hover:text-co-gray-700 hover:border-co-gray-300'
            }`}
          >
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('reusable')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reusable'
                ? 'border-co-blue-500 text-co-blue-600'
                : 'border-transparent text-co-gray-500 hover:text-co-gray-700 hover:border-co-gray-300'
            }`}
          >
            Reusable Cases
          </button>
        </nav>
      </div>

      {activeTab === 'config' ? (
        <>
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
        </>
      ) : (
        <ReusableCasesManager />
      )}
    </div>
  );
}

export default Settings;
