/**
 * API Service for UAT DDT CMS
 * Centralized HTTP client with error handling
 */

import type {
  ApiResponse,
  ReleasesResponse,
  ReleaseListParams,
  CreateReleaseData,
  UpdateReleaseData,
  TestSetsResponse,
  TestSetResponse,
  TestSetListParams,
  CreateTestSetData,
  UpdateTestSetData,
  TestCasesResponse,
  TestCaseResponse,
  CreateTestCaseData,
  UpdateTestCaseData,
  ScenariosResponse,
  ScenarioResponse,
  CreateScenarioData,
  UpdateScenarioData,
  TestStepsResponse,
  UpdateStepData,
  SyncStepsData,
  ConfigResponse,
  CreateConfigData,
  SelectConfigsResponse,
  CreateSelectConfigData,
  UpdateSelectConfigData,
  MatchConfigsResponse,
  CreateMatchConfigData,
  UpdateMatchConfigData,
  CategoriesResponse,
  CategoryResponse,
  CreateCategoryData,
  UpdateCategoryData,
  DashboardResponse,
  ExportResponse,
  HealthResponse,
  TestRunsResponse,
  TestRunResponse,
  CreateTestRunData,
  UpdateTestRunData,
  ReusableCasesResponse,
  ReusableCaseResponse,
  ReusableCaseStepsResponse,
  CreateReusableCaseData,
  UpdateReusableCaseData,
  CopyToCaseData,
  CreateFromCaseData,
  ReusableCaseStepData,
} from '@/types/api';
import type { TestRun } from '@/types/entities';

const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Request failed', response.status, data);
  }

  return data;
}

export const api = {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    return handleResponse<T>(response);
  },
};

// Specific API modules for different resources
export const releasesApi = {
  list(params: ReleaseListParams = {}): Promise<ReleasesResponse> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(`/releases${query ? `?${query}` : ''}`) as Promise<ReleasesResponse>;
  },
  get(id: number) {
    return api.get(`/releases/${id}`);
  },
  create(data: CreateReleaseData) {
    return api.post('/releases', data);
  },
  update(id: number, data: UpdateReleaseData) {
    return api.patch(`/releases/${id}`, data);
  },
  delete(id: number) {
    return api.delete(`/releases/${id}`);
  },
  close(id: number) {
    return api.put(`/releases/${id}/close`);
  },
  reopen(id: number) {
    return api.put(`/releases/${id}/reopen`);
  },
  archive(id: number) {
    return api.put(`/releases/${id}/archive`);
  },
};

export const testSetsApi = {
  list(releaseId: number, params: TestSetListParams = {}): Promise<TestSetsResponse> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(
      `/test-sets/${releaseId}${query ? `?${query}` : ''}`
    ) as Promise<TestSetsResponse>;
  },
  get(releaseId: number, id: number): Promise<TestSetResponse> {
    return api.get(`/test-sets/${releaseId}/${id}`) as Promise<TestSetResponse>;
  },
  create(releaseId: number, data: CreateTestSetData) {
    return api.post(`/test-sets/${releaseId}`, data);
  },
  update(releaseId: number, id: number, data: UpdateTestSetData) {
    return api.patch(`/test-sets/${releaseId}/${id}`, data);
  },
  delete(releaseId: number, id: number) {
    return api.delete(`/test-sets/${releaseId}/${id}`);
  },
};

export const testCasesApi = {
  list(releaseId: number, params: { testSetId: number }): Promise<TestCasesResponse> {
    const query = new URLSearchParams({ testSetId: String(params.testSetId) }).toString();
    return api.get(`/test-cases/${releaseId}?${query}`) as Promise<TestCasesResponse>;
  },
  create(releaseId: number, data: CreateTestCaseData): Promise<TestCaseResponse> {
    return api.post(`/test-cases/${releaseId}`, data) as Promise<TestCaseResponse>;
  },
  update(releaseId: number, id: number, data: UpdateTestCaseData) {
    return api.patch(`/test-cases/${releaseId}/${id}`, data);
  },
  delete(releaseId: number, id: number) {
    return api.delete(`/test-cases/${releaseId}/${id}`);
  },
  getAllScenarios(releaseId: number, params: { testSetId: number }): Promise<ScenariosResponse> {
    const query = new URLSearchParams({ testSetId: String(params.testSetId) }).toString();
    return api.get(`/test-cases/all-scenarios/${releaseId}?${query}`) as Promise<ScenariosResponse>;
  },
  createScenario(releaseId: number, data: CreateScenarioData): Promise<ScenarioResponse> {
    return api.post(`/test-cases/scenarios/${releaseId}`, data) as Promise<ScenarioResponse>;
  },
  updateScenario(releaseId: number, scenarioId: number, data: UpdateScenarioData) {
    return api.patch(`/test-cases/scenarios/${releaseId}/${scenarioId}`, data);
  },
  deleteScenario(releaseId: number, scenarioId: number) {
    return api.delete(`/test-cases/scenarios/${releaseId}/${scenarioId}`);
  },
  reorderScenarios(releaseId: number, testCaseId: number, scenarioIds: number[]) {
    return api.put(`/test-cases/scenarios/${releaseId}/reorder`, { testCaseId, scenarioIds });
  },
  reorderCases(releaseId: number, testSetId: number, caseIds: number[]) {
    return api.put(`/test-cases/${releaseId}/reorder`, { testSetId, caseIds });
  },
};

