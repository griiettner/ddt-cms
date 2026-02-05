/**
 * BatchReportModal - Shows unified report for 7PS batch execution
 * Each test set is an accordion with lazy-loaded content
 */
import { useState, useCallback } from 'react';
import { Modal, ErrorDisplay } from '@/components/common';
import {
  testExecutionApi,
  type BatchExecutionStatus,
  type TestRunStatusResponse,
} from '@/services/api';

interface BatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchStatus: BatchExecutionStatus;
  releaseNumber: string;
}

// Format duration helper
function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

// Accordion item for each test set
interface TestSetAccordionProps {
  testRunId: number;
  testSetName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
}

function TestSetAccordion({ testRunId, testSetName, status }: TestSetAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<TestRunStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    if (data || isLoading) return; // Already loaded or loading

    setIsLoading(true);
    setError(null);
    try {
      const response = await testExecutionApi.getStatus(testRunId);
      if (response.data) {
        setData(response.data);
      }
    } catch (err) {
      const fetchError = err as Error;
      setError(fetchError.message || 'Failed to load test run details');
    } finally {
      setIsLoading(false);
    }
  }, [testRunId, data, isLoading]);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && !data) {
      loadContent();
    }
  };

  const statusColors = {
    passed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-co-gray-100 text-co-gray-700',
  };

  const statusIcons = {
    passed: (
      <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
    failed: (
      <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    running: (
      <svg className="h-5 w-5 animate-spin text-yellow-600" viewBox="0 0 24 24">
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
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    ),
    pending: (
      <svg
        className="text-co-gray-400 h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div className="overflow-hidden rounded-lg border border-co-gray-200">
      {/* Accordion Header */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between bg-white p-4 transition-colors hover:bg-co-gray-50"
      >
        <div className="flex items-center gap-3">
          {statusIcons[status]}
          <span className="font-medium text-co-gray-900">{testSetName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[status]}`}>
            {status.toUpperCase()}
          </span>
          <svg
            className={`text-co-gray-400 h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="border-t border-co-gray-200 bg-co-gray-50 p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <svg className="h-6 w-6 animate-spin text-co-blue" viewBox="0 0 24 24">
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span className="ml-2 text-co-gray-500">Loading details...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-co-gray-900">{data.total_steps || 0}</div>
                  <div className="text-co-gray-500">Total Steps</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-green-600">{data.passed_steps || 0}</div>
                  <div className="text-co-gray-500">Passed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{data.failed_steps || 0}</div>
                  <div className="text-co-gray-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-co-gray-900">
                    {formatDuration(data.duration_ms)}
                  </div>
                  <div className="text-co-gray-500">Duration</div>
                </div>
              </div>

              {/* Video Link */}
              {data.video_path && (
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4 text-co-blue"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <a
                    href={`/api/test-runs/${testRunId}/video`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-co-blue hover:underline"
                  >
                    View Recording
                  </a>
                </div>
              )}

              {/* Step Results - Grouped by Case/Scenario */}
              {data.steps && data.steps.length > 0 && (
                <div className="space-y-3">
                  <h6 className="font-medium text-co-gray-700">Step Results</h6>
                  {groupStepsByCaseAndScenario(data.steps).map((caseGroup) => (
                    <div
                      key={caseGroup.caseName}
                      className="rounded-lg border border-co-gray-200 bg-white"
                    >
                      <div className="bg-co-blue-50 px-3 py-2 text-sm font-medium text-co-blue">
                        {caseGroup.caseName}
                      </div>
                      <div className="divide-y divide-co-gray-100">
                        {caseGroup.scenarios.map((scenario) => (
                          <div key={scenario.scenarioName} className="p-3">
                            <div className="mb-2 text-sm font-medium text-co-gray-600">
                              {scenario.scenarioName}
                            </div>
                            <div className="space-y-1">
                              {scenario.steps.map((step, idx) => (
                                <div
                                  key={step.id || idx}
                                  className={`rounded p-2 text-sm ${
                                    step.status === 'passed'
                                      ? 'bg-green-50'
                                      : step.status === 'failed'
                                        ? 'bg-red-50'
                                        : 'bg-yellow-50'
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5 flex-shrink-0">
                                      {step.status === 'passed' ? (
                                        <svg
                                          className="h-4 w-4 text-green-600"
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
                                      ) : (
                                        <svg
                                          className="h-4 w-4 text-red-600"
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
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div
                                        className={
                                          step.status === 'passed'
                                            ? 'text-green-700'
                                            : 'text-red-700'
                                        }
                                      >
                                        {step.step_definition || `Step ${idx + 1}`}
                                      </div>
                                      {step.error_message && (
                                        <div className="mt-1">
                                          <ErrorDisplay error={step.error_message} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-xs text-co-gray-500">
                                      {formatDuration(step.duration_ms)}
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

              {(!data.steps || data.steps.length === 0) && (
                <div className="py-4 text-center text-co-gray-500">No step details available</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Group steps by case and scenario
interface GroupedStep {
  caseName: string;
  scenarios: {
    scenarioName: string;
    steps: TestRunStatusResponse['steps'];
  }[];
}

function groupStepsByCaseAndScenario(steps: TestRunStatusResponse['steps']): GroupedStep[] {
  const groups = new Map<string, Map<string, typeof steps>>();

  for (const step of steps) {
    const caseName = step.case_name || 'Unknown Case';
    const scenarioName = step.scenario_name || 'Unknown Scenario';

    let caseGroup = groups.get(caseName);
    if (!caseGroup) {
      caseGroup = new Map();
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
    const scenarioList: GroupedStep['scenarios'] = [];
    for (const [scenarioName, stepsInScenario] of scenarios) {
      scenarioList.push({ scenarioName, steps: stepsInScenario });
    }
    result.push({ caseName, scenarios: scenarioList });
  }

  return result;
}

function BatchReportModal({
  isOpen,
  onClose,
  batchStatus,
  releaseNumber,
}: BatchReportModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const totalDuration =
    batchStatus.completedAt && batchStatus.startedAt
      ? new Date(batchStatus.completedAt).getTime() - new Date(batchStatus.startedAt).getTime()
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Release ${releaseNumber} - Test Report`}
      size="fullscreen"
    >
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6">
        {/* Summary Header */}
        <div className="shrink-0 rounded-lg bg-co-gray-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-co-gray-900">Batch Execution Summary</h3>
            <span
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
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

          <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-co-gray-900">{batchStatus.totalSets}</div>
              <div className="text-sm text-co-gray-500">Total Sets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{batchStatus.passedSets}</div>
              <div className="text-sm text-co-gray-500">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{batchStatus.failedSets}</div>
              <div className="text-sm text-co-gray-500">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-co-gray-900">
                {batchStatus.totalSets > 0
                  ? Math.round((batchStatus.passedSets / batchStatus.totalSets) * 100)
                  : 0}
                %
              </div>
              <div className="text-sm text-co-gray-500">Pass Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-co-gray-900">
                {formatDuration(totalDuration)}
              </div>
              <div className="text-sm text-co-gray-500">Duration</div>
            </div>
          </div>
        </div>

        {/* Test Sets Accordion */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <h3 className="mb-3 text-lg font-semibold text-co-gray-900">Test Sets</h3>
          <div className="space-y-2">
            {batchStatus.testRuns.map((run) => (
              <TestSetAccordion
                key={run.testRunId}
                testRunId={run.testRunId}
                testSetName={run.testSetName}
                status={run.status}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-co-gray-200 pt-4">
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default BatchReportModal;
