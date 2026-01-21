/**
 * TestRunDetailModal - Shows detailed information about a test run
 */
import type { TestRun } from '@/types/entities';

interface FailedStepDetail {
  stepId?: number;
  caseName?: string;
  scenarioName?: string;
  stepDefinition?: string;
  error?: string;
}

interface TestRunDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: TestRun | null;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function TestRunDetailModal({ isOpen, onClose, run }: TestRunDetailModalProps): JSX.Element | null {
  if (!isOpen || !run) return null;

  // Cast failed_details to the extended type that includes UI-specific fields
  const failedDetails = (run.failed_details || []) as unknown as FailedStepDetail[];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card max-w-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-co-blue">Test Run Details</h3>
              <p className="mt-1 text-sm text-co-gray-500">
                {run.test_set_name || `Test Set #${run.test_set_id}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-co-gray-500 transition-colors hover:text-co-gray-700"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Summary */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-co-gray-50 p-3 text-center">
              <div className="text-2xl font-bold text-co-blue">{run.total_scenarios || 0}</div>
              <div className="text-xs text-co-gray-500">Scenarios</div>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{run.passed_steps || 0}</div>
              <div className="text-xs text-green-700">Passed</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{run.failed_steps || 0}</div>
              <div className="text-xs text-red-700">Failed</div>
            </div>
            <div className="rounded-lg bg-co-gray-50 p-3 text-center">
              <div className="text-2xl font-bold text-co-gray-700">{run.total_steps || 0}</div>
              <div className="text-xs text-co-gray-500">Total Steps</div>
            </div>
          </div>

          {/* Info */}
          <div className="mb-6 rounded-lg bg-co-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-co-gray-500">Status:</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    run.status === 'passed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {run.status}
                </span>
              </div>
              <div>
                <span className="text-co-gray-500">Duration:</span>
                <span className="ml-2 font-medium text-co-gray-700">
                  {formatDuration(run.duration_ms)}
                </span>
              </div>
              <div>
                <span className="text-co-gray-500">Executed:</span>
                <span className="ml-2 text-co-gray-700">{formatDate(run.executed_at)}</span>
              </div>
              <div>
                <span className="text-co-gray-500">Executed By:</span>
                <span className="ml-2 text-co-gray-700">{run.executed_by || 'System'}</span>
              </div>
            </div>
          </div>

          {/* Failed Steps */}
          {failedDetails.length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold text-co-gray-700">
                Failed Steps ({failedDetails.length})
              </h4>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {failedDetails.map((step, idx) => (
                  <div key={step.stepId || idx} className="rounded-lg bg-red-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                        {step.caseName}
                      </span>
                      <span className="text-xs text-red-400">›</span>
                      <span className="text-xs text-red-600">{step.scenarioName}</span>
                    </div>
                    <div className="mb-1 text-sm font-medium text-red-700">
                      {step.stepDefinition || `Step ${idx + 1}`}
                    </div>
                    <div className="text-xs text-red-600">{step.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success message if all passed */}
          {failedDetails.length === 0 && run.status === 'passed' && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <div className="font-semibold text-green-600">All tests passed successfully!</div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-co-blue py-3 font-bold text-white transition-colors hover:bg-co-blue-hover"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestRunDetailModal;
