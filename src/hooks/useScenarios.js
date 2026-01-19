import { useState, useCallback, useMemo } from 'react';
import { testCasesApi, testSetsApi } from '../services/api';

/**
 * Custom hook to manage scenarios and test cases
 */
export function useScenarios(releaseId, testSetId) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [testSetName, setTestSetName] = useState('Loading...');
  const [openCases, setOpenCases] = useState(new Set());
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * Load test set info
   */
  const loadTestSetInfo = useCallback(async () => {
    if (!releaseId || !testSetId) return;
    try {
      const res = await testSetsApi.get(releaseId, testSetId);
      setTestSetName(res.data.name);
    } catch (err) {
      console.error('Failed to load test set info', err);
    }
  }, [releaseId, testSetId]);

  /**
   * Load all scenarios for the test set
   */
  const loadScenarios = useCallback(async () => {
    if (!releaseId || !testSetId) return;
    setLoading(true);
    try {
      const res = await testCasesApi.getAllScenarios(releaseId, { testSetId });
      setScenarios(res.data);
      return res.data;
    } catch (err) {
      console.error('Failed to load scenarios', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [releaseId, testSetId]);

  /**
   * Select a scenario
   */
  const selectScenario = useCallback((id) => {
    setSelectedScenarioId(id);
    // Auto-open the case containing this scenario
    const scenario = scenarios.find(s => s.id === id);
    if (scenario) {
      setOpenCases(prev => new Set([...prev, scenario.case_name]));
    }
  }, [scenarios]);

  /**
   * Toggle a case accordion
   */
  const toggleCase = useCallback((caseName) => {
    setOpenCases(prev => {
      const next = new Set(prev);
      if (next.has(caseName)) {
        next.delete(caseName);
      } else {
        next.add(caseName);
      }
      return next;
    });
  }, []);

  /**
   * Create a new test case
   */
  const createCase = useCallback(async (name) => {
    try {
      const res = await testCasesApi.create(releaseId, { testSetId, name });
      await loadScenarios();
      return res.data;
    } catch (err) {
      throw err;
    }
  }, [releaseId, testSetId, loadScenarios]);

  /**
   * Load test cases for the scenario modal
   */
  const loadTestCases = useCallback(async () => {
    try {
      const res = await testCasesApi.list(releaseId, { testSetId });
      setTestCases(res.data);
      return res.data;
    } catch (err) {
      throw err;
    }
  }, [releaseId, testSetId]);

  /**
   * Create a new scenario
   */
  const createScenario = useCallback(async (testCaseId, name) => {
    try {
      const res = await testCasesApi.createScenario(releaseId, { testCaseId, name });
      await loadScenarios();
      return res.data;
    } catch (err) {
      throw err;
    }
  }, [releaseId, loadScenarios]);

  /**
   * Delete a scenario
   */
  const deleteScenario = useCallback(async (scenarioId) => {
    try {
      await testCasesApi.deleteScenario(releaseId, scenarioId);
      const remaining = await loadScenarios();
      
      // Auto-select another scenario
      if (remaining.length > 0 && scenarioId === selectedScenarioId) {
        const filtered = remaining.filter(s => s.id !== scenarioId);
        if (filtered.length > 0) {
          selectScenario(filtered[0].id);
        } else {
          setSelectedScenarioId(null);
        }
      } else if (remaining.length === 0) {
        setSelectedScenarioId(null);
      }
    } catch (err) {
      throw err;
    }
  }, [releaseId, loadScenarios, selectedScenarioId, selectScenario]);

  /**
   * Update a scenario's name
   */
  const updateScenarioName = useCallback(async (scenarioId, name) => {
    try {
      await testCasesApi.updateScenario(releaseId, scenarioId, { name });
      setScenarios(prev => prev.map(s => 
        s.id === scenarioId ? { ...s, name } : s
      ));
    } catch (err) {
      throw err;
    }
  }, [releaseId]);

  /**
   * Get the selected scenario object
   */
  const selectedScenario = useMemo(() => {
    return scenarios.find(s => s.id === selectedScenarioId);
  }, [scenarios, selectedScenarioId]);

  /**
   * Group scenarios by case name
   */
  const groupedScenarios = useMemo(() => {
    const groups = {};
    scenarios.forEach(s => {
      if (!groups[s.case_name]) groups[s.case_name] = [];
      groups[s.case_name].push(s);
    });
    return groups;
  }, [scenarios]);

  return {
    scenarios,
    selectedScenarioId,
    selectedScenario,
    testSetName,
    openCases,
    testCases,
    loading,
    groupedScenarios,
    loadTestSetInfo,
    loadScenarios,
    selectScenario,
    toggleCase,
    createCase,
    loadTestCases,
    createScenario,
    deleteScenario,
    updateScenarioName,
    setSelectedScenarioId,
  };
}

export default useScenarios;
