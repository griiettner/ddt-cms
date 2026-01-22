import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getRegistryDb, getDb } from '../db/database.js';
import type { TestRunRow, TotalResult, ApiResponse, TestRunStepRow } from '../types/index.js';
import {
  testExecutionQueue,
  getTestRunSteps,
  type ProgressUpdate,
} from '../services/testExecutionQueue.js';

const router: Router = express.Router();

// Request param types
interface IdParams {
  id: string;
}

// Query types
interface ListTestRunsQuery {
  releaseId?: string;
  page?: string;
  pageSize?: string;
  status?: string;
  executedBy?: string;
  startDate?: string;
  endDate?: string;
  testSetId?: string;
  testSetName?: string;
  environment?: string;
}

// Request body types
interface CreateTestRunBody {
  releaseId: number;
  testSetId?: number;
  testSetName?: string;
  status?: 'passed' | 'failed' | 'running';
  executedBy?: string;
  durationMs?: number;
  totalScenarios?: number;
  totalSteps?: number;
  passedSteps?: number;
  failedSteps?: number;
  failedDetails?: unknown[];
}

interface UpdateTestRunBody {
  status?: 'passed' | 'failed' | 'running';
  executedBy?: string;
  durationMs?: number;
  totalScenarios?: number;
  totalSteps?: number;
  passedSteps?: number;
  failedSteps?: number;
  failedDetails?: unknown[];
  testSetId?: number;
  testSetName?: string;
  [key: string]: unknown;
}

