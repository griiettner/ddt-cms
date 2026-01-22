/**
 * TestRuns Page
 * Shows the complete test run history for a release with pagination
 */
import { Link, useParams } from '@tanstack/react-router';
import { LoadingSpinner } from '@/components/common';
import { useTestRunsPage } from './hooks/useTestRunsPage';
import { TestRunsTable, TestRunDetailModal, TestRunReportModal } from './components';

function TestRuns(): JSX.Element {
  const { releaseId: releaseSlug } = useParams({ strict: false }) as { releaseId?: string };
  const {
    testRuns,
    selectedRelease,
    selectedReleaseId,
    stats,
    isLoading,
    isError,
    selectedRun,
    isDetailModalOpen,
    openDetailModal,
    closeDetailModal,
    // Report modal
    reportRun,
    isReportModalOpen,
    openReportModal,
    closeReportModal,
    // Pagination
    pagination,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
  } = useTestRunsPage();

  if (!selectedReleaseId) {
    return (
      <div className="p-8 text-center">
        <p className="text-co-gray-500">Please select a release first.</p>
        <Link to="/releases" className="btn-primary mt-4 inline-block">
          Go to Releases
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Link
              to="/$releaseId"
              params={{ releaseId: releaseSlug || '' }}
              className="text-co-gray-500 transition-colors hover:text-co-blue"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-co-blue">Test Run History</h1>
          </div>
          <p className="text-co-gray-500">
            Release: {selectedRelease?.release_number || releaseSlug}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <div className="text-3xl font-bold text-co-blue">{stats.totalRuns}</div>
          <div className="text-sm text-co-gray-500">Total Runs</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-green-600">{stats.passedRuns}</div>
          <div className="text-sm text-green-700">Passed (this page)</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-red-600">{stats.failedRuns}</div>
          <div className="text-sm text-red-700">Failed (this page)</div>
        </div>
        <div className="card p-4">
          <div className="text-3xl font-bold text-co-gray-700">{stats.totalStepsRun}</div>
          <div className="text-sm text-co-gray-500">Steps (this page)</div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner className="py-20" />
      ) : isError ? (
        <div className="card p-8 text-center text-red-500">
          Failed to load test runs. Please try again.
        </div>
      ) : (
        <TestRunsTable
          testRuns={testRuns}
          onViewDetails={openDetailModal}
          onViewReport={openReportModal}
          pagination={pagination}
          onPageChange={goToPage}
          onNextPage={goToNextPage}
          onPreviousPage={goToPreviousPage}
          onPageSizeChange={changePageSize}
        />
      )}

      {/* Detail Modal */}
      <TestRunDetailModal isOpen={isDetailModalOpen} onClose={closeDetailModal} run={selectedRun} />

      {/* Report Modal */}
      <TestRunReportModal isOpen={isReportModalOpen} onClose={closeReportModal} run={reportRun} />
    </div>
  );
}

export default TestRuns;
