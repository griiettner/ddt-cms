/**
 * useReleaseState - Combines TanStack Store with TanStack Query
 * Provides a unified hook for release selection and data
 */
import { useEffect } from 'react';
import { useReleasesQuery } from './queries';
import { useReleaseStore, releaseActions } from '../stores/releaseStore';

export function useReleaseState() {
  const { selectedReleaseId, selectRelease, autoSelectFirst } = useReleaseStore();

  // Fetch releases using TanStack Query
  const {
    data: releases = [],
    isLoading,
    isError,
    refetch: refreshReleases,
  } = useReleasesQuery({});

  // Auto-select first release if none selected
  useEffect(() => {
    if (!selectedReleaseId && releases.length > 0) {
      autoSelectFirst(releases);
    }
  }, [releases, selectedReleaseId, autoSelectFirst]);

  // Find the selected release object
  const selectedRelease = releases.find(r => r.id?.toString() === selectedReleaseId);

  return {
    releases,
    selectedReleaseId,
    selectedRelease,
    loading: isLoading,
    isError,
    selectRelease,
    refreshReleases,
  };
}

export default useReleaseState;
