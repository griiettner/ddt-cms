/**
 * Run 7PS Modal - Environment selection for running all test sets in parallel
 */
import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/common';
import { useRelease } from '@/context/ReleaseContext';
import { useEnvironmentsQuery } from '@/hooks/queries';
import { testExecutionApi, type BatchExecutionStatus } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import BatchReportModal from './BatchReportModal';

interface Run7PSModalProps {
  isOpen: boolean;
  onClose: () => void;
  testSetCount: number;
}

function Run7PSModal({ isOpen, onClose, testSetCount }: Run7PSModalProps): JSX.Element {
  const queryClient = useQueryClient();
  const { selectedReleaseId, selectedRelease } = useRelease();
  const [selectedEnvOverride, setSelectedEnvOverride] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [batchStatus, setBatchStatus] = useState<BatchExecutionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Use the same query hook as the single test modal
  const { data: environments = [], isLoading } = useEnvironmentsQuery(selectedReleaseId);

  // Derive selected environment - use override if set, otherwise default to first
  const selectedEnv = useMemo(() => {
    if (selectedEnvOverride) return selectedEnvOverride;
    return environments.length > 0 ? environments[0].environment : '';
  }, [selectedEnvOverride, environments]);

  const setSelectedEnv = (env: string): void => {
    setSelectedEnvOverride(env);
  };

  // Poll for batch status when executing
  useEffect(() => {
    const batchId = batchStatus?.batchId;
    const status = batchStatus?.status;

    if (!batchId || status !== 'running') return;

    const interval = setInterval(async () => {
      try {
        const res = await testExecutionApi.getBatchStatus(batchId);
        if (res.data) {
          setBatchStatus(res.data);

          // Invalidate test runs cache when batch completes
          if (res.data.status !== 'running') {
            queryClient.invalidateQueries({ queryKey: queryKeys.testRuns.all });
          }
        }
      } catch (err) {
        console.error('Failed to poll batch status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [batchStatus?.batchId, batchStatus?.status, queryClient]);

  const handleExecute = async () => {
    if (!selectedReleaseId || !selectedEnv) return;

    setIsExecuting(true);
    setError(null);

    try {
      const res = await testExecutionApi.executeAll({
        releaseId: parseInt(selectedReleaseId, 10),
        environment: selectedEnv,
      });

      if (res.data) {
        // Initialize batch status for tracking
        setBatchStatus({
          batchId: res.data.batchId,
          status: 'running',
          totalSets: res.data.totalSets,
          completedSets: 0,
          passedSets: 0,
          failedSets: 0,
          startedAt: new Date().toISOString(),
          completedAt: null,
          testRuns: [],
        });
      }
    } catch (err) {
      const apiError = err as Error;
      setError(apiError.message || 'Failed to start test execution');
      setIsExecuting(false);
    }
  };

  const handleClose = () => {
    // Invalidate test runs cache if batch was executed
    if (batchStatus) {
      queryClient.invalidateQueries({ queryKey: queryKeys.testRuns.all });
    }
    setBatchStatus(null);
    setIsExecuting(false);
    setError(null);
    setShowReport(false);
    onClose();
  };

  const handleViewReport = () => {
    setShowReport(true);
  };

  const handleCloseReport = () => {
    setShowReport(false);
  };

  // Get release number for report title
  const releaseNumber = selectedRelease?.release_number || 'Unknown';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Run 7PS Test" size="lg">
      <div className="space-y-6">
        {/* Description */}
        <div className="bg-co-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-co-blue">7 Parallel Sets Execution</h4>
          <p className="mt-1 text-sm text-co-gray-600">
            This will run all <strong>{testSetCount}</strong> test sets in the current release
            concurrently, with up to 7 running in parallel at a time.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {/* Batch Progress */}
        {batchStatus && (
          <div className="rounded-lg border border-co-gray-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="font-medium text-co-gray-900">Execution Progress</h5>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  batchStatus.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : batchStatus.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {batchStatus.status.toUpperCase()}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-sm text-co-gray-600">
                <span>
                  {batchStatus.completedSets} of {batchStatus.totalSets} completed
                </span>
                <span>
                  {Math.round((batchStatus.completedSets / batchStatus.totalSets) * 100)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-co-gray-200">
                <div
                  className="h-full rounded-full bg-co-blue transition-all duration-300"
                  style={{
                    width: `${(batchStatus.completedSets / batchStatus.totalSets) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-green-600">{batchStatus.passedSets}</div>
                <div className="text-co-gray-500">Passed</div>
              </div>
              <div>
                <div className="font-semibold text-red-600">{batchStatus.failedSets}</div>
                <div className="text-co-gray-500">Failed</div>
              </div>
              <div>
                <div className="font-semibold text-yellow-600">
                  {batchStatus.totalSets - batchStatus.completedSets}
                </div>
                <div className="text-co-gray-500">Pending</div>
              </div>
            </div>

            {batchStatus.status !== 'running' && (
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={handleClose} className="btn-outline">
                  Close
                </button>
                <button onClick={handleViewReport} className="btn-primary">
                  View Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* Environment Selection - only show when not executing */}
        {!batchStatus && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <svg className="h-8 w-8 animate-spin text-co-blue" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : environments.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-700">
                No environments configured. Please add environments in Settings first.
              </div>
            ) : (
              <div>
                <label className="form-label">Select Environment</label>
                <div className="space-y-2">
                  {environments.map((env) => (
                    <label
                      key={env.environment}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selectedEnv === env.environment
                          ? 'bg-co-blue-50 border-co-blue'
                          : 'border-co-gray-200 hover:border-co-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="environment"
                        value={env.environment}
                        checked={selectedEnv === env.environment}
                        onChange={(e) => setSelectedEnv(e.target.value)}
                        className="text-co-blue focus:ring-co-blue"
                      />
                      <div className="flex-1">
                        <div className="font-medium uppercase text-co-gray-900">
                          {env.environment}
                        </div>
                        <div className="text-sm text-co-gray-500">{env.value}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-co-gray-200 pt-4">
              <button onClick={handleClose} className="btn-outline">
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={!selectedEnv || isExecuting || environments.length === 0}
                className="btn-primary"
              >
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Starting...
                  </span>
                ) : (
                  `Run ${testSetCount} Test Sets`
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Batch Report Modal */}
      {batchStatus && (
        <BatchReportModal
          isOpen={showReport}
          onClose={handleCloseReport}
          batchStatus={batchStatus}
          releaseNumber={releaseNumber}
        />
      )}
    </Modal>
  );
}

export default Run7PSModal;
