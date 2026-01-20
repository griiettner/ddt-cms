import { getRegistryDb, getReleaseDb } from '../db/database.js';

/**
 * Returns dashboard metrics for a specific release
 * @param {string|number} releaseId
 */
export const getDashboardStats = (releaseId) => {
  const registry = getRegistryDb();

  // Helper to parse recent runs
  const parseRecentRuns = (runs) => runs.map(run => ({
    ...run,
    failed_details: run.failed_details ? JSON.parse(run.failed_details) : [],
  }));

  if (!releaseId) {
    // If no release selected, return global stats from registry
    const totalReleases = registry.prepare('SELECT COUNT(*) as count FROM releases').get().count;
    const recentRunsRaw = registry.prepare(`
      SELECT tr.*, r.release_number
      FROM test_runs tr
      LEFT JOIN releases r ON tr.release_id = r.id
      ORDER BY tr.executed_at DESC LIMIT 10
    `).all();
    const recentRuns = parseRecentRuns(recentRunsRaw);

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

  // Get recent runs for this release
  const recentRunsRaw = registry.prepare(`
    SELECT tr.*, r.release_number
    FROM test_runs tr
    LEFT JOIN releases r ON tr.release_id = r.id
    WHERE tr.release_id = ?
    ORDER BY tr.executed_at DESC LIMIT 10
  `).all(releaseId);
  const recentRuns = parseRecentRuns(recentRunsRaw);

  // Get pass/fail from last test run
  const lastRun = recentRuns.length > 0 ? recentRuns[0] : null;
  const lastRunPassed = lastRun?.passed_steps || 0;
  const lastRunFailed = lastRun?.failed_steps || 0;

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
