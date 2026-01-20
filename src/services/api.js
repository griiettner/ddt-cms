/**
 * API Service for Test Builder
 * Centralized HTTP client with error handling
 */

const BASE_URL = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse(response) {
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error || 'Request failed',
      response.status,
      data
    );
  }

  return data;
}

export const api = {
  async get(endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    return handleResponse(response);
  },

  async post(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async put(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async patch(endpoint, body) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async delete(endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// Specific API modules for different resources
export const releasesApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/releases${query ? `?${query}` : ''}`);
  },
  get(id) {
    return api.get(`/releases/${id}`);
  },
  create(data) {
    return api.post('/releases', data);
  },
  update(id, data) {
    return api.patch(`/releases/${id}`, data);
  },
  delete(id) {
    return api.delete(`/releases/${id}`);
  },
  close(id) {
    return api.put(`/releases/${id}/close`);
  },
  reopen(id) {
    return api.put(`/releases/${id}/reopen`);
  },
  archive(id) {
    return api.put(`/releases/${id}/archive`);
  },
};

export const testSetsApi = {
  list(releaseId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/test-sets/${releaseId}${query ? `?${query}` : ''}`);
  },
  get(releaseId, id) {
    return api.get(`/test-sets/${releaseId}/${id}`);
  },
  create(releaseId, data) {
    return api.post(`/test-sets/${releaseId}`, data);
  },
  update(releaseId, id, data) {
    return api.patch(`/test-sets/${releaseId}/${id}`, data);
  },
  delete(releaseId, id) {
    return api.delete(`/test-sets/${releaseId}/${id}`);
  },
};

export const testCasesApi = {
  list(releaseId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/test-cases/${releaseId}${query ? `?${query}` : ''}`);
  },
  create(releaseId, data) {
    return api.post(`/test-cases/${releaseId}`, data);
  },
  update(releaseId, id, data) {
    return api.patch(`/test-cases/${releaseId}/${id}`, data);
  },
  delete(releaseId, id) {
    return api.delete(`/test-cases/${releaseId}/${id}`);
  },
  getAllScenarios(releaseId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/test-cases/all-scenarios/${releaseId}${query ? `?${query}` : ''}`);
  },
  createScenario(releaseId, data) {
    return api.post(`/test-cases/scenarios/${releaseId}`, data);
  },
  updateScenario(releaseId, scenarioId, data) {
    return api.patch(`/test-cases/scenarios/${releaseId}/${scenarioId}`, data);
  },
  deleteScenario(releaseId, scenarioId) {
    return api.delete(`/test-cases/scenarios/${releaseId}/${scenarioId}`);
  },
};

export const testStepsApi = {
  list(releaseId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/test-steps/${releaseId}${query ? `?${query}` : ''}`);
  },
  update(releaseId, stepId, data) {
    return api.patch(`/test-steps/${releaseId}/${stepId}`, data);
  },
  delete(releaseId, stepId) {
    return api.delete(`/test-steps/${releaseId}/${stepId}`);
  },
  sync(releaseId, data) {
    return api.post(`/test-steps/${releaseId}/sync`, data);
  },
};

export const configApi = {
  getTypes(releaseId) {
    return api.get(`/config/${releaseId}/types`);
  },
  getActions(releaseId) {
    return api.get(`/config/${releaseId}/actions`);
  },
  createType(releaseId, data) {
    return api.post(`/config/${releaseId}/type`, data);
  },
  createAction(releaseId, data) {
    return api.post(`/config/${releaseId}/action`, data);
  },
  bulkUpdateTypes(releaseId, options) {
    return api.post(`/config/${releaseId}/type/bulk`, { options });
  },
  delete(releaseId, id) {
    return api.delete(`/config/${releaseId}/${id}`);
  },
};

export const selectConfigsApi = {
  list() {
    return api.get('/select-configs');
  },
  create(data) {
    return api.post('/select-configs', data);
  },
  update(id, data) {
    return api.put(`/select-configs/${id}`, data);
  },
  delete(id) {
    return api.delete(`/select-configs/${id}`);
  },
};

export const matchConfigsApi = {
  list() {
    return api.get('/match-configs');
  },
  create(data) {
    return api.post('/match-configs', data);
  },
  update(id, data) {
    return api.put(`/match-configs/${id}`, data);
  },
  delete(id) {
    return api.delete(`/match-configs/${id}`);
  },
};

export const categoriesApi = {
  list() {
    return api.get('/categories');
  },
  listFlat() {
    return api.get('/categories/flat');
  },
  get(id) {
    return api.get(`/categories/${id}`);
  },
  create(data) {
    return api.post('/categories', data);
  },
  update(id, data) {
    return api.patch(`/categories/${id}`, data);
  },
  delete(id) {
    return api.delete(`/categories/${id}`);
  },
};

export const dashboardApi = {
  get(releaseId) {
    return api.get(`/dashboard/${releaseId}`);
  },
};

export const exportApi = {
  get(releaseId) {
    return api.get(`/export/${releaseId}`);
  },
};

export const healthApi = {
  check() {
    return api.get('/health');
  },
};

export const testRunsApi = {
  list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return api.get(`/test-runs${query ? `?${query}` : ''}`);
  },
  get(id) {
    return api.get(`/test-runs/${id}`);
  },
  create(data) {
    return api.post('/test-runs', data);
  },
  update(id, data) {
    return api.patch(`/test-runs/${id}`, data);
  },
};

export default api;
