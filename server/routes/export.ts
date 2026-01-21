import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type {
  DatabaseInstance,
  ReleaseRow,
  TestSetRow,
  TestCaseRow,
  TestScenarioRow,
  TestStepRow,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../types/index.js';

const router: Router = express.Router();

/**
 * Route params for export endpoint
 */
interface ExportParams {
  releaseId: string;
}

/**
 * Exported step format
 */
interface ExportedStep {
  description: string;
  type: string | null;
  element: string | null;
  action: string | null;
  result: string | null;
  required: boolean;
  expected: string | null;
}

/**
 * Exported scenario format
 */
interface ExportedScenario {
  id: number;
  name: string;
  steps: ExportedStep[];
}

/**
 * Exported test case format
 */
interface ExportedTestCase {
  id: number;
  name: string;
  scenarios: ExportedScenario[];
}

/**
 * Exported test set format
 */
interface ExportedTestSet {
  id: number;
  name: string;
  test_cases: ExportedTestCase[];
}

/**
 * Full export data structure
 */
interface ExportData {
  release: string;
  generated_at: string;
  test_sets: ExportedTestSet[];
}

/**
 * GET /api/export/:releaseId - Export all data for a release
 * Returns a nested structure containing all test sets, cases, scenarios, and steps
 */
router.get(
  '/:releaseId',
  (
    req: Request<ExportParams>,
    res: Response<ApiSuccessResponse<ExportData> | ApiErrorResponse>
  ): void => {
    try {
      const db: DatabaseInstance = getDb();
      const releaseId = req.params.releaseId;

      // Get release info
      const release = db.prepare('SELECT * FROM releases WHERE id = ?').get(releaseId) as
        | ReleaseRow
        | undefined;
      if (!release) {
        res.status(404).json({ success: false, error: 'Release not found' });
        return;
      }

      // Get test sets for this release
      const testSets = db
        .prepare('SELECT * FROM test_sets WHERE release_id = ?')
        .all(releaseId) as TestSetRow[];

      // Build nested structure
      const exportData: ExportData = {
        release: release.release_number,
        generated_at: new Date().toISOString(),
        test_sets: testSets.map((ts: TestSetRow): ExportedTestSet => {
          const cases = db
            .prepare(
              'SELECT * FROM test_cases WHERE test_set_id = ? AND release_id = ? ORDER BY order_index ASC'
            )
            .all(ts.id, releaseId) as TestCaseRow[];

          return {
            id: ts.id,
            name: ts.name,
            test_cases: cases.map((tc: TestCaseRow): ExportedTestCase => {
              // Get scenarios (custom logic: usually 1, but we'll map all)
              const scenarios = db
                .prepare(
                  'SELECT * FROM test_scenarios WHERE test_case_id = ? AND release_id = ? ORDER BY order_index ASC'
                )
                .all(tc.id, releaseId) as TestScenarioRow[];

              return {
                id: tc.id,
                name: tc.name,
                scenarios: scenarios.map((sc: TestScenarioRow): ExportedScenario => {
                  const steps = db
                    .prepare(
                      'SELECT * FROM test_steps WHERE test_scenario_id = ? AND release_id = ? ORDER BY order_index ASC'
                    )
                    .all(sc.id, releaseId) as TestStepRow[];
                  return {
                    id: sc.id,
                    name: sc.name,
                    steps: steps.map(
                      (s: TestStepRow): ExportedStep => ({
                        description: s.step_definition,
                        type: s.type,
                        element: s.element_id,
                        action: s.action,
                        result: s.action_result,
                        required: Boolean(s.required),
                        expected: s.expected_results,
                      })
                    ),
                  };
                }),
              };
            }),
          };
        }),
      };

      res.json({ success: true, data: exportData });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
