/**
 * Reusable Cases API Routes
 * Global test case templates that can be copied to any release
 */
import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type {
  ReusableCaseRow,
  ReusableCaseStepRow,
  TestCaseRow,
  TestScenarioRow,
  TestStepRow,
  MaxOrderResult,
  ApiResponse,
} from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

const router: Router = express.Router();

// Extended Request type for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    eid: string;
  };
}

// Request param types
interface IdParams {
  id: string;
}

interface StepParams extends IdParams {
  stepId: string;
}

// Request body types
interface CreateReusableCaseBody {
  name: string;
  description?: string;
  steps?: ReusableCaseStepInput[];
}

interface UpdateReusableCaseBody {
  name?: string;
  description?: string;
}

interface CopyToBody {
  releaseId: string | number;
  testSetId: string | number;
}

interface FromCaseBody {
  releaseId: string | number;
  caseId: string | number;
  name?: string;
  description?: string;
}

interface ReusableCaseStepInput {
  order_index?: number;
  step_definition?: string;
  type?: string;
  element_id?: string;
  action?: string;
  action_result?: string;
  select_config_id?: number;
  match_config_id?: number;
  required?: boolean | number;
  expected_results?: string;
}

interface ReorderStepsBody {
  steps: { id: number; order_index?: number }[];
}

interface SyncStepsBody {
  steps: ReusableCaseStepInput[];
}

// Response data types
interface ReusableCaseWithStepCount extends ReusableCaseRow {
  step_count: number;
}

interface ReusableCaseWithSteps extends ReusableCaseRow {
  steps: ReusableCaseStepRow[];
}

interface CreateReusableCaseResponse {
  id: number | bigint;
  name: string;
}

interface CopyToResponse {
  caseId: number | bigint;
  scenarioId: number | bigint;
  stepsCopied: number;
}

interface FromCaseResponse {
  id: number | bigint;
  name: string;
  stepsCopied: number;
}

interface AddStepResponse {
  id: number | bigint;
  order_index: number;
}

interface IdResult {
  id: number;
}

