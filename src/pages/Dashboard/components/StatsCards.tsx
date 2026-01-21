interface DashboardStats {
  totalTestSets?: number;
  totalTestCases?: number;
  totalScenarios?: number;
  totalSteps?: number;
  lastRunPassed?: number | null;
  lastRunFailed?: number | null;
  recentRuns?: unknown[];
}

interface StatsCardsProps {
  stats: DashboardStats | null | undefined;
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

  return (
    <div className="mb-8 grid grid-cols-6 gap-4">
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Sets</p>
        <p className="mt-2 text-4xl font-bold text-co-blue">{stats?.totalTestSets ?? 0}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold uppercase tracking-wide text-co-gray-600">Cases</p>
        <p className="mt-2 text-4xl font-bold text-co-blue">{stats?.totalTestCases ?? 0}</p>
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
