import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDashboardStats } from '../utils/dashboard.js';
import type { DashboardStats } from '../utils/dashboard.js';
import type { ApiSuccessResponse, ApiErrorResponse } from '../types/index.js';

const router: Router = express.Router();

/**
 * Route params for dashboard endpoint
 */
interface DashboardParams {
  releaseId?: string;
}

/**
 * GET /api/dashboard/:releaseId? - Get dashboard stats
 * Returns global stats if no releaseId provided, or release-specific stats otherwise
 */
router.get(
  '/:releaseId?',
  (
    req: Request<DashboardParams>,
    res: Response<ApiSuccessResponse<DashboardStats> | ApiErrorResponse>
  ): void => {
    try {
      const stats = getDashboardStats(req.params.releaseId);
      res.json({ success: true, data: stats });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
