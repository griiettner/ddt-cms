/**
 * Extended Playwright Fixtures for Data-Driven Testing
 */
import { test as base } from '@playwright/test';
import type { TestData, SelectConfig, MatchConfig } from './types.js';

// Extend the base test with custom fixtures
export interface TestFixtures {
  testData: TestData | null;
  selectConfigsMap: Map<number, SelectConfig>;
  matchConfigsMap: Map<number, MatchConfig>;
}

/**
 * Fetch test data from the API
 */
async function fetchTestData(
  testSetId: string,
  releaseId: string,
  baseUrl: string
): Promise<TestData> {
  const apiUrl = `${baseUrl}/api/test-generation/${testSetId}?releaseId=${releaseId}`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch test data: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as { success: boolean; data?: TestData; error?: string };
  if (!result.success || !result.data) {
    throw new Error(`API error: ${result.error || 'Unknown error'}`);
  }

  return result.data;
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  testData: async ({ baseURL }, use) => {
    const testSetId = process.env.TEST_SET_ID;
    const releaseId = process.env.RELEASE_ID;

    if (!testSetId || !releaseId) {
      console.warn('TEST_SET_ID or RELEASE_ID not set, skipping test data fetch');
      await use(null);
      return;
    }

    const data = await fetchTestData(testSetId, releaseId, baseURL || 'http://localhost:3000');
    await use(data);
  },

  selectConfigsMap: async ({ testData }, use) => {
    const map = new Map<number, SelectConfig>();
    if (testData) {
      for (const config of testData.selectConfigs) {
        map.set(config.id, config);
      }
    }
    await use(map);
  },

  matchConfigsMap: async ({ testData }, use) => {
    const map = new Map<number, MatchConfig>();
    if (testData) {
      for (const config of testData.matchConfigs) {
        map.set(config.id, config);
      }
    }
    await use(map);
  },
});

export { expect } from '@playwright/test';
