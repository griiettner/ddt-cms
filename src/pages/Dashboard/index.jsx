/**
 * Dashboard Page
 * Smart hooks + dumb components architecture
 */
import { LoadingSpinner } from '../../components/common';
import { useDashboardPage } from './hooks/useDashboardPage';
import { DashboardHeader, StatsCards, RecentExecutions } from './components';
import ReleaseFormModal from '../Releases/components/ReleaseFormModal';

function Dashboard() {
  const {
    stats,
    isLoading,
    selectedRelease,
    handleExport,
    openCreateModal,
    closeModal,
    handleSubmit,
    updateFormField,
    isModalOpen,
    form,
    isSubmitting,
  } = useDashboardPage();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <DashboardHeader
        onExport={handleExport}
        onCreateRelease={openCreateModal}
        isCreating={isSubmitting}
      />

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          <StatsCards stats={stats} />
          <RecentExecutions recentRuns={stats?.recentRuns} />
        </>
      )}

      <ReleaseFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        form={form}
        onFormChange={updateFormField}
        isEditing={false}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export default Dashboard;
