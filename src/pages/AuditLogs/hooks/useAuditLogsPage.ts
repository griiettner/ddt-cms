/**
 * Audit Logs Page Hook
 * Manages all data and logic for the Audit Logs page
 */
import { useState, useMemo } from 'react';
import { useAuditLogsQuery, useAuditLogsFiltersQuery } from '@/hooks/queries/useAuditLogsQuery';
import type { AuditLogsListParams } from '@/services/api';

export interface AuditLogsFilters {
  user_eid: string;
  action: string;
  resource_type: string;
  release_id: string;
  search: string;
  start_date: string;
  end_date: string;
}

const initialFilters: AuditLogsFilters = {
  user_eid: '',
  action: '',
  resource_type: '',
  release_id: '',
  search: '',
  start_date: '',
  end_date: '',
};

export function useAuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogsFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const limit = 50;

  // Build query params
  const queryParams = useMemo<AuditLogsListParams>(() => {
    const params: AuditLogsListParams = { page, limit };
    if (filters.user_eid) params.user_eid = filters.user_eid;
    if (filters.action) params.action = filters.action;
    if (filters.resource_type) params.resource_type = filters.resource_type;
    if (filters.release_id) params.release_id = filters.release_id;
    if (filters.search) params.search = filters.search;
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;
    return params;
  }, [filters, page, limit]);

  // Queries
  const { data: logsResponse, isLoading: isLoadingLogs } = useAuditLogsQuery(queryParams);
  const { data: filterOptions, isLoading: isLoadingFilters } = useAuditLogsFiltersQuery();

  // Handlers
  const updateFilter = (key: keyof AuditLogsFilters, value: string): void => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = (): void => {
    setFilters(initialFilters);
    setPage(1);
  };

  const goToPage = (newPage: number): void => {
    setPage(newPage);
  };

  // Computed values
  const logs = logsResponse?.data ?? [];
  const pagination = logsResponse?.pagination ?? { total: 0, page: 1, limit: 50, pages: 0 };
  const isLoading = isLoadingLogs || isLoadingFilters;

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return {
    // Data
    logs,
    pagination,
    filterOptions,
    isLoading,

    // Filter state
    filters,
    hasActiveFilters,

    // Actions
    updateFilter,
    clearFilters,
    goToPage,
  };
}

export default useAuditLogsPage;
