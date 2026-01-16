import { useRelease } from '../../context/ReleaseContext';

function ReleaseSelector({ className = '' }) {
  const { releases, selectedReleaseId, selectRelease, loading } = useRelease();

  if (loading) {
    return (
      <select className={`form-input ${className}`} disabled>
        <option>Loading...</option>
      </select>
    );
  }

  if (releases.length === 0) {
    return (
      <select className={`form-input ${className}`} disabled>
        <option>No releases</option>
      </select>
    );
  }

  return (
    <select
      className={`form-input ${className}`}
      value={selectedReleaseId}
      onChange={(e) => selectRelease(e.target.value)}
    >
      {releases.map((release) => (
        <option key={release.id} value={release.id}>
          Release {release.release_number}
        </option>
      ))}
    </select>
  );
}

export default ReleaseSelector;
