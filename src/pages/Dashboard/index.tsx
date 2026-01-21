import { LoadingSpinner } from '@/components/common';
import { useDashboardPage } from './hooks/useDashboardPage';
import { DashboardHeader, StatsCards, RecentExecutions } from './components';
import ReleaseFormModal from '@/pages/Releases/components/ReleaseFormModal';

function Dashboard(): JSX.Element {
  const {
    stats,
    isLoading,
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
    <div className="mx-auto max-w-7xl p-8">
      <DashboardHeader
        onExport={handleExport}
        onCreateRelease={openCreateModal}
        isCreating={isSubmitting}
      />

      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <>
          <StatsCards stats={stats?.stats} />
          <RecentExecutions recentRuns={stats?.recentExecutions} />
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
