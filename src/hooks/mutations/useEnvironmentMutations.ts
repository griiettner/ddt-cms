/**
 * TanStack Query mutations for environment configurations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { environmentsApi, testExecutionApi, type EnvironmentConfig } from '@/services/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Save (create or update) an environment configuration
 */
export function useSaveEnvironment(releaseId: number | string | undefined | null) {
  const queryClient = useQueryClient();
  const id = releaseId ? String(releaseId) : '0';

  return useMutation({
    mutationFn: async (data: { environment: string; url: string }): Promise<EnvironmentConfig> => {
      const res = await environmentsApi.save(id, data);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to save environment');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.list(id) });
    },
  });
}

/**
 * Delete an environment configuration
 */
export function useDeleteEnvironment(releaseId: number | string | undefined | null) {
  const queryClient = useQueryClient();
  const id = releaseId ? String(releaseId) : '0';

  return useMutation({
    mutationFn: async (environment: string): Promise<void> => {
      const res = await environmentsApi.delete(id, environment);
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete environment');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.environments.list(id) });
    },
  });
}

/**
 * Execute a Playwright test run
 */
export function useExecuteTestRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      testSetId: number;
      releaseId: number;
      environment: string;
    }): Promise<{ testRunId: number; status: 'queued' | 'running'; queuePosition?: number }> => {
      const res = await testExecutionApi.execute(params.testSetId, {
        releaseId: params.releaseId,
        environment: params.environment,
      });
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to start test execution');
      }
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testRuns.list(variables.releaseId) });
    },
  });
}

export default useSaveEnvironment;
