import { getRegistryDb, getReleaseDb } from '../db/database.js';

/**
 * Returns dashboard metrics for a specific release
 * @param {string|number} releaseId
 */
export const getDashboardStats = (releaseId) => {
  const registry = getRegistryDb();

  if (!releaseId) {
    // If no release selected, return global stats from registry
    const totalReleases = registry.prepare('SELECT COUNT(*) as count FROM releases').get().count;
    const recentRuns = registry.prepare('SELECT * FROM test_runs ORDER BY executed_at DESC LIMIT 5').all();

    return {
      totalReleases,
      totalSets: 0,
      totalCases: 0,
      totalScenarios: 0,
      totalSteps: 0,
      lastRunPassed: 0,
      lastRunFailed: 0,
      recentRuns,
    };
  }

  // Release specific stats
  const db = getReleaseDb(releaseId);
  const totalTestSets = db.prepare('SELECT COUNT(*) as count FROM test_sets').get().count;
  const totalTestCases = db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count;
  const totalScenarios = db.prepare('SELECT COUNT(*) as count FROM test_scenarios').get().count;
  const totalSteps = db.prepare('SELECT COUNT(*) as count FROM test_steps').get().count;

  // Get recent runs
  const recentRuns = registry.prepare('SELECT * FROM test_runs WHERE release_id = ? ORDER BY executed_at DESC LIMIT 5').all(releaseId);

  // Get pass/fail from last test run
  const lastRun = recentRuns.length > 0 ? recentRuns[0] : null;
  const lastRunPassed = lastRun?.passed_tests || 0;
  const lastRunFailed = lastRun?.failed_tests || 0;

  return {
    totalTestSets,
    totalTestCases,
    totalScenarios,
    totalSteps,
    lastRunPassed,
    lastRunFailed,
    recentRuns,
  };
};
