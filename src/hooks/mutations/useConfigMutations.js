/**
 * TanStack Query mutation hooks for configuration
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi, selectConfigsApi, matchConfigsApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Bulk update types configuration
 */
export function useUpdateTypes(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options) => configApi.bulkUpdateTypes(releaseId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.types(releaseId) });
    },
  });
}

/**
 * Create a new type
 */
export function useCreateType(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => configApi.createType(releaseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.types(releaseId) });
    },
  });
}

/**
 * Create a new action
 */
export function useCreateAction(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => configApi.createAction(releaseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.actions(releaseId) });
    },
  });
}

/**
 * Delete a config item
 */
export function useDeleteConfig(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => configApi.delete(releaseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config.all(releaseId) });
    },
  });
}

/**
 * Create a select config
 */
export function useCreateSelectConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => selectConfigsApi.create(data),
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
    mutationFn: ({ id, data }) => selectConfigsApi.update(id, data),
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
    mutationFn: (id) => selectConfigsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.list() });
    },
  });
}

/**
 * Save select config (create or update) with optimistic update
 */
export function useSaveSelectConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedId, name, options, configType }) => {
      if (selectedId) {
        await selectConfigsApi.update(selectedId, { name, options });
        return { id: Number(selectedId), name, options, config_type: configType };
      } else {
        const res = await selectConfigsApi.create({ name, options, config_type: configType });
        return { id: res.data.id, name, options, config_type: configType };
      }
    },
    onMutate: async ({ selectedId, name, options, configType }) => {
      const queryKey = queryKeys.selectConfigs.list();
      await queryClient.cancelQueries({ queryKey });
      const previousConfigs = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        if (selectedId) {
          // Update existing
          return old.map(c => c.id === Number(selectedId) ? { ...c, name, options } : c);
        } else {
          // Add new with temp id (will be replaced on success)
          return [...old, { id: `temp-${Date.now()}`, name, options, config_type: configType }];
        }
      });

      return { previousConfigs };
    },
    onError: (err, variables, context) => {
      if (context?.previousConfigs) {
        queryClient.setQueryData(queryKeys.selectConfigs.list(), context.previousConfigs);
      }
    },
    onSuccess: (newConfig) => {
      // Replace any temp config with the real one
      queryClient.setQueryData(queryKeys.selectConfigs.list(), (old) => {
        if (!old) return [newConfig];
        const filtered = old.filter(c => !String(c.id).startsWith('temp') && c.id !== newConfig.id);
        return [...filtered, newConfig];
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
    mutationFn: (data) => matchConfigsApi.create(data),
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
    mutationFn: ({ id, data }) => matchConfigsApi.update(id, data),
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
    mutationFn: (id) => matchConfigsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.list() });
    },
  });
}

/**
 * Save match config (create or update) with optimistic update
 */
export function useSaveMatchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedId, name, options }) => {
      if (selectedId) {
        await matchConfigsApi.update(selectedId, { name, options });
        return { id: Number(selectedId), name, options };
      } else {
        const res = await matchConfigsApi.create({ name, options });
        return { id: res.data.id, name, options };
      }
    },
    onMutate: async ({ selectedId, name, options }) => {
      const queryKey = queryKeys.matchConfigs.list();
      await queryClient.cancelQueries({ queryKey });
      const previousConfigs = queryClient.getQueryData(queryKey);

      // Optimistically update
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        if (selectedId) {
          return old.map(c => c.id === Number(selectedId) ? { ...c, name, options } : c);
        } else {
          return [...old, { id: `temp-${Date.now()}`, name, options }];
        }
      });

      return { previousConfigs };
    },
    onError: (err, variables, context) => {
      if (context?.previousConfigs) {
        queryClient.setQueryData(queryKeys.matchConfigs.list(), context.previousConfigs);
      }
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData(queryKeys.matchConfigs.list(), (old) => {
        if (!old) return [newConfig];
        const filtered = old.filter(c => !String(c.id).startsWith('temp') && c.id !== newConfig.id);
        return [...filtered, newConfig];
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
