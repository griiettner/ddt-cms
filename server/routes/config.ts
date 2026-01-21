import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
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
      const db = getDb();
      const releaseId = req.params.releaseId;
      // Get release-specific config, falling back to global (NULL release_id) config
      const types = db
        .prepare(
          `SELECT * FROM configuration_options
           WHERE category = 'type' AND is_active = 1
           AND (release_id = ? OR (release_id IS NULL AND key NOT IN (
             SELECT key FROM configuration_options WHERE category = 'type' AND release_id = ?
           )))
           ORDER BY order_index ASC`
        )
        .all(releaseId, releaseId) as ConfigOptionRow[];
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
      const db = getDb();
      const releaseId = req.params.releaseId;
      // Get release-specific config, falling back to global (NULL release_id) config
      const actions = db
        .prepare(
          `SELECT * FROM configuration_options
           WHERE category = 'action' AND is_active = 1
           AND (release_id = ? OR (release_id IS NULL AND key NOT IN (
             SELECT key FROM configuration_options WHERE category = 'action' AND release_id = ?
           )))
           ORDER BY order_index ASC`
        )
        .all(releaseId, releaseId) as ConfigOptionRow[];
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
      const db = getDb();

      // Get max order index for this release's options
      const maxOrder = db
        .prepare(
          'SELECT MAX(order_index) as max_order FROM configuration_options WHERE category = ? AND release_id = ?'
        )
        .get(category, releaseId) as MaxOrderResult;
      const orderIndex = (maxOrder.max_order || 0) + 1;

      const stmt = db.prepare(`
        INSERT INTO configuration_options (release_id, category, key, display_name, result_type, default_value, order_index)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        releaseId,
        category,
        key,
        display_name,
        result_type || null,
        default_value || null,
        orderIndex
      );

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
      const db = getDb();

      db.transaction(() => {
        // Remove existing options for this release and category
        db.prepare('DELETE FROM configuration_options WHERE category = ? AND release_id = ?').run(
          category,
          releaseId
        );

        // Insert new ones
        const stmt = db.prepare(`
          INSERT INTO configuration_options (release_id, category, key, display_name, order_index)
          VALUES (?, ?, ?, ?, ?)
        `);

        options.forEach((opt, i) => {
          stmt.run(releaseId, category, opt.display_name, opt.display_name, i);
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
      const db = getDb();
      db.prepare('DELETE FROM configuration_options WHERE id = ?').run(req.params.id);
      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
