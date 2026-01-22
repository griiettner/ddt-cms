/**
 * TestRunsTable - Displays the full test run history with pagination
 */
import type { TestRun } from '@/types/entities';
import type { TestRunPagination } from '@/types/api';

interface TestRunsTableProps {
  testRuns: TestRun[];
  onViewDetails: (run: TestRun) => void;
  onViewReport?: (run: TestRun) => void;
  pagination: TestRunPagination;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onPageSizeChange: (size: number) => void;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

/**
 * Generate array of page numbers to display
 * Shows first, last, current, and neighbors with ellipsis
 */
function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
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

function TestRunsTable({
  testRuns,
  onViewDetails,
  onViewReport,
  pagination,
  onPageChange,
  onNextPage,
  onPreviousPage,
  onPageSizeChange,
}: TestRunsTableProps): JSX.Element {
  const { page, pageSize, total, totalPages } = pagination;
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  if (!testRuns || testRuns.length === 0) {
    return (
      <div className="card">
        <div className="p-12 text-center text-co-gray-500">
          <svg
            className="mx-auto mb-4 h-16 w-16 text-co-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="mb-2 text-lg font-semibold text-co-gray-700">No Test Runs Yet</h3>
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
              <th>Environment</th>
              <th>Status</th>
              <th>Scenarios</th>
              <th>Results</th>
              <th>Duration</th>
              <th>Run By</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {testRuns.map((run) => (
              <tr key={run.id} className="transition-colors hover:bg-co-gray-50">
                <td className="text-sm text-co-gray-500">#{run.id}</td>
                <td className="font-medium text-co-gray-900">
                  {run.test_set_name || `Test Set #${run.test_set_id}` || 'All Tests'}
                </td>
                <td>
                  {run.environment ? (
                    <span className="bg-co-blue-50 rounded px-2 py-0.5 text-xs font-medium uppercase text-co-blue">
                      {run.environment}
                    </span>
                  ) : (
                    <span className="text-co-gray-400">-</span>
                  )}
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
                  {run.failed_steps > 0 && (
                    <span className="ml-2 text-sm text-red-500">({run.failed_steps} failed)</span>
                  )}
                </td>
                <td className="text-sm text-co-gray-500">{formatDuration(run.duration_ms)}</td>
                <td className="text-sm text-co-gray-600">{run.executed_by || '-'}</td>
                <td className="text-sm text-co-gray-500">{formatDate(run.executed_at)}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onViewDetails(run)}
                      className="text-sm font-medium text-co-blue transition-colors hover:text-co-blue-hover"
                    >
                      View
                    </button>
                    {onViewReport && run.status !== 'running' && (
                      <button
                        onClick={() => onViewReport(run)}
                        className="text-sm font-medium text-co-gray-500 transition-colors hover:text-co-gray-700"
                      >
                        Report
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between border-t border-co-gray-200 px-4 py-3">
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
              className="rounded border border-co-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-co-blue/20"
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
              className={`rounded p-2 transition-colors ${
                page <= 1
                  ? 'cursor-not-allowed text-co-gray-300'
                  : 'text-co-gray-600 hover:bg-co-gray-100'
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {generatePageNumbers(page, totalPages).map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="text-co-gray-400 px-2">
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum as number)}
                    className={`h-8 min-w-[32px] rounded text-sm font-medium transition-colors ${
                      pageNum === page
                        ? 'bg-co-blue text-white'
                        : 'text-co-gray-600 hover:bg-co-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}
            </div>

            <button
              onClick={onNextPage}
              disabled={page >= totalPages}
              className={`rounded p-2 transition-colors ${
                page >= totalPages
                  ? 'cursor-not-allowed text-co-gray-300'
                  : 'text-co-gray-600 hover:bg-co-gray-100'
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestRunsTable;
