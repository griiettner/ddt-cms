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
  async (
    req: Request<ReleaseIdParams, unknown, unknown, TestCasesListQuery>,
    res: Response
  ): Promise<void> => {
    const { testSetId } = req.query;
    if (!testSetId) {
      res.status(400).json({ success: false, error: 'testSetId query parameter is required' });
      return;
    }

    try {
      const db = getDb();
      const testCases = await db.all<TestCaseRow>(
        'SELECT * FROM test_cases WHERE test_set_id = ? AND release_id = ? ORDER BY order_index ASC',
        [testSetId, req.params.releaseId]
      );
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
  async (
    req: Request<ReleaseIdParams, unknown, CreateTestCaseBody>,
    res: Response
  ): Promise<void> => {
    const { testSetId, name, description, order_index } = req.body;
    const releaseId = req.params.releaseId;

    if (!testSetId || !name) {
      res.status(400).json({ success: false, error: 'testSetId and name are required' });
      return;
    }

    try {
      const db = getDb();

      // Start transaction
      await db.exec('BEGIN TRANSACTION');

      try {
        // Create test case
        const result = await db.run(
          'INSERT INTO test_cases (release_id, test_set_id, name, description, order_index) VALUES (?, ?, ?, ?, ?)',
          [releaseId, testSetId, name, description || '', order_index || 0]
        );
        const caseId = Number(result.lastInsertRowid);

        // Auto-create default scenario with release_id
        const scenarioResult = await db.run(
          'INSERT INTO test_scenarios (release_id, test_case_id, name, description) VALUES (?, ?, ?, ?)',
          [releaseId, caseId, 'Default Scenario', 'Auto-created default scenario']
        );
        const scenarioId = Number(scenarioResult.lastInsertRowid);

        await db.exec('COMMIT');

        logAudit({
          req,
          action: 'CREATE',
          resourceType: 'test_case',
          resourceId: caseId,
          resourceName: name,
          releaseId: releaseId,
        });

        res.json({
          success: true,
          data: { id: caseId, scenarioId, test_set_id: testSetId, name, description, order_index },
        });
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/test-cases/:releaseId/:id - Update test case
router.patch(
  '/:releaseId/:id',
  async (
    req: Request<TestCaseIdParams, unknown, UpdateTestCaseBody>,
    res: Response
  ): Promise<void> => {
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
      await db.run(
        `UPDATE test_cases SET ${updates.join(', ')} WHERE id = ? AND release_id = ?`,
        params
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

// PUT /api/test-cases/:releaseId/reorder - Reorder test cases within a test set
interface ReorderCasesBody {
  testSetId: number;
  caseIds: number[];
}

router.put(
  '/:releaseId/reorder',
  async (
    req: Request<ReleaseIdParams, unknown, ReorderCasesBody>,
    res: Response
  ): Promise<void> => {
    const { releaseId } = req.params;
    const { testSetId, caseIds } = req.body;

    if (!testSetId || !Array.isArray(caseIds) || caseIds.length === 0) {
      res.status(400).json({ success: false, error: 'testSetId and caseIds array are required' });
      return;
    }

    try {
      const db = getDb();

      await db.exec('BEGIN TRANSACTION');

      try {
        for (let index = 0; index < caseIds.length; index++) {
          const caseId = caseIds[index];
          await db.run(
            'UPDATE test_cases SET order_index = ? WHERE id = ? AND test_set_id = ? AND release_id = ?',
            [index, caseId, testSetId, releaseId]
          );
        }

        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'test_case',
        releaseId: releaseId,
        details: { reordered: caseIds.length, testSetId },
      });

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-cases/:releaseId/:id - Delete test case and all scenarios/steps
router.delete(
  '/:releaseId/:id',
  async (req: Request<TestCaseIdParams>, res: Response): Promise<void> => {
    const { releaseId, id } = req.params;

    try {
      const db = getDb();

      // Verify the test case exists before delete
      const existingCase = await db.get<TestCaseRow>(
        'SELECT id, name FROM test_cases WHERE id = ? AND release_id = ?',
        [id, releaseId]
      );
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

      await db.exec('BEGIN TRANSACTION');

      try {
        // Get all scenarios for this test case
        const scenarios = await db.all<ScenarioId>(
          'SELECT id FROM test_scenarios WHERE test_case_id = ? AND release_id = ?',
          [id, releaseId]
        );
        console.log(`[DELETE] Found ${scenarios.length} scenarios to delete`);

        // Delete steps for each scenario
        for (const scenario of scenarios) {
          const stepsDeleted = await db.run('DELETE FROM test_steps WHERE test_scenario_id = ?', [
            scenario.id,
          ]);
          console.log(`[DELETE] Deleted ${stepsDeleted.changes} steps for scenario ${scenario.id}`);
        }

        // Delete all scenarios
        const scenariosDeleted = await db.run(
          'DELETE FROM test_scenarios WHERE test_case_id = ? AND release_id = ?',
          [id, releaseId]
        );
        console.log(`[DELETE] Deleted ${scenariosDeleted.changes} scenarios`);

        // Delete the test case
        const caseDeleted = await db.run('DELETE FROM test_cases WHERE id = ? AND release_id = ?', [
          id,
          releaseId,
        ]);
        console.log(`[DELETE] Deleted ${caseDeleted.changes} test case(s)`);

        await db.exec('COMMIT');

        if (caseDeleted.changes === 0) {
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

        res.json({ success: true, deleted: caseDeleted.changes > 0 });
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    } catch (err) {
      const error = err as Error;
      console.error(`[DELETE] Error deleting test case ${id}:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-cases/scenarios/:releaseId?testCaseId=X - List scenarios for a case
router.get(
  '/scenarios/:releaseId',
  async (
    req: Request<ReleaseIdParams, unknown, unknown, ScenariosListQuery>,
    res: Response
  ): Promise<void> => {
    const { testCaseId } = req.query;
    if (!testCaseId) {
      res.status(400).json({ success: false, error: 'testCaseId is required' });
      return;
    }
    try {
      const db = getDb();
      const scenarios = await db.all<TestScenarioRow>(
        'SELECT * FROM test_scenarios WHERE test_case_id = ? AND release_id = ?',
        [testCaseId, req.params.releaseId]
      );
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
  async (
    req: Request<ReleaseIdParams, unknown, CreateScenarioBody>,
    res: Response
  ): Promise<void> => {
    const { testCaseId, name, description } = req.body;
    const releaseId = req.params.releaseId;

    try {
      const db = getDb();
      const result = await db.run(
        'INSERT INTO test_scenarios (release_id, test_case_id, name, description) VALUES (?, ?, ?, ?)',
        [releaseId, testCaseId, name, description || '']
      );

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'test_scenario',
        resourceId: Number(result.lastInsertRowid),
        resourceName: name,
        releaseId: releaseId,
      });

      res.json({ success: true, data: { id: Number(result.lastInsertRowid) } });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-cases/all-scenarios/:releaseId?testSetId=X - List ALL scenarios for a test set
router.get(
  '/all-scenarios/:releaseId',
  async (
    req: Request<ReleaseIdParams, unknown, unknown, AllScenariosQuery>,
    res: Response
  ): Promise<void> => {
    const { testSetId } = req.query;
    if (!testSetId) {
      res.status(400).json({ success: false, error: 'testSetId is required' });
      return;
    }
    try {
      const db = getDb();
      const scenarios = await db.all<ScenarioWithCaseName>(
        `SELECT ts.*, tc.name as case_name
         FROM test_scenarios ts
         JOIN test_cases tc ON ts.test_case_id = tc.id
         WHERE tc.test_set_id = ? AND tc.release_id = ?
         ORDER BY tc.order_index ASC, ts.order_index ASC`,
        [testSetId, req.params.releaseId]
      );
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
  async (
    req: Request<ScenarioIdParams, unknown, UpdateScenarioBody>,
    res: Response
  ): Promise<void> => {
    const { releaseId, id } = req.params;
    const updates = req.body;
    try {
      const db = getDb();
      const fields = Object.keys(updates)
        .map((f) => `${f} = ?`)
        .join(', ');
      const values = Object.values(updates) as (string | number | boolean | null)[];

      await db.run(`UPDATE test_scenarios SET ${fields} WHERE id = ? AND release_id = ?`, [
        ...values,
        id,
        releaseId,
      ]);

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

// PUT /api/test-cases/scenarios/:releaseId/reorder - Reorder scenarios within a case
interface ReorderScenariosBody {
  testCaseId: number;
  scenarioIds: number[];
}

router.put(
  '/scenarios/:releaseId/reorder',
  async (
    req: Request<ReleaseIdParams, unknown, ReorderScenariosBody>,
    res: Response
  ): Promise<void> => {
    const { releaseId } = req.params;
    const { testCaseId, scenarioIds } = req.body;

    if (!testCaseId || !Array.isArray(scenarioIds) || scenarioIds.length === 0) {
      res
        .status(400)
        .json({ success: false, error: 'testCaseId and scenarioIds array are required' });
      return;
    }

    try {
      const db = getDb();

      await db.exec('BEGIN TRANSACTION');

      try {
        for (let index = 0; index < scenarioIds.length; index++) {
          const scenarioId = scenarioIds[index];
          await db.run(
            'UPDATE test_scenarios SET order_index = ? WHERE id = ? AND test_case_id = ? AND release_id = ?',
            [index, scenarioId, testCaseId, releaseId]
          );
        }

        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'test_scenario',
        releaseId: releaseId,
        details: { reordered: scenarioIds.length, testCaseId },
      });

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-cases/scenarios/:releaseId/:id - Delete scenario and steps
router.delete(
  '/scenarios/:releaseId/:id',
  async (req: Request<ScenarioIdParams>, res: Response): Promise<void> => {
    const { releaseId, id } = req.params;
    try {
      const db = getDb();

      // Get scenario name before deleting for audit log
      const scenario = await db.get<{ name: string }>(
        'SELECT name FROM test_scenarios WHERE id = ? AND release_id = ?',
        [id, releaseId]
      );

      await db.exec('BEGIN TRANSACTION');

      try {
        // Delete steps first
        await db.run('DELETE FROM test_steps WHERE test_scenario_id = ? AND release_id = ?', [
          id,
          releaseId,
        ]);
        // Delete scenario
        await db.run('DELETE FROM test_scenarios WHERE id = ? AND release_id = ?', [id, releaseId]);

        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }

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
