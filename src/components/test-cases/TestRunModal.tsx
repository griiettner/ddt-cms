import { ErrorDisplay } from '@/components/common';

type TestStatus = 'running' | 'complete' | 'idle';

interface StepResult {
  stepId?: number;
  stepDefinition?: string;
  status: 'passed' | 'failed';
  error?: string;
  scenarioName?: string;
  caseName?: string;
}

interface ScenarioResult {
  scenarioId: number;
  scenarioName: string;
  caseName: string;
  total?: number;
  passed?: number;
  failed?: number;
  steps?: StepResult[];
}

interface TestResults {
  totalScenarios: number;
  totalSteps: number;
  passed: number;
  failed: number;
  scenarios?: ScenarioResult[];
  duration: number;
}

interface TestRunModalProps {
  isOpen: boolean;
  status: TestStatus;
  currentScenario: number;
  totalScenarios: number;
  scenarioName: string;
  caseName: string;
  currentStep: number;
  totalSteps: number;
  stepDefinition: string;
  results: TestResults | null;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

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
}: TestRunModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const isRunning = status === 'running';
  const isComplete = status === 'complete';

  const scenarioProgress = totalScenarios > 0 ? ((currentScenario - 1) / totalScenarios) * 100 : 0;
  const stepProgress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
  const overallProgress = scenarioProgress + stepProgress / totalScenarios;

  const failedSteps: StepResult[] =
    results?.scenarios?.flatMap(
      (s) =>
        s.steps
          ?.filter((step) => step.status === 'failed')
          .map((step) => ({
            ...step,
            scenarioName: s.scenarioName,
            caseName: s.caseName,
          })) || []
    ) || [];

  return (
    <div className="modal-overlay bg-black/60">
      <div className="modal-card max-w-2xl">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-co-blue">
              {isRunning ? 'Running Tests...' : 'Test Results'}
            </h3>
            {isComplete && (
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
            )}
          </div>

          {isRunning && (
            <div className="space-y-4">
              <div className="mb-2 text-sm text-co-gray-600">
                Scenario {currentScenario} of {totalScenarios}
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-co-gray-100">
                <div
                  className="h-full bg-co-blue transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                />
              </div>

              <div className="rounded-lg border border-co-blue/20 bg-co-blue/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded bg-co-blue/10 px-2 py-0.5 text-xs font-semibold text-co-blue">
                    {caseName || 'Test Case'}
                  </span>
                  <span className="text-xs text-co-gray-500">›</span>
                  <span className="text-sm font-medium text-co-gray-700">
                    {scenarioName || 'Scenario'}
                  </span>
                </div>

                <div className="mb-2 flex items-center gap-3 text-sm text-co-gray-500">
                  <span>
                    Step {currentStep} of {totalSteps}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-co-blue border-t-transparent" />
                  <span className="truncate text-sm text-co-gray-700">
                    {stepDefinition || 'Initializing...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isComplete && results && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 rounded-lg bg-green-50 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{results.passed}</div>
                  <div className="text-sm text-green-700">Steps Passed</div>
                </div>

                <div className="flex-1 rounded-lg bg-red-50 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-red-700">Steps Failed</div>
                </div>

                <div className="flex-1 rounded-lg bg-co-blue/5 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-co-blue/10">
                    <svg
                      className="h-6 w-6 text-co-blue"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-co-blue">{results.totalScenarios}</div>
                  <div className="text-sm text-co-blue">Scenarios</div>
                </div>
              </div>

              <div className="text-center text-sm text-co-gray-500">
                Total duration: {formatDuration(results.duration)} • {results.totalSteps} total
                steps
              </div>

              {failedSteps.length > 0 && (
                <div className="border-t border-co-gray-200 pt-4">
                  <h4 className="mb-3 font-semibold text-co-gray-700">
                    Failed Steps ({failedSteps.length})
                  </h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {failedSteps.map((step, idx) => (
                      <div key={step.stepId || idx} className="rounded-lg bg-red-50 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                            {step.caseName}
                          </span>
                          <span className="text-xs text-red-400">›</span>
                          <span className="text-xs text-red-600">{step.scenarioName}</span>
                        </div>
                        <div className="mb-2 text-sm font-medium text-red-700">
                          {step.stepDefinition || `Step ${idx + 1}`}
                        </div>
                        {step.error && <ErrorDisplay error={step.error} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {failedSteps.length === 0 && results.passed > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                  <div className="font-semibold text-green-600">All tests passed successfully!</div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full rounded-lg bg-co-blue py-3 font-bold text-white transition-colors hover:bg-co-blue-hover"
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
