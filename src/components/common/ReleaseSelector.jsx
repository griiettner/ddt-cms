import { useRouterState } from '@tanstack/react-router';
import { useRelease } from '../../context/ReleaseContext';

function ReleaseSelector({ className = '' }) {
  const { releases, selectedReleaseId, selectRelease, loading } = useRelease();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const handleChange = (e) => {
    selectRelease(e.target.value, pathname);
  };

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
      onChange={handleChange}
    >
      {releases.map((release) => (
        <option key={release.id} value={release.id}>
          {release.release_number}
        </option>
      ))}
    </select>
  );
}

export default ReleaseSelector;
