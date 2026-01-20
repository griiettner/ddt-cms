/**
 * TestRunModal - Shows test run progress and results for all cases/scenarios
 * No close button until tests complete
 */
import { formatDuration } from '../../../temp/testRunner';

function TestRunModal({
  isOpen,
  status,
  currentScenario,
  totalScenarios,
  scenarioName,
  caseName,
  currentStep,
  totalSteps,
  stepDefinition,
  results,
  onClose,
}) {
  if (!isOpen) return null;

  const isRunning = status === 'running';
  const isComplete = status === 'complete';

  // Calculate overall progress
  const scenarioProgress = totalScenarios > 0 ? ((currentScenario - 1) / totalScenarios) * 100 : 0;
  const stepProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const overallProgress = scenarioProgress + (stepProgress / totalScenarios);

  // Get all failed steps across all scenarios
  const failedSteps = results?.scenarios?.flatMap(s =>
    s.steps?.filter(step => step.status === 'failed').map(step => ({
      ...step,
      scenarioName: s.scenarioName,
      caseName: s.caseName,
    })) || []
  ) || [];

  return (
    <div className="modal-overlay bg-black/60">
      <div className="modal-card max-w-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-co-blue">
              {isRunning ? 'Running Tests...' : 'Test Results'}
            </h3>
            {isComplete && (
              <button
                onClick={onClose}
                className="text-co-gray-500 hover:text-co-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Running State */}
          {isRunning && (
            <div className="space-y-4">
              {/* Scenario progress */}
              <div className="text-sm text-co-gray-600 mb-2">
                Scenario {currentScenario} of {totalScenarios}
              </div>

              {/* Overall progress bar */}
              <div className="w-full bg-co-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-co-blue transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                />
              </div>

              {/* Current case/scenario */}
              <div className="bg-co-blue/5 rounded-lg p-4 border border-co-blue/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-co-blue bg-co-blue/10 px-2 py-0.5 rounded">
                    {caseName || 'Test Case'}
                  </span>
                  <span className="text-xs text-co-gray-500">›</span>
                  <span className="text-sm font-medium text-co-gray-700">
                    {scenarioName || 'Scenario'}
                  </span>
                </div>

                {/* Step progress within scenario */}
                <div className="flex items-center gap-3 text-sm text-co-gray-500 mb-2">
                  <span>Step {currentStep} of {totalSteps}</span>
                </div>

                {/* Current step */}
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-4 h-4 border-2 border-co-blue border-t-transparent rounded-full flex-shrink-0" />
                  <span className="text-co-gray-700 text-sm truncate">
                    {stepDefinition || 'Initializing...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Complete State */}
          {isComplete && results && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex gap-4">
                {/* Passed */}
                <div className="flex-1 bg-green-50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{results.passed}</div>
                  <div className="text-sm text-green-700">Steps Passed</div>
                </div>

                {/* Failed */}
                <div className="flex-1 bg-red-50 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-red-700">Steps Failed</div>
                </div>

                {/* Scenarios */}
                <div className="flex-1 bg-co-blue/5 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-co-blue/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-co-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-co-blue">{results.totalScenarios}</div>
                  <div className="text-sm text-co-blue">Scenarios</div>
                </div>
              </div>

              {/* Duration */}
              <div className="text-center text-sm text-co-gray-500">
                Total duration: {formatDuration(results.duration)} • {results.totalSteps} total steps
              </div>

              {/* Failed Steps List */}
              {failedSteps.length > 0 && (
                <div className="border-t border-co-gray-200 pt-4">
                  <h4 className="font-semibold text-co-gray-700 mb-3">
                    Failed Steps ({failedSteps.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {failedSteps.map((step, idx) => (
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
              {failedSteps.length === 0 && results.passed > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-green-600 font-semibold">
                    All tests passed successfully!
                  </div>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-co-blue text-white font-bold rounded-lg hover:bg-co-blue-hover transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestRunModal;
