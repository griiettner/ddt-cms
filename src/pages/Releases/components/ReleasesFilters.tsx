interface ReleaseFilters {
  search: string;
  status: string;
  from_date: string;
  to_date: string;
}

interface ReleasesFiltersProps {
  filters: ReleaseFilters;
  onFilterChange: (key: keyof ReleaseFilters, value: string) => void;
  onApply: () => void;
  onReset: () => void;
}

function ReleasesFilters({
  filters,
  onFilterChange,
  onApply,
  onReset,
}: ReleasesFiltersProps): JSX.Element {
  return (
    <div className="card mb-6">
      <div className="grid grid-cols-5 gap-4">
        <input
          type="text"
          placeholder="Search releases..."
          className="form-input"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
        <select
          className="form-input"
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
        <input
          type="date"
          className="form-input"
          value={filters.from_date}
          onChange={(e) => onFilterChange('from_date', e.target.value)}
        />
        <input
          type="date"
          className="form-input"
          value={filters.to_date}
          onChange={(e) => onFilterChange('to_date', e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={onApply} className="btn-primary btn-sm flex-1">
            Apply
          </button>
          <button onClick={onReset} className="btn-outline btn-sm flex-1">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReleasesFilters;
