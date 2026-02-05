import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { DatabaseWrapper } from '../db/database.js';
import type {
  ReleaseRow,
  TestSetRow,
  TestCaseRow,
  TestScenarioRow,
  TestStepRow,
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

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
  async (
    req: Request<ExportParams>,
    res: Response<ApiSuccessResponse<ExportData> | ApiErrorResponse>
  ): Promise<void> => {
    try {
      const db: DatabaseWrapper = getDb();
      const releaseId = req.params.releaseId;

      // Get release info
      const release = await db.get<ReleaseRow>('SELECT * FROM releases WHERE id = ?', [releaseId]);
      if (!release) {
        res.status(404).json({ success: false, error: 'Release not found' });
        return;
      }

      // Get test sets for this release
      const testSets = await db.all<TestSetRow>('SELECT * FROM test_sets WHERE release_id = ?', [
        releaseId,
      ]);

      // Build nested structure
      const exportedTestSets: ExportedTestSet[] = [];

      for (const ts of testSets) {
        const cases = await db.all<TestCaseRow>(
          'SELECT * FROM test_cases WHERE test_set_id = ? AND release_id = ? ORDER BY order_index ASC',
          [ts.id, releaseId]
        );

        const exportedCases: ExportedTestCase[] = [];

        for (const tc of cases) {
          const scenarios = await db.all<TestScenarioRow>(
            'SELECT * FROM test_scenarios WHERE test_case_id = ? AND release_id = ? ORDER BY order_index ASC',
            [tc.id, releaseId]
          );

          const exportedScenarios: ExportedScenario[] = [];

          for (const sc of scenarios) {
            const steps = await db.all<TestStepRow>(
              'SELECT * FROM test_steps WHERE test_scenario_id = ? AND release_id = ? ORDER BY order_index ASC',
              [sc.id, releaseId]
            );

            exportedScenarios.push({
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
            });
          }

          exportedCases.push({
            id: tc.id,
            name: tc.name,
            scenarios: exportedScenarios,
          });
        }

        exportedTestSets.push({
          id: ts.id,
          name: ts.name,
          test_cases: exportedCases,
        });
      }

      const exportData: ExportData = {
        release: release.release_number,
        generated_at: new Date().toISOString(),
        test_sets: exportedTestSets,
      };

      logAudit({
        req,
        action: 'EXPORT',
        resourceType: 'release',
        resourceId: parseInt(releaseId),
        resourceName: release.release_number,
        releaseId: releaseId,
        details: { testSetCount: testSets.length },
      });

      res.json({ success: true, data: exportData });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
