/**
 * TestRuns Page Hook
 * Fetches and manages test run history for a release with pagination and filters
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRelease } from '@/context/ReleaseContext';
import { testRunsApi, type TestRunFilterOptions } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { TestRun, Release } from '@/types/entities';
import type { TestRunPagination, TestRunsResponse } from '@/types/api';
import type { TestRunFilters } from '../components/TestRunsFilters';

const DEFAULT_PAGE_SIZE = 10;

const INITIAL_FILTERS: TestRunFilters = {
  status: '',
  executedBy: '',
  startDate: '',
  endDate: '',
  testSetId: '',
  testSetName: '',
  environment: '',
};

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

  // Filters
  filters: TestRunFilters;
  appliedFilters: TestRunFilters;
  filterOptions: TestRunFilterOptions | null;
  isFilterOptionsLoading: boolean;
  updateFilter: (key: keyof TestRunFilters, value: string) => void;
  applyFilters: () => void;
  resetFilters: () => void;

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

  // Detail Modal state
  selectedRun: TestRun | null;
  isDetailModalOpen: boolean;
  openDetailModal: (run: TestRun) => void;
  closeDetailModal: () => void;

  // Report Modal state
  reportRun: TestRun | null;
  isReportModalOpen: boolean;
  openReportModal: (run: TestRun) => void;
  closeReportModal: () => void;

  // Actions
  refetch: () => void;
}

export function useTestRunsPage(): UseTestRunsPageReturn {
  const { selectedReleaseId, selectedRelease } = useRelease();
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [reportRun, setReportRun] = useState<TestRun | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Filter state - working state for the form
  const [filters, setFilters] = useState<TestRunFilters>(INITIAL_FILTERS);
  // Applied filters - actually sent to API
  const [appliedFilters, setAppliedFilters] = useState<TestRunFilters>(INITIAL_FILTERS);

  // Parse releaseId as number for API calls
  const releaseIdNum = selectedReleaseId ? parseInt(selectedReleaseId, 10) : undefined;

  // Build query params from applied filters
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      releaseId: releaseIdNum,
      page,
      pageSize,
    };

    if (appliedFilters.status) params.status = appliedFilters.status;
    if (appliedFilters.executedBy) params.executedBy = appliedFilters.executedBy;
    if (appliedFilters.startDate) params.startDate = appliedFilters.startDate;
    if (appliedFilters.endDate) params.endDate = appliedFilters.endDate;
    if (appliedFilters.testSetId) params.testSetId = parseInt(appliedFilters.testSetId, 10);
    if (appliedFilters.environment) params.environment = appliedFilters.environment;

    return params;
  }, [releaseIdNum, page, pageSize, appliedFilters]);

  // Fetch filter options
  const { data: filterOptionsResponse, isLoading: isFilterOptionsLoading } = useQuery({
    queryKey: queryKeys.testRuns.filterOptions(releaseIdNum),
    queryFn: () => testRunsApi.getFilterOptions(releaseIdNum),
    enabled: !!releaseIdNum,
    staleTime: 60 * 1000,
  });

  const filterOptions = filterOptionsResponse?.data || null;

  // Fetch test runs with pagination and filters
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TestRunsResponse, Error>({
    queryKey: queryKeys.testRuns.list(releaseIdNum, queryParams),
    queryFn: async () => {
      const res = await testRunsApi.list(queryParams);
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

  // Open report modal for a specific run
  const openReportModal = useCallback((run: TestRun) => {
    setReportRun(run);
    setIsReportModalOpen(true);
  }, []);

  // Close report modal
  const closeReportModal = useCallback(() => {
    setReportRun(null);
    setIsReportModalOpen(false);
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

  // Filter handlers
  const updateFilter = useCallback((key: keyof TestRunFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
    setPage(1); // Reset to first page when applying filters
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
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

    // Filters
    filters,
    appliedFilters,
    filterOptions,
    isFilterOptionsLoading,
    updateFilter,
    applyFilters,
    resetFilters,

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

    // Detail Modal state
    selectedRun,
    isDetailModalOpen,
    openDetailModal,
    closeDetailModal,

    // Report Modal state
    reportRun,
    isReportModalOpen,
    openReportModal,
    closeReportModal,

    // Actions
    refetch,
  };
}

export default useTestRunsPage;
