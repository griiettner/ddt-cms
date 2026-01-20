/**
 * TestRuns Page Hook
 * Fetches and manages test run history for a release with pagination
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRelease } from '../../../context/ReleaseContext';
import { testRunsApi } from '../../../services/api';
import { queryKeys } from '../../../lib/queryKeys';

const DEFAULT_PAGE_SIZE = 10;

export function useTestRunsPage() {
  const { selectedReleaseId, selectedRelease } = useRelease();
  const [selectedRun, setSelectedRun] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Fetch test runs with pagination
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...(queryKeys.testRuns?.list(selectedReleaseId) || ['testRuns', selectedReleaseId]), page, pageSize],
    queryFn: async () => {
      const res = await testRunsApi.list({
        releaseId: selectedReleaseId,
        page,
        pageSize,
      });
      return res;
    },
    enabled: !!selectedReleaseId,
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });

  const testRuns = response?.data || [];
  const pagination = response?.pagination || {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  };

  // Open detail modal for a specific run
  const openDetailModal = useCallback((run) => {
    setSelectedRun(run);
    setIsDetailModalOpen(true);
  }, []);

  // Close detail modal
  const closeDetailModal = useCallback(() => {
    setSelectedRun(null);
    setIsDetailModalOpen(false);
  }, []);

  // Pagination handlers
  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, Math.min(newPage, pagination.totalPages)));
  }, [pagination.totalPages]);

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

  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  // Calculate summary stats from current page (or could be from pagination.total)
  const stats = {
    totalRuns: pagination.total,
    passedRuns: testRuns.filter(r => r.status === 'passed').length,
    failedRuns: testRuns.filter(r => r.status === 'failed').length,
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
    error,

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
