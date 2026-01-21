/**
 * TanStack Query hook for categories
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';
import type { Category, FlatCategory } from '@/types/entities';
import type { CreateCategoryData, UpdateCategoryData } from '@/types/api';

interface CategoriesData {
  data: Category[];
  tree?: Category[];
}

/**
 * Fetch all categories as a tree structure
 */
export function useCategoriesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: async (): Promise<CategoriesData> => {
      const res = await categoriesApi.list();
      return {
        data: res.data ?? [],
        tree: (res as unknown as { tree?: Category[] }).tree,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    enabled,
  });
}

/**
 * Fetch all categories flat (for dropdowns)
 * The backend already provides displayName with proper indentation
 */
export function useCategoriesFlatQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.categories.flat(),
    queryFn: async (): Promise<FlatCategory[]> => {
      const res = await categoriesApi.listFlat();
      return (res.data ?? []) as FlatCategory[];
    },
    staleTime: 60 * 1000,
    enabled,
  });
}

/**
 * Fetch a single category by ID
 */
export function useCategoryQuery(id: number | undefined | null) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id ?? 0),
    queryFn: async (): Promise<Category> => {
      if (!id) throw new Error('Category ID is required');
      const res = await categoriesApi.get(id);
      if (!res.data) throw new Error('Category not found');
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
    mutationFn: (data: CreateCategoryData) => categoriesApi.create(data),
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
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryData }) =>
      categoriesApi.update(id, data),
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
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export default useCategoriesQuery;
