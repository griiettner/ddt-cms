/**
 * TanStack Query hooks for configuration data
 */
import { useQuery, useQueries } from '@tanstack/react-query';
import { configApi, selectConfigsApi, matchConfigsApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch types configuration for a release
 */
export function useTypesQuery(releaseId) {
  return useQuery({
    queryKey: queryKeys.config.types(releaseId),
    queryFn: async () => {
      const res = await configApi.getTypes(releaseId);
      return res.data;
    },
    enabled: !!releaseId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch actions configuration for a release
 */
export function useActionsQuery(releaseId) {
  return useQuery({
    queryKey: queryKeys.config.actions(releaseId),
    queryFn: async () => {
      const res = await configApi.getActions(releaseId);
      return res.data;
    },
    enabled: !!releaseId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch all select configs (global, not release-specific)
 */
export function useSelectConfigsQuery() {
  return useQuery({
    queryKey: queryKeys.selectConfigs.list(),
    queryFn: async () => {
      const res = await selectConfigsApi.list();
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch all match configs (global, not release-specific)
 */
export function useMatchConfigsQuery() {
  return useQuery({
    queryKey: queryKeys.matchConfigs.list(),
    queryFn: async () => {
      const res = await matchConfigsApi.list();
      return res.data;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Combined hook to fetch all config data at once
 */
export function useAllConfigQuery(releaseId) {
  const typesQuery = useTypesQuery(releaseId);
  const actionsQuery = useActionsQuery(releaseId);
  const selectConfigsQuery = useSelectConfigsQuery();
  const matchConfigsQuery = useMatchConfigsQuery();

  const isLoading = typesQuery.isLoading || actionsQuery.isLoading ||
                    selectConfigsQuery.isLoading || matchConfigsQuery.isLoading;
  const isError = typesQuery.isError || actionsQuery.isError ||
                  selectConfigsQuery.isError || matchConfigsQuery.isError;

  return {
    config: {
      types: typesQuery.data || [],
      actions: actionsQuery.data || [],
    },
    selectConfigs: selectConfigsQuery.data || [],
    matchConfigs: matchConfigsQuery.data || [],
    isLoading,
    isError,
    // Hardcoded action options
    actionOptions: [
      { key: 'active', label: 'Active' },
      { key: 'click', label: 'Click' },
      { key: 'custom_select', label: 'Custom Select' },
      { key: 'options_match', label: 'Options Match' },
      { key: 'text_match', label: 'Text Match' },
      { key: 'text_plain', label: 'Text Plain' },
      { key: 'url', label: 'URL' },
      { key: 'visible', label: 'Visible' },
    ],
  };
}

export default useAllConfigQuery;
