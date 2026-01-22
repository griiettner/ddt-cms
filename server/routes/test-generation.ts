import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type {
  ApiResponse,
  TestGenerationData,
  TestGenerationCase,
  TestGenerationScenario,
  TestGenerationStep,
  SelectConfigRow,
  MatchConfigRow,
} from '../types/index.js';

const router: Router = express.Router();

// Request param types
interface TestSetIdParams {
  testSetId: string;
}

// Query types
interface TestGenerationQuery {
  releaseId: string;
}

// Database row types for joined queries
interface ScenarioWithCaseRow {
  scenario_id: number;
  scenario_name: string;
  scenario_order: number;
  case_id: number;
  case_name: string;
  case_order: number;
}

interface StepRow {
  id: number;
  test_scenario_id: number;
  order_index: number;
  step_definition: string;
  type: string | null;
  element_id: string | null;
  action: string | null;
  action_result: string | null;
  select_config_id: number | null;
  match_config_id: number | null;
  required: number;
  expected_results: string | null;
}

interface TestSetNameRow {
  name: string;
}

/**
 * GET /api/test-generation/:testSetId?releaseId=X
 * Returns full test hierarchy for Playwright execution:
 * test set -> cases -> scenarios -> steps with configs
 */
router.get(
  '/:testSetId',
  (
    req: Request<TestSetIdParams, unknown, unknown, TestGenerationQuery>,
    res: Response<ApiResponse<TestGenerationData>>
  ): void => {
    const { testSetId } = req.params;
    const { releaseId } = req.query;

    if (!releaseId) {
      res.status(400).json({ success: false, error: 'releaseId query parameter is required' });
      return;
    }

    try {
      const db = getDb();

      // Get test set name
      const testSet = db
        .prepare('SELECT name FROM test_sets WHERE id = ? AND release_id = ?')
        .get(testSetId, releaseId) as TestSetNameRow | undefined;

      if (!testSet) {
        res.status(404).json({ success: false, error: 'Test set not found' });
        return;
      }

      // Get all scenarios with their parent case info
      const scenariosWithCases = db
        .prepare(
          `
          SELECT
            ts.id as scenario_id,
            ts.name as scenario_name,
            ts.order_index as scenario_order,
            tc.id as case_id,
            tc.name as case_name,
            tc.order_index as case_order
          FROM test_scenarios ts
          JOIN test_cases tc ON ts.test_case_id = tc.id
          WHERE tc.test_set_id = ? AND tc.release_id = ?
          ORDER BY tc.order_index ASC, ts.order_index ASC
        `
        )
        .all(testSetId, releaseId) as ScenarioWithCaseRow[];

      // Get all steps for all scenarios in this test set
      const scenarioIds = scenariosWithCases.map((s) => s.scenario_id);
      let allSteps: StepRow[] = [];

      if (scenarioIds.length > 0) {
        const placeholders = scenarioIds.map(() => '?').join(',');
        allSteps = db
          .prepare(
            `
            SELECT
              id, test_scenario_id, order_index, step_definition,
              type, element_id, action, action_result,
              select_config_id, match_config_id, required, expected_results
            FROM test_steps
            WHERE test_scenario_id IN (${placeholders})
            ORDER BY order_index ASC
          `
          )
          .all(...scenarioIds) as StepRow[];
      }

      // Get select configs that are used in this test set
      const selectConfigIds = [...new Set(allSteps.map((s) => s.select_config_id).filter(Boolean))];
      let selectConfigs: SelectConfigRow[] = [];
      if (selectConfigIds.length > 0) {
        const placeholders = selectConfigIds.map(() => '?').join(',');
        selectConfigs = db
          .prepare(`SELECT * FROM select_configs WHERE id IN (${placeholders})`)
          .all(...selectConfigIds) as SelectConfigRow[];
      }

      // Get match configs that are used in this test set
      const matchConfigIds = [...new Set(allSteps.map((s) => s.match_config_id).filter(Boolean))];
      let matchConfigs: MatchConfigRow[] = [];
      if (matchConfigIds.length > 0) {
        const placeholders = matchConfigIds.map(() => '?').join(',');
        matchConfigs = db
          .prepare(`SELECT * FROM match_configs WHERE id IN (${placeholders})`)
          .all(...matchConfigIds) as MatchConfigRow[];
      }

      // Group steps by scenario
      const stepsByScenario = new Map<number, TestGenerationStep[]>();
      for (const step of allSteps) {
        if (!stepsByScenario.has(step.test_scenario_id)) {
          stepsByScenario.set(step.test_scenario_id, []);
        }
        const stepList = stepsByScenario.get(step.test_scenario_id);
        if (stepList) {
          stepList.push({
            id: step.id,
            order_index: step.order_index,
            step_definition: step.step_definition,
            type: step.type,
            element_id: step.element_id,
            action: step.action,
            action_result: step.action_result,
            select_config_id: step.select_config_id,
            match_config_id: step.match_config_id,
            required: step.required,
            expected_results: step.expected_results,
          });
        }
      }

      // Build case -> scenarios hierarchy
      const casesMap = new Map<number, TestGenerationCase>();
      for (const row of scenariosWithCases) {
        if (!casesMap.has(row.case_id)) {
          casesMap.set(row.case_id, {
            id: row.case_id,
            name: row.case_name,
            scenarios: [],
          });
        }

        const scenario: TestGenerationScenario = {
          id: row.scenario_id,
          name: row.scenario_name,
          case_name: row.case_name,
          case_id: row.case_id,
          steps: stepsByScenario.get(row.scenario_id) || [],
        };

        const testCase = casesMap.get(row.case_id);
        if (testCase) {
          testCase.scenarios.push(scenario);
        }
      }

      const result: TestGenerationData = {
        testSetId: parseInt(testSetId, 10),
        testSetName: testSet.name,
        releaseId: parseInt(releaseId, 10),
        cases: Array.from(casesMap.values()),
        selectConfigs,
        matchConfigs,
      };

      res.json({ success: true, data: result });
    } catch (err) {
      const error = err as Error;
      console.error('Test generation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
