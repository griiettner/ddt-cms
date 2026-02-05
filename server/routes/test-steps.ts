import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { TestStepRow } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

const router: Router = express.Router();

// Query types
interface StepsListQuery {
  scenarioId?: string;
}

// Param types
interface ReleaseIdParams {
  releaseId: string;
}

interface StepIdParams {
  releaseId: string;
  id: string;
}

// Request body types
type UpdateStepBody = Record<string, string | number | boolean | null | undefined>;

interface SyncStepsBody {
  scenarioId: number;
  steps: StepData[];
}

interface StepData {
  step_definition?: string;
  type?: string;
  element_id?: string;
  action?: string;
  action_result?: string;
  required?: boolean;
  expected_results?: string;
  select_config_id?: number | null;
  match_config_id?: number | null;
}

// GET /api/test-steps/:releaseId?scenarioId=X - List steps
router.get(
  '/:releaseId',
  async (
    req: Request<ReleaseIdParams, unknown, unknown, StepsListQuery>,
    res: Response
  ): Promise<void> => {
    const { scenarioId } = req.query;
    if (!scenarioId) {
      res.status(400).json({ success: false, error: 'scenarioId is required' });
      return;
    }

    try {
      const db = getDb();
      const steps = await db.all<TestStepRow>(
        'SELECT * FROM test_steps WHERE test_scenario_id = ? AND release_id = ? ORDER BY order_index ASC',
        [scenarioId, req.params.releaseId]
      );
      res.json({ success: true, data: steps });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/test-steps/:releaseId/:id - Partial update a step
router.patch(
  '/:releaseId/:id',
  async (req: Request<StepIdParams, unknown, UpdateStepBody>, res: Response): Promise<void> => {
    const { releaseId, id } = req.params;
    const updates = req.body;

    try {
      const db = getDb();

      // Fetch the old step data for audit logging
      const oldStep = await db.get<Record<string, unknown>>(
        'SELECT * FROM test_steps WHERE id = ? AND release_id = ?',
        [id, releaseId]
      );

      const fields = Object.keys(updates)
        .map((f) => `${f} = ?`)
        .join(', ');
      const values = Object.values(updates).map((val): string | number | null => {
        if (val === undefined) return null;
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val as string | number | null;
      });

      await db.run(`UPDATE test_steps SET ${fields} WHERE id = ? AND release_id = ?`, [
        ...values,
        id,
        releaseId,
      ]);

      // Build old and new value objects for changed fields
      const oldValue: Record<string, unknown> = {};
      const newValue: Record<string, unknown> = {};
      if (oldStep) {
        for (const [key, newVal] of Object.entries(updates)) {
          const oldVal = oldStep[key];
          // Normalize boolean values for comparison
          const normalizedOld = oldVal === 1 ? true : oldVal === 0 ? false : oldVal;
          const normalizedNew = newVal;
          if (JSON.stringify(normalizedOld) !== JSON.stringify(normalizedNew)) {
            oldValue[key] = normalizedOld;
            newValue[key] = normalizedNew;
          }
        }
      }

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'test_step',
        resourceId: parseInt(id),
        resourceName: oldStep?.step_definition as string | undefined,
        releaseId: releaseId,
        oldValue: Object.keys(oldValue).length > 0 ? oldValue : null,
        newValue: Object.keys(newValue).length > 0 ? newValue : null,
      });

      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-steps/:releaseId/:id - Delete a step
router.delete(
  '/:releaseId/:id',
  async (req: Request<StepIdParams>, res: Response): Promise<void> => {
    const { releaseId, id } = req.params;

    try {
      const db = getDb();

      // Get the step to find its scenario and order
      interface StepInfo {
        test_scenario_id: number;
        order_index: number;
      }
      const step = await db.get<StepInfo>(
        'SELECT test_scenario_id, order_index FROM test_steps WHERE id = ? AND release_id = ?',
        [id, releaseId]
      );
      if (!step) {
        res.status(404).json({ success: false, error: 'Step not found' });
        return;
      }

      await db.exec('BEGIN TRANSACTION');

      try {
        // Delete the step
        await db.run('DELETE FROM test_steps WHERE id = ? AND release_id = ?', [id, releaseId]);

        // Reorder remaining steps
        await db.run(
          `UPDATE test_steps
         SET order_index = order_index - 1
         WHERE test_scenario_id = ? AND order_index > ? AND release_id = ?`,
          [step.test_scenario_id, step.order_index, releaseId]
        );

        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }

      logAudit({
        req,
        action: 'DELETE',
        resourceType: 'test_step',
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

// POST /api/test-steps/:releaseId/sync - Full sync steps (reorders, bulk additions)
router.post(
  '/:releaseId/sync',
  async (req: Request<ReleaseIdParams, unknown, SyncStepsBody>, res: Response): Promise<void> => {
    const { scenarioId, steps } = req.body;
    const releaseId = req.params.releaseId;

    if (!scenarioId || !Array.isArray(steps)) {
      res.status(400).json({ success: false, error: 'Invalid data' });
      return;
    }

    try {
      const db = getDb();

      await db.exec('BEGIN TRANSACTION');

      try {
        await db.run('DELETE FROM test_steps WHERE test_scenario_id = ? AND release_id = ?', [
          scenarioId,
          releaseId,
        ]);

        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          await db.run(
            `INSERT INTO test_steps (
              release_id, test_scenario_id, order_index, step_definition, type,
              element_id, action, action_result, required, expected_results,
              select_config_id, match_config_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              releaseId,
              scenarioId,
              i,
              s.step_definition || '',
              s.type || '',
              s.element_id || '',
              s.action || '',
              s.action_result || '',
              s.required ? 1 : 0,
              s.expected_results || '',
              s.select_config_id || null,
              s.match_config_id || null,
            ]
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
        resourceType: 'test_steps',
        releaseId: releaseId,
        details: { scenarioId, stepCount: steps.length },
      });

      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
