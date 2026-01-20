/**
 * TestSets Header Component
 */
import { ReleaseSelector } from '../../../components/common';

function TestSetsHeader({ onCreateClick }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Test Sets</h1>
        <p className="text-co-gray-600 mt-1">Manage test sets for your release</p>
      </div>
      <div className="flex items-center gap-4">
        <ReleaseSelector className="w-48" />
        <button onClick={onCreateClick} className="btn-primary">
          + New Test Set
        </button>
      </div>
    </div>
  );
}

export default TestSetsHeader;
