/**
 * TanStack Query mutation hooks for reusable cases
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reusableCasesApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type {
  CreateReusableCaseData,
  UpdateReusableCaseData,
  CreateFromCaseData,
} from '@/types/api';

/**
 * Create a new reusable case
 */
export function useCreateReusableCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReusableCaseData) => reusableCasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
    },
  });
}

/**
 * Update a reusable case
 */
export function useUpdateReusableCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateReusableCaseData }) =>
      reusableCasesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.detail(id) });
    },
  });
}

/**
 * Delete a reusable case
 */
export function useDeleteReusableCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => reusableCasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
    },
  });
}

interface CopyReusableCaseParams {
  reusableCaseId: number;
  releaseId: number;
  testSetId: number;
}

/**
 * Copy a reusable case to a test set
 */
export function useCopyReusableCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reusableCaseId, releaseId, testSetId }: CopyReusableCaseParams) =>
      reusableCasesApi.copyTo(reusableCaseId, { releaseId, testSetId }),
    onSuccess: (_, { releaseId, testSetId }) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', releaseId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.testCases.all(releaseId) });
      if (testSetId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.scenarios.all(releaseId, testSetId),
        });
      }
    },
  });
}

/**
 * Create a reusable case from an existing test case
 */
export function useCreateReusableCaseFromCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFromCaseData) => reusableCasesApi.createFromCase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
    },
  });
}

export default {
  useCreateReusableCase,
  useUpdateReusableCase,
  useDeleteReusableCase,
  useCopyReusableCase,
  useCreateReusableCaseFromCase,
};
