/**
 * Playwright Test Runner Entry Point
 * Executes tests based on test data from the database
 */
import { chromium, type Browser, type Page, type BrowserContext } from '@playwright/test';
import { executeStep } from './fixtures/actionHandlers.js';
import type {
  TestData,
  TestRunResult,
  StepResult,
  ProgressUpdate,
  SelectConfig,
  MatchConfig,
} from './fixtures/types.js';

// Get environment variables
const TEST_RUN_ID = process.env.TEST_RUN_ID;
const TEST_SET_ID = process.env.TEST_SET_ID;
const RELEASE_ID = process.env.RELEASE_ID;
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Fetch test data from the API
 */
async function fetchTestData(): Promise<TestData> {
  if (!TEST_SET_ID || !RELEASE_ID) {
    throw new Error('TEST_SET_ID and RELEASE_ID environment variables are required');
  }

  const url = `${API_BASE_URL}/api/test-generation/${TEST_SET_ID}?releaseId=${RELEASE_ID}`;
  console.log(`Fetching test data from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch test data: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as { success: boolean; data?: TestData; error?: string };
  if (!result.success || !result.data) {
    throw new Error(`API error: ${result.error || 'Unknown error'}`);
  }

  return result.data;
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

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Fetch test data
    console.log('Fetching test data...');
    const testData = await fetchTestData();
    console.log(`Loaded test set: ${testData.testSetName}`);
    console.log(`Cases: ${testData.cases.length}`);

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

    // Launch browser
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
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
              const screenshotPath = `test-results/failure-${scenario.id}-step-${step.id}.png`;
              await page.screenshot({ path: screenshotPath });
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

    const result: TestRunResult = {
      testRunId: TEST_RUN_ID ? parseInt(TEST_RUN_ID, 10) : 0,
      status: failedSteps > 0 ? 'failed' : 'passed',
      durationMs: Date.now() - startTime,
      totalScenarios,
      totalSteps,
      passedSteps,
      failedSteps,
      steps: stepResults,
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
  console.log(`Base URL: ${TEST_BASE_URL}`);
  console.log('');

  try {
    const result = await runTests();

    console.log('');
    console.log('=== Test Results ===');
    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${result.durationMs}ms`);
    console.log(`Total Steps: ${result.totalSteps}`);
    console.log(`Passed: ${result.passedSteps}`);
    console.log(`Failed: ${result.failedSteps}`);

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
