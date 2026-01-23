import { ReleaseSelector } from '@/components/common';

interface TestSetsHeaderProps {
  onCreateClick: () => void;
  onRun7PSClick: () => void;
  testSetCount: number;
}

function TestSetsHeader({
  onCreateClick,
  onRun7PSClick,
  testSetCount,
}: TestSetsHeaderProps): JSX.Element {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Test Sets</h1>
        <p className="mt-1 text-co-gray-600">Manage test sets for your release</p>
      </div>
      <div className="flex items-center gap-4">
        <ReleaseSelector className="w-48" />
        <button
          onClick={onRun7PSClick}
          disabled={testSetCount === 0}
          className="btn-outline"
          title={testSetCount === 0 ? 'No test sets to run' : `Run all ${testSetCount} test sets`}
        >
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
