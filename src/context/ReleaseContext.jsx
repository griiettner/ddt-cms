import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { releasesApi } from '../services/api';

const ReleaseContext = createContext(null);

export function ReleaseProvider({ children }) {
  const [releases, setReleases] = useState([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState(() => {
    return localStorage.getItem('selectedReleaseId') || '';
  });
  const [loading, setLoading] = useState(true);

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      const res = await releasesApi.list({ limit: 100 }); // Get all releases for selector
      const releasesData = res.data || [];
      setReleases(releasesData);

      // Auto-select first release if none selected
      if (!selectedReleaseId && releasesData.length > 0) {
        const firstId = releasesData[0].id.toString();
        setSelectedReleaseId(firstId);
        localStorage.setItem('selectedReleaseId', firstId);
      }
    } catch (err) {
      console.error('Failed to load releases', err);
    } finally {
      setLoading(false);
    }
  }, [selectedReleaseId]);

  useEffect(() => {
    loadReleases();
  }, []);

  const selectRelease = useCallback((id) => {
    const idStr = id?.toString() || '';
    setSelectedReleaseId(idStr);
    localStorage.setItem('selectedReleaseId', idStr);
  }, []);

  const selectedRelease = releases.find(r => r.id.toString() === selectedReleaseId);

  const value = {
    releases,
    selectedReleaseId,
    selectedRelease,
    loading,
    selectRelease,
    refreshReleases: loadReleases,
  };

  return (
    <ReleaseContext.Provider value={value}>
      {children}
    </ReleaseContext.Provider>
  );
}

export function useRelease() {
  const context = useContext(ReleaseContext);
  if (!context) {
    throw new Error('useRelease must be used within a ReleaseProvider');
  }
  return context;
}

export default ReleaseContext;
