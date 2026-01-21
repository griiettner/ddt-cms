import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type {
  AuthenticatedRequest,
  ReleaseRow,
  TotalResult,
  CountResult,
  PaginatedApiResponse,
} from '../types/index.js';

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

// GET /api/releases - List all releases with pagination and filters
router.get(
  '/',
  (req: Request<object, unknown, unknown, ReleasesListQuery>, res: Response): void => {
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

      const totalResult = db.prepare(countQuery).get(...params) as TotalResult;
      const total: number = totalResult.total;
      const releases = db.prepare(query).all(...params, limitNum, offset) as ReleaseRow[];

      // Fetch counts for each release from the unified database
      const data: ReleaseWithCounts[] = releases.map((r: ReleaseRow): ReleaseWithCounts => {
        const testSetCount = (
          db
            .prepare('SELECT COUNT(*) as count FROM test_sets WHERE release_id = ?')
            .get(r.id) as CountResult
        ).count;
        const testCaseCount = (
          db
            .prepare('SELECT COUNT(*) as count FROM test_cases WHERE release_id = ?')
            .get(r.id) as CountResult
        ).count;

        return { ...r, testSetCount, testCaseCount };
      });

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
      const existing = db
        .prepare('SELECT id FROM releases WHERE release_number = ?')
        .get(release_number) as ReleaseRow | undefined;
      if (existing) {
        res.status(400).json({ success: false, error: 'Release number already exists' });
        return;
      }

      // Find the latest open release to copy data from
      const latestRelease = db
        .prepare("SELECT id FROM releases WHERE status = 'open' ORDER BY created_at DESC LIMIT 1")
        .get() as ReleaseRow | undefined;

      // Insert the new release
      const stmt = db.prepare(
        'INSERT INTO releases (release_number, description, notes, created_by, status) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(release_number, description || '', notes || '', user, 'open');
      const newReleaseId = result.lastInsertRowid;

      // If there's a previous release, copy its test data to the new release
      if (latestRelease) {
        copyReleaseData(db, latestRelease.id, newReleaseId as number);
      } else {
        // Seed default configuration options for the new release
        seedDefaultConfig(db, newReleaseId as number);
      }

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
function copyReleaseData(
  db: ReturnType<typeof getDb>,
  sourceReleaseId: number,
  targetReleaseId: number
): void {
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
  const testSets = db
    .prepare('SELECT * FROM test_sets WHERE release_id = ?')
    .all(sourceReleaseId) as TestSetRow[];

  const insertTestSet = db.prepare(
    'INSERT INTO test_sets (release_id, category_id, name, description, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const ts of testSets) {
    const result = insertTestSet.run(
      targetReleaseId,
      ts.category_id,
      ts.name,
      ts.description,
      ts.created_at,
      ts.created_by
    );
    testSetMapping.set(ts.id, result.lastInsertRowid as number);
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
  const testCases = db
    .prepare('SELECT * FROM test_cases WHERE release_id = ?')
    .all(sourceReleaseId) as TestCaseRow[];

  const insertTestCase = db.prepare(
    'INSERT INTO test_cases (release_id, test_set_id, name, description, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const tc of testCases) {
    const newTestSetId = testSetMapping.get(tc.test_set_id);
    if (newTestSetId !== undefined) {
      const result = insertTestCase.run(
        targetReleaseId,
        newTestSetId,
        tc.name,
        tc.description,
        tc.order_index,
        tc.created_at
      );
      testCaseMapping.set(tc.id, result.lastInsertRowid as number);
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
  const scenarios = db
    .prepare('SELECT * FROM test_scenarios WHERE release_id = ?')
    .all(sourceReleaseId) as TestScenarioRow[];

  const insertScenario = db.prepare(
    'INSERT INTO test_scenarios (release_id, test_case_id, name, description, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  for (const sc of scenarios) {
    const newTestCaseId = testCaseMapping.get(sc.test_case_id);
    if (newTestCaseId !== undefined) {
      const result = insertScenario.run(
        targetReleaseId,
        newTestCaseId,
        sc.name,
        sc.description,
        sc.order_index,
        sc.created_at
      );
      scenarioMapping.set(sc.id, result.lastInsertRowid as number);
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
  const steps = db
    .prepare('SELECT * FROM test_steps WHERE release_id = ?')
    .all(sourceReleaseId) as TestStepRow[];

  const insertStep = db.prepare(`
    INSERT INTO test_steps (
      release_id, test_scenario_id, order_index, step_definition, type, element_id,
      action, action_result, select_config_id, match_config_id, required, expected_results,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const step of steps) {
    const newScenarioId = scenarioMapping.get(step.test_scenario_id);
    if (newScenarioId !== undefined) {
      insertStep.run(
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
        step.updated_at
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
  const configs = db
    .prepare('SELECT * FROM configuration_options WHERE release_id = ?')
    .all(sourceReleaseId) as ConfigOptionRow[];

  const insertConfig = db.prepare(`
    INSERT INTO configuration_options (
      release_id, category, key, display_name, result_type, default_value, config_data, is_active, order_index
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const config of configs) {
    insertConfig.run(
      targetReleaseId,
      config.category,
      config.key,
      config.display_name,
      config.result_type,
      config.default_value,
      config.config_data,
      config.is_active,
      config.order_index
    );
  }
}

/**
 * Seed default configuration options for a new release
 */
function seedDefaultConfig(db: ReturnType<typeof getDb>, releaseId: number): void {
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

  const insertConfig = db.prepare(`
    INSERT INTO configuration_options (release_id, category, key, display_name, result_type, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  types.forEach((t, i) => insertConfig.run(releaseId, 'type', t.key, t.name, null, i));
  actions.forEach((a, i) => insertConfig.run(releaseId, 'action', a.key, a.name, a.result_type, i));
}

// PATCH /api/releases/:id - Update release details or notes
router.patch(
  '/:id',
  (req: Request<ReleaseIdParams, unknown, UpdateReleaseBody>, res: Response): void => {
    const { release_number, description, notes } = req.body;
    const db = getDb();

    try {
      const release = db.prepare('SELECT status FROM releases WHERE id = ?').get(req.params.id) as
        | ReleaseRow
        | undefined;
      if (!release) {
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

      db.prepare(query).run(...params);
      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Actions
router.put('/:id/close', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const db = getDb();
    const authReq = req as AuthenticatedRequest;
    db.prepare(
      "UPDATE releases SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ? WHERE id = ?"
    ).run(authReq.user.eid, req.params.id);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/reopen', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const db = getDb();
    db.prepare(
      "UPDATE releases SET status = 'open', closed_at = NULL, closed_by = NULL WHERE id = ?"
    ).run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/archive', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const db = getDb();
    db.prepare("UPDATE releases SET status = 'archived' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const db = getDb();
    const release = db.prepare('SELECT status FROM releases WHERE id = ?').get(req.params.id) as
      | ReleaseRow
      | undefined;
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
    db.prepare('DELETE FROM releases WHERE id = ?').run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
