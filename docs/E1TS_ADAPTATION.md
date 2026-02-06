# E1TS Adaptation Proposal

> Migration guide for adapting E1TS to the new distributed architecture with 7PS integration

**Document Version:** 1.0
**Last Updated:** 2026-02-06
**Status:** Proposal
**Related Docs:** [NEW_ARCHITECTURE.md](./NEW_ARCHITECTURE.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Gap Analysis](#3-gap-analysis)
4. [7PS Integration Requirements](#4-7ps-integration-requirements)
5. [Proposed Architecture](#5-proposed-architecture)
6. [File-by-File Adaptation Plan](#6-file-by-file-adaptation-plan)
7. [New Files Required](#7-new-files-required)
8. [Database Integration](#8-database-integration)
9. [Test Execution Flow](#9-test-execution-flow)
10. [Configuration Management](#10-configuration-management)
11. [Reporting Strategy](#11-reporting-strategy)
12. [Migration Steps](#12-migration-steps)
13. [Testing Strategy](#13-testing-strategy)
14. [Risk Assessment](#14-risk-assessment)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

This document proposes the adaptation strategy for migrating E1TS (ExceptionsOne Testing Suite) from a standalone Playwright test suite to a 7PS-integrated, database-driven test execution framework.

### Key Changes

| Aspect               | Current E1TS                            | Proposed E1TS                            |
| -------------------- | --------------------------------------- | ---------------------------------------- |
| **Test Data Source** | Static JSON files (`workflowData.json`) | Dynamic from Aurora PostgreSQL           |
| **Invocation**       | Direct `npx playwright test`            | 7PS clones repo and runs via YAML config |
| **Configuration**    | `.env` file                             | Environment variables from 7PS `args`    |
| **Report Output**    | Playwright HTML report                  | Cucumber JSON for 7PS consumption        |
| **Test Selection**   | All tests run                           | Filtered by `RELEASE_ID` / `TEST_SET_ID` |

### Migration Scope

```
┌─────────────────────────────────────────────────────────────────────┐
│                        E1TS Adaptation Scope                         │
├─────────────────────────────────────────────────────────────────────┤
│  [KEEP]     Page Objects (pages/*.ts) - Core UI automation logic    │
│  [MODIFY]   Database Utils - Add CMS schema queries                 │
│  [ADD]      Test Data Fetcher - Query test definitions from Aurora  │
│  [ADD]      Dynamic Test Generator - Create tests from DB data      │
│  [MODIFY]   Playwright Config - 7PS-compatible settings             │
│  [ADD]      Cucumber Reporter - Generate 7PS-compatible reports     │
│  [MODIFY]   Entry Point - Read 7PS environment variables            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Current State Analysis

### Current E1TS/src Structure

```
E1TS/src/
├── data/
│   └── workflowData.json          # Static test data
├── pages/
│   ├── BasePage.ts                # Smart locators, helpers
│   ├── ClosurePage.ts             # Closure workflow
│   ├── CreationPage.ts            # Exception creation
│   ├── ImpersonationPage.ts       # User switching
│   ├── LoginPage.ts               # Authentication
│   └── ReviewPage.ts              # Review workflow
├── tests/
│   └── e2e-workflow.spec.ts       # Single hardcoded test
├── utils/
│   ├── DatabaseUtil.ts            # PostgreSQL connection
│   ├── DbQueries.ts               # Generic queries
│   ├── DbValidator.ts             # Status validation
│   └── TestReporter.ts            # Custom reporting
├── playwright.config.ts           # Playwright settings
├── test_config.yml                # 7PS config (partial)
└── package.json                   # Dependencies
```

### Current Limitations

1. **Static Test Data**: Tests are hardcoded in `workflowData.json`
2. **No CMS Integration**: Cannot fetch test definitions from CMS database
3. **Manual Test Creation**: Tests need to be created manually via JSON file edit
4. **No Dynamic Generation**: Cannot create tests from database records
5. **Report Format**: Playwright HTML reports, not Cucumber JSON
6. **No Test Selection**: Cannot filter by release/test set

---

## 3. Gap Analysis

### Required vs Current Capabilities

| Requirement (from NEW_ARCHITECTURE.md)  | Current State                         | Gap        |
| --------------------------------------- | ------------------------------------- | ---------- |
| Read test data from Aurora PostgreSQL   | Partial (utils exist, no CMS queries) | **HIGH**   |
| Accept `RELEASE_ID` from 7PS            | Not implemented                       | **MEDIUM** |
| Accept `TEST_SET_ID` from 7PS           | Not implemented                       | **MEDIUM** |
| Generate Cucumber JSON reports          | Not implemented                       | **HIGH**   |
| Dynamic test generation from DB         | Not implemented                       | **HIGH**   |
| 7PS-compatible `test_config.yml`        | Partial (needs refinement)            | **LOW**    |
| Write results back to `test_runs` table | Not implemented                       | **HIGH**   |
| Support multiple test sets per run      | Not implemented                       | **MEDIUM** |

### Missing Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Missing Components                              │
├─────────────────────────────────────────────────────────────────────┤
│  1. db/testDataFetcher.ts    - Fetch test definitions from CMS DB   │
│  2. runner/dynamicTestGen.ts - Generate Playwright tests from data  │
│  3. runner/testRunner.ts     - Orchestrate test execution           │
│  4. reporter/cucumber.ts     - Generate Cucumber JSON format        │
│  5. index.ts                 - 7PS entry point                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 7PS Integration Requirements

Based on `.claude/skills/7ps/SKILL.md` and `NEW_ARCHITECTURE.md`:

### 7PS Test Type

E1TS will run as **Live Dependency Testing** because:

- Tests require real ExceptionsOne application (not mocked)
- Tests require real Aurora PostgreSQL database
- Tests interact with actual UI endpoints

### 7PS Configuration Requirements

```yaml
# test_config.yml requirements for 7PS
live_dependency_tests:
  - <environment>:
      testSets:
        - testSetName: <unique-name>
          testType: live_dependency
          testAgentType: nodejs
          testAgentRuntimeVersion: '22'
          testFramework: playwright
          testReportingType: cucumber # REQUIRED for 7PS
          testRunner: npm
          testAgentExecutionCommands:
            - npm ci --legacy-peer-deps
            - npx playwright install chromium
            - npm run test:e1ts
          args:
            # Passed as environment variables
            RELEASE_ID: '5'
            TEST_SET_ID: '12'
          testReportLocation: ./report
          testArtifactLocations:
            - playwright-report
            - test-results/
```

### Environment Variables from 7PS

| Variable      | Source      | Description                    |
| ------------- | ----------- | ------------------------------ |
| `NODE_ENV`    | 7PS args    | Environment (dev/qa/prod)      |
| `BASE_URL`    | 7PS args    | Application URL                |
| `DB_HOST`     | 7PS args    | Aurora cluster endpoint        |
| `DB_NAME`     | 7PS args    | Database name (uatcms)         |
| `DB_PORT`     | 7PS args    | Database port (5432)           |
| `DB_USER`     | 7PS secrets | Database username              |
| `DB_PASSWORD` | 7PS secrets | Database password              |
| `RELEASE_ID`  | 7PS args    | Optional: specific release     |
| `TEST_SET_ID` | 7PS args    | Optional: specific test set    |
| `CI`          | 7PS args    | Flag indicating CI environment |

---

## 5. Proposed Architecture

### New E1TS Structure

```
E1TS/src/
├── data/
│   └── workflowData.json          # [KEEP] Fallback test data
├── db/
│   ├── connection.ts              # [NEW] PostgreSQL pool management
│   ├── testDataFetcher.ts         # [NEW] Fetch CMS test definitions
│   └── resultWriter.ts            # [NEW] Write results to test_runs
├── pages/
│   ├── BasePage.ts                # [KEEP] Smart locators
│   ├── ClosurePage.ts             # [KEEP] Closure workflow
│   ├── CreationPage.ts            # [KEEP] Exception creation
│   ├── ImpersonationPage.ts       # [KEEP] User switching
│   ├── LoginPage.ts               # [KEEP] Authentication
│   ├── ReviewPage.ts              # [KEEP] Review workflow
│   └── index.ts                   # [KEEP] Exports
├── runner/
│   ├── dynamicTestGenerator.ts    # [NEW] Generate tests from DB
│   ├── testRunner.ts              # [NEW] Orchestrate execution
│   └── actionExecutor.ts          # [NEW] Execute step actions
├── reporter/
│   ├── cucumberReporter.ts        # [NEW] Cucumber JSON format
│   └── progressReporter.ts        # [NEW] STDOUT progress for 7PS
├── tests/
│   ├── e2e-workflow.spec.ts       # [KEEP] Static E2E test
│   └── dynamic.spec.ts            # [NEW] Dynamic DB-driven tests
├── types/
│   └── testData.ts                # [NEW] TypeScript interfaces
├── utils/
│   ├── DatabaseUtil.ts            # [MODIFY] Merge with db/connection
│   ├── DbQueries.ts               # [DEPRECATE] Replace with testDataFetcher
│   ├── DbValidator.ts             # [KEEP] Status validation
│   └── TestReporter.ts            # [KEEP] Custom reporting utilities
├── index.ts                       # [NEW] 7PS entry point
├── playwright.config.ts           # [MODIFY] 7PS-compatible settings
├── test_config.yml                # [MODIFY] Full 7PS configuration
└── package.json                   # [MODIFY] Add scripts
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           7PS Ephemeral Environment                         │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                              E1TS                                    │   │
│  │                                                                      │   │
│  │   ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐     │   │
│  │   │   index.ts  │───▶│ testDataFetcher │───▶│ dynamicTestGen   │     │   │
│  │   │  (entry)    │    │   (DB queries)  │    │ (create specs)   │     │   │
│  │   └─────────────┘    └────────┬────────┘    └────────┬─────────┘     │   │
│  │         │                     │                      │               │   │
│  │         │            ┌────────▼────────┐    ┌────────▼─────────┐     │   │
│  │         │            │  Aurora DB      │    │  Playwright      │     │   │
│  │         │            │  (uatcms)       │    │  Test Runner     │     │   │
│  │         │            └────────┬────────┘    └────────┬─────────┘     │   │
│  │         │                     │                      │               │   │
│  │         │            ┌────────▼────────┐    ┌────────▼─────────┐     │   │
│  │         └───────────▶│  resultWriter   │◀───│  cucumberReport  │     │   │
│  │                      │  (write runs)   │    │  (JSON output)   │     │   │
│  │                      └─────────────────┘    └──────────────────┘     │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Output: ./report/cucumber.json  ──────────────▶  7PS Results Collection    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. File-by-File Adaptation Plan

### Files to Keep (Future Migration to Dynamic Output)

| File                         | Reason                            |
| ---------------------------- | --------------------------------- |
| `pages/BasePage.ts`          | Core helper methods are reusable  |
| `pages/LoginPage.ts`         | Authentication logic is stable    |
| `pages/ImpersonationPage.ts` | User switching is stable          |
| `pages/CreationPage.ts`      | Exception creation workflow       |
| `pages/ReviewPage.ts`        | Review workflow logic             |
| `pages/ClosurePage.ts`       | Closure workflow logic            |
| `utils/DbValidator.ts`       | Validation utilities are reusable |

### Files to Modify

#### `playwright.config.ts`

```typescript
// Changes needed:
// 1. Add Cucumber reporter
// 2. Read BASE_URL from environment
// 3. Configure for 7PS headless mode
// 4. Set testDir to include dynamic tests

export default defineConfig({
  testDir: './tests',
  timeout: 120 * 1000,

  // ADD: Cucumber reporter for 7PS
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['./reporter/cucumberReporter.ts', { outputFile: 'report/cucumber.json' }],
  ],

  use: {
    // MODIFY: Read from 7PS environment
    baseURL: process.env.BASE_URL || 'https://exceptionsone-ui-dev.clouddgt.capitalone.com/v2/',

    // ADD: Force headless in CI
    headless: process.env.CI === 'true',
  },
});
```

#### `package.json`

```json
{
  "scripts": {
    "test": "npx playwright test",
    "test:e1ts": "ts-node src/index.ts", // NEW: 7PS entry point
    "test:static": "npx playwright test tests/e2e-workflow.spec.ts",
    "test:dynamic": "npx playwright test tests/dynamic.spec.ts"
  }
}
```

#### `test_config.yml`

```yaml
# Full 7PS configuration
name: ExceptionsOne-E1TS
ba: BAEXCEPTIONSONE
asv: ASVEXCEPTIONSONE
component: E1 TEST AUTOMATION
owner: dev.exceptionsone@capitalone.com

live_dependency_tests:
  - dev:
      args:
        BASE_URL: https://exceptionsone-ui-dev.clouddgt.capitalone.com/v2/
        NODE_EXTRA_CA_CERTS: /usr/local/share/ca-certificates/CHGRootCA.crt
        PLAYWRIGHT_DOWNLOAD_HOST: 'https://artifactory.cloud.capitalone.com/artifactory/generic-internalfacing/chromium'
        CI: 'true'
        DB_HOST: aurora-cluster.xxxxx.us-east-1.rds.amazonaws.com
        DB_NAME: uatcms
        DB_PORT: '5432'
      testSets:
        - testSetName: e1ts-live-dependency-dev
          testType: live_dependency
          testAgentType: nodejs
          testRunner: npm
          testAgentRuntimeVersion: '22'
          testFramework: playwright
          testReportingType: cucumber
          workingDirectory: ./
          testReportLocation: ./report
          testSetDisabled: false
          testAgentExecutionCommands:
            - npm ci --legacy-peer-deps
            - PLAYWRIGHT_DOWNLOAD_CMD="https://artifactory.cloud.capitalone.com/artifactory/generic-internalfacing/chromium" npx playwright install chromium
            - npm run test:e1ts
          testArtifactLocations:
            - playwright-report
            - test-results/
            - report/
```

---

## 7. New Files Required

### `src/index.ts` - 7PS Entry Point

```typescript
/**
 * E1TS Entry Point for 7PS Execution
 *
 * This file is invoked by 7PS via `npm run test:e1ts`
 * It reads configuration from environment variables and orchestrates test execution.
 */
import { fetchTestData } from './db/testDataFetcher';
import { runTests } from './runner/testRunner';
import { writeTestResults } from './db/resultWriter';
import { generateCucumberReport } from './reporter/cucumberReporter';

async function main() {
  console.log('=== E1TS Test Runner ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'dev'}`);
  console.log(`CI Mode: ${process.env.CI || 'false'}`);

  // Parse 7PS environment variables
  const releaseId = process.env.RELEASE_ID ? parseInt(process.env.RELEASE_ID) : undefined;
  const testSetId = process.env.TEST_SET_ID ? parseInt(process.env.TEST_SET_ID) : undefined;

  console.log(`Release ID: ${releaseId || 'latest'}`);
  console.log(`Test Set ID: ${testSetId || 'all'}`);

  try {
    // 1. Fetch test data from Aurora DB
    const testData = await fetchTestData(releaseId, testSetId);
    console.log(`Fetched ${testData.testSets.length} test sets`);

    // 2. Run Playwright tests
    const results = await runTests(testData);
    console.log(`Executed ${results.totalTests} tests`);

    // 3. Write results back to database
    await writeTestResults(results, releaseId, testSetId);

    // 4. Generate Cucumber report for 7PS
    await generateCucumberReport(results, './report/cucumber.json');

    // Exit with appropriate code
    const exitCode = results.failed > 0 ? 1 : 0;
    console.log(`\n=== E1TS Complete ===`);
    console.log(`Passed: ${results.passed} | Failed: ${results.failed}`);
    process.exit(exitCode);
  } catch (error) {
    console.error('E1TS Error:', error);
    process.exit(1);
  }
}

main();
```

### `src/db/testDataFetcher.ts` - CMS Database Queries

```typescript
/**
 * Test Data Fetcher
 *
 * Queries Aurora PostgreSQL to fetch test definitions from CMS database.
 * Replaces the current API call: /api/test-generation/:testSetId
 */
import { Pool } from 'pg';
import { TestData, TestSet, TestCase, TestScenario, TestStep } from '../types/testData';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function fetchTestData(releaseId?: number, testSetId?: number): Promise<TestData> {
  // Get release (or latest open release)
  const release = await getRelease(releaseId);

  // Get test sets for release
  const testSets = await getTestSets(release.id, testSetId);

  // For each test set, fetch cases, scenarios, steps
  for (const testSet of testSets) {
    testSet.testCases = await getTestCases(testSet.id);

    for (const testCase of testSet.testCases) {
      testCase.scenarios = await getTestScenarios(testCase.id);

      for (const scenario of testCase.scenarios) {
        scenario.steps = await getTestSteps(scenario.id);
      }
    }
  }

  // Get configuration options
  const configOptions = await getConfigurationOptions(release.id);
  const envConfigs = await getEnvironmentConfigs(release.id);

  return {
    release,
    testSets,
    configOptions,
    envConfigs,
  };
}

async function getRelease(releaseId?: number) {
  if (releaseId) {
    const result = await pool.query('SELECT * FROM releases WHERE id = $1', [releaseId]);
    if (result.rows.length === 0) throw new Error(`Release ${releaseId} not found`);
    return result.rows[0];
  }

  // Get latest open release
  const result = await pool.query(
    `SELECT * FROM releases WHERE status = 'open' ORDER BY created_at DESC LIMIT 1`
  );
  if (result.rows.length === 0) throw new Error('No active release found');
  return result.rows[0];
}

async function getTestSets(releaseId: number, testSetId?: number): Promise<TestSet[]> {
  const query = testSetId
    ? 'SELECT * FROM test_sets WHERE release_id = $1 AND id = $2 ORDER BY name'
    : 'SELECT * FROM test_sets WHERE release_id = $1 ORDER BY name';

  const params = testSetId ? [releaseId, testSetId] : [releaseId];
  const result = await pool.query(query, params);
  return result.rows;
}

async function getTestCases(testSetId: number): Promise<TestCase[]> {
  const result = await pool.query(
    'SELECT * FROM test_cases WHERE test_set_id = $1 ORDER BY order_index',
    [testSetId]
  );
  return result.rows;
}

async function getTestScenarios(testCaseId: number): Promise<TestScenario[]> {
  const result = await pool.query(
    'SELECT * FROM test_scenarios WHERE test_case_id = $1 ORDER BY order_index',
    [testCaseId]
  );
  return result.rows;
}

async function getTestSteps(scenarioId: number): Promise<TestStep[]> {
  const result = await pool.query(
    `SELECT ts.*, sc.options as select_options, mc.options as match_options
     FROM test_steps ts
     LEFT JOIN select_configs sc ON ts.select_config_id = sc.id
     LEFT JOIN match_configs mc ON ts.match_config_id = mc.id
     WHERE ts.test_scenario_id = $1
     ORDER BY ts.order_index`,
    [scenarioId]
  );
  return result.rows;
}

async function getConfigurationOptions(releaseId: number) {
  const result = await pool.query(
    'SELECT * FROM configuration_options WHERE release_id = $1 ORDER BY option_type, order_index',
    [releaseId]
  );
  return result.rows;
}

async function getEnvironmentConfigs(releaseId: number) {
  const result = await pool.query('SELECT * FROM environment_configs WHERE release_id = $1', [
    releaseId,
  ]);
  return result.rows;
}

export async function closePool() {
  await pool.end();
}
```

### `src/db/resultWriter.ts` - Write Results to Database

```typescript
/**
 * Result Writer
 *
 * Writes test execution results back to the CMS database.
 * Creates records in test_runs and test_run_steps tables.
 */
import { Pool } from 'pg';
import { TestResults, StepResult } from '../types/testData';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export async function writeTestResults(
  results: TestResults,
  releaseId: number,
  testSetId: number
): Promise<number> {
  // Create test_run record
  const testRun = await pool.query(
    `INSERT INTO test_runs (
      release_id, test_set_id, test_set_name, environment, base_url,
      status, batch_id, duration_ms, total_scenarios, total_steps,
      passed_steps, failed_steps, failed_details, executed_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id`,
    [
      releaseId,
      testSetId,
      results.testSetName,
      process.env.NODE_ENV || 'dev',
      process.env.BASE_URL,
      results.failed > 0 ? 'failed' : 'passed',
      results.batchId,
      results.durationMs,
      results.totalScenarios,
      results.totalSteps,
      results.passed,
      results.failed,
      JSON.stringify(results.failedDetails),
      '7PS-E1TS',
    ]
  );

  const testRunId = testRun.rows[0].id;

  // Insert step results
  for (const step of results.stepResults) {
    await pool.query(
      `INSERT INTO test_run_steps (
        test_run_id, test_step_id, scenario_id, scenario_name, case_name,
        step_definition, expected_results, status, error_message, duration_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        testRunId,
        step.testStepId,
        step.scenarioId,
        step.scenarioName,
        step.caseName,
        step.stepDefinition,
        step.expectedResults,
        step.status,
        step.errorMessage,
        step.durationMs,
      ]
    );
  }

  return testRunId;
}
```

### `src/types/testData.ts` - TypeScript Interfaces

```typescript
/**
 * Type definitions for CMS test data structures
 */

export interface TestData {
  release: Release;
  testSets: TestSet[];
  configOptions: ConfigurationOption[];
  envConfigs: EnvironmentConfig[];
}

export interface Release {
  id: number;
  release_number: string;
  description?: string;
  status: 'draft' | 'open' | 'closed' | 'archived';
}

export interface TestSet {
  id: number;
  release_id: number;
  category_id?: number;
  name: string;
  description?: string;
  testCases?: TestCase[];
}

export interface TestCase {
  id: number;
  release_id: number;
  test_set_id: number;
  name: string;
  description?: string;
  order_index: number;
  scenarios?: TestScenario[];
}

export interface TestScenario {
  id: number;
  release_id: number;
  test_case_id: number;
  name: string;
  description?: string;
  order_index: number;
  steps?: TestStep[];
}

export interface TestStep {
  id: number;
  release_id: number;
  test_scenario_id: number;
  order_index: number;
  step_definition?: string;
  type?: string;
  element_id?: string;
  action?: string;
  action_result?: string;
  select_options?: string[];
  match_options?: string[];
  required: boolean;
  expected_results?: string;
}

export interface ConfigurationOption {
  id: number;
  release_id: number;
  option_type: 'type' | 'action';
  name: string;
  display_name?: string;
  order_index: number;
  result_type?: string;
}

export interface EnvironmentConfig {
  id: number;
  release_id: number;
  name: string;
  value: string;
}

export interface TestResults {
  testSetName: string;
  batchId: string;
  durationMs: number;
  totalTests: number;
  totalScenarios: number;
  totalSteps: number;
  passed: number;
  failed: number;
  failedDetails: FailedDetail[];
  stepResults: StepResult[];
}

export interface StepResult {
  testStepId: number;
  scenarioId: number;
  scenarioName: string;
  caseName: string;
  stepDefinition: string;
  expectedResults?: string;
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  durationMs: number;
}

export interface FailedDetail {
  scenarioName: string;
  stepDefinition: string;
  error: string;
}
```

### `src/reporter/cucumberReporter.ts` - Cucumber JSON Reporter

```typescript
/**
 * Cucumber JSON Reporter
 *
 * Generates Cucumber-compatible JSON reports for 7PS consumption.
 * Format: https://cucumber.io/docs/cucumber/reporting/
 */
import * as fs from 'fs';
import { TestResults, StepResult } from '../types/testData';

interface CucumberFeature {
  id: string;
  name: string;
  uri: string;
  elements: CucumberScenario[];
}

interface CucumberScenario {
  id: string;
  name: string;
  type: string;
  steps: CucumberStep[];
}

interface CucumberStep {
  name: string;
  keyword: string;
  result: {
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error_message?: string;
  };
}

export async function generateCucumberReport(
  results: TestResults,
  outputPath: string
): Promise<void> {
  // Group step results by scenario
  const scenarioMap = new Map<string, StepResult[]>();
  for (const step of results.stepResults) {
    const key = `${step.caseName}::${step.scenarioName}`;
    if (!scenarioMap.has(key)) {
      scenarioMap.set(key, []);
    }
    scenarioMap.get(key)!.push(step);
  }

  // Build Cucumber feature structure
  const feature: CucumberFeature = {
    id: results.testSetName.toLowerCase().replace(/\s+/g, '-'),
    name: results.testSetName,
    uri: 'e1ts://dynamic-tests',
    elements: [],
  };

  for (const [key, steps] of scenarioMap) {
    const [caseName, scenarioName] = key.split('::');

    const scenario: CucumberScenario = {
      id: `${feature.id};${scenarioName.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${caseName} - ${scenarioName}`,
      type: 'scenario',
      steps: steps.map((step) => ({
        name: step.stepDefinition,
        keyword: getKeyword(step.stepDefinition),
        result: {
          status: step.status,
          duration: step.durationMs * 1000000, // Convert to nanoseconds
          error_message: step.errorMessage,
        },
      })),
    };

    feature.elements.push(scenario);
  }

  // Ensure output directory exists
  const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write JSON file
  fs.writeFileSync(outputPath, JSON.stringify([feature], null, 2));
  console.log(`Cucumber report written to: ${outputPath}`);
}

function getKeyword(stepDefinition: string): string {
  const lower = stepDefinition.toLowerCase();
  if (lower.startsWith('given')) return 'Given ';
  if (lower.startsWith('when')) return 'When ';
  if (lower.startsWith('then')) return 'Then ';
  if (lower.startsWith('and')) return 'And ';
  return 'Step ';
}
```

---

## 8. Database Integration

### CMS Schema Tables Used by E1TS

| Table                   | Access | Purpose                        |
| ----------------------- | ------ | ------------------------------ |
| `releases`              | READ   | Get release info               |
| `test_sets`             | READ   | Get test sets to execute       |
| `test_cases`            | READ   | Get test cases within sets     |
| `test_scenarios`        | READ   | Get scenarios within cases     |
| `test_steps`            | READ   | Get steps within scenarios     |
| `select_configs`        | READ   | Get dropdown options for steps |
| `match_configs`         | READ   | Get assertion options          |
| `configuration_options` | READ   | Get type/action configs        |
| `environment_configs`   | READ   | Get environment variables      |
| `test_runs`             | WRITE  | Record execution results       |
| `test_run_steps`        | WRITE  | Record step-level results      |

### Connection String

```
postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

Example:
postgresql://uatcms_user:xxxxx@aurora-cluster.xxxxx.us-east-1.rds.amazonaws.com:5432/uatcms
```

---

## 9. Test Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        E1TS Test Execution Flow                             │
└─────────────────────────────────────────────────────────────────────────────┘

7PS triggers: npm run test:e1ts
                    │
                    ▼
┌──────────────────────────────────────┐
│           index.ts                   │
│  • Parse RELEASE_ID, TEST_SET_ID     │
│  • Initialize database connection    │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│       testDataFetcher.ts             │
│  • Query releases, test_sets         │
│  • Query test_cases, scenarios       │
│  • Query test_steps with configs     │
│  • Return TestData object            │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│       testRunner.ts                  │
│  • For each TestSet:                 │
│    • For each TestCase:              │
│      • For each Scenario:            │
│        • Execute steps via Playwright│
│        • Record pass/fail/skip       │
│  • Return TestResults object         │
└─────────────────┬────────────────────┘
                  │
                  ├────────────────────────┐
                  ▼                        ▼
┌──────────────────────────────┐  ┌─────────────────────────────┐
│     resultWriter.ts          │  │   cucumberReporter.ts       │
│  • INSERT INTO test_runs     │  │  • Generate cucumber.json   │
│  • INSERT INTO test_run_steps│  │  • Write to ./report/       │
└──────────────────────────────┘  └─────────────────────────────┘
                  │                        │
                  └────────────┬───────────┘
                               ▼
                    Exit with code 0 or 1
```

---

## 10. Configuration Management

### Environment-Specific Settings

| Environment | BASE_URL                                                   | DB_HOST             | Notes                  |
| ----------- | ---------------------------------------------------------- | ------------------- | ---------------------- |
| dev         | `https://exceptionsone-ui-dev.clouddgt.capitalone.com/v2/` | Aurora Dev Cluster  | Development testing    |
| qa          | `https://exceptionsone-ui-qa.clouddgt.capitalone.com/v2/`  | Aurora QA Cluster   | QA validation          |
| prod        | `https://exceptionsone-ui.clouddgt.capitalone.com/v2/`     | Aurora Prod Cluster | Production smoke tests |

### 7PS Secrets Management

Secrets are passed via 7PS `secrets` field and injected as environment variables:

```yaml
secrets:
  DB_USER: '${aws_secretsmanager:uatcms-db-creds:username}'
  DB_PASSWORD: '${aws_secretsmanager:uatcms-db-creds:password}'
```

---

## 11. Reporting Strategy

### Report Types

| Report          | Format      | Location                       | Consumer     |
| --------------- | ----------- | ------------------------------ | ------------ |
| Cucumber        | JSON        | `./report/cucumber.json`       | 7PS          |
| Playwright HTML | HTML        | `./playwright-report/`         | Human review |
| Playwright JSON | JSON        | `./test-results/results.json`  | CI artifacts |
| Database        | SQL records | `test_runs` / `test_run_steps` | CMS UI       |

### STDOUT Progress (for 7PS)

```
PROGRESS:{"step":"Logging in","status":"running","percent":10}
PROGRESS:{"step":"Creating exception","status":"running","percent":30}
PROGRESS:{"step":"Executing scenarios","status":"running","percent":60}
RESULT:{"passed":45,"failed":2,"total":47,"duration":120000}
```

---

## 12. Migration Steps

### Phase 1: Prepare E1TS Structure (Week 1)

- [ ] Create `src/db/` directory with `connection.ts`
- [ ] Create `src/types/testData.ts` with interfaces
- [ ] Create `src/db/testDataFetcher.ts` with CMS queries
- [ ] Create `src/db/resultWriter.ts` for test_runs
- [ ] Update `package.json` with new scripts

### Phase 2: Implement Test Runner (Week 2)

- [ ] Create `src/runner/testRunner.ts`
- [ ] Create `src/runner/actionExecutor.ts` (maps step actions to page methods)
- [ ] Create `src/tests/dynamic.spec.ts` for DB-driven tests
- [ ] Test locally with mock data

### Phase 3: Implement Reporting (Week 3)

- [ ] Create `src/reporter/cucumberReporter.ts`
- [ ] Create `src/reporter/progressReporter.ts`
- [ ] Update `playwright.config.ts` with Cucumber reporter
- [ ] Test report generation

### Phase 4: Create Entry Point (Week 3)

- [ ] Create `src/index.ts` entry point
- [ ] Update `test_config.yml` for 7PS
- [ ] Test with local database connection
- [ ] Validate environment variable handling

### Phase 5: Integration Testing (Week 4)

- [ ] Connect to Aurora dev database
- [ ] Run full test cycle
- [ ] Verify results written to database
- [ ] Verify Cucumber report format
- [ ] Test 7PS execution (dry run)

### Phase 6: Deployment (Week 5)

- [ ] Push E1TS to `cof-primary/ExceptionsOne-E1TS`
- [ ] Configure 7PS to clone E1TS
- [ ] Run end-to-end test with CMS triggering
- [ ] Monitor and troubleshoot

---

## 13. Testing Strategy

### Local Testing

```bash
# 1. Set up local environment
cp .env.example .env
# Edit .env with local credentials

# 2. Run static tests (existing)
npm run test:static

# 3. Run dynamic tests (new)
export RELEASE_ID=1
export TEST_SET_ID=1
npm run test:e1ts
```

### CI Testing

```yaml
# test_config.yml - CI test set
live_dependency_tests:
  - ci:
      args:
        RELEASE_ID: '1'
        TEST_SET_ID: '1'
        CI: 'true'
```

### Validation Checklist

- [ ] Test data fetched correctly from Aurora
- [ ] All step types execute correctly (click, fill, assert)
- [ ] Results written to test_runs table
- [ ] Cucumber JSON is valid format
- [ ] 7PS can parse and display results
- [ ] Error handling works for DB connection failures
- [ ] Cleanup runs even on test failure

---

## 14. Risk Assessment

| Risk                            | Likelihood | Impact | Mitigation                                  |
| ------------------------------- | ---------- | ------ | ------------------------------------------- |
| DB connection fails in 7PS      | Medium     | High   | Implement retry logic, clear error messages |
| Test data schema mismatch       | Medium     | High   | Version control schema, validate on fetch   |
| Cucumber report format rejected | Low        | High   | Test with 7PS team, follow spec exactly     |
| Page objects incompatible       | Low        | Medium | Keep existing tests as fallback             |
| 7PS timeout on long tests       | Medium     | Medium | Chunk test sets, parallelize                |
| Secrets not injected            | Low        | High   | Validate env vars at startup                |

---

## 15. Open Questions

### Questions for Platform Team (7PS)

1. **Exact Cucumber JSON schema** - Is there a specific version/format required?
2. **Progress reporting** - Does 7PS parse STDOUT for progress updates?
3. **Artifact retrieval** - How are videos/screenshots accessed after run?
4. **Max execution time** - What is the timeout for live_dependency_tests?
5. **Parallelization** - Can 7PS run multiple test sets concurrently?

### Questions for CMS Team

1. **Database access** - Can E1TS have read-only access to Aurora?
2. **Results write** - Should E1TS write to test_runs or should CMS poll 7PS?
3. **Test data format** - Is the current step structure sufficient for dynamic execution?
4. **Environment configs** - How should E1TS use environment_configs table?

### Questions for Security

1. **Secrets handling** - How are DB credentials passed securely through 7PS?
2. **Network access** - Can 7PS ephemeral env access Aurora VPC?
3. **Certificate handling** - How do we handle Capital One CA certs in 7PS?

---

## Appendix A: Command Reference

```bash
# Local development
npm install                           # Install dependencies
npm run test                          # Run all Playwright tests
npm run test:e1ts                     # Run via 7PS entry point
npm run test:static                   # Run static E2E test only
npm run test:dynamic                  # Run dynamic DB-driven tests

# 7PS execution (automated)
npm ci --legacy-peer-deps             # Clean install
npx playwright install chromium       # Install browser
npm run test:e1ts                     # Execute tests

# Debug
PWDEBUG=1 npm run test:static         # Debug mode
DEBUG=pw:api npm run test             # Playwright API logs
```

---

## Appendix B: Environment Variables

| Variable      | Required | Default  | Description                |
| ------------- | -------- | -------- | -------------------------- |
| `NODE_ENV`    | No       | `dev`    | Environment name           |
| `CI`          | No       | `false`  | CI mode flag               |
| `BASE_URL`    | Yes      | -        | Application base URL       |
| `DB_HOST`     | Yes      | -        | Aurora cluster endpoint    |
| `DB_NAME`     | Yes      | `uatcms` | Database name              |
| `DB_PORT`     | No       | `5432`   | Database port              |
| `DB_USER`     | Yes      | -        | Database username (secret) |
| `DB_PASSWORD` | Yes      | -        | Database password (secret) |
| `RELEASE_ID`  | No       | latest   | Specific release to test   |
| `TEST_SET_ID` | No       | all      | Specific test set to run   |

---

_Document maintained by E1 Development Team_
