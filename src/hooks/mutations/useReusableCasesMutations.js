/**
 * TanStack Query mutation hooks for reusable cases
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reusableCasesApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Create a new reusable case
 */
export function useCreateReusableCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => reusableCasesApi.create(data),
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
    mutationFn: ({ id, data }) => reusableCasesApi.update(id, data),
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
    mutationFn: (id) => reusableCasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reusableCases.all });
    },
  });
}

/**
 * Copy a reusable case to a test set
 */
export function useCopyReusableCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reusableCaseId, releaseId, testSetId }) =>
      reusableCasesApi.copyTo(reusableCaseId, { releaseId, testSetId }),
    onSuccess: (_, { releaseId, testSetId }) => {
      // Invalidate scenarios/cases queries for this release and test set
      // Use partial key match to invalidate all scenarios queries for this release
      queryClient.invalidateQueries({ queryKey: ['scenarios', releaseId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.testCases.all(releaseId) });
      // Also invalidate the specific test set's scenarios
      if (testSetId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.scenarios.all(releaseId, testSetId) });
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
    mutationFn: (data) => reusableCasesApi.createFromCase(data),
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
