/**
 * Audit Logs API Routes
 * Provides read-only access to audit log data
 */
import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type {
  AuditLogRow,
  TotalResult,
  PaginatedApiResponse,
  ApiResponse,
} from '../types/index.js';

const router: Router = express.Router();

// Query types
interface AuditLogsListQuery {
  page?: string;
  limit?: string;
  user_eid?: string;
  action?: string;
  resource_type?: string;
  release_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

// Filter options response type
interface FilterOptions {
  users: { eid: string; name: string | null }[];
  actions: string[];
  resourceTypes: string[];
}

// GET /api/audit-logs - List audit logs with filters and pagination
router.get(
  '/',
  (
    req: Request<object, unknown, unknown, AuditLogsListQuery>,
    res: Response<PaginatedApiResponse<AuditLogRow>>
  ): void => {
    const {
      page = '1',
      limit = '50',
      user_eid,
      action,
      resource_type,
      release_id,
      start_date,
      end_date,
      search,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Cap at 100
    const offset = (pageNum - 1) * limitNum;

    try {
      const db = getDb();
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
      const params: (string | number)[] = [];

      // Apply filters
      if (user_eid) {
        query += ' AND user_eid = ?';
        countQuery += ' AND user_eid = ?';
        params.push(user_eid);
      }

      if (action) {
        query += ' AND action = ?';
        countQuery += ' AND action = ?';
        params.push(action);
      }

      if (resource_type) {
        query += ' AND resource_type = ?';
        countQuery += ' AND resource_type = ?';
        params.push(resource_type);
      }

      if (release_id) {
        query += ' AND release_id = ?';
        countQuery += ' AND release_id = ?';
        params.push(release_id);
      }

      if (start_date) {
        query += ' AND timestamp >= ?';
        countQuery += ' AND timestamp >= ?';
        params.push(start_date);
      }

      if (end_date) {
        query += ' AND timestamp <= ?';
        countQuery += ' AND timestamp <= ?';
        params.push(end_date);
      }

      if (search) {
        const searchPattern = `%${search}%`;
        query += ' AND (resource_name LIKE ? OR user_eid LIKE ? OR user_name LIKE ?)';
        countQuery += ' AND (resource_name LIKE ? OR user_eid LIKE ? OR user_name LIKE ?)';
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Order by timestamp descending (most recent first)
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';

      // Get total count
      const totalResult = db.prepare(countQuery).get(...params) as TotalResult;
      const total = totalResult?.total ?? 0;

      // Get paginated results
      const logs = db.prepare(query).all(...params, limitNum, offset) as AuditLogRow[];

      res.json({
        success: true,
        data: logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching audit logs:', error);
      res
        .status(500)
        .json({
          success: false,
          error: error.message,
        } as unknown as PaginatedApiResponse<AuditLogRow>);
    }
  }
);

// GET /api/audit-logs/filters - Get available filter options
router.get('/filters', (_req: Request, res: Response<ApiResponse<FilterOptions>>): void => {
  try {
    const db = getDb();

    // Get distinct users
    interface UserResult {
      user_eid: string;
      user_name: string | null;
    }
    const users = db
      .prepare(`SELECT DISTINCT user_eid, user_name FROM audit_logs ORDER BY user_eid`)
      .all() as UserResult[];

    // Get distinct actions
    interface ActionResult {
      action: string;
    }
    const actions = db
      .prepare(`SELECT DISTINCT action FROM audit_logs ORDER BY action`)
      .all() as ActionResult[];

    // Get distinct resource types
    interface ResourceTypeResult {
      resource_type: string;
    }
    const resourceTypes = db
      .prepare(`SELECT DISTINCT resource_type FROM audit_logs ORDER BY resource_type`)
      .all() as ResourceTypeResult[];

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({ eid: u.user_eid, name: u.user_name })),
        actions: actions.map((a) => a.action),
        resourceTypes: resourceTypes.map((r) => r.resource_type),
      },
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching audit log filters:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
