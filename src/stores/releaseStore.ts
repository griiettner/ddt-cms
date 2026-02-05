/**
 * Release Store - TanStack Store
 * Manages release selection state (persisted to localStorage)
 */
import { Store } from '@tanstack/store';
import { useStore } from '@tanstack/react-store';
import type { Release } from '@/types/entities';

interface ReleaseState {
  selectedReleaseId: string;
}

// Get initial value from localStorage
const getInitialReleaseId = (): string => {
  try {
    return localStorage.getItem('selectedReleaseId') || '';
  } catch {
    return '';
  }
};

// Create the release store
export const releaseStore = new Store<ReleaseState>({
  selectedReleaseId: getInitialReleaseId(),
});

// Subscribe to changes and persist to localStorage
releaseStore.subscribe(() => {
  try {
    const { selectedReleaseId } = releaseStore.state;
    if (selectedReleaseId) {
      localStorage.setItem('selectedReleaseId', selectedReleaseId);
    } else {
      localStorage.removeItem('selectedReleaseId');
    }
  } catch (err) {
    console.error('Failed to persist release selection', err);
  }
});

// Actions
export const releaseActions = {
  selectRelease: (id: string | number | null | undefined): void => {
    const idStr = id?.toString() || '';
    releaseStore.setState((state) => ({
      ...state,
      selectedReleaseId: idStr,
    }));
  },

  clearSelection: (): void => {
    releaseStore.setState((state) => ({
      ...state,
      selectedReleaseId: '',
    }));
  },

  // Auto-select first release if none selected
  autoSelectFirst: (releases: Release[] | undefined | null): void => {
    if (!releaseStore.state.selectedReleaseId && releases && releases.length > 0) {
      const firstId = releases[0].id.toString();
      releaseActions.selectRelease(firstId);
    }
  },
};

// Selectors
export const releaseSelectors = {
  getSelectedReleaseId: (): string => releaseStore.state.selectedReleaseId,
};

// React hook to use release store
export function useReleaseStore(): {
  selectedReleaseId: string;
  selectRelease: (id: string | number | null | undefined) => void;
  clearSelection: () => void;
  autoSelectFirst: (releases: Release[] | undefined | null) => void;
} {
  const selectedReleaseId = useStore(releaseStore, (state) => state.selectedReleaseId);

  return {
    selectedReleaseId,
    selectRelease: releaseActions.selectRelease,
    clearSelection: releaseActions.clearSelection,
    autoSelectFirst: releaseActions.autoSelectFirst,
  };
}

export default releaseStore;
