import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { TestStepRow } from '../types/index.js';

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
  (req: Request<ReleaseIdParams, unknown, unknown, StepsListQuery>, res: Response): void => {
    const { scenarioId } = req.query;
    if (!scenarioId) {
      res.status(400).json({ success: false, error: 'scenarioId is required' });
      return;
    }

    try {
      const db = getDb();
      const steps = db
        .prepare(
          'SELECT * FROM test_steps WHERE test_scenario_id = ? AND release_id = ? ORDER BY order_index ASC'
        )
        .all(scenarioId, req.params.releaseId) as TestStepRow[];
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
  (req: Request<StepIdParams, unknown, UpdateStepBody>, res: Response): void => {
    const { releaseId, id } = req.params;
    const updates = req.body;

    try {
      const db = getDb();
      const fields = Object.keys(updates)
        .map((f) => `${f} = ?`)
        .join(', ');
      const values = Object.values(updates).map((val): string | number | null => {
        if (val === undefined) return null;
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val as string | number | null;
      });

      const stmt = db.prepare(`UPDATE test_steps SET ${fields} WHERE id = ? AND release_id = ?`);
      stmt.run(...values, id, releaseId);

      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-steps/:releaseId/:id - Delete a step
router.delete('/:releaseId/:id', (req: Request<StepIdParams>, res: Response): void => {
  const { releaseId, id } = req.params;

  try {
    const db = getDb();

    // Get the step to find its scenario and order
    interface StepInfo {
      test_scenario_id: number;
      order_index: number;
    }
    const step = db
      .prepare(
        'SELECT test_scenario_id, order_index FROM test_steps WHERE id = ? AND release_id = ?'
      )
      .get(id, releaseId) as StepInfo | undefined;
    if (!step) {
      res.status(404).json({ success: false, error: 'Step not found' });
      return;
    }

    db.transaction(() => {
      // Delete the step
      db.prepare('DELETE FROM test_steps WHERE id = ? AND release_id = ?').run(id, releaseId);

      // Reorder remaining steps
      db.prepare(
        `
        UPDATE test_steps
        SET order_index = order_index - 1
        WHERE test_scenario_id = ? AND order_index > ? AND release_id = ?
      `
      ).run(step.test_scenario_id, step.order_index, releaseId);
    })();

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/test-steps/:releaseId/sync - Full sync steps (reorders, bulk additions)
router.post(
  '/:releaseId/sync',
  (req: Request<ReleaseIdParams, unknown, SyncStepsBody>, res: Response): void => {
    const { scenarioId, steps } = req.body;
    const releaseId = req.params.releaseId;

    if (!scenarioId || !Array.isArray(steps)) {
      res.status(400).json({ success: false, error: 'Invalid data' });
      return;
    }

    try {
      const db = getDb();
      db.transaction(() => {
        db.prepare('DELETE FROM test_steps WHERE test_scenario_id = ? AND release_id = ?').run(
          scenarioId,
          releaseId
        );
        const insert = db.prepare(`
        INSERT INTO test_steps (
          release_id, test_scenario_id, order_index, step_definition, type,
          element_id, action, action_result, required, expected_results,
          select_config_id, match_config_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
        steps.forEach((s: StepData, i: number) => {
          insert.run(
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
            s.match_config_id || null
          );
        });
      })();
      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
