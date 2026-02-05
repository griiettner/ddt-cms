import { getDb } from '../db/database.js';
import type { DatabaseWrapper } from '../db/database.js';
import type { CountResult, TestRunRow } from '../types/index.js';

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
export const getDashboardStats = async (releaseId?: string | number): Promise<DashboardStats> => {
  const db: DatabaseWrapper = getDb();

  if (!releaseId) {
    // Global stats - query all data from the unified database
    const totalReleasesResult = await db.get<CountResult>('SELECT COUNT(*) as count FROM releases');
    const totalReleases = totalReleasesResult?.count || 0;

    const totalSetsResult = await db.get<CountResult>('SELECT COUNT(*) as count FROM test_sets');
    const totalSets = totalSetsResult?.count || 0;

    const totalCasesResult = await db.get<CountResult>('SELECT COUNT(*) as count FROM test_cases');
    const totalCases = totalCasesResult?.count || 0;

    const totalScenariosResult = await db.get<CountResult>(
      'SELECT COUNT(*) as count FROM test_scenarios'
    );
    const totalScenarios = totalScenariosResult?.count || 0;

    const totalStepsResult = await db.get<CountResult>('SELECT COUNT(*) as count FROM test_steps');
    const totalSteps = totalStepsResult?.count || 0;

    const recentRunsRaw = await db.all<TestRunWithRelease>(`
      SELECT tr.*, r.release_number
      FROM test_runs tr
      LEFT JOIN releases r ON tr.release_id = r.id
      ORDER BY tr.executed_at DESC LIMIT 10
    `);
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
  const totalTestSetsResult = await db.get<CountResult>(
    'SELECT COUNT(*) as count FROM test_sets WHERE release_id = ?',
    [releaseId]
  );
  const totalTestSets = totalTestSetsResult?.count || 0;

  const totalTestCasesResult = await db.get<CountResult>(
    'SELECT COUNT(*) as count FROM test_cases WHERE release_id = ?',
    [releaseId]
  );
  const totalTestCases = totalTestCasesResult?.count || 0;

  const totalScenariosResult = await db.get<CountResult>(
    'SELECT COUNT(*) as count FROM test_scenarios WHERE release_id = ?',
    [releaseId]
  );
  const totalScenarios = totalScenariosResult?.count || 0;

  const totalStepsResult = await db.get<CountResult>(
    'SELECT COUNT(*) as count FROM test_steps WHERE release_id = ?',
    [releaseId]
  );
  const totalSteps = totalStepsResult?.count || 0;

  // Get recent runs for this release
  const recentRunsRaw = await db.all<TestRunWithRelease>(
    `
    SELECT tr.*, r.release_number
    FROM test_runs tr
    LEFT JOIN releases r ON tr.release_id = r.id
    WHERE tr.release_id = ?
    ORDER BY tr.executed_at DESC LIMIT 10
  `,
    [releaseId]
  );
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
