import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getReleaseDb } from '../db/database.js';
import type { ConfigOptionRow, MaxOrderResult, ApiResponse } from '../types/index.js';

const router: Router = express.Router();

// Request param types
interface ReleaseIdParams {
  releaseId: string;
}

interface CategoryParams extends ReleaseIdParams {
  category: string;
}

interface DeleteParams extends ReleaseIdParams {
  id: string;
}

// Request body types
interface CreateOptionBody {
  key: string;
  display_name: string;
  result_type?: string;
  default_value?: string;
}

interface BulkOptionsBody {
  options: { display_name: string }[];
}

// GET /api/config/:releaseId/types - List type options
router.get(
  '/:releaseId/types',
  (req: Request<ReleaseIdParams>, res: Response<ApiResponse<ConfigOptionRow[]>>): void => {
    try {
      const db = getReleaseDb(req.params.releaseId);
      const types = db
        .prepare(
          "SELECT * FROM configuration_options WHERE category = 'type' AND is_active = 1 ORDER BY order_index ASC"
        )
        .all() as ConfigOptionRow[];
      res.json({ success: true, data: types });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/config/:releaseId/actions - List action options
router.get(
  '/:releaseId/actions',
  (req: Request<ReleaseIdParams>, res: Response<ApiResponse<ConfigOptionRow[]>>): void => {
    try {
      const db = getReleaseDb(req.params.releaseId);
      const actions = db
        .prepare(
          "SELECT * FROM configuration_options WHERE category = 'action' AND is_active = 1 ORDER BY order_index ASC"
        )
        .all() as ConfigOptionRow[];
      res.json({ success: true, data: actions });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/config/:releaseId/:category - Add new option
router.post(
  '/:releaseId/:category',
  (
    req: Request<CategoryParams, unknown, CreateOptionBody>,
    res: Response<ApiResponse<undefined>>
  ): void => {
    const { key, display_name, result_type, default_value } = req.body;
    const { category, releaseId } = req.params;

    if (!key || !display_name) {
      res.status(400).json({ success: false, error: 'Key and Display Name are required' });
      return;
    }

    try {
      const db = getReleaseDb(releaseId);

      // Get max order index
      const maxOrder = db
        .prepare(
          'SELECT MAX(order_index) as max_order FROM configuration_options WHERE category = ?'
        )
        .get(category) as MaxOrderResult;
      const orderIndex = (maxOrder.max_order || 0) + 1;

      const stmt = db.prepare(`
        INSERT INTO configuration_options (category, key, display_name, result_type, default_value, order_index)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(category, key, display_name, result_type || null, default_value || null, orderIndex);

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/config/:releaseId/:category/bulk - Replace all options for a category
router.post(
  '/:releaseId/:category/bulk',
  (
    req: Request<CategoryParams, unknown, BulkOptionsBody>,
    res: Response<ApiResponse<undefined>>
  ): void => {
    const { category, releaseId } = req.params;
    const { options } = req.body;

    try {
      const db = getReleaseDb(releaseId);

      db.transaction(() => {
        // Remove existing active options for this category
        db.prepare('DELETE FROM configuration_options WHERE category = ?').run(category);

        // Insert new ones
        const stmt = db.prepare(`
          INSERT INTO configuration_options (category, key, display_name, order_index)
          VALUES (?, ?, ?, ?)
        `);

        options.forEach((opt, i) => {
          stmt.run(category, opt.display_name, opt.display_name, i);
        });
      })();

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/config/:releaseId/:id - Delete option
router.delete(
  '/:releaseId/:id',
  (req: Request<DeleteParams>, res: Response<ApiResponse<undefined>>): void => {
    try {
      const db = getReleaseDb(req.params.releaseId);
      db.prepare('DELETE FROM configuration_options WHERE id = ?').run(req.params.id);
      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