export const testStepsApi = {
  list(releaseId: number, params: { scenarioId: number }): Promise<TestStepsResponse> {
    const query = new URLSearchParams({ scenarioId: String(params.scenarioId) }).toString();
    return api.get(`/test-steps/${releaseId}?${query}`) as Promise<TestStepsResponse>;
  },
  update(releaseId: number, stepId: number, data: UpdateStepData) {
    return api.patch(`/test-steps/${releaseId}/${stepId}`, data);
  },
  delete(releaseId: number, stepId: number) {
    return api.delete(`/test-steps/${releaseId}/${stepId}`);
  },
  sync(releaseId: number, data: SyncStepsData) {
    return api.post(`/test-steps/${releaseId}/sync`, data);
  },
};

export const configApi = {
  getTypes(releaseId: number): Promise<ConfigResponse> {
    return api.get(`/config/${releaseId}/types`) as Promise<ConfigResponse>;
  },
  getActions(releaseId: number): Promise<ConfigResponse> {
    return api.get(`/config/${releaseId}/actions`) as Promise<ConfigResponse>;
  },
  createType(releaseId: number, data: CreateConfigData) {
    return api.post(`/config/${releaseId}/type`, data);
  },
  createAction(releaseId: number, data: CreateConfigData) {
    return api.post(`/config/${releaseId}/action`, data);
  },
  bulkUpdateTypes(releaseId: number, options: CreateConfigData[]) {
    return api.post(`/config/${releaseId}/type/bulk`, { options });
  },
  delete(releaseId: number, id: number) {
    return api.delete(`/config/${releaseId}/${id}`);
  },
  reorderTypes(releaseId: number, ids: number[]) {
    return api.put(`/config/${releaseId}/type/reorder`, { ids });
  },
  reorderActions(releaseId: number, ids: number[]) {
    return api.put(`/config/${releaseId}/action/reorder`, { ids });
  },
};

export const selectConfigsApi = {
  list(): Promise<SelectConfigsResponse> {
    return api.get('/select-configs') as Promise<SelectConfigsResponse>;
  },
  create(data: CreateSelectConfigData) {
    return api.post('/select-configs', data);
  },
  update(id: number, data: UpdateSelectConfigData) {
    return api.put(`/select-configs/${id}`, data);
  },
  delete(id: number) {
    return api.delete(`/select-configs/${id}`);
  },
};

export const matchConfigsApi = {
  list(): Promise<MatchConfigsResponse> {
    return api.get('/match-configs') as Promise<MatchConfigsResponse>;
  },
  create(data: CreateMatchConfigData) {
    return api.post('/match-configs', data);
  },
  update(id: number, data: UpdateMatchConfigData) {
    return api.put(`/match-configs/${id}`, data);
  },
  delete(id: number) {
    return api.delete(`/match-configs/${id}`);
  },
};

export const categoriesApi = {
  list(): Promise<CategoriesResponse> {
    return api.get('/categories') as Promise<CategoriesResponse>;
  },
  listFlat(): Promise<CategoriesResponse> {
    return api.get('/categories/flat') as Promise<CategoriesResponse>;
  },
  get(id: number): Promise<CategoryResponse> {
    return api.get(`/categories/${id}`) as Promise<CategoryResponse>;
  },
  create(data: CreateCategoryData) {
    return api.post('/categories', data);
  },
  update(id: number, data: UpdateCategoryData) {
    return api.patch(`/categories/${id}`, data);
  },
  delete(id: number) {
    return api.delete(`/categories/${id}`);
  },
};

export const dashboardApi = {
  get(releaseId: number): Promise<DashboardResponse> {
    return api.get(`/dashboard/${releaseId}`) as Promise<DashboardResponse>;
  },
};

export const exportApi = {
  get(releaseId: number): Promise<ExportResponse> {
    return api.get(`/export/${releaseId}`) as Promise<ExportResponse>;
  },
};

export const healthApi = {
  check(): Promise<HealthResponse> {
    return api.get('/health') as Promise<HealthResponse>;
  },
};

