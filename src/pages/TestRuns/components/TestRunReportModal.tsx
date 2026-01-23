/**
 * TestRunReportModal - Shows detailed step-by-step test report in fullscreen
 * Features:
 * - Two tabs: Report and Media
 * - Cases displayed as collapsible accordions
 * - Media tab is lazy loaded (content only loads when tab is active)
 * - PDF report generation and download
 * - Scroll happens inside the tab body
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Modal, ErrorDisplay } from '@/components/common';
import type { TestRun } from '@/types/entities';
import type { TestRunStepResult, TestRunStatusResponse } from '@/services/api';
import { testExecutionApi } from '@/services/api';

// Media file type from API
interface MediaFile {
  type: 'video' | 'screenshot';
  filename: string;
  path: string;
  stepId?: number;
  scenarioId?: number;
  size: number;
}

interface MediaFilesResponse {
  video: MediaFile | null;
  screenshots: MediaFile[];
}

// Tab types
type TabId = 'report' | 'media';

// PDF generation state
type PdfState = 'idle' | 'generating' | 'ready' | 'error';

// Video player component
function VideoPlayer({ testRunId }: { testRunId: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const videoUrl = `/api/test-runs/${testRunId}/video`;

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-co-gray-100 text-co-gray-500">
        <div className="text-center">
          <svg
            className="text-co-gray-400 mx-auto h-12 w-12"
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
          <p className="mt-2 text-sm">Video not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-co-gray-100">
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
      )}
      <video
        ref={videoRef}
        className="h-full w-full rounded-lg bg-black"
        controls
        onError={handleError}
        onLoadedData={handleLoadedData}
      >
        <source src={videoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

// Screenshot gallery component
function ScreenshotGallery({
  screenshots,
  steps,
}: {
  screenshots: MediaFile[];
  steps: TestRunStepResult[];
}) {
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);

  // Create a map of step info by stepId for quick lookup
  const stepInfoMap = new Map<number, TestRunStepResult>();
  for (const step of steps) {
    if (step.test_step_id) {
      stepInfoMap.set(step.test_step_id, step);
    }
  }

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-co-gray-500">
        <svg
          className="text-co-gray-400 mb-3 h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p>No failure screenshots available</p>
        <p className="mt-1 text-sm">Screenshots are captured when steps fail</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {screenshots.map((screenshot) => {
          const stepInfo = screenshot.stepId ? stepInfoMap.get(screenshot.stepId) : null;
          return (
            <div
              key={screenshot.filename}
              className="group cursor-pointer overflow-hidden rounded-lg border border-co-gray-200 bg-white transition-shadow hover:shadow-lg"
              onClick={() => setSelectedImage(screenshot)}
            >
              <div className="aspect-video bg-co-gray-100">
                <img
                  src={screenshot.path}
                  alt={`Failure screenshot ${screenshot.filename}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-co-gray-700">
                  {stepInfo?.step_definition || screenshot.filename}
                </p>
                {stepInfo && (
                  <p className="mt-0.5 truncate text-xs text-co-gray-500">
                    {stepInfo.scenario_name}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -right-4 -top-4 rounded-full bg-white p-2 text-co-gray-600 shadow-lg hover:bg-co-gray-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <img
              src={selectedImage.path}
              alt="Failure screenshot"
              className="max-h-[90vh] max-w-[90vw] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}

// Media tab content - lazy loaded
function MediaTabContent({ testRunId, steps }: { testRunId: number; steps: TestRunStepResult[] }) {
  const [media, setMedia] = useState<MediaFilesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/test-runs/${testRunId}/media`);
        if (!response.ok) {
          throw new Error('Failed to fetch media files');
        }
        const result = (await response.json()) as { success: boolean; data: MediaFilesResponse };
        if (result.success) {
          setMedia(result.data);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, [testRunId]);

  if (isLoading) {
    return (
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
        <span className="ml-3 text-co-gray-500">Loading media files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
        {error}
      </div>
    );
  }

  const hasVideo = media?.video !== null;
  const hasScreenshots = media?.screenshots && media.screenshots.length > 0;

  if (!hasVideo && !hasScreenshots) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-co-gray-500">
        <svg
          className="text-co-gray-400 mb-3 h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
          />
        </svg>
        <p>No media files available for this test run</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Section */}
      {hasVideo && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-co-gray-900">Test Recording</h3>
          <div className="aspect-video max-h-[400px] overflow-hidden rounded-lg border border-co-gray-200 bg-black">
            <VideoPlayer testRunId={testRunId} />
          </div>
        </div>
      )}

      {/* Screenshots Section */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-co-gray-900">
          Failure Screenshots
          {hasScreenshots && (
            <span className="ml-2 text-sm font-normal text-co-gray-500">
              ({media?.screenshots.length} images)
            </span>
          )}
        </h3>
        <ScreenshotGallery screenshots={media?.screenshots || []} steps={steps} />
      </div>
    </div>
  );
}

