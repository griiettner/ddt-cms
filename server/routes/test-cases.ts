import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { TestCaseRow, TestScenarioRow } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

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
      const db = getDb();
      const testCases = db
        .prepare(
          'SELECT * FROM test_cases WHERE test_set_id = ? AND release_id = ? ORDER BY order_index ASC'
        )
        .all(testSetId, req.params.releaseId) as TestCaseRow[];
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
    const releaseId = req.params.releaseId;

    if (!testSetId || !name) {
      res.status(400).json({ success: false, error: 'testSetId and name are required' });
      return;
    }

    try {
      const db = getDb();
      const stmt = db.prepare(
        'INSERT INTO test_cases (release_id, test_set_id, name, description, order_index) VALUES (?, ?, ?, ?, ?)'
      );

      // Use transaction to ensure both case and scenario are created
      const createWithScenario = db.transaction(
        (
          relId: string,
          tsId: number,
          n: string,
          desc: string,
          idx: number
        ): { caseId: number | bigint; scenarioId: number | bigint } => {
          const result = stmt.run(relId, tsId, n, desc, idx);
          const caseId = result.lastInsertRowid;

          // Auto-create default scenario with release_id
          const scenarioResult = db
            .prepare(
              'INSERT INTO test_scenarios (release_id, test_case_id, name, description) VALUES (?, ?, ?, ?)'
            )
            .run(relId, caseId, 'Default Scenario', 'Auto-created default scenario');

          return { caseId, scenarioId: scenarioResult.lastInsertRowid };
        }
      );

      const { caseId, scenarioId } = createWithScenario(
        releaseId,
        testSetId,
        name,
        description || '',
        order_index || 0
      );

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'test_case',
        resourceId: caseId as number,
        resourceName: name,
        releaseId: releaseId,
      });

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
      const db = getDb();
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

      params.push(id, releaseId);
      db.prepare(`UPDATE test_cases SET ${updates.join(', ')} WHERE id = ? AND release_id = ?`).run(
        ...params
      );

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'test_case',
        resourceId: parseInt(id),
        resourceName: name,
        releaseId: releaseId,
      });

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
    const db = getDb();

    // Verify the test case exists before delete
    const existingCase = db
      .prepare('SELECT id, name FROM test_cases WHERE id = ? AND release_id = ?')
      .get(id, releaseId) as TestCaseRow | undefined;
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
        .prepare('SELECT id FROM test_scenarios WHERE test_case_id = ? AND release_id = ?')
        .all(id, releaseId) as ScenarioId[];
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
        .prepare('DELETE FROM test_scenarios WHERE test_case_id = ? AND release_id = ?')
        .run(id, releaseId);
      console.log(`[DELETE] Deleted ${scenariosDeleted.changes} scenarios`);

      // Delete the test case
      const caseDeleted = db
        .prepare('DELETE FROM test_cases WHERE id = ? AND release_id = ?')
        .run(id, releaseId);
      console.log(`[DELETE] Deleted ${caseDeleted.changes} test case(s)`);

      return caseDeleted.changes;
    })();

    if (result === 0) {
      console.log(`[DELETE] Warning: No rows deleted for test case ${id}`);
    }

    logAudit({
      req,
      action: 'DELETE',
      resourceType: 'test_case',
      resourceId: parseInt(id),
      resourceName: existingCase.name,
      releaseId: releaseId,
    });

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
      const db = getDb();
      const scenarios = db
        .prepare('SELECT * FROM test_scenarios WHERE test_case_id = ? AND release_id = ?')
        .all(testCaseId, req.params.releaseId) as TestScenarioRow[];
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
    const releaseId = req.params.releaseId;

    try {
      const db = getDb();
      const stmt = db.prepare(
        'INSERT INTO test_scenarios (release_id, test_case_id, name, description) VALUES (?, ?, ?, ?)'
      );
      const result = stmt.run(releaseId, testCaseId, name, description || '');

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'test_scenario',
        resourceId: result.lastInsertRowid as number,
        resourceName: name,
        releaseId: releaseId,
      });

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
      const db = getDb();
      const scenarios = db
        .prepare(
          `
            SELECT ts.*, tc.name as case_name
            FROM test_scenarios ts
            JOIN test_cases tc ON ts.test_case_id = tc.id
            WHERE tc.test_set_id = ? AND tc.release_id = ?
            ORDER BY tc.order_index ASC, ts.order_index ASC
        `
        )
        .all(testSetId, req.params.releaseId) as ScenarioWithCaseName[];
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
      const db = getDb();
      const fields = Object.keys(updates)
        .map((f) => `${f} = ?`)
        .join(', ');
      const values = Object.values(updates);
      const stmt = db.prepare(
        `UPDATE test_scenarios SET ${fields} WHERE id = ? AND release_id = ?`
      );
      stmt.run(...values, id, releaseId);

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'test_scenario',
        resourceId: parseInt(id),
        releaseId: releaseId,
      });

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
      const db = getDb();

      // Get scenario name before deleting for audit log
      const scenario = db
        .prepare('SELECT name FROM test_scenarios WHERE id = ? AND release_id = ?')
        .get(id, releaseId) as { name: string } | undefined;

      db.transaction(() => {
        // Delete steps first
        db.prepare('DELETE FROM test_steps WHERE test_scenario_id = ? AND release_id = ?').run(
          id,
          releaseId
        );
        // Delete scenario
        db.prepare('DELETE FROM test_scenarios WHERE id = ? AND release_id = ?').run(id, releaseId);
      })();

      logAudit({
        req,
        action: 'DELETE',
        resourceType: 'test_scenario',
        resourceId: parseInt(id),
        resourceName: scenario?.name,
        releaseId: releaseId,
      });

      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
