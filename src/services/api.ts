/**
 * API Service for Test Builder
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

export const testRunsApi = {
  list(
    params: { releaseId?: number; page?: number; pageSize?: number } = {}
  ): Promise<TestRunsResponse> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get(`/test-runs${query ? `?${query}` : ''}`) as Promise<TestRunsResponse>;
  },
  get(id: number): Promise<TestRunResponse> {
    return api.get(`/test-runs/${id}`) as Promise<TestRunResponse>;
  },
  create(data: CreateTestRunData) {
    return api.post('/test-runs', data);
  },
  update(id: number, data: UpdateTestRunData) {
    return api.patch(`/test-runs/${id}`, data);
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

export default api;
