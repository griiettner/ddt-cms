import { getDb } from '../db/database.js';
import type { DatabaseInstance, CountResult, TestRunRow } from '../types/index.js';

/**
 * Test run with release number included
 */
interface TestRunWithRelease extends TestRunRow {
  release_number: string | null;
}

/**
 * Parsed test run with failed_details as an array
 */
interface ParsedTestRun extends Omit<TestRunWithRelease, 'failed_details'> {
  failed_details: unknown[];
}

/**
 * Dashboard stats response for no release selected
 */
interface GlobalDashboardStats {
  totalReleases: number;
  totalSets: number;
  totalCases: number;
  totalScenarios: number;
  totalSteps: number;
  lastRunPassed: number;
  lastRunFailed: number;
  recentRuns: ParsedTestRun[];
}

/**
 * Dashboard stats response for a specific release
 */
interface ReleaseDashboardStats {
  totalTestSets: number;
  totalTestCases: number;
  totalScenarios: number;
  totalSteps: number;
  lastRunPassed: number;
  lastRunFailed: number;
  recentRuns: ParsedTestRun[];
}

/**
 * Union type for dashboard stats
 */
export type DashboardStats = GlobalDashboardStats | ReleaseDashboardStats;

/**
 * Parses recent runs by converting failed_details JSON string to array
 */
const parseRecentRuns = (runs: TestRunWithRelease[]): ParsedTestRun[] => {
  return runs.map((run) => ({
    ...run,
    failed_details: run.failed_details ? JSON.parse(run.failed_details) : [],
  }));
};

/**
 * Returns dashboard metrics for a specific release or global stats
 * @param releaseId - Optional release ID
 * @returns Dashboard statistics
 */
export const getDashboardStats = (releaseId?: string | number): DashboardStats => {
  const db: DatabaseInstance = getDb();

  if (!releaseId) {
    // Global stats - query all data from the unified database
    const totalReleases = (
      db.prepare('SELECT COUNT(*) as count FROM releases').get() as CountResult
    ).count;

    const totalSets = (db.prepare('SELECT COUNT(*) as count FROM test_sets').get() as CountResult)
      .count;

    const totalCases = (db.prepare('SELECT COUNT(*) as count FROM test_cases').get() as CountResult)
      .count;

    const totalScenarios = (
      db.prepare('SELECT COUNT(*) as count FROM test_scenarios').get() as CountResult
    ).count;

    const totalSteps = (db.prepare('SELECT COUNT(*) as count FROM test_steps').get() as CountResult)
      .count;

    const recentRunsRaw = db
      .prepare(
        `
      SELECT tr.*, r.release_number
      FROM test_runs tr
      LEFT JOIN releases r ON tr.release_id = r.id
      ORDER BY tr.executed_at DESC LIMIT 10
    `
      )
      .all() as TestRunWithRelease[];
    const recentRuns = parseRecentRuns(recentRunsRaw);

    // Get pass/fail from last run
    const lastRun = recentRuns.length > 0 ? recentRuns[0] : null;
    const lastRunPassed = lastRun?.passed_steps || 0;
    const lastRunFailed = lastRun?.failed_steps || 0;

    return {
      totalReleases,
      totalSets,
      totalCases,
      totalScenarios,
      totalSteps,
      lastRunPassed,
      lastRunFailed,
      recentRuns,
    };
  }

  // Release specific stats - all from the unified database filtered by release_id
  const totalTestSets = (
    db
      .prepare('SELECT COUNT(*) as count FROM test_sets WHERE release_id = ?')
      .get(releaseId) as CountResult
  ).count;

  const totalTestCases = (
    db
      .prepare('SELECT COUNT(*) as count FROM test_cases WHERE release_id = ?')
      .get(releaseId) as CountResult
  ).count;

  const totalScenarios = (
    db
      .prepare('SELECT COUNT(*) as count FROM test_scenarios WHERE release_id = ?')
      .get(releaseId) as CountResult
  ).count;

  const totalSteps = (
    db
      .prepare('SELECT COUNT(*) as count FROM test_steps WHERE release_id = ?')
      .get(releaseId) as CountResult
  ).count;

  // Get recent runs for this release
  const recentRunsRaw = db
    .prepare(
      `
    SELECT tr.*, r.release_number
    FROM test_runs tr
    LEFT JOIN releases r ON tr.release_id = r.id
    WHERE tr.release_id = ?
    ORDER BY tr.executed_at DESC LIMIT 10
  `
    )
    .all(releaseId) as TestRunWithRelease[];
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
