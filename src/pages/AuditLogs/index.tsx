/**
 * Audit Logs Page
 * Displays audit log entries with filtering and pagination
 */
import { useAuditLogsPage } from './hooks/useAuditLogsPage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';

// Action badge colors
const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-co-blue/10 text-co-blue',
  DELETE: 'bg-red-100 text-red-800',
  EXPORT: 'bg-purple-100 text-purple-800',
  COPY: 'bg-yellow-100 text-yellow-800',
  IMPORT: 'bg-indigo-100 text-indigo-800',
};

// Format resource type for display
function formatResourceType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Format timestamp for display
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function AuditLogsPage() {
  const {
    logs,
    pagination,
    filterOptions,
    isLoading,
    filters,
    hasActiveFilters,
    updateFilter,
    clearFilters,
    goToPage,
  } = useAuditLogsPage();

  return (
    <div className="mx-auto max-w-7xl p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-co-gray-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-co-gray-500">
          Track all user actions across the system for accountability and compliance.
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="form-label">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search by name, user..."
              className="form-input"
            />
          </div>

          {/* User Filter */}
          <div>
            <label htmlFor="user_eid" className="form-label">
              User
            </label>
            <select
              id="user_eid"
              value={filters.user_eid}
              onChange={(e) => updateFilter('user_eid', e.target.value)}
              className="form-input"
            >
              <option value="">All Users</option>
              {filterOptions?.users.map((user) => (
                <option key={user.eid} value={user.eid}>
                  {user.name || user.eid}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label htmlFor="action" className="form-label">
              Action
            </label>
            <select
              id="action"
              value={filters.action}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="form-input"
            >
              <option value="">All Actions</option>
              {filterOptions?.actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label htmlFor="resource_type" className="form-label">
              Resource Type
            </label>
            <select
              id="resource_type"
              value={filters.resource_type}
              onChange={(e) => updateFilter('resource_type', e.target.value)}
              className="form-input"
            >
              <option value="">All Types</option>
              {filterOptions?.resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {formatResourceType(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label htmlFor="start_date" className="form-label">
              From Date
            </label>
            <input
              type="date"
              id="start_date"
              value={filters.start_date}
              onChange={(e) => updateFilter('start_date', e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="form-label">
              To Date
            </label>
            <input
              type="date"
              id="end_date"
              value={filters.end_date}
              onChange={(e) => updateFilter('end_date', e.target.value)}
              className="form-input"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end lg:col-span-2">
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn-outline btn-sm">
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden !p-0">
        {isLoading ? (
          <div className="p-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-co-gray-500">
            No audit logs found{hasActiveFilters ? ' matching your filters' : ''}.
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource Type</th>
                    <th>Resource Name</th>
                    <th>Release ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-sm text-co-gray-500">{formatTimestamp(log.timestamp)}</td>
                      <td>
                        <div className="text-sm font-medium text-co-gray-900">
                          {log.user_name || log.user_eid}
                        </div>
                        {log.user_name && (
                          <div className="text-xs text-co-gray-500">{log.user_eid}</div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            actionColors[log.action] || 'text-co-gray-800 bg-co-gray-100'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="text-sm text-co-gray-600">
                        {formatResourceType(log.resource_type)}
                      </td>
                      <td className="text-sm text-co-gray-900">{log.resource_name || '-'}</td>
                      <td className="text-sm text-co-gray-500">{log.release_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination pagination={pagination} onPageChange={goToPage} />
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogsPage;
