/**
 * TanStack Query hooks for configuration data
 */
import { useQuery } from '@tanstack/react-query';
import { configApi, selectConfigsApi, matchConfigsApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { ConfigOption, SelectConfig, MatchConfig } from '@/types/entities';
import { ACTION_TYPES } from '@/utils/constants';

/**
 * Fetch types configuration for a release
 */
export function useTypesQuery(releaseId: number | string | undefined | null) {
  const id = releaseId ? Number(releaseId) : 0;
  return useQuery({
    queryKey: queryKeys.config.types(id),
    queryFn: async (): Promise<ConfigOption[]> => {
      const res = await configApi.getTypes(id);
      return res.data ?? [];
    },
    enabled: !!releaseId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch actions configuration for a release
 */
export function useActionsQuery(releaseId: number | string | undefined | null) {
  const id = releaseId ? Number(releaseId) : 0;
  return useQuery({
    queryKey: queryKeys.config.actions(id),
    queryFn: async (): Promise<ConfigOption[]> => {
      const res = await configApi.getActions(id);
      return res.data ?? [];
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
    queryFn: async (): Promise<SelectConfig[]> => {
      const res = await selectConfigsApi.list();
      return res.data ?? [];
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
    queryFn: async (): Promise<MatchConfig[]> => {
      const res = await matchConfigsApi.list();
      return res.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

interface AllConfigData {
  config: {
    types: ConfigOption[];
    actions: ConfigOption[];
  };
  selectConfigs: SelectConfig[];
  matchConfigs: MatchConfig[];
  isLoading: boolean;
  isError: boolean;
  actionOptions: typeof ACTION_TYPES;
}

/**
 * Combined hook to fetch all config data at once
 */
export function useAllConfigQuery(releaseId: number | string | undefined | null): AllConfigData {
  const typesQuery = useTypesQuery(releaseId);
  const actionsQuery = useActionsQuery(releaseId);
  const selectConfigsQuery = useSelectConfigsQuery();
  const matchConfigsQuery = useMatchConfigsQuery();

  const isLoading =
    typesQuery.isLoading ||
    actionsQuery.isLoading ||
    selectConfigsQuery.isLoading ||
    matchConfigsQuery.isLoading;
  const isError =
    typesQuery.isError ||
    actionsQuery.isError ||
    selectConfigsQuery.isError ||
    matchConfigsQuery.isError;

  return {
    config: {
      types: typesQuery.data || [],
      actions: actionsQuery.data || [],
    },
    selectConfigs: selectConfigsQuery.data || [],
    matchConfigs: matchConfigsQuery.data || [],
    isLoading,
    isError,
    actionOptions: ACTION_TYPES,
  };
}

export default useAllConfigQuery;
