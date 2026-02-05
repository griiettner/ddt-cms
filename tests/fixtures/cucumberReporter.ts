/**
 * Cucumber Report Generator
 * Converts test results to Cucumber JSON format
 *
 * Structure:
 * - Feature = Test Set
 * - Elements = All Scenarios from all Cases in the Test Set
 * - Steps = Steps within each Scenario
 */
import * as fs from 'fs';
import * as path from 'path';
import type { TestRunResult, StepResult } from './types.js';

// Cucumber JSON format types
interface CucumberStep {
  keyword: string;
  name: string;
  line: number;
  result: {
    status: 'passed' | 'failed' | 'skipped' | 'pending';
    duration: number; // nanoseconds
    error_message?: string;
  };
  match?: {
    location: string;
  };
}

interface CucumberScenario {
  keyword: string;
  name: string;
  description: string;
  line: number;
  id: string;
  type: 'scenario';
  steps: CucumberStep[];
  tags?: { name: string; line: number }[];
}

interface CucumberFeature {
  keyword: string;
  name: string;
  description: string;
  line: number;
  id: string;
  uri: string;
  elements: CucumberScenario[];
  tags?: { name: string; line: number }[];
}

// Report directories
const REPORTS_DIR = path.join(process.cwd(), 'tests', 'reports');
const RESULTS_DIR = path.join(REPORTS_DIR, 'results');
const REPORT_DIR = path.join(process.cwd(), 'report');

/**
 * Convert status to Cucumber status
 */
