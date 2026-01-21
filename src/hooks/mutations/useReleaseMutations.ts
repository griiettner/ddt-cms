/**
 * TanStack Query mutation hooks for releases
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { releasesApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateReleaseData, UpdateReleaseData } from '@/types/api';

/**
 * Create a new release
 */
export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReleaseData) => releasesApi.create(data),
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
    mutationFn: ({ id, data }: { id: number; data: UpdateReleaseData }) =>
      releasesApi.update(id, data),
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
    mutationFn: (id: number) => releasesApi.delete(id),
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
    mutationFn: (id: number) => releasesApi.close(id),
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
    mutationFn: (id: number) => releasesApi.reopen(id),
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
    mutationFn: (id: number) => releasesApi.archive(id),
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
