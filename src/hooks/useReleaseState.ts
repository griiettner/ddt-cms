/**
 * useReleaseState - Combines TanStack Store with TanStack Query
 * Provides a unified hook for release selection and data
 */
import { useEffect, useMemo } from 'react';
import { useReleasesQuery } from './queries';
import { useReleaseStore } from '@/stores/releaseStore';
import type { Release } from '@/types/entities';

interface UseReleaseStateReturn {
  releases: Release[];
  selectedReleaseId: string;
  selectedRelease: Release | undefined;
  loading: boolean;
  isError: boolean;
  selectRelease: (id: string | number | null | undefined) => void;
  refreshReleases: () => void;
}

export function useReleaseState(): UseReleaseStateReturn {
  const { selectedReleaseId, selectRelease, autoSelectFirst } = useReleaseStore();

  // Fetch releases using TanStack Query
  const { data, isLoading, isError, refetch: refreshReleases } = useReleasesQuery({});

  // Memoize releases to prevent unnecessary re-renders
  const releases = useMemo(() => data?.data ?? [], [data?.data]);

  // Auto-select first release if none selected
  useEffect(() => {
    if (!selectedReleaseId && releases.length > 0) {
      autoSelectFirst(releases);
    }
  }, [releases, selectedReleaseId, autoSelectFirst]);

  // Find the selected release object
  const selectedRelease = releases.find((r) => r.id?.toString() === selectedReleaseId);

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
