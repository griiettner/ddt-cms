import type { RecentRun } from '@/types/api';

interface RecentExecutionsProps {
  recentRuns: RecentRun[] | null | undefined;
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

function RecentExecutions({ recentRuns }: RecentExecutionsProps): JSX.Element {
  return (
    <div className="card">
      <h2 className="card-header">Recent Test Runs</h2>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Test Set</th>
              <th>Status</th>
              <th>Scenarios</th>
              <th>Results</th>
              <th>Duration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentRuns && recentRuns.length > 0 ? (
              recentRuns.map((run) => (
                <tr key={run.id}>
                  <td className="font-medium text-co-gray-900">
                    {run.test_set_name || `Test Set #${run.test_set_id}` || 'All Tests'}
                  </td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        run.status === 'passed'
                          ? 'bg-green-100 text-green-700'
                          : run.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {run.status || 'unknown'}
                    </span>
                  </td>
                  <td className="text-co-gray-700">{run.total_scenarios || 0}</td>
                  <td className="text-co-gray-700">
                    <span className="font-medium text-green-600">{run.passed_steps || 0}</span>
                    <span className="text-co-gray-400 mx-1">/</span>
                    <span className="text-co-gray-600">{run.total_steps || 0}</span>
                    {(run.failed_steps ?? 0) > 0 && (
                      <span className="ml-2 text-red-500">({run.failed_steps} failed)</span>
                    )}
                  </td>
                  <td className="text-sm text-co-gray-500">{formatDuration(run.duration_ms)}</td>
                  <td className="text-sm text-co-gray-500">{formatDate(run.executed_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center italic text-co-gray-500">
                  No test runs recorded yet. Run a test to see results here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentExecutions;
