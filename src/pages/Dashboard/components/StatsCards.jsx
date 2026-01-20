/**
 * Stats Cards Component
 */
function StatsCards({ stats }) {
  const passCount = stats?.lastRunPassed;
  const failCount = stats?.lastRunFailed;
  const hasTestRun = passCount !== undefined && passCount !== null && failCount !== undefined && failCount !== null && (passCount > 0 || failCount > 0);

  return (
    <div className="grid grid-cols-6 gap-4 mb-8">
      <div className="card">
        <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Sets</p>
        <p className="text-4xl font-bold text-co-blue mt-2">{stats?.totalSets ?? 0}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Cases</p>
        <p className="text-4xl font-bold text-co-blue mt-2">{stats?.totalCases ?? 0}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Scenarios</p>
        <p className="text-4xl font-bold text-co-blue mt-2">{stats?.totalScenarios ?? 0}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Steps</p>
        <p className="text-4xl font-bold text-co-blue mt-2">{stats?.totalSteps ?? 0}</p>
      </div>
      <div className="card">
        <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Pass</p>
        {hasTestRun ? (
          <p className="text-4xl font-bold text-green-600 mt-2">{passCount}</p>
        ) : (
          <p className="text-4xl font-bold text-co-gray-400 mt-2">N/A</p>
        )}
      </div>
      <div className="card">
        <p className="text-sm font-semibold text-co-gray-600 uppercase tracking-wide">Fail</p>
        {hasTestRun ? (
          <p className="text-4xl font-bold text-red-600 mt-2">{failCount}</p>
        ) : (
          <p className="text-4xl font-bold text-co-gray-400 mt-2">N/A</p>
        )}
      </div>
    </div>
  );
}

export default StatsCards;
