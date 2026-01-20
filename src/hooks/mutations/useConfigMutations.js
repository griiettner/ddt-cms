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
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.all });
    },
  });
}

/**
 * Save select config (create or update)
 */
export function useSaveSelectConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedId, name, options, configType }) => {
      if (selectedId) {
        await selectConfigsApi.update(selectedId, { name, options });
        return selectedId;
      } else {
        const res = await selectConfigsApi.create({ name, options, config_type: configType });
        return res.data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.selectConfigs.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.all });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.all });
    },
  });
}

/**
 * Save match config (create or update)
 */
export function useSaveMatchConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ selectedId, name, options }) => {
      if (selectedId) {
        await matchConfigsApi.update(selectedId, { name, options });
        return selectedId;
      } else {
        const res = await matchConfigsApi.create({ name, options });
        return res.data.id;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.matchConfigs.all });
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
