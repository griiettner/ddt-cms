/**
 * TestRuns Page Hook
 * Fetches and manages test run history for a release with pagination
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRelease } from '@/context/ReleaseContext';
import { testRunsApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { TestRun, Release } from '@/types/entities';
import type { TestRunPagination, TestRunsResponse } from '@/types/api';

const DEFAULT_PAGE_SIZE = 10;

interface TestRunStats {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  totalStepsRun: number;
}

interface UseTestRunsPageReturn {
  // Data
  testRuns: TestRun[];
  selectedRelease: Release | null;
  selectedReleaseId: string;
  stats: TestRunStats;

  // Pagination
  pagination: TestRunPagination;
  page: number;
  pageSize: number;
  goToPage: (newPage: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  changePageSize: (newSize: number) => void;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Modal state
  selectedRun: TestRun | null;
  isDetailModalOpen: boolean;

  // Actions
  openDetailModal: (run: TestRun) => void;
  closeDetailModal: () => void;
  refetch: () => void;
}

export function useTestRunsPage(): UseTestRunsPageReturn {
  const { selectedReleaseId, selectedRelease } = useRelease();
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Parse releaseId as number for API calls
  const releaseIdNum = selectedReleaseId ? parseInt(selectedReleaseId, 10) : undefined;

  // Fetch test runs with pagination
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TestRunsResponse, Error>({
    queryKey: [...queryKeys.testRuns.list(releaseIdNum), page, pageSize],
    queryFn: async () => {
      const res = await testRunsApi.list({
        releaseId: releaseIdNum,
        page,
        pageSize,
      });
      return res;
    },
    enabled: !!releaseIdNum,
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const testRuns = response?.data || [];
  const pagination: TestRunPagination = response?.pagination || {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

  // Open detail modal for a specific run
  const openDetailModal = useCallback((run: TestRun) => {
    setSelectedRun(run);
    setIsDetailModalOpen(true);
  }, []);

  // Close detail modal
  const closeDetailModal = useCallback(() => {
    setSelectedRun(null);
    setIsDetailModalOpen(false);
  }, []);

  // Pagination handlers
  const goToPage = useCallback(
    (newPage: number) => {
      setPage(Math.max(1, Math.min(newPage, pagination.totalPages)));
    },
    [pagination.totalPages]
  );

  const goToNextPage = useCallback(() => {
    if (page < pagination.totalPages) {
      setPage(page + 1);
    }
  }, [page, pagination.totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  // Calculate summary stats from current page (or could be from pagination.total)
  const stats: TestRunStats = {
    totalRuns: pagination.total,
    passedRuns: testRuns.filter((r) => r.status === 'passed').length,
    failedRuns: testRuns.filter((r) => r.status === 'failed').length,
    totalStepsRun: testRuns.reduce((sum, r) => sum + (r.total_steps || 0), 0),
  };

  return {
    // Data
    testRuns,
    selectedRelease,
    selectedReleaseId,
    stats,

    // Pagination
    pagination,
    page,
    pageSize,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,

    // Loading states
    isLoading,
    isError,
    error: error || null,

    // Modal state
    selectedRun,
    isDetailModalOpen,

    // Actions
    openDetailModal,
    closeDetailModal,
    refetch,
  };
}

export default useTestRunsPage;
