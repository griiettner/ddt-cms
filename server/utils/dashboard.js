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
      recentRuns,
    };
  }

  // Release specific stats
  const db = getReleaseDb(releaseId);
  const totalTestSets = db.prepare('SELECT COUNT(*) as count FROM test_sets').get().count;
  const totalTestCases = db.prepare('SELECT COUNT(*) as count FROM test_cases').get().count;
  
  const recentRuns = registry.prepare('SELECT * FROM test_runs WHERE release_id = ? ORDER BY executed_at DESC LIMIT 5').all(releaseId);

  return {
    totalTestSets,
    totalTestCases,
    recentRuns
  };
};
