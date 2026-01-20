/**
 * Query Key Factory
 * Centralized query key management for TanStack Query
 *
 * Pattern: Each resource has:
 * - all: Base key for the entire resource
 * - list: Key for list queries with optional filters
 * - detail: Key for single item queries
 */
export const queryKeys = {
  // User/Auth queries
  auth: {
    all: ['auth'],
    user: () => ['auth', 'user'],
  },

  // Release queries
  releases: {
    all: ['releases'],
    list: (filters) => ['releases', 'list', filters],
    detail: (id) => ['releases', 'detail', id],
  },

  // Test Sets queries
  testSets: {
    all: (releaseId) => ['testSets', releaseId],
    list: (releaseId, filters) => ['testSets', releaseId, 'list', filters],
    detail: (releaseId, id) => ['testSets', releaseId, 'detail', id],
  },

  // Test Cases queries
  testCases: {
    all: (releaseId) => ['testCases', releaseId],
    list: (releaseId, filters) => ['testCases', releaseId, 'list', filters],
  },

  // Scenarios queries
  scenarios: {
    all: (releaseId, testSetId) => ['scenarios', releaseId, testSetId],
    list: (releaseId, testSetId, filters) => ['scenarios', releaseId, testSetId, 'list', filters],
    detail: (releaseId, scenarioId) => ['scenarios', releaseId, 'detail', scenarioId],
  },

  // Steps queries
  steps: {
    all: (releaseId, scenarioId) => ['steps', releaseId, scenarioId],
    list: (releaseId, scenarioId) => ['steps', releaseId, scenarioId, 'list'],
    detail: (releaseId, stepId) => ['steps', releaseId, 'detail', stepId],
  },

  // Config queries (types, actions)
  config: {
    all: (releaseId) => ['config', releaseId],
    types: (releaseId) => ['config', releaseId, 'types'],
    actions: (releaseId) => ['config', releaseId, 'actions'],
  },

  // Select configs (global, not release-specific)
  selectConfigs: {
    all: ['selectConfigs'],
    list: () => ['selectConfigs', 'list'],
    detail: (id) => ['selectConfigs', 'detail', id],
    byType: (type) => ['selectConfigs', 'byType', type],
  },

  // Match configs (global, not release-specific)
  matchConfigs: {
    all: ['matchConfigs'],
    list: () => ['matchConfigs', 'list'],
    detail: (id) => ['matchConfigs', 'detail', id],
  },

  // Categories (global, not release-specific)
  categories: {
    all: ['categories'],
    list: () => ['categories', 'list'],
    flat: () => ['categories', 'flat'],
    detail: (id) => ['categories', 'detail', id],
  },

  // Dashboard queries
  dashboard: {
    all: (releaseId) => ['dashboard', releaseId],
    stats: (releaseId) => ['dashboard', releaseId, 'stats'],
  },

  // Export queries
  export: {
    all: (releaseId) => ['export', releaseId],
  },
};

export default queryKeys;
