/**
 * TanStack Query hook for categories
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

/**
 * Fetch all categories as a tree structure
 * Returns { data: [], tree: [] }
 * @param {boolean} enabled - Whether to fetch (default: true)
 */
export function useCategoriesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: async () => {
      const res = await categoriesApi.list();
      return {
        data: res.data,
        tree: res.tree,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
}

/**
 * Fetch all categories flat (for dropdowns)
 * Returns { data: [] } with displayName for each category
 * @param {boolean} enabled - Whether to fetch (default: true)
 */
export function useCategoriesFlatQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.flat(),
    queryFn: async () => {
      const res = await categoriesApi.listFlat();
      return res.data;
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
}

/**
 * Fetch a single category by ID
 */
export function useCategoryQuery(id) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: async () => {
      const res = await categoriesApi.get(id);
      return res.data;
    },
    enabled: !!id,
  });
}

/**
 * Mutation hook for creating a category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Mutation hook for updating a category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Mutation hook for deleting a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export default useCategoriesQuery;
