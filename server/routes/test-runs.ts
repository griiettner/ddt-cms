import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getRegistryDb } from '../db/database.js';
import type { TestRunRow, TotalResult, ApiResponse } from '../types/index.js';

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

// GET /api/test-runs - List test runs with pagination (optionally filter by releaseId)
router.get(
  '/',
  (
    req: Request<unknown, unknown, unknown, ListTestRunsQuery>,
    res: Response<TestRunsListResponse | { success: false; error: string }>
  ): void => {
    const { releaseId, page = '1', pageSize = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10)));
    const offset = (pageNum - 1) * limit;

    try {
      const db = getRegistryDb();

      // Build WHERE clause
      let whereClause = '';
      const countParams: string[] = [];
      const queryParams: (string | number)[] = [];

      if (releaseId) {
        whereClause = ' WHERE tr.release_id = ?';
        countParams.push(releaseId);
        queryParams.push(releaseId);
      }

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

export default router;
