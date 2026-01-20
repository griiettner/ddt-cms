/**
 * TanStack Query mutation hooks for test sets
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testSetsApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Create a new test set
 */
export function useCreateTestSet(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => testSetsApi.create(releaseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.all(releaseId) });
    },
  });
}

/**
 * Update a test set
 */
export function useUpdateTestSet(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => testSetsApi.update(releaseId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.all(releaseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.detail(releaseId, id) });
    },
  });
}

/**
 * Delete a test set
 */
export function useDeleteTestSet(releaseId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => testSetsApi.delete(releaseId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.all(releaseId) });
    },
  });
}

export default {
  useCreateTestSet,
  useUpdateTestSet,
  useDeleteTestSet,
};
