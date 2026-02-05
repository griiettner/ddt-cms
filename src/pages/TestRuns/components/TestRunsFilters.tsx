/**
 * TestRunsFilters - Filter controls for test run history
 */
import { useState, useRef, useEffect } from 'react';
import type { TestRunFilterOptions } from '@/services/api';

export interface TestRunFilters {
  status: string;
  executedBy: string;
  startDate: string;
  endDate: string;
  testSetId: string;
  testSetName: string;
  environment: string;
}

interface TestRunsFiltersProps {
  filters: TestRunFilters;
  onFilterChange: (key: keyof TestRunFilters, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  filterOptions: TestRunFilterOptions | null;
  isLoading?: boolean;
}

function TestRunsFilters({
  filters,
  onFilterChange,
  onApply,
  onReset,
  filterOptions,
  isLoading,
}: TestRunsFiltersProps): JSX.Element {
  const [testSetSearchOpen, setTestSetSearchOpen] = useState(false);
  const [testSetSearch, setTestSetSearch] = useState('');
  const testSetRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (testSetRef.current && !testSetRef.current.contains(event.target as Node)) {
        setTestSetSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter test sets based on search
  const filteredTestSets =
    filterOptions?.testSets.filter((ts) =>
      ts.name.toLowerCase().includes(testSetSearch.toLowerCase())
    ) || [];

  const handleTestSetSelect = (id: number, name: string) => {
    onFilterChange('testSetId', String(id));
    onFilterChange('testSetName', name);
    setTestSetSearch(name);
    setTestSetSearchOpen(false);
  };

  const handleTestSetClear = () => {
    onFilterChange('testSetId', '');
    onFilterChange('testSetName', '');
    setTestSetSearch('');
  };

  return (
    <div className="card mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-co-gray-500">Filters</h3>
        {isLoading && <span className="text-co-gray-400 text-xs">Loading options...</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Status Filter */}
        <div>
          <label className="mb-1 block text-xs font-medium text-co-gray-600">Status</label>
          <select
            className="form-input w-full"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>

        {/* Environment Filter */}
        <div>
          <label className="mb-1 block text-xs font-medium text-co-gray-600">Environment</label>
          <select
            className="form-input w-full"
            value={filters.environment}
            onChange={(e) => onFilterChange('environment', e.target.value)}
          >
            <option value="">All Environments</option>
            {filterOptions?.environments.map((env) => (
              <option key={env} value={env}>
                {env.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Executed By Filter */}
        <div>
          <label className="mb-1 block text-xs font-medium text-co-gray-600">Run By</label>
          <select
            className="form-input w-full"
            value={filters.executedBy}
            onChange={(e) => onFilterChange('executedBy', e.target.value)}
          >
            <option value="">All Users</option>
            {filterOptions?.executedBy.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>

        {/* Test Set Typeahead */}
        <div ref={testSetRef} className="relative">
          <label className="mb-1 block text-xs font-medium text-co-gray-600">Test Set</label>
          <div className="relative">
            <input
              type="text"
              className="form-input w-full pr-8"
              placeholder="Search test sets..."
              value={testSetSearch}
              onChange={(e) => {
                setTestSetSearch(e.target.value);
                setTestSetSearchOpen(true);
                if (!e.target.value) {
                  handleTestSetClear();
                }
              }}
              onFocus={() => setTestSetSearchOpen(true)}
            />
            {filters.testSetId && (
              <button
                onClick={handleTestSetClear}
                className="text-co-gray-400 absolute right-2 top-1/2 -translate-y-1/2 hover:text-co-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {testSetSearchOpen && filteredTestSets.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-co-gray-200 bg-white shadow-lg">
              {filteredTestSets.map((ts) => (
                <button
                  key={ts.id}
                  onClick={() => handleTestSetSelect(ts.id, ts.name)}
                  className={`hover:bg-co-blue-50 w-full px-3 py-2 text-left text-sm ${
                    filters.testSetId === String(ts.id)
                      ? 'bg-co-blue-50 text-co-blue'
                      : 'text-co-gray-700'
                  }`}
                >
                  {ts.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-co-gray-600">From Date</label>
          <input
            type="date"
            className="form-input w-full"
            value={filters.startDate}
            onChange={(e) => onFilterChange('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-co-gray-600">To Date</label>
          <input
            type="date"
            className="form-input w-full"
            value={filters.endDate}
            onChange={(e) => onFilterChange('endDate', e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button onClick={onApply} className="btn-primary btn-sm flex-1">
            Apply Filters
          </button>
          <button onClick={onReset} className="btn-outline btn-sm flex-1">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestRunsFilters;
