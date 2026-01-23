/**
 * Cucumber Report Generator
 * Converts test results to Cucumber JSON format and generates HTML reports
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

// Report directory
const REPORTS_DIR = path.join(process.cwd(), 'tests', 'reports');
const BDD_DIR = path.join(REPORTS_DIR, 'bdd');
const RESULTS_DIR = path.join(REPORTS_DIR, 'results');

/**
 * Convert our step status to Cucumber status
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
 * Generate a slug from a string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Convert test results to Cucumber JSON format
 */
export function convertToCucumberJson(
  result: TestRunResult,
  testSetName: string,
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

  // Group scenarios by case
  const caseMap = new Map<
    string,
    {
      caseName: string;
      scenarios: {
        scenarioId: number;
        scenarioName: string;
        caseName: string;
        steps: StepResult[];
      }[];
    }
  >();

  for (const scenario of scenarioMap.values()) {
    if (!caseMap.has(scenario.caseName)) {
      caseMap.set(scenario.caseName, {
        caseName: scenario.caseName,
        scenarios: [],
      });
    }
    caseMap.get(scenario.caseName)?.scenarios.push(scenario);
  }

  // Create Cucumber features (one per test case)
  const features: CucumberFeature[] = [];
  let featureLine = 1;

  for (const testCase of caseMap.values()) {
    const featureId = slugify(testCase.caseName);
    const elements: CucumberScenario[] = [];
    let scenarioLine = 3;

    for (const scenario of testCase.scenarios) {
      const steps: CucumberStep[] = [];
      let stepLine = scenarioLine + 1;

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
        name: scenario.scenarioName,
        description: '',
        line: scenarioLine,
        id: `${featureId};${slugify(scenario.scenarioName)}`,
        type: 'scenario',
        steps,
        tags: releaseNumber ? [{ name: `@release-${releaseNumber}`, line: scenarioLine - 1 }] : [],
      });

      scenarioLine = stepLine + 2;
    }

    features.push({
      keyword: 'Feature',
      name: testCase.caseName,
      description: `Test Case: ${testCase.caseName}\nTest Set: ${testSetName}`,
      line: featureLine,
      id: featureId,
      uri: `tests/features/${featureId}.feature`,
      elements,
      tags: [
        { name: `@test-set-${slugify(testSetName)}`, line: 1 },
        ...(releaseNumber ? [{ name: `@release-${releaseNumber}`, line: 1 }] : []),
      ],
    });

    featureLine += scenarioLine;
  }

  return features;
}

/**
 * Save Cucumber JSON report
 */
export function saveCucumberJson(
  result: TestRunResult,
  testSetName: string,
  testRunId: number,
  releaseNumber?: string
): string {
  // Ensure directories exist
  if (!fs.existsSync(BDD_DIR)) {
    fs.mkdirSync(BDD_DIR, { recursive: true });
  }

  const cucumberJson = convertToCucumberJson(result, testSetName, releaseNumber);
  const filename = `cucumber-${testRunId}.json`;
  const filepath = path.join(BDD_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(cucumberJson, null, 2));
  console.log(`Cucumber JSON report saved: ${filepath}`);

  return filepath;
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
 * Generate HTML report from Cucumber JSON files
 */
export async function generateHtmlReport(
  testRunId: number,
  testSetName: string,
  releaseNumber?: string
): Promise<string> {
  // Dynamic import for multiple-cucumber-html-reporter
  const reporter = await import('multiple-cucumber-html-reporter');

  const outputDir = path.join(BDD_DIR, `html-${testRunId}`);

  // Ensure the JSON file exists
  const jsonFile = path.join(BDD_DIR, `cucumber-${testRunId}.json`);
  if (!fs.existsSync(jsonFile)) {
    throw new Error(`Cucumber JSON file not found: ${jsonFile}`);
  }

  reporter.generate({
    jsonDir: BDD_DIR,
    reportPath: outputDir,
    reportName: `Test Run #${testRunId} - ${testSetName}`,
    pageTitle: `UAT DDT CMS - ${testSetName}`,
    pageFooter: '<div class="text-center">Generated by UAT DDT CMS</div>',
    displayDuration: true,
    displayReportTime: true,
    hideMetadata: false,
    metadata: {
      browser: {
        name: 'chromium',
        version: 'latest',
      },
      device: 'Desktop',
      platform: {
        name: process.platform,
        version: process.version,
      },
    },
    customData: {
      title: 'Test Information',
      data: [
        { label: 'Test Run ID', value: String(testRunId) },
        { label: 'Test Set', value: testSetName },
        ...(releaseNumber ? [{ label: 'Release', value: releaseNumber }] : []),
        { label: 'Executed At', value: new Date().toISOString() },
      ],
    },
  });

  console.log(`HTML report generated: ${outputDir}`);
  return outputDir;
}

/**
 * Generate all reports for a test run
 */
export async function generateAllReports(
  result: TestRunResult,
  testSetName: string,
  testRunId: number,
  releaseNumber?: string
): Promise<{
  jsonPath: string;
  cucumberPath: string;
  htmlPath: string;
}> {
  // Save JSON results
  const jsonPath = saveJsonResults(result, testRunId);

  // Save Cucumber JSON
  const cucumberPath = saveCucumberJson(result, testSetName, testRunId, releaseNumber);

  // Generate HTML report
  const htmlPath = await generateHtmlReport(testRunId, testSetName, releaseNumber);

  return { jsonPath, cucumberPath, htmlPath };
}