function toCucumberStatus(status: string): 'passed' | 'failed' | 'skipped' | 'pending' {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

/**
 * Generate a slug from a string (lowercase, hyphens)
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Convert test results to Cucumber JSON format
 *
 * @param result - Test run result with step data
 * @param testSetId - Database ID of the test set
 * @param testSetName - Name of the test set
 * @param categoryPath - Category path (e.g., "Organization / UTEP / Credential")
 * @param releaseNumber - Optional release number for tagging
 */
export function convertToCucumberJson(
  result: TestRunResult,
  testSetId: number,
  testSetName: string,
  categoryPath: string,
  releaseNumber?: string
): CucumberFeature[] {
  // Group steps by scenario
  const scenarioMap = new Map<
    number,
    {
      scenarioId: number;
      scenarioName: string;
      caseName: string;
      steps: StepResult[];
    }
  >();

  for (const step of result.steps) {
    if (!scenarioMap.has(step.scenarioId)) {
      scenarioMap.set(step.scenarioId, {
        scenarioId: step.scenarioId,
        scenarioName: step.scenarioName,
        caseName: step.caseName,
        steps: [],
      });
    }
    scenarioMap.get(step.scenarioId)?.steps.push(step);
  }

  // Build slugs for IDs
  const categorySlug = slugify(categoryPath || 'uncategorized');
  const testSetSlug = slugify(testSetName);

  // Feature ID: <category>_<test-set>_<test-set-id>
  const featureId = `${categorySlug}_${testSetSlug}_${testSetId}`;

  // Build scenario elements
  const elements: CucumberScenario[] = [];
  let currentLine = 3; // Scenarios start at line 3

  for (const scenario of scenarioMap.values()) {
    const caseSlug = slugify(scenario.caseName);
    const scenarioSlug = slugify(scenario.scenarioName);

    // Scenario ID: <category>_<test-set>_<test-set-id>_<case>_<scenario>
    const scenarioId = `${categorySlug}_${testSetSlug}_${testSetId}_${caseSlug}_${scenarioSlug}`;

    // Scenario name: <case-name> / <scenario-name>
    const scenarioName = `${scenario.caseName} / ${scenario.scenarioName}`;

    // Build steps
    const steps: CucumberStep[] = [];
    let stepLine = currentLine + 1;

    for (const step of scenario.steps) {
      // Determine keyword based on step definition
      let keyword = 'Given ';
      const stepLower = step.stepDefinition.toLowerCase();
      if (
        stepLower.includes('when') ||
        stepLower.includes('click') ||
        stepLower.includes('enter')
      ) {
        keyword = 'When ';
      } else if (
        stepLower.includes('then') ||
        stepLower.includes('verify') ||
        stepLower.includes('should')
      ) {
        keyword = 'Then ';
      } else if (stepLower.includes('and')) {
        keyword = 'And ';
      }

      steps.push({
        keyword,
        name: step.stepDefinition,
        line: stepLine,
        result: {
          status: toCucumberStatus(step.status),
          duration: step.durationMs * 1000000, // Convert ms to nanoseconds
          error_message: step.errorMessage,
        },
        match: {
          location: `tests/fixtures/actionHandlers.ts:1`,
        },
      });

      stepLine++;
    }

    elements.push({
      keyword: 'Scenario',
      name: scenarioName,
      description: '',
      line: currentLine,
      id: scenarioId,
      type: 'scenario',
      steps,
      tags: releaseNumber ? [{ name: `@release-${releaseNumber}`, line: currentLine - 1 }] : [],
    });

    // Next scenario line = current + steps + 1 blank line
    currentLine = stepLine + 1;
  }

  // Create feature (one per test set)
  const feature: CucumberFeature = {
    keyword: 'Feature',
    name: testSetName,
    description: categoryPath || '',
    line: 1,
    id: featureId,
    uri: `tests/features/${testSetId}.feature`,
    elements,
    tags: [
      { name: `@test-set-${testSetSlug}`, line: 1 },
      ...(releaseNumber ? [{ name: `@release-${releaseNumber}`, line: 1 }] : []),
    ],
  };

  return [feature];
}

/**
 * Save JSON results to results folder
 */
export function saveJsonResults(result: TestRunResult, testRunId: number): string {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const filename = `results-${testRunId}.json`;
  const filepath = path.join(RESULTS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`JSON results saved: ${filepath}`);

  return filepath;
}

/**
 * Generate all reports for a test run
 * @param isBatchRun - If true, saves to individual file for later merge
 */
export function generateAllReports(
  result: TestRunResult,
  testSetId: number,
  testSetName: string,
  categoryPath: string,
  testRunId: number,
  releaseNumber?: string,
  isBatchRun = false
): {
  jsonPath: string;
  cucumberPath: string;
} {
  // Save JSON results
  const jsonPath = saveJsonResults(result, testRunId);

  // Save Cucumber JSON
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const cucumberJson = convertToCucumberJson(
    result,
    testSetId,
    testSetName,
    categoryPath,
    releaseNumber
  );

  // For batch runs, save to individual file (will be merged later)
  // For single runs, save directly to result.json
  const cucumberFilename = isBatchRun ? `result-${testRunId}.json` : 'result.json';
  const cucumberPath = path.join(REPORT_DIR, cucumberFilename);

  fs.writeFileSync(cucumberPath, JSON.stringify(cucumberJson, null, 2));
  console.log(
    `Cucumber JSON report saved: ${cucumberPath} (${cucumberJson.length} features, ${result.steps.length} steps)`
  );

  return { jsonPath, cucumberPath };
}

/**
 * Merge multiple Cucumber JSON files into a single combined report
 * Used after batch execution completes
 */
export function mergeBatchReports(testRunIds: number[]): string {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  const allFeatures: CucumberFeature[] = [];

  for (const testRunId of testRunIds) {
    const filePath = path.join(REPORT_DIR, `result-${testRunId}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const features = JSON.parse(content) as CucumberFeature[];
        allFeatures.push(...features);
        // Clean up individual file after merging
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Failed to read/parse ${filePath}:`, err);
      }
    }
  }

  // Save combined report
  const combinedPath = path.join(REPORT_DIR, 'result.json');
  fs.writeFileSync(combinedPath, JSON.stringify(allFeatures, null, 2));
  console.log(
    `Combined Cucumber JSON report saved: ${combinedPath} (${allFeatures.length} features)`
  );

  return combinedPath;
}