// GET /api/reusable-cases - List all reusable cases
router.get('/', (_req: Request, res: Response<ApiResponse<ReusableCaseWithStepCount[]>>): void => {
  try {
    const db = getDb();
    const cases = db
      .prepare(
        `
        SELECT
          rc.*,
          (SELECT COUNT(*) FROM reusable_case_steps WHERE reusable_case_id = rc.id) as step_count
        FROM reusable_cases rc
        ORDER BY rc.name ASC
      `
      )
      .all() as ReusableCaseWithStepCount[];

    res.json({ success: true, data: cases });
  } catch (err) {
    const error = err as Error;
    console.error('Error listing reusable cases:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reusable-cases/:id - Get a reusable case with its steps
router.get(
  '/:id',
  (req: Request<IdParams>, res: Response<ApiResponse<ReusableCaseWithSteps>>): void => {
    const { id } = req.params;

    try {
      const db = getDb();

      const reusableCase = db
        .prepare(
          `
        SELECT * FROM reusable_cases WHERE id = ?
      `
        )
        .get(id) as ReusableCaseRow | undefined;

      if (!reusableCase) {
        res.status(404).json({ success: false, error: 'Reusable case not found' });
        return;
      }

      const steps = db
        .prepare(
          `
        SELECT * FROM reusable_case_steps
        WHERE reusable_case_id = ?
        ORDER BY order_index ASC
      `
        )
        .all(id) as ReusableCaseStepRow[];

      res.json({
        success: true,
        data: { ...reusableCase, steps },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error getting reusable case:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/reusable-cases - Create a new reusable case
router.post(
  '/',
  (req: AuthenticatedRequest, res: Response<ApiResponse<CreateReusableCaseResponse>>): void => {
    const { name, description, steps } = req.body as CreateReusableCaseBody;
    const user = req.user?.eid || 'anonymous';

    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    try {
      const db = getDb();

      // Create the reusable case
      const result = db
        .prepare(
          `
        INSERT INTO reusable_cases (name, description, created_by)
        VALUES (?, ?, ?)
      `
        )
        .run(name, description || '', user);

      const reusableCaseId = result.lastInsertRowid;

      // Insert steps if provided
      if (steps && steps.length > 0) {
        const insertStep = db.prepare(`
          INSERT INTO reusable_case_steps (
            reusable_case_id, order_index, step_definition, type, element_id,
            action, action_result, select_config_id, match_config_id, required, expected_results
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        steps.forEach((step, index) => {
          insertStep.run(
            reusableCaseId,
            step.order_index ?? index,
            step.step_definition || '',
            step.type || null,
            step.element_id || null,
            step.action || null,
            step.action_result || null,
            step.select_config_id || null,
            step.match_config_id || null,
            step.required ? 1 : 0,
            step.expected_results || null
          );
        });
      }

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'reusable_case',
        resourceId: reusableCaseId as number,
        resourceName: name,
        details: { stepCount: steps?.length || 0 },
      });

      res.json({
        success: true,
        data: { id: reusableCaseId, name },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error creating reusable case:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/reusable-cases/:id - Update a reusable case
router.put(
  '/:id',
  (
    req: Request<IdParams, unknown, UpdateReusableCaseBody>,
    res: Response<ApiResponse<undefined>>
  ): void => {
    const { id } = req.params;
    const { name, description } = req.body;

    try {
      const db = getDb();

      const existing = db.prepare('SELECT id FROM reusable_cases WHERE id = ?').get(id) as
        | IdResult
        | undefined;
      if (!existing) {
        res.status(404).json({ success: false, error: 'Reusable case not found' });
        return;
      }

      db.prepare(
        `
        UPDATE reusable_cases
        SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      ).run(name, description || '', id);

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'reusable_case',
        resourceId: parseInt(id),
        resourceName: name,
      });

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      console.error('Error updating reusable case:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/reusable-cases/:id - Delete a reusable case
router.delete('/:id', (req: Request<IdParams>, res: Response<ApiResponse<undefined>>): void => {
  const { id } = req.params;

  try {
    const db = getDb();

    const existing = db.prepare('SELECT id, name FROM reusable_cases WHERE id = ?').get(id) as
      | { id: number; name: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ success: false, error: 'Reusable case not found' });
      return;
    }

    // Steps are deleted automatically via CASCADE
    db.prepare('DELETE FROM reusable_cases WHERE id = ?').run(id);

    logAudit({
      req,
      action: 'DELETE',
      resourceType: 'reusable_case',
      resourceId: parseInt(id),
      resourceName: existing.name,
    });

    res.json({ success: true, data: undefined });
  } catch (err) {
    const error = err as Error;
    console.error('Error deleting reusable case:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reusable-cases/:id/copy-to - Copy a reusable case to a test set
router.post(
  '/:id/copy-to',
  (
    req: Request<IdParams, unknown, CopyToBody>,
    res: Response<ApiResponse<CopyToResponse>>
  ): void => {
    const { id } = req.params;
    const { releaseId, testSetId } = req.body;

    if (!releaseId || !testSetId) {
      res.status(400).json({
        success: false,
        error: 'releaseId and testSetId are required',
      });
      return;
    }

    try {
      const db = getDb();

      // Get the reusable case
      const reusableCase = db
        .prepare(
          `
        SELECT * FROM reusable_cases WHERE id = ?
      `
        )
        .get(id) as ReusableCaseRow | undefined;

      if (!reusableCase) {
        res.status(404).json({ success: false, error: 'Reusable case not found' });
        return;
      }

      // Get the steps
      const steps = db
        .prepare(
          `
        SELECT * FROM reusable_case_steps
        WHERE reusable_case_id = ?
        ORDER BY order_index ASC
      `
        )
        .all(id) as ReusableCaseStepRow[];

      // Get max order_index for test cases in this test set
      const maxOrder = db
        .prepare(
          `
        SELECT COALESCE(MAX(order_index), -1) as max_order
        FROM test_cases WHERE test_set_id = ? AND release_id = ?
      `
        )
        .get(testSetId, releaseId) as MaxOrderResult;
      const newOrderIndex = (maxOrder?.max_order ?? -1) + 1;

      // Create the test case in the unified database with release_id
      const caseResult = db
        .prepare(
          `
        INSERT INTO test_cases (release_id, test_set_id, name, description, order_index)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          releaseId,
          testSetId,
          reusableCase.name,
          reusableCase.description || '',
          newOrderIndex
        );

      const newCaseId = caseResult.lastInsertRowid;

      // Create a default scenario for this case with release_id
      const scenarioResult = db
        .prepare(
          `
        INSERT INTO test_scenarios (release_id, test_case_id, name, order_index)
        VALUES (?, ?, ?, 0)
      `
        )
        .run(releaseId, newCaseId, 'Default Scenario');

      const newScenarioId = scenarioResult.lastInsertRowid;

      // Copy the steps to the new scenario with release_id
      if (steps.length > 0) {
        const insertStep = db.prepare(`
          INSERT INTO test_steps (
            release_id, test_scenario_id, order_index, step_definition, type, element_id,
            action, action_result, select_config_id, match_config_id, required, expected_results
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        steps.forEach((step) => {
          insertStep.run(
            releaseId,
            newScenarioId,
            step.order_index,
            step.step_definition || '',
            step.type || null,
            step.element_id || null,
            step.action || null,
            step.action_result || null,
            step.select_config_id || null,
            step.match_config_id || null,
            step.required ? 1 : 0,
            step.expected_results || null
          );
        });
      }

      logAudit({
        req,
        action: 'COPY',
        resourceType: 'reusable_case',
        resourceId: parseInt(id),
        resourceName: reusableCase.name,
        releaseId: releaseId,
        details: { targetTestSetId: testSetId, stepsCopied: steps.length },
      });

      res.json({
        success: true,
        data: {
          caseId: newCaseId,
          scenarioId: newScenarioId,
          stepsCopied: steps.length,
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error copying reusable case:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/reusable-cases/from-case - Create a reusable case from an existing test case
router.post(
  '/from-case',
  (req: AuthenticatedRequest, res: Response<ApiResponse<FromCaseResponse>>): void => {
    const { releaseId, caseId, name, description } = req.body as FromCaseBody;
    const user = req.user?.eid || 'anonymous';

    if (!releaseId || !caseId) {
      res.status(400).json({
        success: false,
        error: 'releaseId and caseId are required',
      });
      return;
    }

    try {
      const db = getDb();

      // Get the test case from the unified database
      const testCase = db
        .prepare(
          `
        SELECT * FROM test_cases WHERE id = ? AND release_id = ?
      `
        )
        .get(caseId, releaseId) as TestCaseRow | undefined;

      if (!testCase) {
        res.status(404).json({ success: false, error: 'Test case not found' });
        return;
      }

      // Get all scenarios and their steps for this case
      const scenarios = db
        .prepare(
          `
        SELECT * FROM test_scenarios WHERE test_case_id = ? AND release_id = ? ORDER BY order_index ASC
      `
        )
        .all(caseId, releaseId) as TestScenarioRow[];

      // Collect all steps from all scenarios
      const allSteps: (TestStepRow & { order_index: number })[] = [];
      let stepIndex = 0;
      for (const scenario of scenarios) {
        const steps = db
          .prepare(
            `
          SELECT * FROM test_steps WHERE test_scenario_id = ? AND release_id = ? ORDER BY order_index ASC
        `
          )
          .all(scenario.id, releaseId) as TestStepRow[];

        for (const step of steps) {
          allSteps.push({ ...step, order_index: stepIndex++ });
        }
      }

      // Create the reusable case
      const reusableName = name || testCase.name;
      const reusableDesc = description || testCase.description;

      const result = db
        .prepare(
          `
        INSERT INTO reusable_cases (name, description, created_by)
        VALUES (?, ?, ?)
      `
        )
        .run(reusableName, reusableDesc || '', user);

      const reusableCaseId = result.lastInsertRowid;

      // Insert all steps
      if (allSteps.length > 0) {
        const insertStep = db.prepare(`
          INSERT INTO reusable_case_steps (
            reusable_case_id, order_index, step_definition, type, element_id,
            action, action_result, select_config_id, match_config_id, required, expected_results
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        allSteps.forEach((step) => {
          insertStep.run(
            reusableCaseId,
            step.order_index,
            step.step_definition || '',
            step.type || null,
            step.element_id || null,
            step.action || null,
            step.action_result || null,
            step.select_config_id || null,
            step.match_config_id || null,
            step.required ? 1 : 0,
            step.expected_results || null
          );
        });
      }

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'reusable_case',
        resourceId: reusableCaseId as number,
        resourceName: reusableName,
        releaseId: releaseId,
        details: { fromCaseId: caseId, stepsCopied: allSteps.length },
      });

      res.json({
        success: true,
        data: {
          id: reusableCaseId,
          name: reusableName,
          stepsCopied: allSteps.length,
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error creating reusable case from test case:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/reusable-cases/:id/steps - Get steps for a reusable case
router.get(
  '/:id/steps',
  (req: Request<IdParams>, res: Response<ApiResponse<ReusableCaseStepRow[]>>): void => {
    const { id } = req.params;

    try {
      const db = getDb();
      const steps = db
        .prepare(
          `
        SELECT * FROM reusable_case_steps
        WHERE reusable_case_id = ?
        ORDER BY order_index ASC
      `
        )
        .all(id) as ReusableCaseStepRow[];

      res.json({ success: true, data: steps });
    } catch (err) {
      const error = err as Error;
      console.error('Error getting reusable case steps:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/reusable-cases/:id/steps - Add a step to a reusable case
router.post(
  '/:id/steps',
  (
    req: Request<IdParams, unknown, ReusableCaseStepInput>,
    res: Response<ApiResponse<AddStepResponse>>
  ): void => {
    const { id } = req.params;
    const step = req.body;

    try {
      const db = getDb();

      // Get max order_index
      const maxOrder = db
        .prepare(
          `
        SELECT COALESCE(MAX(order_index), -1) as max_order
        FROM reusable_case_steps WHERE reusable_case_id = ?
      `
        )
        .get(id) as MaxOrderResult;
      const newOrderIndex = (maxOrder?.max_order ?? -1) + 1;

      const result = db
        .prepare(
          `
        INSERT INTO reusable_case_steps (
          reusable_case_id, order_index, step_definition, type, element_id,
          action, action_result, select_config_id, match_config_id, required, expected_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          id,
          step.order_index ?? newOrderIndex,
          step.step_definition || '',
          step.type || null,
          step.element_id || null,
          step.action || null,
          step.action_result || null,
          step.select_config_id || null,
          step.match_config_id || null,
          step.required ? 1 : 0,
          step.expected_results || null
        );

      res.json({
        success: true,
        data: { id: result.lastInsertRowid, order_index: newOrderIndex },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error adding step to reusable case:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/reusable-cases/:id/steps/:stepId - Update a step in a reusable case
router.patch(
  '/:id/steps/:stepId',
  (
    req: Request<StepParams, unknown, Record<string, unknown>>,
    res: Response<ApiResponse<undefined>>
  ): void => {
    const { id, stepId } = req.params;
    const updates = req.body;

    try {
      const db = getDb();

      const fields = Object.keys(updates)
        .map((f) => `${f} = ?`)
        .join(', ');
      const values = Object.values(updates);

      db.prepare(
        `
        UPDATE reusable_case_steps
        SET ${fields}
        WHERE id = ? AND reusable_case_id = ?
      `
      ).run(...values, stepId, id);

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      console.error('Error updating reusable case step:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/reusable-cases/:id/steps/:stepId - Delete a step from a reusable case
router.delete(
  '/:id/steps/:stepId',
  (req: Request<StepParams>, res: Response<ApiResponse<undefined>>): void => {
    const { id, stepId } = req.params;

    try {
      const db = getDb();
      db.prepare(
        `
        DELETE FROM reusable_case_steps
        WHERE id = ? AND reusable_case_id = ?
      `
      ).run(stepId, id);

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      console.error('Error deleting reusable case step:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/reusable-cases/:id/steps/reorder - Reorder steps in a reusable case
router.put(
  '/:id/steps/reorder',
  (
    req: Request<IdParams, unknown, ReorderStepsBody>,
    res: Response<ApiResponse<undefined>>
  ): void => {
    const { id } = req.params;
    const { steps } = req.body;

    try {
      const db = getDb();

      const updateStep = db.prepare(`
        UPDATE reusable_case_steps
        SET order_index = ?
        WHERE id = ? AND reusable_case_id = ?
      `);

      const reorderTransaction = db.transaction((stepsToReorder: { id: number }[]) => {
        stepsToReorder.forEach((step, index) => {
          updateStep.run(index, step.id, id);
        });
      });

      reorderTransaction(steps);

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      console.error('Error reordering reusable case steps:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/reusable-cases/:id/steps - Sync all steps (bulk update)
router.put(
  '/:id/steps',
  (req: Request<IdParams, unknown, SyncStepsBody>, res: Response<ApiResponse<undefined>>): void => {
    const { id } = req.params;
    const { steps } = req.body;

    try {
      const db = getDb();

      const syncTransaction = db.transaction((stepsToSync: ReusableCaseStepInput[]) => {
        // Delete existing steps
        db.prepare('DELETE FROM reusable_case_steps WHERE reusable_case_id = ?').run(id);

        // Insert new steps
        const insertStep = db.prepare(`
          INSERT INTO reusable_case_steps (
            reusable_case_id, order_index, step_definition, type, element_id,
            action, action_result, select_config_id, match_config_id, required, expected_results
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stepsToSync.forEach((step, index) => {
          insertStep.run(
            id,
            step.order_index ?? index,
            step.step_definition || '',
            step.type || null,
            step.element_id || null,
            step.action || null,
            step.action_result || null,
            step.select_config_id || null,
            step.match_config_id || null,
            step.required ? 1 : 0,
            step.expected_results || null
          );
        });
      });

      syncTransaction(steps);

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      console.error('Error syncing reusable case steps:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
