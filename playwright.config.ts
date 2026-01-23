import { defineConfig, devices } from '@playwright/test';

// Allow configuring workers via environment variable (default: 1, max: 7 for 7PS)
const workers = parseInt(process.env.PLAYWRIGHT_WORKERS || '1', 10);

export default defineConfig({
  testDir: './tests',
  fullyParallel: workers > 1, // Enable parallel execution when multiple workers
  workers,
  reporter: [['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on', // Record video for all tests
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  outputDir: 'test-results',
  timeout: 60000, // 60 second timeout per test
  expect: {
    timeout: 10000, // 10 second timeout for assertions
  },
});
