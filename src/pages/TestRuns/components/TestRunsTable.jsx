/**
 * TestRunsTable - Displays the full test run history with pagination
 */

function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function TestRunsTable({
  testRuns,
  onViewDetails,
  pagination,
  onPageChange,
  onNextPage,
  onPreviousPage,
  onPageSizeChange,
}) {
  const { page, pageSize, total, totalPages } = pagination || {};
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  if (!testRuns || testRuns.length === 0) {
    return (
      <div className="card">
        <div className="p-12 text-center text-co-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-co-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h3 className="text-lg font-semibold text-co-gray-700 mb-2">No Test Runs Yet</h3>
          <p className="text-sm">
            Run tests from the Test Cases page to see your test history here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Test Set</th>
              <th>Status</th>
              <th>Scenarios</th>
              <th>Results</th>
              <th>Duration</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {testRuns.map((run) => (
              <tr key={run.id} className="hover:bg-co-gray-50 transition-colors">
                <td className="text-co-gray-500 text-sm">
                  #{run.id}
                </td>
                <td className="font-medium text-co-gray-900">
                  {run.test_set_name || `Test Set #${run.test_set_id}` || 'All Tests'}
                </td>
                <td>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    run.status === 'passed'
                      ? 'bg-green-100 text-green-700'
                      : run.status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {run.status || 'unknown'}
                  </span>
                </td>
                <td className="text-co-gray-700">
                  {run.total_scenarios || 0}
                </td>
                <td className="text-co-gray-700">
                  <span className="text-green-600 font-medium">{run.passed_steps || 0}</span>
                  <span className="text-co-gray-400 mx-1">/</span>
                  <span className="text-co-gray-600">{run.total_steps || 0}</span>
                  {run.failed_steps > 0 && (
                    <span className="text-red-500 ml-2 text-sm">
                      ({run.failed_steps} failed)
                    </span>
                  )}
                </td>
                <td className="text-co-gray-500 text-sm">
                  {formatDuration(run.duration_ms)}
                </td>
                <td className="text-co-gray-500 text-sm">
                  {formatDate(run.executed_at)}
                </td>
                <td>
                  <button
                    onClick={() => onViewDetails(run)}
                    className="text-co-blue hover:text-co-blue-hover text-sm font-medium transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-co-gray-200">
          {/* Left: Showing X of Y */}
          <div className="text-sm text-co-gray-500">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{total}</span> results
          </div>

          {/* Center: Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-co-gray-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
              className="border border-co-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-co-blue/20"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Right: Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPreviousPage}
              disabled={page <= 1}
              className={`p-2 rounded transition-colors ${
                page <= 1
                  ? 'text-co-gray-300 cursor-not-allowed'
                  : 'text-co-gray-600 hover:bg-co-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {generatePageNumbers(page, totalPages).map((pageNum, idx) => (
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-co-gray-400">...</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[32px] h-8 rounded text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-co-blue text-white'
                        : 'text-co-gray-600 hover:bg-co-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              ))}
            </div>

            <button
              onClick={onNextPage}
              disabled={page >= totalPages}
              className={`p-2 rounded transition-colors ${
                page >= totalPages
                  ? 'text-co-gray-300 cursor-not-allowed'
                  : 'text-co-gray-600 hover:bg-co-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generate array of page numbers to display
 * Shows first, last, current, and neighbors with ellipsis
 */
function generatePageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  const showEllipsisStart = currentPage > 4;
  const showEllipsisEnd = currentPage < totalPages - 3;

  // Always show first page
  pages.push(1);

  if (showEllipsisStart) {
    pages.push('...');
  }

  // Calculate range around current page
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  // Adjust if near start
  if (currentPage <= 4) {
    start = 2;
    end = 5;
  }

  // Adjust if near end
  if (currentPage >= totalPages - 3) {
    start = totalPages - 4;
    end = totalPages - 1;
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (showEllipsisEnd) {
    pages.push('...');
  }

  // Always show last page
  pages.push(totalPages);

  return pages;
}

export default TestRunsTable;
