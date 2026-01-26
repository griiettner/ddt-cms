import express, { Router } from 'express';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../db/database.js';
import type { TestRunRow, TotalResult, ApiResponse, TestRunStepRow } from '../types/index.js';
import {
  testExecutionQueue,
  getTestRunSteps,
  type ProgressUpdate,
} from '../services/testExecutionQueue.js';
import {
  parallelTestExecution,
  type BatchExecutionStatus,
} from '../services/parallelTestExecution.js';
import { generatePdfReport, getPdfPath } from '../services/pdfGenerator.js';

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
  async (
    req: Request<unknown, unknown, unknown, ListTestRunsQuery>,
    res: Response<TestRunsListResponse | { success: false; error: string }>
  ): Promise<void> => {
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
      const db = getDb();

      // Build base WHERE conditions
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (releaseId) {
        conditions.push('release_id = ?');
        params.push(releaseId);
      }

      if (executedBy) {
        conditions.push('executed_by LIKE ?');
        params.push(`%${executedBy}%`);
      }

      if (startDate) {
        conditions.push('executed_at >= ?');
        params.push(startDate);
      }

      if (endDate) {
        conditions.push("executed_at < date(?, '+1 day')");
        params.push(endDate);
      }

      if (environment) {
        conditions.push('environment = ?');
        params.push(environment);
      }

      const baseWhere = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

      // Query for combined view: individual runs + aggregated batches
      const individualQuery = `
        SELECT
          tr.id,
          tr.release_id,
          r.release_number,
          tr.test_set_id,
          tr.test_set_name,
          tr.status,
          tr.environment,
          tr.base_url,
          tr.executed_by,
          tr.executed_at,
          tr.duration_ms,
          tr.total_scenarios,
          tr.total_steps,
          tr.passed_steps,
          tr.failed_steps,
          tr.failed_details,
          tr.video_path,
          NULL as batch_id,
          1 as batch_size
        FROM test_runs tr
        LEFT JOIN releases r ON tr.release_id = r.id
        WHERE tr.batch_id IS NULL AND ${baseWhere}
        ${status ? 'AND tr.status = ?' : ''}
        ${testSetId ? 'AND tr.test_set_id = ?' : ''}
        ${testSetName ? 'AND tr.test_set_name LIKE ?' : ''}
      `;

      const batchQuery = `
        SELECT
          MIN(tr.id) as id,
          tr.release_id,
          r.release_number,
          NULL as test_set_id,
          'Release ' || COALESCE(r.release_number, 'Unknown') || ' ' ||
            strftime('%m/%d/%Y ', MIN(tr.executed_at)) ||
            CASE
              WHEN CAST(strftime('%H', MIN(tr.executed_at)) AS INTEGER) = 0 THEN '12'
              WHEN CAST(strftime('%H', MIN(tr.executed_at)) AS INTEGER) > 12 THEN printf('%02d', CAST(strftime('%H', MIN(tr.executed_at)) AS INTEGER) - 12)
              ELSE printf('%02d', CAST(strftime('%H', MIN(tr.executed_at)) AS INTEGER))
            END || ':' || strftime('%M', MIN(tr.executed_at)) ||
            CASE WHEN CAST(strftime('%H', MIN(tr.executed_at)) AS INTEGER) < 12 THEN 'AM' ELSE 'PM' END
          as test_set_name,
          CASE
            WHEN SUM(CASE WHEN tr.status = 'running' THEN 1 ELSE 0 END) > 0 THEN 'running'
            WHEN SUM(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) > 0 THEN 'failed'
            ELSE 'passed'
          END as status,
          tr.environment,
          tr.base_url,
          tr.executed_by,
          MIN(tr.executed_at) as executed_at,
          SUM(tr.duration_ms) as duration_ms,
          SUM(tr.total_scenarios) as total_scenarios,
          SUM(tr.total_steps) as total_steps,
          SUM(tr.passed_steps) as passed_steps,
          SUM(tr.failed_steps) as failed_steps,
          NULL as failed_details,
          NULL as video_path,
          tr.batch_id,
          COUNT(*) as batch_size
        FROM test_runs tr
        LEFT JOIN releases r ON tr.release_id = r.id
        WHERE tr.batch_id IS NOT NULL AND ${baseWhere}
        GROUP BY tr.batch_id, tr.release_id, r.release_number, tr.environment, tr.base_url, tr.executed_by
        ${
          status
            ? `HAVING CASE
            WHEN SUM(CASE WHEN tr.status = 'running' THEN 1 ELSE 0 END) > 0 THEN 'running'
            WHEN SUM(CASE WHEN tr.status = 'failed' THEN 1 ELSE 0 END) > 0 THEN 'failed'
            ELSE 'passed'
          END = ?`
            : ''
        }
      `;

      // Build params for each query
      const individualParams = [...params];
      if (status) individualParams.push(status);
      if (testSetId) individualParams.push(testSetId);
      if (testSetName) individualParams.push(`%${testSetName}%`);

      const batchParams = [...params];
      if (status) batchParams.push(status);

      // Combined query with UNION ALL
      const combinedQuery = `
        SELECT * FROM (
          ${individualQuery}
          UNION ALL
          ${batchQuery}
        )
        ORDER BY executed_at DESC
        LIMIT ? OFFSET ?
      `;

      // Count query
      const countQuery = `
        SELECT (
          SELECT COUNT(*) FROM test_runs tr
          WHERE tr.batch_id IS NULL AND ${baseWhere}
          ${status ? 'AND tr.status = ?' : ''}
          ${testSetId ? 'AND tr.test_set_id = ?' : ''}
          ${testSetName ? 'AND tr.test_set_name LIKE ?' : ''}
        ) + (
          SELECT COUNT(DISTINCT batch_id) FROM test_runs tr
          WHERE tr.batch_id IS NOT NULL AND ${baseWhere}
          ${
            status
              ? `AND batch_id IN (
            SELECT batch_id FROM test_runs
            WHERE batch_id IS NOT NULL AND ${baseWhere}
            GROUP BY batch_id
            HAVING CASE
              WHEN SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) > 0 THEN 'running'
              WHEN SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) > 0 THEN 'failed'
              ELSE 'passed'
            END = ?
          )`
              : ''
          }
        ) as total
      `;

      // Execute count query
      const countParams = [...individualParams, ...batchParams];
      if (status) countParams.push(...params, status);
      const totalResult = await db.get<TotalResult>(countQuery, countParams);
      const total = totalResult?.total ?? 0;

      // Execute main query
      const allParams = [...individualParams, ...batchParams, limit, offset];
      const runs = await db.all<
        TestRunRow & { release_number?: string; batch_id?: string; batch_size?: number }
      >(combinedQuery, allParams);

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
      console.error('[Test Runs] List error:', error);
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
  async (
    req: Request<unknown, unknown, unknown, { releaseId?: string }>,
    res: Response<ApiResponse<FilterOptionsResponse>>
  ): Promise<void> => {
    const { releaseId } = req.query;

    try {
      const db = getDb();

      const params = releaseId ? [releaseId] : [];

      // Get distinct environments
      const envQuery = releaseId
        ? 'SELECT DISTINCT environment FROM test_runs WHERE release_id = ? AND environment IS NOT NULL ORDER BY environment'
        : 'SELECT DISTINCT environment FROM test_runs WHERE environment IS NOT NULL ORDER BY environment';
      const environments = await db.all<{ environment: string }>(envQuery, params);

      // Get distinct executed_by values
      const execQuery = releaseId
        ? 'SELECT DISTINCT executed_by FROM test_runs WHERE release_id = ? AND executed_by IS NOT NULL ORDER BY executed_by'
        : 'SELECT DISTINCT executed_by FROM test_runs WHERE executed_by IS NOT NULL ORDER BY executed_by';
      const executedBy = await db.all<{ executed_by: string }>(execQuery, params);

      // Get distinct test sets with their IDs
      const testSetQuery = releaseId
        ? 'SELECT DISTINCT test_set_id, test_set_name FROM test_runs WHERE release_id = ? AND test_set_id IS NOT NULL ORDER BY test_set_name'
        : 'SELECT DISTINCT test_set_id, test_set_name FROM test_runs WHERE test_set_id IS NOT NULL ORDER BY test_set_name';
      const testSets = await db.all<{ test_set_id: number; test_set_name: string }>(
        testSetQuery,
        params
      );

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
  async (req: Request<IdParams>, res: Response<ApiResponse<TestRunWithRelease>>): Promise<void> => {
    const { id } = req.params;

    try {
      const db = getDb();
      const run = await db.get<TestRunRow & { release_number?: string }>(
        `SELECT tr.*, r.release_number
         FROM test_runs tr
         LEFT JOIN releases r ON tr.release_id = r.id
         WHERE tr.id = ?`,
        [id]
      );

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
  async (
    req: Request<unknown, unknown, CreateTestRunBody>,
    res: Response<ApiResponse<CreateTestRunResponse>>
  ): Promise<void> => {
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
      const db = getDb();
      const result = await db.run(
        `INSERT INTO test_runs (
          release_id, test_set_id, test_set_name, status, executed_by,
          duration_ms, total_scenarios, total_steps, passed_steps, failed_steps, failed_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          failedDetails ? JSON.stringify(failedDetails) : null,
        ]
      );

      res.json({
        success: true,
        data: { id: Number(result.lastInsertRowid) },
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/test-runs/:id - Update a test run
router.patch(
  '/:id',
  async (
    req: Request<IdParams, unknown, UpdateTestRunBody>,
    res: Response<ApiResponse<undefined>>
  ): Promise<void> => {
    const { id } = req.params;
    const updates = { ...req.body };

    try {
      const db = getDb();

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
      const values = Object.values(dbUpdates) as (string | number | null)[];

      await db.run(`UPDATE test_runs SET ${fields} WHERE id = ?`, [...values, id]);

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

interface ExecuteTestRunBody {
  releaseId: number;
  environment: string;
}

interface ExecuteParams {
  testSetId: string;
}

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
  async (
    req: Request<ExecuteParams, unknown, ExecuteTestRunBody>,
    res: Response<ApiResponse<ExecuteResponse>>
  ): Promise<void> => {
    const { testSetId } = req.params;
    const { releaseId, environment } = req.body;

    if (!releaseId || !environment) {
      res.status(400).json({ success: false, error: 'releaseId and environment are required' });
      return;
    }

    // Parse IDs as integers for database queries
    const testSetIdNum = parseInt(testSetId, 10);
    const releaseIdNum = typeof releaseId === 'string' ? parseInt(releaseId, 10) : releaseId;

    try {
      const db = getDb();

      // Get environment URL
      const envConfig = await db.get<{ value: string }>(
        `SELECT value FROM environment_configs
         WHERE (release_id = ? OR release_id IS NULL)
           AND environment = ?
         ORDER BY release_id DESC NULLS LAST
         LIMIT 1`,
        [releaseIdNum, environment.toLowerCase()]
      );

      if (!envConfig) {
        res.status(400).json({
          success: false,
          error: `Environment "${environment}" not configured. Please configure it in Settings.`,
        });
        return;
      }

      // Get test set name
      const testSet = await db.get<{ name: string }>(
        'SELECT name FROM test_sets WHERE id = ? AND release_id = ?',
        [testSetIdNum, releaseIdNum]
      );

      if (!testSet) {
        res.status(404).json({ success: false, error: 'Test set not found' });
        return;
      }

      // Get release number for reports
      const release = await db.get<{ release_number: string }>(
        'SELECT release_number FROM releases WHERE id = ?',
        [releaseIdNum]
      );

      // Create test run record
      const result = await db.run(
        `INSERT INTO test_runs (
          release_id, test_set_id, test_set_name, status, environment, base_url, executed_by
        ) VALUES (?, ?, ?, 'running', ?, ?, ?)`,
        [
          releaseIdNum,
          testSetIdNum,
          testSet.name,
          environment,
          envConfig.value,
          req.user?.eid || null,
        ]
      );

      const testRunId = Number(result.lastInsertRowid);

      // Add to execution queue
      testExecutionQueue.enqueue({
        testRunId,
        testSetId: testSetIdNum,
        releaseId: releaseIdNum,
        releaseNumber: release?.release_number,
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
  async (req: Request<IdParams>, res: Response<ApiResponse<StatusResponse>>): Promise<void> => {
    const { id } = req.params;

    try {
      const db = getDb();
      const run = await db.get<TestRunRow & { release_number?: string }>(
        `SELECT tr.*, r.release_number
         FROM test_runs tr
         LEFT JOIN releases r ON tr.release_id = r.id
         WHERE tr.id = ?`,
        [id]
      );

      if (!run) {
        res.status(404).json({ success: false, error: 'Test run not found' });
        return;
      }

      // Get step results
      const testRunId = parseInt(id, 10);
      const steps = await getTestRunSteps(testRunId);

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

// ================================
// 7PS (7 Parallel Sets) Execution
// ================================

interface BulkExecuteBody {
  releaseId: number;
  environment: string;
}

interface BulkExecuteResponse {
  batchId: string;
  testRunIds: number[];
  totalSets: number;
}

// POST /api/test-runs/execute-all - Start 7PS execution
router.post(
  '/execute-all',
  async (
    req: Request<unknown, unknown, BulkExecuteBody>,
    res: Response<ApiResponse<BulkExecuteResponse>>
  ): Promise<void> => {
    const { releaseId, environment } = req.body;

    if (!releaseId || !environment) {
      res.status(400).json({ success: false, error: 'releaseId and environment are required' });
      return;
    }

    try {
      const db = getDb();

      // Get environment URL
      const envConfig = await db.get<{ value: string }>(
        `SELECT value FROM environment_configs
         WHERE (release_id = ? OR release_id IS NULL)
           AND environment = ?
         ORDER BY release_id DESC NULLS LAST
         LIMIT 1`,
        [releaseId, environment.toLowerCase()]
      );

      if (!envConfig) {
        res.status(400).json({
          success: false,
          error: `Environment "${environment}" not configured. Please configure it in Settings.`,
        });
        return;
      }

      // Get all test sets for the release
      interface TestSetInfo {
        id: number;
        name: string;
      }
      const testSets = await db.all<TestSetInfo>(
        'SELECT id, name FROM test_sets WHERE release_id = ? ORDER BY name',
        [releaseId]
      );

      if (testSets.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No test sets found for this release.',
        });
        return;
      }

      // Get release number for reports
      const release = await db.get<{ release_number: string }>(
        'SELECT release_number FROM releases WHERE id = ?',
        [releaseId]
      );

      // Generate batch ID
      const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const executedBy = req.user?.eid || null;

      // Create test run records for each test set
      const items: {
        testRunId: number;
        testSetId: number;
        testSetName: string;
        releaseId: number;
        releaseNumber?: string;
        baseUrl: string;
      }[] = [];

      for (const testSet of testSets) {
        const result = await db.run(
          `INSERT INTO test_runs (
            release_id, test_set_id, test_set_name, status, environment, base_url, executed_by, batch_id
          ) VALUES (?, ?, ?, 'running', ?, ?, ?, ?)`,
          [releaseId, testSet.id, testSet.name, environment, envConfig.value, executedBy, batchId]
        );

        items.push({
          testRunId: Number(result.lastInsertRowid),
          testSetId: testSet.id,
          testSetName: testSet.name,
          releaseId,
          releaseNumber: release?.release_number,
          baseUrl: envConfig.value,
        });
      }

      // Start parallel execution
      const { testRunIds } = await parallelTestExecution.startBatch(items, executedBy, batchId);
      console.log(`[7PS] Batch ${batchId} started with ${testRunIds.length} test sets`);

      res.json({
        success: true,
        data: {
          batchId,
          testRunIds,
          totalSets: items.length,
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error('[7PS] Execute all error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/batch/:batchId/status - Get batch execution status
router.get(
  '/batch/:batchId/status',
  (
    req: Request<{ batchId: string }>,
    res: Response<ApiResponse<BatchExecutionStatus | null>>
  ): void => {
    const { batchId } = req.params;

    try {
      const status = parallelTestExecution.getBatchStatus(batchId);
      res.json({ success: true, data: status });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/batches/active - Get all active batch executions
router.get(
  '/batches/active',
  (_req: Request, res: Response<ApiResponse<BatchExecutionStatus[]>>): void => {
    try {
      const batches = parallelTestExecution.getActiveBatches();
      res.json({ success: true, data: batches });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Batch details response type
interface BatchDetailsResponse {
  batchId: string;
  releaseId: number;
  releaseNumber: string;
  environment: string;
  status: 'running' | 'completed' | 'failed';
  totalSets: number;
  completedSets: number;
  passedSets: number;
  failedSets: number;
  executedBy: string | null;
  startedAt: string;
  completedAt: string | null;
  totalDurationMs: number;
  testRuns: {
    testRunId: number;
    testSetId: number;
    testSetName: string;
    status: string;
    passedSteps: number;
    failedSteps: number;
    totalSteps: number;
    durationMs: number;
  }[];
}

// GET /api/test-runs/batch/:batchId/details - Get full batch details from DB
router.get(
  '/batch/:batchId/details',
  async (
    req: Request<{ batchId: string }>,
    res: Response<ApiResponse<BatchDetailsResponse | null>>
  ): Promise<void> => {
    const { batchId } = req.params;

    try {
      const db = getDb();

      // Get all test runs for this batch
      interface BatchRunRow {
        id: number;
        release_id: number;
        release_number: string;
        test_set_id: number;
        test_set_name: string;
        status: string;
        environment: string;
        executed_by: string | null;
        executed_at: string;
        duration_ms: number;
        passed_steps: number;
        failed_steps: number;
        total_steps: number;
      }

      const runs = await db.all<BatchRunRow>(
        `SELECT
          tr.id, tr.release_id, r.release_number, tr.test_set_id, tr.test_set_name,
          tr.status, tr.environment, tr.executed_by, tr.executed_at,
          tr.duration_ms, tr.passed_steps, tr.failed_steps, tr.total_steps
        FROM test_runs tr
        LEFT JOIN releases r ON tr.release_id = r.id
        WHERE tr.batch_id = ?
        ORDER BY tr.id`,
        [batchId]
      );

      if (runs.length === 0) {
        res.json({ success: true, data: null });
        return;
      }

      // Calculate aggregates
      const completedRuns = runs.filter((r) => r.status !== 'running');
      const passedRuns = runs.filter((r) => r.status === 'passed');
      const failedRuns = runs.filter((r) => r.status === 'failed');
      const hasRunning = runs.some((r) => r.status === 'running');
      const hasFailed = runs.some((r) => r.status === 'failed');
      const totalDurationMs = runs.reduce((sum, r) => sum + (r.duration_ms || 0), 0);

      let batchStatus: 'running' | 'completed' | 'failed';
      if (hasRunning) {
        batchStatus = 'running';
      } else if (hasFailed) {
        batchStatus = 'failed';
      } else {
        batchStatus = 'completed';
      }

      const startedAt = runs[0].executed_at;
      const lastRun = completedRuns.length > 0 ? completedRuns[completedRuns.length - 1] : null;
      const completedAt = !hasRunning && lastRun ? lastRun.executed_at : null;

      const response: BatchDetailsResponse = {
        batchId,
        releaseId: runs[0].release_id,
        releaseNumber: runs[0].release_number || 'Unknown',
        environment: runs[0].environment || '',
        status: batchStatus,
        totalSets: runs.length,
        completedSets: completedRuns.length,
        passedSets: passedRuns.length,
        failedSets: failedRuns.length,
        executedBy: runs[0].executed_by,
        startedAt,
        completedAt,
        totalDurationMs,
        testRuns: runs.map((r) => ({
          testRunId: r.id,
          testSetId: r.test_set_id,
          testSetName: r.test_set_name || `Test Set ${r.test_set_id}`,
          status: r.status || 'running',
          passedSteps: r.passed_steps || 0,
          failedSteps: r.failed_steps || 0,
          totalSteps: r.total_steps || 0,
          durationMs: r.duration_ms || 0,
        })),
      };

      res.json({ success: true, data: response });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Media file info type
interface MediaFile {
  type: 'video' | 'screenshot';
  filename: string;
  path: string;
  stepId?: number;
  scenarioId?: number;
  size: number;
}

interface MediaFilesResponse {
  video: MediaFile | null;
  screenshots: MediaFile[];
}

// GET /api/test-runs/:id/media - List media files for a test run
router.get(
  '/:id/media',
  (req: Request<IdParams>, res: Response<ApiResponse<MediaFilesResponse>>): void => {
    const { id } = req.params;

    try {
      const runDir = path.join(process.cwd(), 'tests', 'reports', 'results', `run-${id}`);

      if (!fs.existsSync(runDir)) {
        res.json({
          success: true,
          data: { video: null, screenshots: [] },
        });
        return;
      }

      let video: MediaFile | null = null;
      const screenshots: MediaFile[] = [];

      // Check for video file
      const videoPath = path.join(runDir, 'video.webm');
      if (fs.existsSync(videoPath)) {
        const stats = fs.statSync(videoPath);
        video = {
          type: 'video',
          filename: 'video.webm',
          path: `/api/test-runs/${id}/video`,
          size: stats.size,
        };
      }

      // Check for screenshots directory
      const screenshotsDir = path.join(runDir, 'screenshots');
      if (fs.existsSync(screenshotsDir)) {
        const files = fs.readdirSync(screenshotsDir);
        for (const file of files) {
          if (file.endsWith('.png')) {
            const filePath = path.join(screenshotsDir, file);
            const stats = fs.statSync(filePath);

            const match = file.match(/failure-(\d+)-step-(\d+)\.png/);
            const scenarioId = match ? parseInt(match[1], 10) : undefined;
            const stepId = match ? parseInt(match[2], 10) : undefined;

            screenshots.push({
              type: 'screenshot',
              filename: file,
              path: `/api/test-runs/${id}/screenshot/${file}`,
              stepId,
              scenarioId,
              size: stats.size,
            });
          }
        }
      }

      res.json({
        success: true,
        data: { video, screenshots },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Media list error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/:id/screenshot/:filename - Serve screenshot file
router.get(
  '/:id/screenshot/:filename',
  (req: Request<IdParams & { filename: string }>, res: Response): void => {
    const { id, filename } = req.params;

    try {
      if (filename.includes('..') || filename.includes('/')) {
        res.status(400).json({ success: false, error: 'Invalid filename' });
        return;
      }

      const screenshotPath = path.join(
        process.cwd(),
        'tests',
        'reports',
        'results',
        `run-${id}`,
        'screenshots',
        filename
      );

      if (!fs.existsSync(screenshotPath)) {
        res.status(404).json({ success: false, error: 'Screenshot not found' });
        return;
      }

      const stat = fs.statSync(screenshotPath);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': stat.size,
      });
      fs.createReadStream(screenshotPath).pipe(res);
    } catch (err) {
      const error = err as Error;
      console.error('Screenshot error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/test-runs/:id/pdf - Generate PDF report for a test run
router.post(
  '/:id/pdf',
  async (
    req: Request<IdParams>,
    res: Response<ApiResponse<{ pdfPath: string }>>
  ): Promise<void> => {
    const { id } = req.params;

    try {
      const testRunId = parseInt(id, 10);
      if (isNaN(testRunId)) {
        res.status(400).json({ success: false, error: 'Invalid test run ID' });
        return;
      }

      // Check if test run exists
      const db = getDb();
      const run = await db.get<{ id: number }>('SELECT id FROM test_runs WHERE id = ?', [
        testRunId,
      ]);
      if (!run) {
        res.status(404).json({ success: false, error: 'Test run not found' });
        return;
      }

      // Generate PDF
      const result = await generatePdfReport(testRunId);

      if (result.success && result.pdfPath) {
        res.json({ success: true, data: { pdfPath: result.pdfPath } });
      } else {
        res.status(500).json({ success: false, error: result.error || 'Failed to generate PDF' });
      }
    } catch (err) {
      const error = err as Error;
      console.error('PDF generation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/:id/pdf - Download PDF report for a test run
router.get('/:id/pdf', async (req: Request<IdParams>, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const testRunId = parseInt(id, 10);
    if (isNaN(testRunId)) {
      res.status(400).json({ success: false, error: 'Invalid test run ID' });
      return;
    }

    const pdfPath = await getPdfPath(testRunId);

    if (!pdfPath) {
      res
        .status(404)
        .json({ success: false, error: 'PDF not found. Generate it first using POST.' });
      return;
    }

    if (!fs.existsSync(pdfPath)) {
      res.status(404).json({ success: false, error: 'PDF file not found on disk' });
      return;
    }

    const stat = fs.statSync(pdfPath);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="test-run-${id}-report.pdf"`,
    });

    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    const error = err as Error;
    console.error('PDF download error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/test-runs/:id/pdf/status - Check if PDF exists for a test run
router.get(
  '/:id/pdf/status',
  async (
    req: Request<IdParams>,
    res: Response<ApiResponse<{ exists: boolean; pdfPath: string | null }>>
  ): Promise<void> => {
    const { id } = req.params;

    try {
      const testRunId = parseInt(id, 10);
      if (isNaN(testRunId)) {
        res.status(400).json({ success: false, error: 'Invalid test run ID' });
        return;
      }

      const pdfPath = await getPdfPath(testRunId);
      res.json({
        success: true,
        data: {
          exists: pdfPath !== null,
          pdfPath,
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error('PDF status error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-runs/:id/video - Stream video file for test run
router.get('/:id/video', async (req: Request<IdParams>, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // First, try the new location
    let videoPath = path.join(
      process.cwd(),
      'tests',
      'reports',
      'results',
      `run-${id}`,
      'video.webm'
    );

    // If not found, check the database for the stored path
    if (!fs.existsSync(videoPath)) {
      const db = getDb();
      const run = await db.get<{ video_path: string | null }>(
        'SELECT video_path FROM test_runs WHERE id = ?',
        [id]
      );

      if (!run || !run.video_path) {
        res.status(404).json({ success: false, error: 'Video not found for this test run' });
        return;
      }

      videoPath = run.video_path;
      if (!path.isAbsolute(videoPath)) {
        videoPath = path.join(process.cwd(), videoPath);
      }

      if (!fs.existsSync(videoPath)) {
        res.status(404).json({ success: false, error: 'Video file not found on disk' });
        return;
      }
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/webm',
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/webm',
      };

      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    const error = err as Error;
    console.error('Video streaming error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
