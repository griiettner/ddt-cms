import { useState, useCallback } from 'react';
import { configApi, selectConfigsApi, matchConfigsApi } from '@/services/api';
import type { ConfigOption, SelectConfig, MatchConfig } from '@/types/entities';
import { ACTION_TYPES } from '@/utils/constants';

interface Config {
  types: ConfigOption[];
  actions: ConfigOption[];
}

interface SaveSelectConfigParams {
  stepId?: number | string;
  selectedId?: number | string | null;
  name: string;
  options: string[];
  configType?: string;
}

interface SaveMatchConfigParams {
  selectedId?: number | string | null;
  name: string;
  options: string[];
}

/**
 * Custom hook to manage configuration data
 */
export function useConfig(releaseId: number | string | undefined | null) {
  const [config, setConfig] = useState<Config>({ types: [], actions: [] });
  const [selectConfigs, setSelectConfigs] = useState<SelectConfig[]>([]);
  const [matchConfigs, setMatchConfigs] = useState<MatchConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const id = releaseId ? Number(releaseId) : 0;

  /**
   * Load all configuration data
   */
  const loadConfig = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [typesRes, actionsRes, selectRes, matchRes] = await Promise.all([
        configApi.getTypes(id),
        configApi.getActions(id),
        selectConfigsApi.list(),
        matchConfigsApi.list(),
      ]);
      setConfig({ types: typesRes.data ?? [], actions: actionsRes.data ?? [] });
      setSelectConfigs(selectRes.data ?? []);
      setMatchConfigs(matchRes.data ?? []);
    } catch (err) {
      console.error('Failed to load config', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  /**
   * Update types configuration
   */
  const updateTypes = useCallback(
    async (options: ConfigOption[]) => {
      const configData = options.map((opt) => ({
        key: opt.key,
        display_name: opt.display_name,
        result_type: opt.result_type ?? undefined,
        default_value: opt.default_value ?? undefined,
        config_data: opt.config_data ?? undefined,
      }));
      await configApi.bulkUpdateTypes(id, configData);
      await loadConfig();
    },
    [id, loadConfig]
  );

  /**
   * Create or update a select config and associate with step
   */
  const saveSelectConfig = useCallback(
    async ({ selectedId, name, options, configType }: SaveSelectConfigParams): Promise<number> => {
      let configId = selectedId ? Number(selectedId) : 0;

      if (selectedId) {
        await selectConfigsApi.update(Number(selectedId), { name, options });
      } else {
        const res = await selectConfigsApi.create({
          name,
          options,
          config_type: configType,
        });
        configId = (res.data as { id: number }).id;
      }

      // Reload select configs
      const selectRes = await selectConfigsApi.list();
      setSelectConfigs(selectRes.data ?? []);

      return configId;
    },
    []
  );

  /**
   * Create or update a match config
   */
  const saveMatchConfig = useCallback(
    async ({ selectedId, name, options }: SaveMatchConfigParams): Promise<number> => {
      let configId = selectedId ? Number(selectedId) : 0;

      if (selectedId) {
        await matchConfigsApi.update(Number(selectedId), { name, options });
      } else {
        const res = await matchConfigsApi.create({ name, options });
        configId = (res.data as { id: number }).id;
      }

      // Reload match configs
      const matchRes = await matchConfigsApi.list();
      setMatchConfigs(matchRes.data ?? []);

      return configId;
    },
    []
  );

  /**
   * Get a select config by ID
   */
  const getSelectConfig = useCallback(
    (configId: number | string | undefined | null): SelectConfig | undefined => {
      if (!configId) return undefined;
      return selectConfigs.find((c) => c.id === Number(configId));
    },
    [selectConfigs]
  );

  /**
   * Get a match config by ID
   */
  const getMatchConfig = useCallback(
    (configId: number | string | undefined | null): MatchConfig | undefined => {
      if (!configId) return undefined;
      return matchConfigs.find((c) => c.id === Number(configId));
    },
    [matchConfigs]
  );

  /**
   * Get select configs filtered by type
   */
  const getSelectConfigsByType = useCallback(
    (configType: string): SelectConfig[] => {
      return selectConfigs.filter((c) => c.config_type === configType);
    },
    [selectConfigs]
  );

  return {
    config,
    selectConfigs,
    matchConfigs,
    loading,
    actionOptions: ACTION_TYPES,
    loadConfig,
    updateTypes,
    saveSelectConfig,
    saveMatchConfig,
    getSelectConfig,
    getMatchConfig,
    getSelectConfigsByType,
  };
}

export default useConfig;
