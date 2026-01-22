/**
 * TypeScript interfaces for Playwright test execution
 */

// Step data from database
export interface TestStep {
  id: number;
  order_index: number;
  step_definition: string;
  type: string | null;
  element_id: string | null;
  action: string | null;
  action_result: string | null;
  select_config_id: number | null;
  match_config_id: number | null;
  required: number;
  expected_results: string | null;
}

// Scenario data from database
export interface TestScenario {
  id: number;
  name: string;
  case_name: string;
  case_id: number;
  steps: TestStep[];
}

// Case data from database
export interface TestCase {
  id: number;
  name: string;
  scenarios: TestScenario[];
}

// Select config from database
export interface SelectConfig {
  id: number;
  name: string;
  options: string; // JSON string of options
  config_type: string;
}

// Match config from database
export interface MatchConfig {
  id: number;
  name: string;
  options: string; // JSON string of options
}

// Full test data structure
export interface TestData {
  testSetId: number;
  testSetName: string;
  releaseId: number;
  cases: TestCase[];
  selectConfigs: SelectConfig[];
  matchConfigs: MatchConfig[];
}

// Step execution result
export interface StepResult {
  testStepId: number;
  scenarioId: number;
  scenarioName: string;
  caseName: string;
  stepDefinition: string;
  expectedResults: string | null;
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  durationMs: number;
}

// Scenario execution result
export interface ScenarioResult {
  scenarioId: number;
  scenarioName: string;
  caseName: string;
  status: 'passed' | 'failed';
  steps: StepResult[];
  durationMs: number;
}

// Full test run result
export interface TestRunResult {
  testRunId: number;
  status: 'passed' | 'failed';
  durationMs: number;
  totalScenarios: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  steps: StepResult[];
}

// Progress update for real-time tracking
export interface ProgressUpdate {
  currentScenario: number;
  totalScenarios: number;
  scenarioName: string;
  caseName: string;
  currentStep: number;
  totalSteps: number;
  stepDefinition: string;
}

// Action handler context
export interface ActionContext {
  page: import('@playwright/test').Page;
  step: TestStep;
  selectConfigs: Map<number, SelectConfig>;
  matchConfigs: Map<number, MatchConfig>;
}

// Action handler function type
export type ActionHandler = (context: ActionContext) => Promise<void>;

// Supported action types
export type ActionType =
  | 'active'
  | 'click'
  | 'custom_select'
  | 'options_match'
  | 'password'
  | 'text_match'
  | 'text_plain'
  | 'url'
  | 'visible';