// Custom hook for fetching test run status
function useTestRunStatus(runId: number) {
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

  return { data, isLoading, error, fetchStatus, runId };
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

// Tab button component
function TabButton({
  id,
  label,
  icon,
  isActive,
  onClick,
}: {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-co-blue text-co-blue'
          : 'border-transparent text-co-gray-500 hover:border-co-gray-300 hover:text-co-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Case Accordion Component
function CaseAccordion({
  caseName,
  scenarios,
  defaultExpanded = false,
}: {
  caseName: string;
  scenarios: { scenarioName: string; steps: TestRunStepResult[] }[];
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Count passed/failed for this case
  let passedCount = 0;
  let failedCount = 0;
  for (const scenario of scenarios) {
    for (const step of scenario.steps) {
      if (step.status === 'passed') passedCount++;
      else if (step.status === 'failed') failedCount++;
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-co-gray-200">
      {/* Case Header - Clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-co-blue-50 hover:bg-co-blue-100 flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-co-blue transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <h5 className="font-semibold text-co-blue">{caseName}</h5>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-green-600">{passedCount} passed</span>
          {failedCount > 0 && (
            <span className="font-medium text-red-600">{failedCount} failed</span>
          )}
        </div>
      </button>

      {/* Case Content - Collapsible */}
      {isExpanded && (
        <div className="divide-y divide-co-gray-100">
          {scenarios.map((scenario) => (
            <div key={scenario.scenarioName} className="p-4">
              <h6 className="mb-3 text-sm font-medium text-co-gray-700">{scenario.scenarioName}</h6>

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
                            <span className="font-medium">Expected:</span> {step.expected_results}
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
      )}
    </div>
  );
}

// PDF Generation Modal
function PdfGenerationModal({
  isOpen,
  onClose,
  testRunId,
  testSetName,
}: {
  isOpen: boolean;
  onClose: () => void;
  testRunId: number;
  testSetName: string;
}) {
  const [pdfState, setPdfState] = useState<PdfState>('idle');
  const [error, setError] = useState<string | null>(null);

  const generatePdf = useCallback(async () => {
    setPdfState('generating');
    setError(null);

    try {
      const response = await fetch(`/api/test-runs/${testRunId}/pdf`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Failed to generate PDF');
      }

      setPdfState('ready');
    } catch (err) {
      setError((err as Error).message);
      setPdfState('error');
    }
  }, [testRunId]);

  // Start generation when modal opens
  useEffect(() => {
    if (isOpen && pdfState === 'idle') {
      generatePdf();
    }
  }, [isOpen, pdfState, generatePdf]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPdfState('idle');
      setError(null);
    }
  }, [isOpen]);

  const handleDownload = () => {
    window.open(`/api/test-runs/${testRunId}/pdf`, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="text-center">
          {pdfState === 'generating' && (
            <>
              <svg className="mx-auto h-12 w-12 animate-spin text-co-blue" viewBox="0 0 24 24">
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
              <h3 className="mt-4 text-lg font-semibold text-co-gray-900">Generating PDF Report</h3>
              <p className="mt-2 text-sm text-co-gray-500">
                Please wait while we generate the PDF for {testSetName}...
              </p>
            </>
          )}

          {pdfState === 'ready' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
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
              <h3 className="mt-4 text-lg font-semibold text-co-gray-900">PDF Ready!</h3>
              <p className="mt-2 text-sm text-co-gray-500">
                Your PDF report for {testSetName} has been generated.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-co-gray-700 hover:text-co-gray-900"
                >
                  Cancel
                </button>
                <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download PDF
                </button>
              </div>
            </>
          )}

          {pdfState === 'error' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
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
              <h3 className="mt-4 text-lg font-semibold text-co-gray-900">Generation Failed</h3>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-co-gray-700 hover:text-co-gray-900"
                >
                  Close
                </button>
                <button onClick={generatePdf} className="btn-primary">
                  Try Again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Inner component to handle modal content with key-based reset
function TestRunReportModalContent({ run, onClose }: { run: TestRun; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('report');
  const [mediaTabLoaded, setMediaTabLoaded] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const { data: statusData, isLoading, error, fetchStatus } = useTestRunStatus(run.id);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus(run.id);
  }, [run.id, fetchStatus]);

  // Handle tab change - mark media as loaded when switching to media tab
  const handleTabChange = useCallback(
    (tabId: TabId) => {
      setActiveTab(tabId);
      if (tabId === 'media' && !mediaTabLoaded) {
        setMediaTabLoaded(true);
      }
    },
    [mediaTabLoaded]
  );

  const steps = statusData?.steps || [];
  const groupedSteps = groupStepsByCaseAndScenario(steps);

  return (
    <>
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        {/* Summary Header */}
        <div className="shrink-0 rounded-lg bg-co-gray-50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="font-semibold text-co-blue">
                {run.test_set_name || `Test Set #${run.test_set_id}`}
              </h4>
              {run.environment && (
                <span className="bg-co-blue-50 rounded px-2 py-0.5 text-xs font-medium uppercase text-co-blue">
                  {run.environment}
                </span>
              )}
            </div>
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
              <span className="text-co-gray-500">Run By:</span>
              <span className="ml-2">{run.executed_by || 'System'}</span>
            </div>
            <div>
              <span className="text-co-gray-500">Total Steps:</span>
              <span className="ml-2 font-medium">{run.total_steps || 0}</span>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <span className="text-green-600">Passed:</span>
              <span className="ml-2 font-medium text-green-600">{run.passed_steps || 0}</span>
            </div>
            <div>
              <span className="text-red-600">Failed:</span>
              <span className="ml-2 font-medium text-red-600">{run.failed_steps || 0}</span>
            </div>
            {run.base_url && (
              <div className="col-span-2">
                <span className="text-co-gray-500">Base URL:</span>
                <span className="ml-2 font-mono text-xs">{run.base_url}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 shrink-0 border-b border-co-gray-200">
          <div className="flex gap-4">
            <TabButton
              id="report"
              label="Report"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              isActive={activeTab === 'report'}
              onClick={handleTabChange}
            />
            <TabButton
              id="media"
              label="Media"
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              }
              isActive={activeTab === 'media'}
              onClick={handleTabChange}
            />
          </div>
        </div>

        {/* Tab Content - Scrollable */}
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
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

          {/* Report Tab */}
          {!isLoading && !error && activeTab === 'report' && (
            <>
              {groupedSteps.length === 0 ? (
                <>
                  <h3 className="mb-3 text-lg font-semibold text-co-gray-900">Step Results</h3>
                  <div className="rounded-lg bg-co-gray-50 p-8 text-center text-co-gray-500">
                    No step results available for this test run.
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-co-gray-900">Step Results</h3>
                  {groupedSteps.map((caseGroup, index) => (
                    <CaseAccordion
                      key={caseGroup.caseName}
                      caseName={caseGroup.caseName}
                      scenarios={caseGroup.scenarios}
                      defaultExpanded={index === 0} // First case expanded by default
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Media Tab - Lazy Loaded */}
          {!isLoading && !error && activeTab === 'media' && mediaTabLoaded && (
            <MediaTabContent testRunId={run.id} steps={steps} />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-co-gray-200 pt-4">
          <div className="flex justify-between">
            {/* Download PDF Button - Left Side */}
            <button
              onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-2 rounded-lg border border-co-gray-300 bg-white px-4 py-2 text-sm font-medium text-co-gray-700 transition-colors hover:bg-co-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </button>

            {/* Close Button - Right Side */}
            <button onClick={onClose} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* PDF Generation Modal */}
      <PdfGenerationModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        testRunId={run.id}
        testSetName={run.test_set_name || `Test Set #${run.test_set_id}`}
      />
    </>
  );
}

function TestRunReportModal({ isOpen, onClose, run }: TestRunReportModalProps): JSX.Element | null {
  if (!isOpen || !run) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Test Run Report" size="fullscreen">
      {/* Key forces re-mount when run changes, resetting all state */}
      <TestRunReportModalContent key={run.id} run={run} onClose={onClose} />
    </Modal>
  );
}

export default TestRunReportModal;