export interface TestRunsListParams {
  releaseId?: number;
  page?: number;
  pageSize?: number;
  status?: string;
  executedBy?: string;
  startDate?: string;
  endDate?: string;
  testSetId?: number;
  testSetName?: string;
  environment?: string;
}

export interface TestRunFilterOptions {
  environments: string[];
  executedBy: string[];
  testSets: { id: number; name: string }[];
}

export const testRunsApi = {
  list(params: TestRunsListParams = {}): Promise<TestRunsResponse> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(`/test-runs${query ? `?${query}` : ''}`) as Promise<TestRunsResponse>;
  },
  get(id: number): Promise<TestRunResponse> {
    return api.get(`/test-runs/${id}`) as Promise<TestRunResponse>;
  },
  getFilterOptions(releaseId?: number): Promise<ApiResponse<TestRunFilterOptions>> {
    const query = releaseId ? `?releaseId=${releaseId}` : '';
    return api.get(`/test-runs/filter-options${query}`) as Promise<
      ApiResponse<TestRunFilterOptions>
    >;
  },
  create(data: CreateTestRunData) {
    return api.post('/test-runs', data);
  },
  update(id: number, data: UpdateTestRunData) {
    return api.patch(`/test-runs/${id}`, data);
  },
};

export interface AuditLogsListParams {
  page?: number;
  limit?: number;
  user_eid?: string;
  action?: string;
  resource_type?: string;
  release_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export const auditLogsApi = {
  list(params: AuditLogsListParams = {}) {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(`/audit-logs${query ? `?${query}` : ''}`);
  },
  getFilters() {
    return api.get('/audit-logs/filters');
  },
};

export const reusableCasesApi = {
  list(): Promise<ReusableCasesResponse> {
    return api.get('/reusable-cases') as Promise<ReusableCasesResponse>;
  },
  get(id: number): Promise<ReusableCaseResponse> {
    return api.get(`/reusable-cases/${id}`) as Promise<ReusableCaseResponse>;
  },
  create(data: CreateReusableCaseData) {
    return api.post('/reusable-cases', data);
  },
  update(id: number, data: UpdateReusableCaseData) {
    return api.put(`/reusable-cases/${id}`, data);
  },
  delete(id: number) {
    return api.delete(`/reusable-cases/${id}`);
  },
  copyTo(id: number, data: CopyToCaseData) {
    return api.post(`/reusable-cases/${id}/copy-to`, data);
  },
  createFromCase(data: CreateFromCaseData) {
    return api.post('/reusable-cases/from-case', data);
  },
  // Step management
  listSteps(id: number): Promise<ReusableCaseStepsResponse> {
    return api.get(`/reusable-cases/${id}/steps`) as Promise<ReusableCaseStepsResponse>;
  },
  addStep(id: number, step: ReusableCaseStepData) {
    return api.post(`/reusable-cases/${id}/steps`, step);
  },
  updateStep(id: number, stepId: number, data: Partial<ReusableCaseStepData>) {
    return api.patch(`/reusable-cases/${id}/steps/${stepId}`, data);
  },
  deleteStep(id: number, stepId: number) {
    return api.delete(`/reusable-cases/${id}/steps/${stepId}`);
  },
  reorderSteps(id: number, steps: { id: number }[]) {
    return api.put(`/reusable-cases/${id}/steps/reorder`, { steps });
  },
  syncSteps(id: number, steps: ReusableCaseStepData[]) {
    return api.put(`/reusable-cases/${id}/steps`, { steps });
  },
};

// Environment configuration API
export interface EnvironmentConfig {
  id: number;
  release_id: number | null;
  environment: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export type EnvironmentsResponse = ApiResponse<EnvironmentConfig[]>;
export type EnvironmentResponse = ApiResponse<EnvironmentConfig>;

export const environmentsApi = {
  list(releaseId: number | string): Promise<EnvironmentsResponse> {
    return api.get(`/config/${releaseId}/environments`) as Promise<EnvironmentsResponse>;
  },
  save(
    releaseId: number | string,
    data: { environment: string; url: string }
  ): Promise<EnvironmentResponse> {
    return api.post(`/config/${releaseId}/environments`, data) as Promise<EnvironmentResponse>;
  },
  delete(releaseId: number | string, environment: string) {
    return api.delete(`/config/${releaseId}/environments/${environment}`);
  },
};

// Test generation API for Playwright
export interface TestGenerationStep {
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

export interface TestGenerationScenario {
  id: number;
  name: string;
  case_name: string;
  case_id: number;
  steps: TestGenerationStep[];
}

export interface TestGenerationCase {
  id: number;
  name: string;
  scenarios: TestGenerationScenario[];
}

export interface TestGenerationData {
  testSetId: number;
  testSetName: string;
  releaseId: number;
  cases: TestGenerationCase[];
  selectConfigs: { id: number; name: string; options: string; config_type: string }[];
  matchConfigs: { id: number; name: string; options: string }[];
}

export type TestGenerationResponse = ApiResponse<TestGenerationData>;

export const testGenerationApi = {
  get(testSetId: number, releaseId: number): Promise<TestGenerationResponse> {
    return api.get(
      `/test-generation/${testSetId}?releaseId=${releaseId}`
    ) as Promise<TestGenerationResponse>;
  },
};

// Test run execution API
export interface ExecuteTestRunResponse {
  testRunId: number;
  status: 'queued' | 'running';
  queuePosition?: number;
}

export interface TestRunStepResult {
  id: number;
  test_run_id: number;
  test_step_id: number;
  scenario_id: number;
  scenario_name: string | null;
  case_name: string | null;
  step_definition: string | null;
  expected_results: string | null;
  status: 'passed' | 'failed' | 'skipped';
  error_message: string | null;
  duration_ms: number;
  executed_at: string;
}

export interface ProgressUpdate {
  currentScenario: number;
  totalScenarios: number;
  scenarioName: string;
  caseName: string;
  currentStep: number;
  totalSteps: number;
  stepDefinition: string;
}

export interface TestRunStatusResponse extends TestRun {
  steps: TestRunStepResult[];
  queueStatus: {
    isRunning: boolean;
    queuePosition: number | null;
  };
  progress: ProgressUpdate | null;
}

// Bulk execution response types
export interface BulkExecuteResponse {
  batchId: string;
  testRunIds: number[];
  totalSets: number;
}

export interface BatchExecutionStatus {
  batchId: string;
  status: 'running' | 'completed' | 'failed';
  totalSets: number;
  completedSets: number;
  passedSets: number;
  failedSets: number;
  startedAt: string;
  completedAt: string | null;
  testRuns: {
    testRunId: number;
    testSetName: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
  }[];
}

export const testExecutionApi = {
  execute(
    testSetId: number,
    data: { releaseId: number; environment: string }
  ): Promise<ApiResponse<ExecuteTestRunResponse>> {
    return api.post(`/test-runs/execute/${testSetId}`, data) as Promise<
      ApiResponse<ExecuteTestRunResponse>
    >;
  },
  getStatus(testRunId: number): Promise<ApiResponse<TestRunStatusResponse>> {
    return api.get(`/test-runs/${testRunId}/status`) as Promise<ApiResponse<TestRunStatusResponse>>;
  },
  getQueueStatus(): Promise<
    ApiResponse<{
      current: { testRunId: number; startedAt: string } | null;
      pending: { testRunId: number; addedAt: string }[];
    }>
  > {
    return api.get('/test-runs/queue/status') as Promise<
      ApiResponse<{
        current: { testRunId: number; startedAt: string } | null;
        pending: { testRunId: number; addedAt: string }[];
      }>
    >;
  },
  // 7PS (7 Parallel Sets) execution
  executeAll(data: {
    releaseId: number;
    environment: string;
  }): Promise<ApiResponse<BulkExecuteResponse>> {
    return api.post('/test-runs/execute-all', data) as Promise<ApiResponse<BulkExecuteResponse>>;
  },
  getBatchStatus(batchId: string): Promise<ApiResponse<BatchExecutionStatus | null>> {
    return api.get(`/test-runs/batch/${batchId}/status`) as Promise<
      ApiResponse<BatchExecutionStatus | null>
    >;
  },
  getActiveBatches(): Promise<ApiResponse<BatchExecutionStatus[]>> {
    return api.get('/test-runs/batches/active') as Promise<ApiResponse<BatchExecutionStatus[]>>;
  },
  getBatchDetails(batchId: string): Promise<ApiResponse<BatchDetailsResponse | null>> {
    return api.get(`/test-runs/batch/${batchId}/details`) as Promise<
      ApiResponse<BatchDetailsResponse | null>
    >;
  },
};

// Batch details response (from database)
export interface BatchDetailsResponse {
  batchId: string;
  releaseId: number;
  releaseNumber: string;
  environment: string;
  status: 'running' | 'completed' | 'failed';
  totalSets: number;
  completedSets: number;
  passedSets: number;
  failedSets: number;
  executedBy: string | null;
  startedAt: string;
  completedAt: string | null;
  totalDurationMs: number;
  testRuns: {
    testRunId: number;
    testSetId: number;
    testSetName: string;
    status: string;
    passedSteps: number;
    failedSteps: number;
    totalSteps: number;
    durationMs: number;
  }[];
}

export default api;
