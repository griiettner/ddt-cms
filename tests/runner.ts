/**
 * Playwright Test Runner Entry Point
 * Executes tests based on test data from the database
 * Generates Cucumber/BDD reports for test results
 */
import { chromium, type Browser, type Page, type BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { executeStep } from './fixtures/actionHandlers.js';
import { generateAllReports } from './fixtures/cucumberReporter.js';
import type {
  TestData,
  TestRunResult,
  StepResult,
  ProgressUpdate,
  SelectConfig,
  MatchConfig,
} from './fixtures/types.js';

// Load .env file
dotenv.config();

// Get environment variables
const TEST_RUN_ID = process.env.TEST_RUN_ID;
const TEST_SET_ID = process.env.TEST_SET_ID;
let RELEASE_ID = process.env.RELEASE_ID;
let RELEASE_NUMBER = process.env.RELEASE_NUMBER;
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const IS_BATCH_RUN = process.env.IS_BATCH_RUN === 'true';

interface LatestActiveResponse {
  success: boolean;
  data?: {
    id: number;
    release_number: string;
  };
  error?: string;
}

/**
 * Fetch the latest active release from the API
 */
async function fetchLatestActiveRelease(): Promise<{ id: string; releaseNumber: string }> {
  const url = `${API_BASE_URL}/api/releases/latest-active`;
  console.log(`Fetching latest active release from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch latest active release: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as LatestActiveResponse;
  if (!result.success || !result.data) {
    throw new Error(`No active release found: ${result.error || 'Unknown error'}`);
  }

  console.log(
    `  Found latest active release: ${result.data.release_number} (ID: ${result.data.id})`
  );
  return {
    id: String(result.data.id),
    releaseNumber: result.data.release_number,
  };
}

// Report directories
const REPORTS_DIR = path.join(process.cwd(), 'tests', 'reports');
const RESULTS_DIR = path.join(REPORTS_DIR, 'results');

// Per-run directory for media (videos, screenshots)
function getRunDir(testRunId: string): string {
  return path.join(RESULTS_DIR, `run-${testRunId}`);
}

function getScreenshotsDir(testRunId: string): string {
  return path.join(getRunDir(testRunId), 'screenshots');
}

interface TestSetInfo {
  id: number;
  name: string;
}

/**
 * Ensure RELEASE_ID is resolved (from env or latest active)
 */
async function resolveReleaseId(): Promise<void> {
  if (!RELEASE_ID) {
    console.log('RELEASE_ID not provided, fetching latest active release...');
    const latestRelease = await fetchLatestActiveRelease();
    RELEASE_ID = latestRelease.id;
    RELEASE_NUMBER = latestRelease.releaseNumber;
  }
}

/**
 * Fetch all test sets for a release
 */
async function fetchTestSetsForRelease(releaseId: string): Promise<TestSetInfo[]> {
  const url = `${API_BASE_URL}/api/test-sets/${releaseId}?limit=1000`;
  console.log(`Fetching test sets for release ${releaseId} from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch test sets: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as {
    success: boolean;
    data?: TestSetInfo[];
    error?: string;
  };
  if (!result.success || !result.data) {
    throw new Error(`API error: ${result.error || 'Unknown error'}`);
  }

  console.log(`  Found ${result.data.length} test sets`);
  return result.data;
}

/**
 * Fetch test data for a single test set from the API with retry logic
 */
async function fetchTestDataForSet(
  testSetId: string,
  releaseId: string,
  maxRetries = 3,
  retryDelay = 1000
): Promise<TestData> {
  const url = `${API_BASE_URL}/api/test-generation/${testSetId}?releaseId=${releaseId}`;
  console.log(`Fetching test data from: ${url}`);
  console.log(`  API_BASE_URL: ${API_BASE_URL}`);
  console.log(`  TEST_SET_ID: ${testSetId}`);
  console.log(`  RELEASE_ID: ${releaseId}`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/${maxRetries}...`);
      const response = await fetch(url);
      console.log(`  Response status: ${response.status}`);

      if (!response.ok) {
        const text = await response.text();
        console.error(`  Response body: ${text}`);
        throw new Error(`Failed to fetch test data: ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as {
        success: boolean;
        data?: TestData;
        error?: string;
      };
      if (!result.success || !result.data) {
        throw new Error(`API error: ${result.error || 'Unknown error'}`);
      }

      console.log(`  Fetched ${result.data.cases.length} cases`);
      return result.data;
    } catch (err) {
      lastError = err as Error;
      console.error(`  Fetch error on attempt ${attempt}: ${lastError.message}`);

      if (attempt < maxRetries) {
        console.log(`  Retrying in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch test data after retries');
}

/**
 * Fetch test data - either for a specific test set or all test sets in the release
 */
async function fetchTestData(): Promise<TestData> {
  await resolveReleaseId();

  if (!RELEASE_ID) {
    throw new Error('Could not resolve RELEASE_ID');
  }

  const releaseId = RELEASE_ID;

  if (TEST_SET_ID) {
    return fetchTestDataForSet(TEST_SET_ID, releaseId);
  }

  // No TEST_SET_ID provided - fetch all test sets for the release and merge
  console.log('TEST_SET_ID not provided, fetching all test sets for the release...');
  const testSets = await fetchTestSetsForRelease(releaseId);

  if (testSets.length === 0) {
    throw new Error(`No test sets found for release ${releaseId}`);
  }

  // Fetch test data for each test set and merge
  const allTestData: TestData[] = [];
  for (const testSet of testSets) {
    try {
      const data = await fetchTestDataForSet(String(testSet.id), releaseId);
      allTestData.push(data);
    } catch (err) {
      console.warn(
        `  Skipping test set ${testSet.name} (ID: ${testSet.id}): ${(err as Error).message}`
      );
    }
  }

  if (allTestData.length === 0) {
    throw new Error('No test data could be fetched for any test set');
  }

  // Merge all test data into one
  const merged: TestData = {
    testSetId: allTestData[0].testSetId,
    testSetName: allTestData.map((d) => d.testSetName).join(', '),
    categoryPath: allTestData[0].categoryPath,
    releaseId: allTestData[0].releaseId,
    cases: allTestData.flatMap((d) => d.cases),
    selectConfigs: allTestData.flatMap((d) => d.selectConfigs),
    matchConfigs: allTestData.flatMap((d) => d.matchConfigs),
  };

  // Deduplicate configs by id
  const uniqueSelectConfigs = new Map<number, (typeof merged.selectConfigs)[0]>();
  for (const config of merged.selectConfigs) {
    uniqueSelectConfigs.set(config.id, config);
  }
  merged.selectConfigs = Array.from(uniqueSelectConfigs.values());

  const uniqueMatchConfigs = new Map<number, (typeof merged.matchConfigs)[0]>();
  for (const config of merged.matchConfigs) {
    uniqueMatchConfigs.set(config.id, config);
  }
  merged.matchConfigs = Array.from(uniqueMatchConfigs.values());

  console.log(`  Merged ${allTestData.length} test sets: ${merged.cases.length} total cases`);
  return merged;
}

/**
 * Log progress for real-time updates
 */
function logProgress(progress: ProgressUpdate): void {
  console.log(`PROGRESS:${JSON.stringify(progress)}`);
}

/**
 * Run all tests
 */
async function runTests(): Promise<TestRunResult> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  let totalSteps = 0;
  let passedSteps = 0;
  let failedSteps = 0;
  let videoPath: string | undefined;

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Ensure run directory exists for media files
    const runDir = getRunDir(TEST_RUN_ID || '0');
    const screenshotsDir = getScreenshotsDir(TEST_RUN_ID || '0');
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Fetch test data
    console.log('Fetching test data...');
    const testData = await fetchTestData();
    console.log(`Loaded test set: ${testData.testSetName}`);
    console.log(`Cases: ${testData.cases.length}`);

    // Warn if no test data
    if (testData.cases.length === 0) {
      console.warn('WARNING: No test cases found for this test set');
    }

    // Build config maps
    const selectConfigsMap = new Map<number, SelectConfig>();
    for (const config of testData.selectConfigs) {
      selectConfigsMap.set(config.id, config);
    }

    const matchConfigsMap = new Map<number, MatchConfig>();
    for (const config of testData.matchConfigs) {
      matchConfigsMap.set(config.id, config);
    }

    // Count total scenarios and steps
    let totalScenarios = 0;
    for (const testCase of testData.cases) {
      totalScenarios += testCase.scenarios.length;
      for (const scenario of testCase.scenarios) {
        totalSteps += scenario.steps.length;
      }
    }

    console.log(`Total scenarios: ${totalScenarios}`);
    console.log(`Total steps: ${totalSteps}`);

    // Launch browser with video recording
    console.log('Launching browser with video recording...');
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: runDir,
        size: { width: 1280, height: 720 },
      },
    });
    page = await context.newPage();

    // Navigate to base URL
    console.log(`Navigating to: ${TEST_BASE_URL}`);
    await page.goto(TEST_BASE_URL);
    await page.waitForLoadState('networkidle');

    // Execute tests
    let scenarioIndex = 0;
    for (const testCase of testData.cases) {
      console.log(`\nCase: ${testCase.name}`);

      for (const scenario of testCase.scenarios) {
        scenarioIndex++;
        console.log(`  Scenario ${scenarioIndex}/${totalScenarios}: ${scenario.name}`);

        let stepIndex = 0;
        for (const step of scenario.steps) {
          stepIndex++;
          const stepStartTime = Date.now();

          // Log progress
          logProgress({
            currentScenario: scenarioIndex,
            totalScenarios,
            scenarioName: scenario.name,
            caseName: scenario.case_name,
            currentStep: stepIndex,
            totalSteps: scenario.steps.length,
            stepDefinition: step.step_definition,
          });

          console.log(`    Step ${stepIndex}/${scenario.steps.length}: ${step.step_definition}`);

          const stepResult: StepResult = {
            testStepId: step.id,
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            caseName: scenario.case_name,
            stepDefinition: step.step_definition,
            expectedResults: step.expected_results,
            status: 'passed',
            durationMs: 0,
          };

          try {
            // Execute the step
            await executeStep({
              page,
              step,
              selectConfigs: selectConfigsMap,
              matchConfigs: matchConfigsMap,
            });

            stepResult.status = 'passed';
            passedSteps++;
            console.log(`      ✓ Passed`);
          } catch (err) {
            const error = err as Error;
            stepResult.status = 'failed';
            stepResult.errorMessage = error.message;
            failedSteps++;
            console.log(`      ✗ Failed: ${error.message}`);

            // Take screenshot on failure
            try {
              const screenshotPath = path.join(
                screenshotsDir,
                `failure-${scenario.id}-step-${step.id}.png`
              );
              await page.screenshot({ path: screenshotPath });
              stepResult.screenshotPath = screenshotPath;
              console.log(`      Screenshot saved: ${screenshotPath}`);
            } catch (screenshotErr) {
              console.error(`      Failed to save screenshot:`, screenshotErr);
            }
          }

          stepResult.durationMs = Date.now() - stepStartTime;
          stepResults.push(stepResult);
        }
      }
    }

    // Get video reference before closing
    const video = page?.video();

    // Close page and context to finalize the video
    // Video is only fully written after context.close()
    if (page) {
      await page.close().catch(() => {
        /* ignore cleanup errors */
      });
      page = null;
    }
    if (context) {
      await context.close().catch(() => {
        /* ignore cleanup errors */
      });
      context = null;
    }

    // Now get the video path (video is finalized after context close)
    if (video) {
      try {
        const originalPath = await video.path();
        console.log(`Original video path: ${originalPath}`);

        if (originalPath && fs.existsSync(originalPath)) {
          // Wait a moment for file to be fully written
          await new Promise((resolve) => setTimeout(resolve, 500));

          const stats = fs.statSync(originalPath);
          console.log(`Video file size: ${stats.size} bytes`);

          if (stats.size > 0) {
            // Rename to a predictable path in the run directory
            const finalVideoPath = path.join(runDir, 'video.webm');

            // Rename (move) to final location
            fs.renameSync(originalPath, finalVideoPath);
            videoPath = finalVideoPath;
            console.log(`Video saved to: ${finalVideoPath}`);
          } else {
            console.error('Video file is empty');
          }
        } else {
          console.error('Video file does not exist at:', originalPath);
        }
      } catch (videoErr) {
        console.error('Failed to save video:', videoErr);
      }
    }

    const result: TestRunResult = {
      testRunId: TEST_RUN_ID ? parseInt(TEST_RUN_ID, 10) : 0,
      status: failedSteps > 0 ? 'failed' : 'passed',
      durationMs: Date.now() - startTime,
      totalScenarios,
      totalSteps,
      passedSteps,
      failedSteps,
      steps: stepResults,
      videoPath,
    };

    return result;
  } finally {
    // Cleanup - ignore errors during cleanup as we're shutting down anyway
    if (page)
      await page.close().catch(() => {
        /* ignore cleanup errors */
      });
    if (context)
      await context.close().catch(() => {
        /* ignore cleanup errors */
      });
    if (browser)
      await browser.close().catch(() => {
        /* ignore cleanup errors */
      });
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('=== Playwright Test Runner ===');
  console.log(`Test Run ID: ${TEST_RUN_ID}`);
  console.log(`Test Set ID: ${TEST_SET_ID}`);
  console.log(`Release ID: ${RELEASE_ID}`);
  console.log(`Release Number: ${RELEASE_NUMBER || 'N/A'}`);
  console.log(`Test Base URL: ${TEST_BASE_URL}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`CWD: ${process.cwd()}`);
  console.log('');

  // Store test data for reports
  let testSetId = parseInt(TEST_SET_ID || '0', 10);
  let testSetName = 'Unknown Test Set';
  let categoryPath = '';

  try {
    const result = await runTests();

    // Get test data for report metadata
    try {
      const testDataUrl = `${API_BASE_URL}/api/test-generation/${TEST_SET_ID}?releaseId=${RELEASE_ID}`;
      const response = await fetch(testDataUrl);
      if (response.ok) {
        const data = (await response.json()) as {
          data?: { testSetId: number; testSetName: string; categoryPath: string };
        };
        if (data.data) {
          testSetId = data.data.testSetId;
          testSetName = data.data.testSetName;
          categoryPath = data.data.categoryPath || '';
        }
      }
    } catch {
      // Ignore - use default values
    }

    console.log('');
    console.log('=== Test Results ===');
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${result.durationMs}ms`);
    console.log(`Total Steps: ${result.totalSteps}`);
    console.log(`Passed: ${result.passedSteps}`);
    console.log(`Failed: ${result.failedSteps}`);

    // Generate reports (Cucumber JSON)
    console.log('');
    console.log('=== Generating Reports ===');
    console.log(`Test Run ID: ${TEST_RUN_ID}`);
    console.log(`Test Set ID: ${testSetId}`);
    console.log(`Test Set Name: ${testSetName}`);
    console.log(`Category: ${categoryPath || '(none)'}`);
    console.log(`Steps count: ${result.steps.length}`);
    console.log(`Batch run: ${IS_BATCH_RUN}`);

    if (TEST_RUN_ID && result.steps.length > 0) {
      try {
        const reportPaths = generateAllReports(
          result,
          testSetId,
          testSetName,
          categoryPath,
          parseInt(TEST_RUN_ID, 10),
          RELEASE_NUMBER,
          IS_BATCH_RUN
        );
        console.log(`JSON Results: ${reportPaths.jsonPath}`);
        console.log(`Cucumber JSON: ${reportPaths.cucumberPath}`);
      } catch (reportErr) {
        console.error('Failed to generate reports:', reportErr);
      }
    } else {
      console.log(
        `Skipping report generation: TEST_RUN_ID=${TEST_RUN_ID}, steps=${result.steps.length}`
      );
    }

    // Output result for queue service to capture
    console.log(`RESULT:${JSON.stringify(result)}`);

    // Exit with appropriate code
    process.exit(result.status === 'passed' ? 0 : 1);
  } catch (err) {
    const error = err as Error;
    console.error('Test runner failed:', error.message);
    console.error(error.stack);

    // Output error result
    const errorResult: TestRunResult = {
      testRunId: TEST_RUN_ID ? parseInt(TEST_RUN_ID, 10) : 0,
      status: 'failed',
      durationMs: 0,
      totalScenarios: 0,
      totalSteps: 0,
      passedSteps: 0,
      failedSteps: 0,
      steps: [],
    };
    console.log(`RESULT:${JSON.stringify(errorResult)}`);

    process.exit(1);
  }
}

main();
