/**
 * TanStack Query mutation hooks for configuration
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, selectConfigsApi, matchConfigsApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateConfigData, CreateSelectConfigData, CreateMatchConfigData } from '@/types/api';
import type { SelectConfig, MatchConfig } from '@/types/entities';

/**
 * Bulk update types configuration
 */
export function useUpdateTypes(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (options: CreateConfigData[]) => configApi.bulkUpdateTypes(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.types(id) });
    },
  });
}

/**
 * Create a new type
 */
export function useCreateType(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (data: CreateConfigData) => configApi.createType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.types(id) });
    },
  });
}

/**
 * Create a new action
 */
export function useCreateAction(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (data: CreateConfigData) => configApi.createAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.actions(id) });
    },
  });
}

/**
 * Delete a config item
 */
export function useDeleteConfig(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (configId: number) => configApi.delete(id, configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.all(id) });
    },
  });
}

/**
 * Create a select config
 */
export function useCreateSelectConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSelectConfigData) => selectConfigsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.list() });
    },
  });
}

/**
 * Update a select config
 */
export function useUpdateSelectConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSelectConfigData> }) =>
      selectConfigsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.list() });
    },
  });
}

/**
 * Delete a select config
 */
export function useDeleteSelectConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => selectConfigsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.list() });
    },
  });
}

interface SaveSelectConfigParams {
  selectedId?: number | string | null;
  name: string;
  options: string[];
  configType?: string;
}

/**
 * Save select config (create or update) with optimistic update
 */
export function useSaveSelectConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedId, name, options, configType }: SaveSelectConfigParams) => {
      if (selectedId) {
        await selectConfigsApi.update(Number(selectedId), { name, options });
        return {
          id: Number(selectedId),
          name,
          options: JSON.stringify(options),
          config_type: configType || 'custom_select',
        };
      } else {
        const res = await selectConfigsApi.create({ name, options, config_type: configType });
        return {
          id: (res.data as { id: number }).id,
          name,
          options: JSON.stringify(options),
          config_type: configType || 'custom_select',
        };
      }
    },
    onMutate: async ({ selectedId, name, options, configType }) => {
      const queryKey = queryKeys.selectConfigs.list();
      await queryClient.cancelQueries({ queryKey });
      const previousConfigs = queryClient.getQueryData<SelectConfig[]>(queryKey);

      queryClient.setQueryData<SelectConfig[]>(queryKey, (old) => {
        if (!old) return old;
        if (selectedId) {
          return old.map((c) =>
            c.id === Number(selectedId) ? { ...c, name, options: JSON.stringify(options) } : c
          );
        } else {
          return [
            ...old,
            {
              id: Date.now(),
              name,
              options: JSON.stringify(options),
              config_type: configType || 'custom_select',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as SelectConfig,
          ];
        }
      });

      return { previousConfigs };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousConfigs) {
        queryClient.setQueryData(queryKeys.selectConfigs.list(), context.previousConfigs);
      }
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData<SelectConfig[]>(queryKeys.selectConfigs.list(), (old) => {
        if (!old) return [newConfig as SelectConfig];
        const filtered = old.filter((c) => c.id !== newConfig.id);
        return [...filtered, newConfig as SelectConfig];
      });
    },
  });
}

/**
 * Create a match config
 */
export function useCreateMatchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMatchConfigData) => matchConfigsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.list() });
    },
  });
}

/**
 * Update a match config
 */
export function useUpdateMatchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateMatchConfigData> }) =>
      matchConfigsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.list() });
    },
  });
}

/**
 * Delete a match config
 */
export function useDeleteMatchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => matchConfigsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.list() });
    },
  });
}

interface SaveMatchConfigParams {
  selectedId?: number | string | null;
  name: string;
  options: string[];
}

/**
 * Save match config (create or update) with optimistic update
 */
export function useSaveMatchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedId, name, options }: SaveMatchConfigParams) => {
      if (selectedId) {
        await matchConfigsApi.update(Number(selectedId), { name, options });
        return { id: Number(selectedId), name, options: JSON.stringify(options) };
      } else {
        const res = await matchConfigsApi.create({ name, options });
        return { id: (res.data as { id: number }).id, name, options: JSON.stringify(options) };
      }
    },
    onMutate: async ({ selectedId, name, options }) => {
      const queryKey = queryKeys.matchConfigs.list();
      await queryClient.cancelQueries({ queryKey });
      const previousConfigs = queryClient.getQueryData<MatchConfig[]>(queryKey);

      queryClient.setQueryData<MatchConfig[]>(queryKey, (old) => {
        if (!old) return old;
        if (selectedId) {
          return old.map((c) =>
            c.id === Number(selectedId) ? { ...c, name, options: JSON.stringify(options) } : c
          );
        } else {
          return [
            ...old,
            {
              id: Date.now(),
              name,
              options: JSON.stringify(options),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as MatchConfig,
          ];
        }
      });

      return { previousConfigs };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousConfigs) {
        queryClient.setQueryData(queryKeys.matchConfigs.list(), context.previousConfigs);
      }
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData<MatchConfig[]>(queryKeys.matchConfigs.list(), (old) => {
        if (!old) return [newConfig as MatchConfig];
        const filtered = old.filter((c) => c.id !== newConfig.id);
        return [...filtered, newConfig as MatchConfig];
      });
    },
  });
}

export default {
  useUpdateTypes,
  useCreateType,
  useCreateAction,
  useDeleteConfig,
  useCreateSelectConfig,
  useUpdateSelectConfig,
  useDeleteSelectConfig,
  useSaveSelectConfig,
  useCreateMatchConfig,
  useUpdateMatchConfig,
  useDeleteMatchConfig,
  useSaveMatchConfig,
};
