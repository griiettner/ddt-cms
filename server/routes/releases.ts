import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { DatabaseWrapper } from '../db/database.js';
import type {
  AuthenticatedRequest,
  ReleaseRow,
  TotalResult,
  CountResult,
  PaginatedApiResponse,
} from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

const router: Router = express.Router();

// Query types
interface ReleasesListQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

interface ReleaseIdParams {
  id: string;
  [key: string]: string;
}

// Request body types
interface CreateReleaseBody {
  release_number: string;
  description?: string;
  notes?: string;
}

interface UpdateReleaseBody {
  release_number?: string;
  description?: string;
  notes?: string;
}

// Response types
interface ReleaseWithCounts extends ReleaseRow {
  testSetCount: number;
  testCaseCount: number;
}

// GET /api/releases/latest-active - Get the latest active (open) release
router.get('/latest-active', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();

    // Get the latest open release (most recently created)
    const release = await db.get<ReleaseRow>(
      `SELECT * FROM releases
       WHERE status = 'open'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (!release) {
      res.status(404).json({
        success: false,
        error: 'No active release found. Please create or open a release first.',
      });
      return;
    }

    // Get counts for the release
    const testSetResult = await db.get<CountResult>(
      'SELECT COUNT(*) as count FROM test_sets WHERE release_id = ?',
      [release.id]
    );
    const testSetCount = testSetResult?.count ?? 0;

    const testCaseResult = await db.get<CountResult>(
      'SELECT COUNT(*) as count FROM test_cases WHERE release_id = ?',
      [release.id]
    );
    const testCaseCount = testCaseResult?.count ?? 0;

    const data: ReleaseWithCounts = { ...release, testSetCount, testCaseCount };
    res.json({ success: true, data });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/releases - List all releases with pagination and filters
router.get(
  '/',
  async (
    req: Request<object, unknown, unknown, ReleasesListQuery>,
    res: Response
  ): Promise<void> => {
    const {
      page = '1',
      limit = '10',
      search = '',
      status = '',
      from_date = '',
      to_date = '',
    } = req.query;
    const pageNum: number = parseInt(page as string);
    const limitNum: number = parseInt(limit as string);
    const offset: number = (pageNum - 1) * limitNum;

    try {
      const db = getDb();
      let query = 'SELECT * FROM releases WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM releases WHERE 1=1';
      const params: (string | number)[] = [];

      if (search) {
        const searchPattern = `%${search}%`;
        query += ' AND (release_number LIKE ? OR description LIKE ?)';
        countQuery += ' AND (release_number LIKE ? OR description LIKE ?)';
        params.push(searchPattern, searchPattern);
      }

      if (status) {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
      }

      if (from_date) {
        query += ' AND created_at >= ?';
        countQuery += ' AND created_at >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND created_at <= ?';
        countQuery += ' AND created_at <= ?';
        params.push(to_date);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

      const totalResult = await db.get<TotalResult>(countQuery, params);
      const total: number = totalResult?.total ?? 0;
      const releases = await db.all<ReleaseRow>(query, [...params, limitNum, offset]);

      // Fetch counts for each release from the unified database
      const data: ReleaseWithCounts[] = [];
      for (const r of releases) {
        const testSetResult = await db.get<CountResult>(
          'SELECT COUNT(*) as count FROM test_sets WHERE release_id = ?',
          [r.id]
        );
        const testSetCount = testSetResult?.count ?? 0;

        const testCaseResult = await db.get<CountResult>(
          'SELECT COUNT(*) as count FROM test_cases WHERE release_id = ?',
          [r.id]
        );
        const testCaseCount = testCaseResult?.count ?? 0;

        data.push({ ...r, testSetCount, testCaseCount });
      }

      const response: PaginatedApiResponse<ReleaseWithCounts> = {
        success: true,
        data,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      };
      res.json(response);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/releases - Create new release
router.post(
  '/',
  async (req: Request<object, unknown, CreateReleaseBody>, res: Response): Promise<void> => {
    const { release_number, description, notes } = req.body;
    const authReq = req as AuthenticatedRequest;
    const user: string = authReq.user?.eid || 'anonymous';

    if (!release_number) {
      res.status(400).json({ success: false, error: 'Release number is required' });
      return;
    }

    try {
      const db = getDb();

      // Check if release number already exists
      const existing = await db.get<ReleaseRow>(
        'SELECT id FROM releases WHERE release_number = ?',
        [release_number]
      );
      if (existing) {
        res.status(400).json({ success: false, error: 'Release number already exists' });
        return;
      }

      // Find the latest release to copy data from (regardless of status)
      const latestRelease = await db.get<ReleaseRow>(
        'SELECT id FROM releases ORDER BY created_at DESC LIMIT 1'
      );

      // Insert the new release
      const result = await db.run(
        'INSERT INTO releases (release_number, description, notes, created_by, status) VALUES (?, ?, ?, ?, ?)',
        [release_number, description || '', notes || '', user, 'open']
      );
      const newReleaseId = Number(result.lastInsertRowid);

      // If there's a previous release, copy its test data to the new release
      if (latestRelease) {
        await copyReleaseData(db, latestRelease.id, newReleaseId);
      } else {
        // Seed default configuration options for the new release
        await seedDefaultConfig(db, newReleaseId);
      }

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'release',
        resourceId: newReleaseId,
        resourceName: release_number,
      });

      res.json({ success: true, data: { id: newReleaseId, release_number } });
    } catch (err) {
      const error = err as Error;
      console.error('[POST /api/releases] Error:', error.message);
      console.error('[POST /api/releases] Stack:', error.stack);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * Copy test data from one release to another
 */
async function copyReleaseData(
  db: DatabaseWrapper,
  sourceReleaseId: number,
  targetReleaseId: number
): Promise<void> {
  // ID mappings for foreign key references
  const testSetMapping = new Map<number, number>();
  const testCaseMapping = new Map<number, number>();
  const scenarioMapping = new Map<number, number>();

  // Copy test_sets
  interface TestSetRow {
    id: number;
    category_id: number | null;
    name: string;
    description: string | null;
    created_at: string;
    created_by: string | null;
  }
  const testSets = await db.all<TestSetRow>('SELECT * FROM test_sets WHERE release_id = ?', [
    sourceReleaseId,
  ]);

  for (const ts of testSets) {
    const result = await db.run(
      'INSERT INTO test_sets (release_id, category_id, name, description, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [targetReleaseId, ts.category_id, ts.name, ts.description, ts.created_at, ts.created_by]
    );
    testSetMapping.set(ts.id, Number(result.lastInsertRowid));
  }

  // Copy test_cases
  interface TestCaseRow {
    id: number;
    test_set_id: number;
    name: string;
    description: string | null;
    order_index: number;
    created_at: string;
  }
  const testCases = await db.all<TestCaseRow>('SELECT * FROM test_cases WHERE release_id = ?', [
    sourceReleaseId,
  ]);

  for (const tc of testCases) {
    const newTestSetId = testSetMapping.get(tc.test_set_id);
    if (newTestSetId !== undefined) {
      const result = await db.run(
        'INSERT INTO test_cases (release_id, test_set_id, name, description, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [targetReleaseId, newTestSetId, tc.name, tc.description, tc.order_index, tc.created_at]
      );
      testCaseMapping.set(tc.id, Number(result.lastInsertRowid));
    }
  }

  // Copy test_scenarios
  interface TestScenarioRow {
    id: number;
    test_case_id: number;
    name: string;
    description: string | null;
    order_index: number;
    created_at: string;
  }
  const scenarios = await db.all<TestScenarioRow>(
    'SELECT * FROM test_scenarios WHERE release_id = ?',
    [sourceReleaseId]
  );

  for (const sc of scenarios) {
    const newTestCaseId = testCaseMapping.get(sc.test_case_id);
    if (newTestCaseId !== undefined) {
      const result = await db.run(
        'INSERT INTO test_scenarios (release_id, test_case_id, name, description, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [targetReleaseId, newTestCaseId, sc.name, sc.description, sc.order_index, sc.created_at]
      );
      scenarioMapping.set(sc.id, Number(result.lastInsertRowid));
    }
  }

  // Copy test_steps
  interface TestStepRow {
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
    created_at: string;
    updated_at: string;
  }
  const steps = await db.all<TestStepRow>('SELECT * FROM test_steps WHERE release_id = ?', [
    sourceReleaseId,
  ]);

  for (const step of steps) {
    const newScenarioId = scenarioMapping.get(step.test_scenario_id);
    if (newScenarioId !== undefined) {
      await db.run(
        `INSERT INTO test_steps (
          release_id, test_scenario_id, order_index, step_definition, type, element_id,
          action, action_result, select_config_id, match_config_id, required, expected_results,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetReleaseId,
          newScenarioId,
          step.order_index,
          step.step_definition,
          step.type,
          step.element_id,
          step.action,
          step.action_result,
          step.select_config_id,
          step.match_config_id,
          step.required,
          step.expected_results,
          step.created_at,
          step.updated_at,
        ]
      );
    }
  }

  // Copy configuration_options (release-specific)
  interface ConfigOptionRow {
    category: string;
    key: string;
    display_name: string;
    result_type: string | null;
    default_value: string | null;
    config_data: string | null;
    is_active: number;
    order_index: number;
  }
  const configs = await db.all<ConfigOptionRow>(
    'SELECT * FROM configuration_options WHERE release_id = ?',
    [sourceReleaseId]
  );

  for (const config of configs) {
    await db.run(
      `INSERT INTO configuration_options (
        release_id, category, key, display_name, result_type, default_value, config_data, is_active, order_index
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetReleaseId,
        config.category,
        config.key,
        config.display_name,
        config.result_type,
        config.default_value,
        config.config_data,
        config.is_active,
        config.order_index,
      ]
    );
  }
}

/**
 * Seed default configuration options for a new release
 */
async function seedDefaultConfig(db: DatabaseWrapper, releaseId: number): Promise<void> {
  const types = [
    { key: 'button-click', name: 'button-click' },
    { key: 'button-click-redirect', name: 'button-click-redirect' },
    { key: 'field-checkbox', name: 'field-checkbox' },
    { key: 'field-error', name: 'field-error' },
    { key: 'field-input', name: 'field-input' },
    { key: 'field-label', name: 'field-label' },
    { key: 'field-options', name: 'field-options' },
    { key: 'field-radio', name: 'field-radio' },
    { key: 'field-select', name: 'field-select' },
    { key: 'field-textarea', name: 'field-textarea' },
    { key: 'text-link', name: 'text-link' },
    { key: 'text-plain', name: 'text-plain' },
    { key: 'ui-card', name: 'ui-card' },
    { key: 'ui-element', name: 'ui-element' },
    { key: 'url-validate', name: 'url-validate' },
    { key: 'url-visit', name: 'url-visit' },
  ];

  const actions = [
    { key: 'Active', name: 'Active', result_type: 'text' },
    { key: 'Click', name: 'Click', result_type: 'disabled' },
    { key: 'Custom Select', name: 'Custom Select', result_type: 'select' },
    { key: 'Options Match', name: 'Options Match', result_type: 'array' },
    { key: 'Text Match', name: 'Text Match', result_type: 'text' },
    { key: 'Text Plain', name: 'Text Plain', result_type: 'text' },
    { key: 'URL', name: 'URL', result_type: 'select' },
    { key: 'Visible', name: 'Visible', result_type: 'bool' },
  ];

  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    await db.run(
      'INSERT INTO configuration_options (release_id, category, key, display_name, result_type, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      [releaseId, 'type', t.key, t.name, null, i]
    );
  }

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    await db.run(
      'INSERT INTO configuration_options (release_id, category, key, display_name, result_type, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      [releaseId, 'action', a.key, a.name, a.result_type, i]
    );
  }
}

// PATCH /api/releases/:id - Update release details or notes
router.patch(
  '/:id',
  async (
    req: Request<ReleaseIdParams, unknown, UpdateReleaseBody>,
    res: Response
  ): Promise<void> => {
    const { release_number, description, notes } = req.body;
    const db = getDb();

    try {
      // Fetch the old release data for audit logging
      const oldRelease = await db.get<ReleaseRow>(
        'SELECT release_number, description, notes, status FROM releases WHERE id = ?',
        [req.params.id]
      );
      if (!oldRelease) {
        res.status(404).json({ success: false, error: 'Release not found' });
        return;
      }

      let query = 'UPDATE releases SET ';
      const params: (string | number)[] = [];
      const fields: string[] = [];
      if (release_number !== undefined) {
        fields.push('release_number = ?');
        params.push(release_number);
      }
      if (description !== undefined) {
        fields.push('description = ?');
        params.push(description);
      }
      if (notes !== undefined) {
        fields.push('notes = ?');
        params.push(notes);
      }

      if (fields.length === 0) {
        res.json({ success: true });
        return;
      }

      query += fields.join(', ') + ' WHERE id = ?';
      params.push(req.params.id);

      await db.run(query, params);

      // Build old and new value objects for changed fields only
      const oldValue: Record<string, unknown> = {};
      const newValue: Record<string, unknown> = {};
      if (release_number !== undefined && release_number !== oldRelease.release_number) {
        oldValue.release_number = oldRelease.release_number;
        newValue.release_number = release_number;
      }
      if (description !== undefined && description !== oldRelease.description) {
        oldValue.description = oldRelease.description;
        newValue.description = description;
      }
      if (notes !== undefined && notes !== oldRelease.notes) {
        oldValue.notes = oldRelease.notes;
        newValue.notes = notes;
      }

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'release',
        resourceId: parseInt(req.params.id),
        resourceName: release_number || oldRelease.release_number,
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

// Actions
router.put('/:id/draft', async (req: Request<ReleaseIdParams>, res: Response): Promise<void> => {
  try {
    const db = getDb();
    await db.run("UPDATE releases SET status = 'draft' WHERE id = ?", [req.params.id]);

    logAudit({
      req,
      action: 'UPDATE',
      resourceType: 'release',
      resourceId: parseInt(req.params.id),
      details: { status: 'draft' },
    });

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/close', async (req: Request<ReleaseIdParams>, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const authReq = req as AuthenticatedRequest;
    await db.run(
      "UPDATE releases SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ? WHERE id = ?",
      [authReq.user?.eid || 'anonymous', req.params.id]
    );

    logAudit({
      req,
      action: 'UPDATE',
      resourceType: 'release',
      resourceId: parseInt(req.params.id),
      details: { status: 'closed' },
    });

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/reopen', async (req: Request<ReleaseIdParams>, res: Response): Promise<void> => {
  try {
    const db = getDb();
    await db.run(
      "UPDATE releases SET status = 'open', closed_at = NULL, closed_by = NULL WHERE id = ?",
      [req.params.id]
    );

    logAudit({
      req,
      action: 'UPDATE',
      resourceType: 'release',
      resourceId: parseInt(req.params.id),
      details: { status: 'open' },
    });

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/archive', async (req: Request<ReleaseIdParams>, res: Response): Promise<void> => {
  try {
    const db = getDb();
    await db.run("UPDATE releases SET status = 'archived' WHERE id = ?", [req.params.id]);

    logAudit({
      req,
      action: 'UPDATE',
      resourceType: 'release',
      resourceId: parseInt(req.params.id),
      details: { status: 'archived' },
    });

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req: Request<ReleaseIdParams>, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const release = await db.get<ReleaseRow>('SELECT status FROM releases WHERE id = ?', [
      req.params.id,
    ]);
    if (!release) {
      res.status(404).json({ success: false, error: 'Release not found' });
      return;
    }

    if (release.status !== 'open') {
      res.status(400).json({ success: false, error: 'Only open releases can be deleted' });
      return;
    }

    // With CASCADE deletes enabled, this will automatically delete:
    // - test_sets
    // - test_cases
    // - test_scenarios
    // - test_steps
    // - configuration_options
    // - test_runs
    await db.run('DELETE FROM releases WHERE id = ?', [req.params.id]);

    logAudit({
      req,
      action: 'DELETE',
      resourceType: 'release',
      resourceId: parseInt(req.params.id),
      resourceName: release.status,
    });

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
