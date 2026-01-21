interface ReleasesHeaderProps {
  onCreateClick: () => void;
}

function ReleasesHeader({ onCreateClick }: ReleasesHeaderProps): JSX.Element {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-co-gray-900">Releases</h1>
        <p className="mt-1 text-co-gray-600">Manage release versions</p>
      </div>
      <button onClick={onCreateClick} className="btn-primary">
        + New Release
      </button>
    </div>
  );
}

export default ReleasesHeader;
