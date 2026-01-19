import { useState, useCallback } from 'react';
import { configApi, selectConfigsApi, matchConfigsApi } from '../services/api';

/**
 * Custom hook to manage configuration data
 */
export function useConfig(releaseId) {
  const [config, setConfig] = useState({ types: [], actions: [] });
  const [selectConfigs, setSelectConfigs] = useState([]);
  const [matchConfigs, setMatchConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Load all configuration data
   */
  const loadConfig = useCallback(async () => {
    if (!releaseId) return;
    setLoading(true);
    try {
      const [typesRes, actionsRes, selectRes, matchRes] = await Promise.all([
        configApi.getTypes(releaseId),
        configApi.getActions(releaseId),
        selectConfigsApi.list(),
        matchConfigsApi.list(),
      ]);
      setConfig({ types: typesRes.data, actions: actionsRes.data });
      setSelectConfigs(selectRes.data);
      setMatchConfigs(matchRes.data);
    } catch (err) {
      console.error('Failed to load config', err);
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  /**
   * Update types configuration
   */
  const updateTypes = useCallback(async (options) => {
    try {
      await configApi.bulkUpdateTypes(releaseId, options);
      await loadConfig();
    } catch (err) {
      throw err;
    }
  }, [releaseId, loadConfig]);

  /**
   * Create or update a select config and associate with step
   */
  const saveSelectConfig = useCallback(async ({ stepId, selectedId, name, options, configType }) => {
    try {
      let configId = selectedId;

      if (selectedId) {
        await selectConfigsApi.update(selectedId, { name, options });
      } else {
        const res = await selectConfigsApi.create({ name, options, config_type: configType });
        configId = res.data.id;
      }

      // Reload select configs
      const selectRes = await selectConfigsApi.list();
      setSelectConfigs(selectRes.data);

      return configId;
    } catch (err) {
      throw err;
    }
  }, []);

  /**
   * Create or update a match config
   */
  const saveMatchConfig = useCallback(async ({ selectedId, name, options }) => {
    try {
      let configId = selectedId;

      if (selectedId) {
        await matchConfigsApi.update(selectedId, { name, options });
      } else {
        const res = await matchConfigsApi.create({ name, options });
        configId = res.data.id;
      }

      // Reload match configs
      const matchRes = await matchConfigsApi.list();
      setMatchConfigs(matchRes.data);

      return configId;
    } catch (err) {
      throw err;
    }
  }, []);

  /**
   * Get a select config by ID
   */
  const getSelectConfig = useCallback((id) => {
    return selectConfigs.find(c => c.id === id);
  }, [selectConfigs]);

  /**
   * Get a match config by ID
   */
  const getMatchConfig = useCallback((id) => {
    return matchConfigs.find(c => c.id === id);
  }, [matchConfigs]);

  /**
   * Get select configs filtered by type
   */
  const getSelectConfigsByType = useCallback((configType) => {
    return selectConfigs.filter(c => c.config_type === configType);
  }, [selectConfigs]);

  /**
   * Hardcoded action options
   */
  const actionOptions = [
    { key: 'active', label: 'Active' },
    { key: 'click', label: 'Click' },
    { key: 'custom_select', label: 'Custom Select' },
    { key: 'options_match', label: 'Options Match' },
    { key: 'text_match', label: 'Text Match' },
    { key: 'text_plain', label: 'Text Plain' },
    { key: 'url', label: 'URL' },
    { key: 'visible', label: 'Visible' },
  ];

  return {
    config,
    selectConfigs,
    matchConfigs,
    loading,
    actionOptions,
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
