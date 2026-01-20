/**
 * Recent Executions Component
 */
function RecentExecutions({ recentRuns }) {
  return (
    <div className="card">
      <h2 className="card-header">Recent Executions</h2>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Test Set</th>
              <th>Status</th>
              <th>Date</th>
              <th>Results</th>
            </tr>
          </thead>
          <tbody>
            {recentRuns && recentRuns.length > 0 ? (
              recentRuns.map((run, i) => (
                <tr key={i}>
                  <td className="font-medium text-co-gray-900">
                    {run.test_set_id || 'Global'}
                  </td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      run.status === 'passed'
                        ? 'bg-success-light text-success'
                        : 'bg-error-light text-error'
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="text-co-gray-700">
                    {new Date(run.executed_at).toLocaleDateString()}
                  </td>
                  <td className="text-co-gray-700">
                    {run.passed_tests}/{run.total_tests} Passed
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center text-co-gray-500 italic py-12">
                  No execution history found.
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
