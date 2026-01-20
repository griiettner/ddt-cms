/**
 * TanStack Query mutation hooks for releases
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { releasesApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Create a new release
 */
export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => releasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
    },
  });
}

/**
 * Update a release
 */
export function useUpdateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => releasesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.detail(id) });
    },
  });
}

/**
 * Delete a release
 */
export function useDeleteRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => releasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
    },
  });
}

/**
 * Close a release
 */
export function useCloseRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => releasesApi.close(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.detail(id) });
    },
  });
}

/**
 * Reopen a release
 */
export function useReopenRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => releasesApi.reopen(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.detail(id) });
    },
  });
}

/**
 * Archive a release
 */
export function useArchiveRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => releasesApi.archive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.releases.detail(id) });
    },
  });
}

export default {
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
  useCloseRelease,
  useReopenRelease,
  useArchiveRelease,
};
