import { useState, useCallback, useMemo } from 'react';
import { testCasesApi, testSetsApi } from '@/services/api';
import type { TestScenario, TestCase } from '@/types/entities';

type GroupedScenarios = Record<string, TestScenario[]>;

interface UseScenarios {
  scenarios: TestScenario[];
  selectedScenarioId: number | null;
  selectedScenario: TestScenario | undefined;
  testSetName: string;
  openCases: Set<string>;
  testCases: TestCase[];
  loading: boolean;
  groupedScenarios: GroupedScenarios;
  loadTestSetInfo: () => Promise<void>;
  loadScenarios: () => Promise<TestScenario[]>;
  selectScenario: (id: number) => void;
  toggleCase: (caseName: string) => void;
  createCase: (name: string) => Promise<unknown>;
  loadTestCases: () => Promise<TestCase[]>;
  createScenario: (testCaseId: number, name: string) => Promise<unknown>;
  deleteScenario: (scenarioId: number) => Promise<void>;
  updateScenarioName: (scenarioId: number, name: string) => Promise<void>;
  setSelectedScenarioId: React.Dispatch<React.SetStateAction<number | null>>;
}

/**
 * Custom hook to manage scenarios and test cases
 */
export function useScenarios(
  releaseId: number | string | undefined | null,
  testSetId: number | string | undefined | null
): UseScenarios {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [testSetName, setTestSetName] = useState('Loading...');
  const [openCases, setOpenCases] = useState<Set<string>>(new Set());
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);

  const relId = releaseId ? Number(releaseId) : 0;
  const tsId = testSetId ? Number(testSetId) : 0;

  /**
   * Load test set info
   */
  const loadTestSetInfo = useCallback(async () => {
    if (!relId || !tsId) return;
    try {
      const res = await testSetsApi.get(relId, tsId);
      setTestSetName(res.data?.name ?? 'Unknown');
    } catch (err) {
      console.error('Failed to load test set info', err);
    }
  }, [relId, tsId]);

  /**
   * Load all scenarios for the test set
   */
  const loadScenarios = useCallback(async (): Promise<TestScenario[]> => {
    if (!relId || !tsId) return [];
    setLoading(true);
    try {
      const res = await testCasesApi.getAllScenarios(relId, { testSetId: tsId });
      const data = res.data ?? [];
      setScenarios(data);
      return data;
    } catch (err) {
      console.error('Failed to load scenarios', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [relId, tsId]);

  /**
   * Select a scenario
   */
  const selectScenario = useCallback(
    (id: number) => {
      setSelectedScenarioId(id);
      // Auto-open the case containing this scenario
      const scenario = scenarios.find((s) => s.id === id);
      if (scenario?.case_name) {
        const caseName = scenario.case_name;
        setOpenCases((prev) => new Set([...prev, caseName]));
      }
    },
    [scenarios]
  );

  /**
   * Toggle a case accordion
   */
  const toggleCase = useCallback((caseName: string) => {
    setOpenCases((prev) => {
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
  const createCase = useCallback(
    async (name: string) => {
      const res = await testCasesApi.create(relId, { testSetId: tsId, name });
      await loadScenarios();
      return res.data;
    },
    [relId, tsId, loadScenarios]
  );

  /**
   * Load test cases for the scenario modal
   */
  const loadTestCases = useCallback(async (): Promise<TestCase[]> => {
    const res = await testCasesApi.list(relId, { testSetId: tsId });
    const data = res.data ?? [];
    setTestCases(data);
    return data;
  }, [relId, tsId]);

  /**
   * Create a new scenario
   */
  const createScenario = useCallback(
    async (testCaseId: number, name: string) => {
      const res = await testCasesApi.createScenario(relId, { testCaseId, name });
      await loadScenarios();
      return res.data;
    },
    [relId, loadScenarios]
  );

  /**
   * Delete a scenario
   */
  const deleteScenario = useCallback(
    async (scenarioId: number) => {
      await testCasesApi.deleteScenario(relId, scenarioId);
      const remaining = await loadScenarios();

      // Auto-select another scenario
      if (remaining.length > 0 && scenarioId === selectedScenarioId) {
        const filtered = remaining.filter((s) => s.id !== scenarioId);
        if (filtered.length > 0) {
          selectScenario(filtered[0].id);
        } else {
          setSelectedScenarioId(null);
        }
      } else if (remaining.length === 0) {
        setSelectedScenarioId(null);
      }
    },
    [relId, loadScenarios, selectedScenarioId, selectScenario]
  );

  /**
   * Update a scenario's name
   */
  const updateScenarioName = useCallback(
    async (scenarioId: number, name: string) => {
      await testCasesApi.updateScenario(relId, scenarioId, { name });
      setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? { ...s, name } : s)));
    },
    [relId]
  );

  /**
   * Get the selected scenario object
   */
  const selectedScenario = useMemo(() => {
    return scenarios.find((s) => s.id === selectedScenarioId);
  }, [scenarios, selectedScenarioId]);

  /**
   * Group scenarios by case name
   */
  const groupedScenarios = useMemo(() => {
    const groups: GroupedScenarios = {};
    scenarios.forEach((s) => {
      const caseName = s.case_name || 'Unknown';
      if (!groups[caseName]) groups[caseName] = [];
      groups[caseName].push(s);
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
