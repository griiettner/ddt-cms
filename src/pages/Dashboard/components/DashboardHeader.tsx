import { ReleaseSelector } from '@/components/common';

interface DashboardHeaderProps {
  onExport: () => void;
  onCreateRelease: () => void;
  isCreating: boolean;
}

function DashboardHeader({
  onExport,
  onCreateRelease,
  isCreating,
}: DashboardHeaderProps): JSX.Element {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Dashboard</h1>
        <p className="mt-1 text-co-gray-600">Overview of your test data</p>
      </div>
      <div className="flex items-center gap-4">
        <ReleaseSelector className="w-48" />
        <button onClick={onExport} className="btn-primary btn-sm">
          Export JSON
        </button>
        <button onClick={onCreateRelease} className="btn-outline btn-sm" disabled={isCreating}>
          {isCreating ? 'Creating...' : '+ New Release'}
        </button>
      </div>
    </div>
  );
}

export default DashboardHeader;
