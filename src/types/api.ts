/**
 * API Types
 */

import type {
  Release,
  TestSet,
  TestCase,
  TestScenario,
  TestStep,
  ConfigOption,
  SelectConfig,
  MatchConfig,
  Category,
  ReusableCase,
  ReusableCaseStep,
  TestRun,
} from './entities';

// Base API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination Types
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

// Release API Types
export interface ReleaseListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export interface CreateReleaseData {
  release_number: string;
  description?: string;
  notes?: string;
}

export interface UpdateReleaseData {
  release_number?: string;
  description?: string;
  notes?: string;
}

export type ReleasesResponse = PaginatedResponse<Release>;
export type ReleaseResponse = ApiResponse<Release>;

// Test Set API Types
export interface TestSetListParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  category_ids?: string;
}

export interface CreateTestSetData {
  name: string;
  description?: string;
  category_id?: number;
}

export interface UpdateTestSetData {
  name?: string;
  description?: string;
  category_id?: number | null;
}

export type TestSetsResponse = PaginatedResponse<TestSet>;
export type TestSetResponse = ApiResponse<TestSet>;

// Test Case API Types
export interface TestCaseListParams {
  testSetId: number;
}

export interface CreateTestCaseData {
  testSetId: number;
  name: string;
  description?: string;
  order_index?: number;
}

export interface CreateTestCaseResponse {
  id: number;
  scenarioId: number;
  test_set_id: number;
  name: string;
  description: string;
  order_index: number;
}

export interface UpdateTestCaseData {
  name?: string;
  description?: string;
}

export type TestCasesResponse = ApiResponse<TestCase[]>;
export type TestCaseResponse = ApiResponse<CreateTestCaseResponse>;

// Test Scenario API Types
export interface CreateScenarioData {
  testCaseId: number;
  name: string;
  description?: string;
}

export interface UpdateScenarioData {
  name?: string;
  description?: string;
  order_index?: number;
}

export type ScenariosResponse = ApiResponse<TestScenario[]>;
export type ScenarioResponse = ApiResponse<{ id: number }>;

// Test Step API Types
export interface TestStepListParams {
  scenarioId?: number;
}

export interface UpdateStepData {
  step_definition?: string;
  type?: string | null;
  element_id?: string | null;
  action?: string | null;
  action_result?: string | null;
  select_config_id?: number | null;
  match_config_id?: number | null;
  required?: boolean;
  expected_results?: string | null;
  order_index?: number;
}

export interface SyncStepsData {
  scenarioId: number;
  steps: {
    id?: number;
    order_index: number;
    step_definition: string;
    type?: string | null;
    element_id?: string | null;
    action?: string | null;
    action_result?: string | null;
    select_config_id?: number | null;
    match_config_id?: number | null;
    required?: boolean;
    expected_results?: string | null;
  }[];
}

export type TestStepsResponse = ApiResponse<TestStep[]>;

// Config API Types
export interface CreateConfigData {
  key: string;
  display_name: string;
  result_type?: string;
  default_value?: string;
  config_data?: string;
}

export interface BulkUpdateTypesData {
  options: {
    key: string;
    display_name: string;
    result_type?: string;
    default_value?: string;
    config_data?: string;
  }[];
}

export type ConfigResponse = ApiResponse<ConfigOption[]>;

// Select/Match Config API Types
export interface CreateSelectConfigData {
  name: string;
  options: string[];
  config_type?: string;
}

export interface UpdateSelectConfigData {
  name?: string;
  options?: string[];
  config_type?: string;
}

export interface CreateMatchConfigData {
  name: string;
  options: string[];
}

export interface UpdateMatchConfigData {
  name?: string;
  options?: string[];
}

export type SelectConfigsResponse = ApiResponse<SelectConfig[]>;
export type MatchConfigsResponse = ApiResponse<MatchConfig[]>;

// Category API Types
export interface CreateCategoryData {
  parent_id?: number | null;
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  parent_id?: number | null;
}

export type CategoriesResponse = ApiResponse<Category[]>;
export type CategoryResponse = ApiResponse<Category>;

// Reusable Case API Types
export interface CreateReusableCaseData {
  name: string;
  description?: string;
  steps?: Omit<ReusableCaseStep, 'id' | 'reusable_case_id' | 'created_at'>[];
}

export interface UpdateReusableCaseData {
  name?: string;
  description?: string;
}

export interface CopyToCaseData {
  releaseId: number;
  testSetId: number;
}

export interface CreateFromCaseData {
  releaseId: number;
  caseId: number;
  name?: string;
  description?: string;
}

export interface ReusableCaseStepData {
  order_index?: number;
  step_definition: string;
  type?: string | null;
  element_id?: string | null;
  action?: string | null;
  action_result?: string | null;
  select_config_id?: number | null;
  match_config_id?: number | null;
  required?: boolean;
  expected_results?: string | null;
}

export type ReusableCasesResponse = ApiResponse<ReusableCase[]>;
export type ReusableCaseResponse = ApiResponse<ReusableCase>;
export type ReusableCaseStepsResponse = ApiResponse<ReusableCaseStep[]>;

// Test Run API Types
export interface TestRunListParams {
  releaseId?: number;
  page?: number;
  pageSize?: number;
}

export interface CreateTestRunData {
  releaseId: number;
  testSetId?: number;
  testSetName?: string;
  status?: string;
  executedBy?: string;
  durationMs?: number;
  totalScenarios?: number;
  totalSteps?: number;
  passedSteps?: number;
  failedSteps?: number;
  failedDetails?: { scenario: string; step: string; error: string }[];
}

export interface UpdateTestRunData {
  status?: string;
  durationMs?: number;
  totalScenarios?: number;
  totalSteps?: number;
  passedSteps?: number;
  failedSteps?: number;
  failedDetails?: { scenario: string; step: string; error: string }[];
}

export interface TestRunPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TestRunsResponse extends ApiResponse<TestRun[]> {
  pagination: TestRunPagination;
}

export type TestRunResponse = ApiResponse<TestRun>;

// Dashboard API Types
export interface DashboardStats {
  totalTestSets: number;
  totalTestCases: number;
  totalScenarios: number;
  totalSteps: number;
}

export interface RecentExecution {
  id: number;
  test_set_name: string;
  status: string;
  executed_at: string;
  duration_ms: number;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentExecutions: RecentExecution[];
}

export type DashboardResponse = ApiResponse<DashboardData>;

// Export API Types
export interface ExportData {
  release: Release;
  testSets: (TestSet & {
    cases: (TestCase & {
      scenarios: (TestScenario & { steps: TestStep[] })[];
    })[];
  })[];
}

export type ExportResponse = ApiResponse<ExportData>;

// Health Check
export interface HealthData {
  status: string;
  timestamp: string;
}

export type HealthResponse = ApiResponse<HealthData>;