// Response data types
interface TestRunWithRelease extends Omit<TestRunRow, 'failed_details'> {
  release_number?: string;
  failed_details: unknown[];
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface TestRunsListResponse {
  success: true;
  data: TestRunWithRelease[];
  pagination: PaginationInfo;
}

interface CreateTestRunResponse {
  id: number | bigint;
}

// GET /api/test-runs - List test runs with pagination and filters
router.get(
  '/',
  (
    req: Request<unknown, unknown, unknown, ListTestRunsQuery>,
    res: Response<TestRunsListResponse | { success: false; error: string }>
  ): void => {
    const {
      releaseId,
      page = '1',
      pageSize = '10',
      status,
      executedBy,
      startDate,
      endDate,
      testSetId,
      testSetName,
      environment,
    } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const offset = (pageNum - 1) * limit;

    try {
      const db = getRegistryDb();

      // Build WHERE clauses
      const conditions: string[] = [];
      const countParams: (string | number)[] = [];
      const queryParams: (string | number)[] = [];

      if (releaseId) {
        conditions.push('tr.release_id = ?');
        countParams.push(releaseId);
        queryParams.push(releaseId);
      }

      if (status) {
        conditions.push('tr.status = ?');
        countParams.push(status);
        queryParams.push(status);
      }

      if (executedBy) {
        conditions.push('tr.executed_by LIKE ?');
        const searchTerm = `%${executedBy}%`;
        countParams.push(searchTerm);
        queryParams.push(searchTerm);
      }

      if (startDate) {
        conditions.push('tr.executed_at >= ?');
        countParams.push(startDate);
        queryParams.push(startDate);
      }

      if (endDate) {
        // Add one day to include the end date
        conditions.push("tr.executed_at < date(?, '+1 day')");
        countParams.push(endDate);
        queryParams.push(endDate);
      }

      if (testSetId) {
        conditions.push('tr.test_set_id = ?');
        countParams.push(testSetId);
        queryParams.push(testSetId);
      }

      if (testSetName) {
        conditions.push('tr.test_set_name LIKE ?');
        const searchTerm = `%${testSetName}%`;
        countParams.push(searchTerm);
        queryParams.push(searchTerm);
      }

      if (environment) {
        conditions.push('tr.environment = ?');
        countParams.push(environment);
        queryParams.push(environment);
      }

      const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM test_runs tr${whereClause}`;
      const { total } = db.prepare(countQuery).get(...countParams) as TotalResult;

      // Get paginated data
      const dataQuery = `
        SELECT
          tr.*,
          r.release_number
        FROM test_runs tr
        LEFT JOIN releases r ON tr.release_id = r.id
        ${whereClause}
        ORDER BY tr.executed_at DESC
        LIMIT ? OFFSET ?
      `;
      queryParams.push(limit, offset);

      const runs = db.prepare(dataQuery).all(...queryParams) as (TestRunRow & {
        release_number?: string;
      })[];

      // Parse failed_details JSON
      const parsedRuns: TestRunWithRelease[] = runs.map((run) => ({
        ...run,
        failed_details: run.failed_details ? (JSON.parse(run.failed_details) as unknown[]) : [],
      }));

      res.json({
        success: true,
        data: parsedRuns,
        pagination: {
          page: pageNum,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Filter options response type
interface FilterOptionsResponse {
  environments: string[];
  executedBy: string[];
  testSets: { id: number; name: string }[];
}

// GET /api/test-runs/filter-options - Get unique values for filters
router.get(
  '/filter-options',
  (
    req: Request<unknown, unknown, unknown, { releaseId?: string }>,
    res: Response<ApiResponse<FilterOptionsResponse>>
  ): void => {
    const { releaseId } = req.query;

    try {
      const db = getRegistryDb();

      const whereClause = releaseId ? ' WHERE release_id = ?' : '';
      const params = releaseId ? [releaseId] : [];

      // Get distinct environments
      const environments = db
        .prepare(
          `SELECT DISTINCT environment FROM test_runs${whereClause} AND environment IS NOT NULL ORDER BY environment`
            .replace('AND', releaseId ? 'AND' : 'WHERE')
            .replace(' WHERE AND', ' WHERE')
        )
        .all(...params) as { environment: string }[];

      // Get distinct executed_by values
      const executedBy = db
        .prepare(
          `SELECT DISTINCT executed_by FROM test_runs${whereClause} AND executed_by IS NOT NULL ORDER BY executed_by`
            .replace('AND', releaseId ? 'AND' : 'WHERE')
            .replace(' WHERE AND', ' WHERE')
        )
        .all(...params) as { executed_by: string }[];

      // Get distinct test sets with their IDs
      const testSets = db
        .prepare(
          `SELECT DISTINCT test_set_id, test_set_name FROM test_runs${whereClause} AND test_set_id IS NOT NULL ORDER BY test_set_name`
            .replace('AND', releaseId ? 'AND' : 'WHERE')
            .replace(' WHERE AND', ' WHERE')
        )
        .all(...params) as { test_set_id: number; test_set_name: string }[];

      res.json({
        success: true,
        data: {
          environments: environments.map((e) => e.environment),
          executedBy: executedBy.map((e) => e.executed_by),
          testSets: testSets.map((ts) => ({ id: ts.test_set_id, name: ts.test_set_name })),
        },
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/:id - Get a specific test run
router.get(
  '/:id',
  (req: Request<IdParams>, res: Response<ApiResponse<TestRunWithRelease>>): void => {
    const { id } = req.params;

    try {
      const db = getRegistryDb();
      const run = db
        .prepare(
          `
        SELECT
          tr.*,
          r.release_number
        FROM test_runs tr
        LEFT JOIN releases r ON tr.release_id = r.id
        WHERE tr.id = ?
      `
        )
        .get(id) as (TestRunRow & { release_number?: string }) | undefined;

      if (!run) {
        res.status(404).json({ success: false, error: 'Test run not found' });
        return;
      }

      // Parse failed_details JSON
      const parsedRun: TestRunWithRelease = {
        ...run,
        failed_details: run.failed_details ? (JSON.parse(run.failed_details) as unknown[]) : [],
      };

      res.json({ success: true, data: parsedRun });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/test-runs - Create a new test run
router.post(
  '/',
  (
    req: Request<unknown, unknown, CreateTestRunBody>,
    res: Response<ApiResponse<CreateTestRunResponse>>
  ): void => {
    const {
      releaseId,
      testSetId,
      testSetName,
      status,
      executedBy,
      durationMs,
      totalScenarios,
      totalSteps,
      passedSteps,
      failedSteps,
      failedDetails,
    } = req.body;

    if (!releaseId) {
      res.status(400).json({ success: false, error: 'releaseId is required' });
      return;
    }

    try {
      const db = getRegistryDb();
      const stmt = db.prepare(`
        INSERT INTO test_runs (
          release_id,
          test_set_id,
          test_set_name,
          status,
          executed_by,
          duration_ms,
          total_scenarios,
          total_steps,
          passed_steps,
          failed_steps,
          failed_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        releaseId,
        testSetId || null,
        testSetName || null,
        status || 'running',
        executedBy || null,
        durationMs || 0,
        totalScenarios || 0,
        totalSteps || 0,
        passedSteps || 0,
        failedSteps || 0,
        failedDetails ? JSON.stringify(failedDetails) : null
      );

      res.json({
        success: true,
        data: { id: result.lastInsertRowid },
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/test-runs/:id - Update a test run (for updating status after completion)
router.patch(
  '/:id',
  (
    req: Request<IdParams, unknown, UpdateTestRunBody>,
    res: Response<ApiResponse<undefined>>
  ): void => {
    const { id } = req.params;
    const updates = { ...req.body };

    try {
      const db = getRegistryDb();

      // Handle failed_details serialization
      if (updates.failedDetails !== undefined) {
        (updates as Record<string, unknown>).failed_details = JSON.stringify(updates.failedDetails);
        delete updates.failedDetails;
      }

      // Convert camelCase to snake_case for database
      const fieldMap: Record<string, string> = {
        durationMs: 'duration_ms',
        totalScenarios: 'total_scenarios',
        totalSteps: 'total_steps',
        passedSteps: 'passed_steps',
        failedSteps: 'failed_steps',
        executedBy: 'executed_by',
        testSetId: 'test_set_id',
        testSetName: 'test_set_name',
      };

      const dbUpdates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        const dbKey = fieldMap[key] || key;
        dbUpdates[dbKey] = value;
      }

      const fields = Object.keys(dbUpdates)
        .map((f) => `${f} = ?`)
        .join(', ');
      const values = Object.values(dbUpdates);

      const stmt = db.prepare(`UPDATE test_runs SET ${fields} WHERE id = ?`);
      stmt.run(...values, id);

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ================================
// Playwright Execution Endpoints
// ================================

// Request body for execute
interface ExecuteTestRunBody {
  releaseId: number;
  environment: string;
}

// Request params for execute
interface ExecuteParams {
  testSetId: string;
}

// Response types
interface ExecuteResponse {
  testRunId: number;
  status: 'queued' | 'running';
  queuePosition?: number;
}

interface StatusResponse extends TestRunWithRelease {
  steps: TestRunStepRow[];
  queueStatus: {
    isRunning: boolean;
    queuePosition: number | null;
  };
  progress: ProgressUpdate | null;
}

// POST /api/test-runs/execute/:testSetId - Start Playwright execution
router.post(
  '/execute/:testSetId',
  (
    req: Request<ExecuteParams, unknown, ExecuteTestRunBody>,
    res: Response<ApiResponse<ExecuteResponse>>
  ): void => {
    const { testSetId } = req.params;
    const { releaseId, environment } = req.body;

    if (!releaseId || !environment) {
      res.status(400).json({ success: false, error: 'releaseId and environment are required' });
      return;
    }

    try {
      const db = getDb();

      // Get environment URL
      const envConfig = db
        .prepare(
          `
          SELECT value FROM environment_configs
          WHERE (release_id = ? OR release_id IS NULL)
            AND environment = ?
          ORDER BY release_id DESC NULLS LAST
          LIMIT 1
        `
        )
        .get(releaseId, environment.toLowerCase()) as { value: string } | undefined;

      if (!envConfig) {
        res.status(400).json({
          success: false,
          error: `Environment "${environment}" not configured. Please configure it in Settings.`,
        });
        return;
      }

      // Get test set name
      const testSet = db
        .prepare('SELECT name FROM test_sets WHERE id = ? AND release_id = ?')
        .get(testSetId, releaseId) as { name: string } | undefined;

      if (!testSet) {
        res.status(404).json({ success: false, error: 'Test set not found' });
        return;
      }

      // Create test run record
      const result = db
        .prepare(
          `
          INSERT INTO test_runs (
            release_id, test_set_id, test_set_name, status, environment, base_url, executed_by
          ) VALUES (?, ?, ?, 'running', ?, ?, ?)
        `
        )
        .run(
          releaseId,
          testSetId,
          testSet.name,
          environment,
          envConfig.value,
          req.user?.eid || null
        );

      const testRunId = Number(result.lastInsertRowid);

      // Add to execution queue
      testExecutionQueue.enqueue({
        testRunId,
        testSetId: parseInt(testSetId, 10),
        releaseId,
        baseUrl: envConfig.value,
      });

      // Get queue status
      const queueStatus = testExecutionQueue.getStatus();
      const queuePosition = queueStatus.pending.findIndex((p) => p.testRunId === testRunId);

      res.json({
        success: true,
        data: {
          testRunId,
          status: queuePosition === -1 ? 'running' : 'queued',
          queuePosition: queuePosition === -1 ? undefined : queuePosition + 1,
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Execute error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/:id/status - Get test run status with step-level results
router.get(
  '/:id/status',
  (req: Request<IdParams>, res: Response<ApiResponse<StatusResponse>>): void => {
    const { id } = req.params;

    try {
      const db = getRegistryDb();
      const run = db
        .prepare(
          `
          SELECT
            tr.*,
            r.release_number
          FROM test_runs tr
          LEFT JOIN releases r ON tr.release_id = r.id
          WHERE tr.id = ?
        `
        )
        .get(id) as (TestRunRow & { release_number?: string }) | undefined;

      if (!run) {
        res.status(404).json({ success: false, error: 'Test run not found' });
        return;
      }

      // Get step results
      const testRunId = parseInt(id, 10);
      const steps = getTestRunSteps(testRunId);

      // Get queue status and progress
      const queueStatus = testExecutionQueue.getStatus();
      const isRunning = testExecutionQueue.isRunning(testRunId);
      const queuePosition = queueStatus.pending.findIndex((p) => p.testRunId === testRunId);
      const progress = testExecutionQueue.getProgress(testRunId);

      // Parse failed_details JSON
      const parsedRun: StatusResponse = {
        ...run,
        failed_details: run.failed_details ? (JSON.parse(run.failed_details) as unknown[]) : [],
        steps,
        queueStatus: {
          isRunning,
          queuePosition: queuePosition === -1 ? null : queuePosition + 1,
        },
        progress,
      };

      res.json({ success: true, data: parsedRun });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/queue/status - Get queue status
router.get(
  '/queue/status',
  (
    _req: Request,
    res: Response<ApiResponse<ReturnType<typeof testExecutionQueue.getStatus>>>
  ): void => {
    try {
      const status = testExecutionQueue.getStatus();
      res.json({ success: true, data: status });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
