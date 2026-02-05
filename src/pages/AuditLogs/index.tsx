/**
 * Audit Logs Page
 * Displays audit log entries with filtering and pagination
 */
import { useState } from 'react';
import { useAuditLogsPage } from './hooks/useAuditLogsPage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import type { AuditLog } from '@/types/entities';

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

// Format field name for display
function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Check if a field should be masked (sensitive data)
function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = ['password', 'secret', 'token', 'api_key', 'apikey', 'credential'];
  return sensitiveFields.some((sf) => fieldName.toLowerCase().includes(sf));
}

// Check if the action type indicates a password action
function isPasswordAction(actionValue: unknown): boolean {
  if (typeof actionValue === 'string') {
    return actionValue.toLowerCase() === 'password';
  }
  return false;
}

// Format value for display (with masking for sensitive fields)
function formatValue(value: unknown, fieldName?: string, isSensitive?: boolean): string {
  if (value === null || value === undefined) return '(empty)';
  if (isSensitive || (fieldName && isSensitiveField(fieldName))) {
    return '********';
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Component to display changes
function ChangesDisplay({ log }: { log: AuditLog }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!log.old_value && !log.new_value) {
    return <span className="text-co-gray-400">-</span>;
  }

  const oldValue = log.old_value || {};
  const newValue = log.new_value || {};

  // Check if the action field indicates this is a password-related change
  const actionIsPassword = isPasswordAction(oldValue.action) || isPasswordAction(newValue.action);

  // Get the element type for display (for test_step edits)
  const elementType = (newValue.type || oldValue.type) as string | undefined;

  // Get all keys that changed
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  const changedFields: { field: string; old: unknown; new: unknown }[] = [];

  allKeys.forEach((key) => {
    const oldVal = oldValue[key];
    const newVal = newValue[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changedFields.push({ field: key, old: oldVal, new: newVal });
    }
  });

  if (changedFields.length === 0) {
    return <span className="text-co-gray-400">-</span>;
  }

  // Check if action_result field should be masked (when action is password)
  const shouldMaskActionResult = actionIsPassword;

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs font-medium text-co-blue hover:text-co-blue-hover"
      >
        <span>
          {changedFields.length} field{changedFields.length > 1 ? 's' : ''} changed
        </span>
        {elementType && (
          <span className="ml-1 rounded bg-co-gray-200 px-1.5 py-0.5 text-[10px] font-normal text-co-gray-600">
            {elementType}
          </span>
        )}
        <svg
          className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="mt-2 space-y-1 rounded border border-co-gray-200 bg-co-gray-50 p-2 text-xs">
          {changedFields.map(({ field, old, new: newVal }) => {
            // Determine if this field's value should be masked
            const isMasked =
              isSensitiveField(field) || (field === 'action_result' && shouldMaskActionResult);

            return (
              <div key={field} className="flex flex-col gap-0.5">
                <span className="font-medium text-co-gray-700">{formatFieldName(field)}:</span>
                <div className="ml-2 flex items-center gap-2">
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 line-through">
                    {formatValue(old, field, isMasked)}
                  </span>
                  <svg
                    className="text-co-gray-400 h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
                    {formatValue(newVal, field, isMasked)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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
                    <th>Changes</th>
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
                      <td className="text-sm">
                        <ChangesDisplay log={log} />
                      </td>
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
