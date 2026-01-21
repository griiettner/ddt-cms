import type { DashboardData } from '@/types/api';

interface StatsCardsProps {
  stats: DashboardData | null | undefined;
}

function StatsCards({ stats }: StatsCardsProps): JSX.Element {
  const passCount = stats?.lastRunPassed;
  const failCount = stats?.lastRunFailed;
  const hasTestRun =
    passCount !== undefined &&
    passCount !== null &&
    failCount !== undefined &&
    failCount !== null &&
    (passCount > 0 || failCount > 0);

  // Handle both global (totalSets) and release-specific (totalTestSets) property names
  const totalSets =
    stats && 'totalTestSets' in stats
      ? stats.totalTestSets
      : stats && 'totalSets' in stats
        ? stats.totalSets
        : 0;
  const totalCases =
    stats && 'totalTestCases' in stats
      ? stats.totalTestCases
      : stats && 'totalCases' in stats
        ? stats.totalCases
        : 0;

  return (
    <div className="mb-8 grid grid-cols-6 gap-4">
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Sets</p>
        <p className="mt-2 text-4xl font-bold text-co-blue">{totalSets}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Cases</p>
        <p className="mt-2 text-4xl font-bold text-co-blue">{totalCases}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Scenarios</p>
        <p className="mt-2 text-4xl font-bold text-co-blue">{stats?.totalScenarios ?? 0}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Steps</p>
        <p className="mt-2 text-4xl font-bold text-co-blue">{stats?.totalSteps ?? 0}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Pass</p>
        {hasTestRun ? (
          <p className="mt-2 text-4xl font-bold text-green-600">{passCount}</p>
        ) : (
          <p className="text-co-gray-400 mt-2 text-4xl font-bold">N/A</p>
        )}
      </div>
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Fail</p>
        {hasTestRun ? (
          <p className="mt-2 text-4xl font-bold text-red-600">{failCount}</p>
        ) : (
          <p className="text-co-gray-400 mt-2 text-4xl font-bold">N/A</p>
        )}
      </div>
    </div>
  );
}

export default StatsCards;
