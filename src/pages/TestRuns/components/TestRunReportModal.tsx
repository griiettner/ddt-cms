/**
 * TestRunReportModal - Shows detailed step-by-step test report
 */
import { useEffect, useState, useCallback } from 'react';
import { Modal, ErrorDisplay } from '@/components/common';
import type { TestRun } from '@/types/entities';
import type { TestRunStepResult, TestRunStatusResponse } from '@/services/api';
import { testExecutionApi } from '@/services/api';

// Custom hook for fetching test run status
function useTestRunStatus(_runId: number | null) {
  const [data, setData] = useState<TestRunStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await testExecutionApi.getStatus(id);
      if (response.data) {
        setData(response.data);
      }
    } catch (err) {
      const fetchError = err as Error;
      setError(fetchError.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, fetchStatus, reset };
}

interface TestRunReportModalProps {
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

// Group steps by case and scenario
interface GroupedStep {
  caseName: string;
  scenarios: {
    scenarioName: string;
    steps: TestRunStepResult[];
  }[];
}

function groupStepsByCaseAndScenario(steps: TestRunStepResult[]): GroupedStep[] {
  const groups = new Map<string, Map<string, TestRunStepResult[]>>();

  for (const step of steps) {
    const caseName = step.case_name || 'Unknown Case';
    const scenarioName = step.scenario_name || 'Unknown Scenario';

    let caseGroup = groups.get(caseName);
    if (!caseGroup) {
      caseGroup = new Map<string, TestRunStepResult[]>();
      groups.set(caseName, caseGroup);
    }

    let scenarioSteps = caseGroup.get(scenarioName);
    if (!scenarioSteps) {
      scenarioSteps = [];
      caseGroup.set(scenarioName, scenarioSteps);
    }
    scenarioSteps.push(step);
  }

  const result: GroupedStep[] = [];
  for (const [caseName, scenarios] of groups) {
    const scenarioList: { scenarioName: string; steps: TestRunStepResult[] }[] = [];
    for (const [scenarioName, stepsInScenario] of scenarios) {
      scenarioList.push({ scenarioName, steps: stepsInScenario });
    }
    result.push({ caseName, scenarios: scenarioList });
  }

  return result;
}

function TestRunReportModal({ isOpen, onClose, run }: TestRunReportModalProps): JSX.Element | null {
  const {
    data: statusData,
    isLoading,
    error,
    fetchStatus,
    reset,
  } = useTestRunStatus(run?.id ?? null);

  useEffect(() => {
    if (isOpen && run) {
      fetchStatus(run.id);
    } else {
      reset();
    }
  }, [isOpen, run, fetchStatus, reset]);

  if (!isOpen || !run) return null;

  const steps = statusData?.steps || [];
  const groupedSteps = groupStepsByCaseAndScenario(steps);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Test Run Report" size="lg">
      <div className="space-y-6">
        {/* Summary Header */}
        <div className="rounded-lg bg-co-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold text-co-blue">
              {run.test_set_name || `Test Set #${run.test_set_id}`}
            </h4>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                run.status === 'passed'
                  ? 'bg-green-100 text-green-700'
                  : run.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {run.status?.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="text-co-gray-500">Duration:</span>
              <span className="ml-2 font-medium">{formatDuration(run.duration_ms)}</span>
            </div>
            <div>
              <span className="text-co-gray-500">Executed:</span>
              <span className="ml-2">{formatDate(run.executed_at)}</span>
            </div>
            <div>
              <span className="text-co-gray-500">Total Steps:</span>
              <span className="ml-2 font-medium">{run.total_steps || 0}</span>
            </div>
            <div>
              <span className="text-green-600">Passed:</span>
              <span className="ml-2 font-medium text-green-600">{run.passed_steps || 0}</span>
              {run.failed_steps > 0 && (
                <>
                  <span className="text-co-gray-400 mx-1">/</span>
                  <span className="text-red-600">Failed:</span>
                  <span className="ml-1 font-medium text-red-600">{run.failed_steps}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
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
            <span className="ml-3 text-co-gray-500">Loading report...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
            {error}
          </div>
        )}

        {/* Step Results */}
        {!isLoading && !error && (
          <div className="max-h-[60vh] overflow-y-auto">
            {groupedSteps.length === 0 ? (
              <div className="rounded-lg bg-co-gray-50 p-8 text-center text-co-gray-500">
                No step results available for this test run.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedSteps.map((caseGroup) => (
                  <div key={caseGroup.caseName} className="rounded-lg border border-co-gray-200">
                    {/* Case Header */}
                    <div className="bg-co-blue-50 rounded-t-lg px-4 py-2">
                      <h5 className="font-semibold text-co-blue">{caseGroup.caseName}</h5>
                    </div>

                    {/* Scenarios */}
                    <div className="divide-y divide-co-gray-100">
                      {caseGroup.scenarios.map((scenario) => (
                        <div key={scenario.scenarioName} className="p-4">
                          <h6 className="mb-3 text-sm font-medium text-co-gray-700">
                            {scenario.scenarioName}
                          </h6>

                          {/* Steps */}
                          <div className="space-y-2">
                            {scenario.steps.map((step, idx) => (
                              <div
                                key={step.id || idx}
                                className={`rounded-lg p-3 ${
                                  step.status === 'passed'
                                    ? 'bg-green-50'
                                    : step.status === 'failed'
                                      ? 'bg-red-50'
                                      : 'bg-yellow-50'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Status Icon */}
                                  <div className="mt-0.5 flex-shrink-0">
                                    {step.status === 'passed' ? (
                                      <svg
                                        className="h-5 w-5 text-green-600"
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
                                    ) : step.status === 'failed' ? (
                                      <svg
                                        className="h-5 w-5 text-red-600"
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
                                    ) : (
                                      <svg
                                        className="h-5 w-5 text-yellow-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                      </svg>
                                    )}
                                  </div>

                                  {/* Step Content */}
                                  <div className="min-w-0 flex-1">
                                    {/* Step Definition */}
                                    <div
                                      className={`text-sm font-medium ${
                                        step.status === 'passed'
                                          ? 'text-green-700'
                                          : step.status === 'failed'
                                            ? 'text-red-700'
                                            : 'text-yellow-700'
                                      }`}
                                    >
                                      {step.step_definition || `Step ${idx + 1}`}
                                    </div>

                                    {/* Expected Results */}
                                    {step.expected_results && (
                                      <div className="mt-1 text-xs text-co-gray-600">
                                        <span className="font-medium">Expected:</span>{' '}
                                        {step.expected_results}
                                      </div>
                                    )}

                                    {/* Duration */}
                                    <div className="mt-1 text-xs text-co-gray-500">
                                      Duration: {formatDuration(step.duration_ms)}
                                    </div>

                                    {/* Error Message */}
                                    {step.error_message && (
                                      <div className="mt-2">
                                        <ErrorDisplay error={step.error_message} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-co-gray-200 pt-4">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default TestRunReportModal;
