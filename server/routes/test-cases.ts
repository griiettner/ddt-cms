import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getReleaseDb } from '../db/database.js';
import type { TestCaseRow, TestScenarioRow } from '../types/index.js';

const router: Router = express.Router();

// Query types
interface TestCasesListQuery {
  testSetId?: string;
}

interface ScenariosListQuery {
  testCaseId?: string;
}

interface AllScenariosQuery {
  testSetId?: string;
}

// Param types
interface ReleaseIdParams {
  releaseId: string;
}

interface TestCaseIdParams {
  releaseId: string;
  id: string;
}

interface ScenarioIdParams {
  releaseId: string;
  id: string;
}

// Request body types
interface CreateTestCaseBody {
  testSetId: number;
  name: string;
  description?: string;
  order_index?: number;
}

interface UpdateTestCaseBody {
  name?: string;
  description?: string;
}

interface CreateScenarioBody {
  testCaseId: number;
  name: string;
  description?: string;
}

type UpdateScenarioBody = Record<string, string | number | boolean | null | undefined>;

// Response types
interface ScenarioWithCaseName extends TestScenarioRow {
  case_name: string;
}

// GET /api/test-cases/:releaseId?testSetId=X - List test cases for a set
router.get(
  '/:releaseId',
  (req: Request<ReleaseIdParams, unknown, unknown, TestCasesListQuery>, res: Response): void => {
    const { testSetId } = req.query;
    if (!testSetId) {
      res.status(400).json({ success: false, error: 'testSetId query parameter is required' });
      return;
    }

    try {
      const db = getReleaseDb(req.params.releaseId);
      const testCases = db
        .prepare('SELECT * FROM test_cases WHERE test_set_id = ? ORDER BY order_index ASC')
        .all(testSetId) as TestCaseRow[];
      res.json({ success: true, data: testCases });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/test-cases/:releaseId - Create test case
router.post(
  '/:releaseId',
  (req: Request<ReleaseIdParams, unknown, CreateTestCaseBody>, res: Response): void => {
    const { testSetId, name, description, order_index } = req.body;
    if (!testSetId || !name) {
      res.status(400).json({ success: false, error: 'testSetId and name are required' });
      return;
    }

    try {
      const db = getReleaseDb(req.params.releaseId);
      const stmt = db.prepare(
        'INSERT INTO test_cases (test_set_id, name, description, order_index) VALUES (?, ?, ?, ?)'
      );

      // Use transaction to ensure both case and scenario are created
      const createWithScenario = db.transaction(
        (
          tsId: number,
          n: string,
          desc: string,
          idx: number
        ): { caseId: number | bigint; scenarioId: number | bigint } => {
          const result = stmt.run(tsId, n, desc, idx);
          const caseId = result.lastInsertRowid;

          // Auto-create default scenario
          const scenarioResult = db
            .prepare(
              'INSERT INTO test_scenarios (test_case_id, name, description) VALUES (?, ?, ?)'
            )
            .run(caseId, 'Default Scenario', 'Auto-created default scenario');

          return { caseId, scenarioId: scenarioResult.lastInsertRowid };
        }
      );

      const { caseId, scenarioId } = createWithScenario(
        testSetId,
        name,
        description || '',
        order_index || 0
      );

      res.json({
        success: true,
        data: { id: caseId, scenarioId, test_set_id: testSetId, name, description, order_index },
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/test-cases/:releaseId/:id - Update test case
router.patch(
  '/:releaseId/:id',
  (req: Request<TestCaseIdParams, unknown, UpdateTestCaseBody>, res: Response): void => {
    const { releaseId, id } = req.params;
    const { name, description } = req.body;

    try {
      const db = getReleaseDb(releaseId);
      const updates: string[] = [];
      const params: (string | number)[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }

      if (updates.length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      params.push(id);
      db.prepare(`UPDATE test_cases SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-cases/:releaseId/:id - Delete test case and all scenarios/steps
router.delete('/:releaseId/:id', (req: Request<TestCaseIdParams>, res: Response): void => {
  const { releaseId, id } = req.params;

  try {
    const db = getReleaseDb(releaseId);

    // Verify the test case exists before delete
    const existingCase = db.prepare('SELECT id, name FROM test_cases WHERE id = ?').get(id) as
      | TestCaseRow
      | undefined;
    if (!existingCase) {
      console.log(`[DELETE] Test case ${id} not found in release ${releaseId}`);
      res.status(404).json({ success: false, error: 'Test case not found' });
      return;
    }

    console.log(
      `[DELETE] Deleting test case ${id} (${existingCase.name}) from release ${releaseId}`
    );

    interface ScenarioId {
      id: number;
    }

    const result = db.transaction((): number => {
      // Get all scenarios for this test case
      const scenarios = db
        .prepare('SELECT id FROM test_scenarios WHERE test_case_id = ?')
        .all(id) as ScenarioId[];
      console.log(`[DELETE] Found ${scenarios.length} scenarios to delete`);

      // Delete steps for each scenario
      for (const scenario of scenarios) {
        const stepsDeleted = db
          .prepare('DELETE FROM test_steps WHERE test_scenario_id = ?')
          .run(scenario.id);
        console.log(`[DELETE] Deleted ${stepsDeleted.changes} steps for scenario ${scenario.id}`);
      }

      // Delete all scenarios
      const scenariosDeleted = db
        .prepare('DELETE FROM test_scenarios WHERE test_case_id = ?')
        .run(id);
      console.log(`[DELETE] Deleted ${scenariosDeleted.changes} scenarios`);

      // Delete the test case
      const caseDeleted = db.prepare('DELETE FROM test_cases WHERE id = ?').run(id);
      console.log(`[DELETE] Deleted ${caseDeleted.changes} test case(s)`);

      return caseDeleted.changes;
    })();

    if (result === 0) {
      console.log(`[DELETE] Warning: No rows deleted for test case ${id}`);
    }

    res.json({ success: true, deleted: result > 0 });
  } catch (err) {
    const error = err as Error;
    console.error(`[DELETE] Error deleting test case ${id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/test-cases/scenarios/:releaseId?testCaseId=X - List scenarios for a case
router.get(
  '/scenarios/:releaseId',
  (req: Request<ReleaseIdParams, unknown, unknown, ScenariosListQuery>, res: Response): void => {
    const { testCaseId } = req.query;
    if (!testCaseId) {
      res.status(400).json({ success: false, error: 'testCaseId is required' });
      return;
    }
    try {
      const db = getReleaseDb(req.params.releaseId);
      const scenarios = db
        .prepare('SELECT * FROM test_scenarios WHERE test_case_id = ?')
        .all(testCaseId) as TestScenarioRow[];
      res.json({ success: true, data: scenarios });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/test-cases/scenarios/:releaseId - Create scenario
router.post(
  '/scenarios/:releaseId',
  (req: Request<ReleaseIdParams, unknown, CreateScenarioBody>, res: Response): void => {
    const { testCaseId, name, description } = req.body;
    try {
      const db = getReleaseDb(req.params.releaseId);
      const stmt = db.prepare(
        'INSERT INTO test_scenarios (test_case_id, name, description) VALUES (?, ?, ?)'
      );
      const result = stmt.run(testCaseId, name, description || '');
      res.json({ success: true, data: { id: result.lastInsertRowid } });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-cases/all-scenarios/:releaseId?testSetId=X - List ALL scenarios for a test set
router.get(
  '/all-scenarios/:releaseId',
  (req: Request<ReleaseIdParams, unknown, unknown, AllScenariosQuery>, res: Response): void => {
    const { testSetId } = req.query;
    if (!testSetId) {
      res.status(400).json({ success: false, error: 'testSetId is required' });
      return;
    }
    try {
      const db = getReleaseDb(req.params.releaseId);
      const scenarios = db
        .prepare(
          `
            SELECT ts.*, tc.name as case_name
            FROM test_scenarios ts
            JOIN test_cases tc ON ts.test_case_id = tc.id
            WHERE tc.test_set_id = ?
            ORDER BY tc.order_index ASC, ts.order_index ASC
        `
        )
        .all(testSetId) as ScenarioWithCaseName[];
      res.json({ success: true, data: scenarios });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/test-cases/scenarios/:releaseId/:id - Update scenario
router.patch(
  '/scenarios/:releaseId/:id',
  (req: Request<ScenarioIdParams, unknown, UpdateScenarioBody>, res: Response): void => {
    const { releaseId, id } = req.params;
    const updates = req.body;
    try {
      const db = getReleaseDb(releaseId);
      const fields = Object.keys(updates)
        .map((f) => `${f} = ?`)
        .join(', ');
      const values = Object.values(updates);
      const stmt = db.prepare(`UPDATE test_scenarios SET ${fields} WHERE id = ?`);
      stmt.run(...values, id);
      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-cases/scenarios/:releaseId/:id - Delete scenario and steps
router.delete(
  '/scenarios/:releaseId/:id',
  (req: Request<ScenarioIdParams>, res: Response): void => {
    const { releaseId, id } = req.params;
    try {
      const db = getReleaseDb(releaseId);
      db.transaction(() => {
        // Delete steps first
        db.prepare('DELETE FROM test_steps WHERE test_scenario_id = ?').run(id);
        // Delete scenario
        db.prepare('DELETE FROM test_scenarios WHERE id = ?').run(id);
      })();
      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
