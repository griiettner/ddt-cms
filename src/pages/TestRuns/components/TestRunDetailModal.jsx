/**
 * TestRunDetailModal - Shows detailed information about a test run
 */

function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function TestRunDetailModal({ isOpen, onClose, run }) {
  if (!isOpen || !run) return null;

  const failedDetails = run.failed_details || [];

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card max-w-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-co-blue">Test Run Details</h3>
              <p className="text-sm text-co-gray-500 mt-1">
                {run.test_set_name || `Test Set #${run.test_set_id}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-co-gray-500 hover:text-co-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-co-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-co-blue">{run.total_scenarios || 0}</div>
              <div className="text-xs text-co-gray-500">Scenarios</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{run.passed_steps || 0}</div>
              <div className="text-xs text-green-700">Passed</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{run.failed_steps || 0}</div>
              <div className="text-xs text-red-700">Failed</div>
            </div>
            <div className="bg-co-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-co-gray-700">{run.total_steps || 0}</div>
              <div className="text-xs text-co-gray-500">Total Steps</div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-co-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-co-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  run.status === 'passed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {run.status}
                </span>
              </div>
              <div>
                <span className="text-co-gray-500">Duration:</span>
                <span className="ml-2 text-co-gray-700 font-medium">
                  {formatDuration(run.duration_ms)}
                </span>
              </div>
              <div>
                <span className="text-co-gray-500">Executed:</span>
                <span className="ml-2 text-co-gray-700">
                  {formatDate(run.executed_at)}
                </span>
              </div>
              <div>
                <span className="text-co-gray-500">Executed By:</span>
                <span className="ml-2 text-co-gray-700">
                  {run.executed_by || 'System'}
                </span>
              </div>
            </div>
          </div>

          {/* Failed Steps */}
          {failedDetails.length > 0 && (
            <div>
              <h4 className="font-semibold text-co-gray-700 mb-3">
                Failed Steps ({failedDetails.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {failedDetails.map((step, idx) => (
                  <div key={step.stepId || idx} className="bg-red-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                        {step.caseName}
                      </span>
                      <span className="text-xs text-red-400">›</span>
                      <span className="text-xs text-red-600">
                        {step.scenarioName}
                      </span>
                    </div>
                    <div className="font-medium text-red-700 text-sm mb-1">
                      {step.stepDefinition || `Step ${idx + 1}`}
                    </div>
                    <div className="text-red-600 text-xs">
                      {step.error}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success message if all passed */}
          {failedDetails.length === 0 && run.status === 'passed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-600 font-semibold">
                All tests passed successfully!
              </div>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full mt-6 py-3 bg-co-blue text-white font-bold rounded-lg hover:bg-co-blue-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestRunDetailModal;
