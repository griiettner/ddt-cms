/**
 * Releases Header Component
 */
function ReleasesHeader({ onCreateClick }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Releases</h1>
        <p className="text-co-gray-600 mt-1">Manage release versions</p>
      </div>
      <button onClick={onCreateClick} className="btn-primary">
        + New Release
      </button>
    </div>
  );
}

export default ReleasesHeader;
