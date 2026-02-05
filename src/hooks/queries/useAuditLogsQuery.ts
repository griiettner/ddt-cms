/**
 * Audit Logs Query Hooks
 * Provides data fetching for audit log entries
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { auditLogsApi, type AuditLogsListParams } from '@/services/api';
import type { AuditLog, AuditLogFilters } from '@/types/entities';
import type { Pagination } from '@/types/api';

interface AuditLogsListResponse {
  data: AuditLog[];
  pagination: Pagination;
}

interface AuditLogsFiltersResponse {
  data: AuditLogFilters;
}

export function useAuditLogsQuery(params: AuditLogsListParams = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(params as Record<string, unknown>, params.page),
    queryFn: async () => {
      const response = (await auditLogsApi.list(params)) as unknown as AuditLogsListResponse;
      return response;
    },
  });
}

export function useAuditLogsFiltersQuery() {
  return useQuery({
    queryKey: queryKeys.auditLogs.filters(),
    queryFn: async () => {
      const response = (await auditLogsApi.getFilters()) as unknown as AuditLogsFiltersResponse;
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - filter options don't change often
  });
}

export default useAuditLogsQuery;
