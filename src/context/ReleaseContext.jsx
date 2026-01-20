import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { releasesApi } from '../services/api';
import { toReleaseSlug } from '../lib/urlUtils';

const ReleaseContext = createContext(null);

export function ReleaseProvider({ children }) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Get release slug from URL params
  const params = useParams({ strict: false });
  const releaseSlugFromUrl = params.releaseId; // This is now a slug like "10.1.12"

  const loadReleases = useCallback(async () => {
    try {
      setLoading(true);
      // Only fetch open releases for the selector dropdown
      const res = await releasesApi.list({ limit: 100, status: 'open' });
      const releasesData = res.data || [];
      setReleases(releasesData);
    } catch (err) {
      console.error('Failed to load releases', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  // Find release by slug (release_number)
  const findReleaseBySlug = useCallback((slug) => {
    if (!slug) return null;
    const normalizedSlug = slug.toLowerCase();
    return releases.find(r => toReleaseSlug(r.release_number) === normalizedSlug);
  }, [releases]);

  // Sync localStorage with URL param
  useEffect(() => {
    if (releaseSlugFromUrl) {
      localStorage.setItem('selectedReleaseSlug', releaseSlugFromUrl);
    }
  }, [releaseSlugFromUrl]);

  // Navigate to a different release (updates URL using slug)
  const selectRelease = useCallback((releaseOrId, currentPath = '') => {
    // If passed an object with release_number, use it; otherwise find the release by ID
    let slug;
    if (typeof releaseOrId === 'object' && releaseOrId.release_number) {
      slug = toReleaseSlug(releaseOrId.release_number);
    } else {
      const release = releases.find(r => r.id.toString() === releaseOrId?.toString());
      slug = release ? toReleaseSlug(release.release_number) : '';
    }

    if (!slug) return;

    localStorage.setItem('selectedReleaseSlug', slug);

    // Determine which sub-page we're on and navigate accordingly
    if (currentPath.includes('/test-sets')) {
      navigate({ to: '/$releaseId/test-sets', params: { releaseId: slug } });
    } else if (currentPath.includes('/test-cases')) {
      navigate({ to: '/$releaseId/test-cases', params: { releaseId: slug } });
    } else if (currentPath.includes('/settings')) {
      navigate({ to: '/$releaseId/settings', params: { releaseId: slug } });
    } else {
      // Default to dashboard
      navigate({ to: '/$releaseId', params: { releaseId: slug } });
    }
  }, [navigate, releases]);

  // Get the selected release from URL slug
  const selectedRelease = findReleaseBySlug(releaseSlugFromUrl);
  const selectedReleaseId = selectedRelease?.id?.toString() || '';

  const value = {
    releases,
    selectedReleaseId,
    selectedRelease,
    releaseSlug: releaseSlugFromUrl || '',
    loading,
    selectRelease,
    refreshReleases: loadReleases,
    toReleaseSlug, // Export utility for components
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
