/**
 * TanStack Query mutation hooks for test sets
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { testSetsApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateTestSetData, UpdateTestSetData } from '@/types/api';

/**
 * Create a new test set
 */
export function useCreateTestSet(releaseId: number | string) {
  const queryClient = useQueryClient();
  const id = Number(releaseId);

  return useMutation({
    mutationFn: (data: CreateTestSetData) => testSetsApi.create(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.all(id) });
    },
  });
}

/**
 * Update a test set
 */
export function useUpdateTestSet(releaseId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTestSetData }) =>
      testSetsApi.update(relId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.all(relId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.detail(relId, id) });
    },
  });
}

/**
 * Delete a test set
 */
export function useDeleteTestSet(releaseId: number | string) {
  const queryClient = useQueryClient();
  const relId = Number(releaseId);

  return useMutation({
    mutationFn: (id: number) => testSetsApi.delete(relId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testSets.all(relId) });
    },
  });
}

export default {
  useCreateTestSet,
  useUpdateTestSet,
  useDeleteTestSet,
};
