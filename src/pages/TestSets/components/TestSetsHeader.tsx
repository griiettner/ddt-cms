import { ReleaseSelector } from '@/components/common';

interface TestSetsHeaderProps {
  onCreateClick: () => void;
}

function TestSetsHeader({ onCreateClick }: TestSetsHeaderProps): JSX.Element {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Test Sets</h1>
        <p className="mt-1 text-co-gray-600">Manage test sets for your release</p>
      </div>
      <div className="flex items-center gap-4">
        <ReleaseSelector className="w-48" />
        <button className="btn-outline" disabled>
          Run 7PS Test
        </button>
        <button onClick={onCreateClick} className="btn-primary">
          + New Test Set
        </button>
      </div>
    </div>
  );
}

export default TestSetsHeader;
