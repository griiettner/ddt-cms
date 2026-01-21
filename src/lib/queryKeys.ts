/**
 * Query Key Factory
 * Centralized query key management for TanStack Query
 *
 * Pattern: Each resource has:
 * - all: Base key for the entire resource
 * - list: Key for list queries with optional filters
 * - detail: Key for single item queries
 */

export interface ReleaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export interface TestSetFilters {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  category_ids?: string;
}

export interface TestCaseFilters {
  testSetId: number;
}

export interface ScenarioFilters {
  testCaseId?: number;
}

export const queryKeys = {
  // User/Auth queries
  auth: {
    all: ['auth'] as const,
    user: () => ['auth', 'user'] as const,
  },

  // Release queries
  releases: {
    all: ['releases'] as const,
    list: (filters?: ReleaseFilters) => ['releases', 'list', filters] as const,
    detail: (id: number) => ['releases', 'detail', id] as const,
  },

  // Test Sets queries
  testSets: {
    all: (releaseId: number) => ['testSets', releaseId] as const,
    list: (releaseId: number, filters?: TestSetFilters) =>
      ['testSets', releaseId, 'list', filters] as const,
    detail: (releaseId: number, id: number) => ['testSets', releaseId, 'detail', id] as const,
  },

  // Test Cases queries
  testCases: {
    all: (releaseId: number) => ['testCases', releaseId] as const,
    list: (releaseId: number, filters?: TestCaseFilters) =>
      ['testCases', releaseId, 'list', filters] as const,
  },

  // Scenarios queries
  scenarios: {
    all: (releaseId: number, testSetId: number) => ['scenarios', releaseId, testSetId] as const,
    list: (releaseId: number, testSetId: number, filters?: ScenarioFilters) =>
      ['scenarios', releaseId, testSetId, 'list', filters] as const,
    detail: (releaseId: number, scenarioId: number) =>
      ['scenarios', releaseId, 'detail', scenarioId] as const,
  },

  // Steps queries
  steps: {
    all: (releaseId: number, scenarioId: number) => ['steps', releaseId, scenarioId] as const,
    list: (releaseId: number, scenarioId: number) =>
      ['steps', releaseId, scenarioId, 'list'] as const,
    detail: (releaseId: number, stepId: number) => ['steps', releaseId, 'detail', stepId] as const,
  },

  // Config queries (types, actions)
  config: {
    all: (releaseId: number) => ['config', releaseId] as const,
    types: (releaseId: number) => ['config', releaseId, 'types'] as const,
    actions: (releaseId: number) => ['config', releaseId, 'actions'] as const,
  },

  // Select configs (global, not release-specific)
  selectConfigs: {
    all: ['selectConfigs'] as const,
    list: () => ['selectConfigs', 'list'] as const,
    detail: (id: number) => ['selectConfigs', 'detail', id] as const,
    byType: (type: string) => ['selectConfigs', 'byType', type] as const,
  },

  // Match configs (global, not release-specific)
  matchConfigs: {
    all: ['matchConfigs'] as const,
    list: () => ['matchConfigs', 'list'] as const,
    detail: (id: number) => ['matchConfigs', 'detail', id] as const,
  },

  // Categories (global, not release-specific)
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
    flat: () => ['categories', 'flat'] as const,
    detail: (id: number) => ['categories', 'detail', id] as const,
  },

  // Dashboard queries
  dashboard: {
    all: (releaseId: number) => ['dashboard', releaseId] as const,
    stats: (releaseId: number) => ['dashboard', releaseId, 'stats'] as const,
  },

  // Export queries
  export: {
    all: (releaseId: number) => ['export', releaseId] as const,
  },

  // Test Runs queries
  testRuns: {
    all: ['testRuns'] as const,
    list: (releaseId?: number) => ['testRuns', releaseId, 'list'] as const,
    detail: (id: number) => ['testRuns', 'detail', id] as const,
  },

  // Reusable Cases queries (global)
  reusableCases: {
    all: ['reusableCases'] as const,
    list: () => ['reusableCases', 'list'] as const,
    detail: (id: number) => ['reusableCases', 'detail', id] as const,
  },

  // Audit Logs queries (global)
  auditLogs: {
    all: ['auditLogs'] as const,
    list: (filters?: Record<string, unknown>, page?: number) =>
      ['auditLogs', 'list', filters, page] as const,
    filters: () => ['auditLogs', 'filters'] as const,
  },
};

export default queryKeys;
