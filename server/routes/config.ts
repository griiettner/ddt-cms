import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type {
  ConfigOptionRow,
  MaxOrderResult,
  ApiResponse,
  EnvironmentConfigRow,
} from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

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
  async (
    req: Request<ReleaseIdParams>,
    res: Response<ApiResponse<ConfigOptionRow[]>>
  ): Promise<void> => {
    try {
      const db = getDb();
      const releaseId = req.params.releaseId;
      // Get release-specific config, falling back to global (NULL release_id) config
      const types = await db.all<ConfigOptionRow>(
        `SELECT * FROM configuration_options
         WHERE category = 'type' AND is_active = 1
         AND (release_id = ? OR (release_id IS NULL AND key NOT IN (
           SELECT key FROM configuration_options WHERE category = 'type' AND release_id = ?
         )))
         ORDER BY order_index ASC`,
        [releaseId, releaseId]
      );
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
  async (
    req: Request<ReleaseIdParams>,
    res: Response<ApiResponse<ConfigOptionRow[]>>
  ): Promise<void> => {
    try {
      const db = getDb();
      const releaseId = req.params.releaseId;
      // Get release-specific config, falling back to global (NULL release_id) config
      const actions = await db.all<ConfigOptionRow>(
        `SELECT * FROM configuration_options
         WHERE category = 'action' AND is_active = 1
         AND (release_id = ? OR (release_id IS NULL AND key NOT IN (
           SELECT key FROM configuration_options WHERE category = 'action' AND release_id = ?
         )))
         ORDER BY order_index ASC`,
        [releaseId, releaseId]
      );
      res.json({ success: true, data: actions });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ================================
// Environment Configuration Endpoints
// IMPORTANT: These must come BEFORE the generic /:releaseId/:category routes
// ================================

// Request body for environment
interface EnvironmentBody {
  environment: string;
  url: string;
}

interface EnvironmentParams {
  releaseId: string;
  environment: string;
}

// GET /api/config/:releaseId/environments - List environment URLs
router.get(
  '/:releaseId/environments',
  async (
    req: Request<ReleaseIdParams>,
    res: Response<ApiResponse<EnvironmentConfigRow[]>>
  ): Promise<void> => {
    try {
      const db = getDb();
      const { releaseId } = req.params;

      // Get environments for this release, falling back to global (NULL release_id)
      const environments = await db.all<EnvironmentConfigRow>(
        `SELECT * FROM environment_configs
         WHERE release_id = ? OR release_id IS NULL
         ORDER BY
           CASE
             WHEN environment = 'dev' THEN 1
             WHEN environment = 'qa' THEN 2
             WHEN environment = 'uat' THEN 3
             ELSE 4
           END,
           environment ASC`,
        [releaseId]
      );

      // Filter to prefer release-specific over global
      const envMap = new Map<string, EnvironmentConfigRow>();
      for (const env of environments) {
        const existing = envMap.get(env.environment);
        // Prefer release-specific (non-null release_id) over global
        if (!existing || (env.release_id !== null && existing.release_id === null)) {
          envMap.set(env.environment, env);
        }
      }

      res.json({ success: true, data: Array.from(envMap.values()) });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/config/:releaseId/environments - Create or update environment
router.post(
  '/:releaseId/environments',
  async (
    req: Request<ReleaseIdParams, unknown, EnvironmentBody>,
    res: Response<ApiResponse<EnvironmentConfigRow>>
  ): Promise<void> => {
    const { environment, url } = req.body;
    const { releaseId } = req.params;

    if (!environment || !url) {
      res.status(400).json({ success: false, error: 'Environment and URL are required' });
      return;
    }

    try {
      const db = getDb();

      // releaseId of 0 or 'global' means global config
      const effectiveReleaseId = releaseId === '0' || releaseId === 'global' ? null : releaseId;

      // Use upsert pattern - insert or replace on conflict
      await db.run(
        `INSERT INTO environment_configs (release_id, environment, value, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(release_id, environment) DO UPDATE SET
           value = excluded.value,
           updated_at = CURRENT_TIMESTAMP`,
        [effectiveReleaseId, environment.toLowerCase(), url]
      );

      // Fetch the updated/created record
      const created = await db.get<EnvironmentConfigRow>(
        `SELECT * FROM environment_configs
         WHERE (release_id = ? OR (? IS NULL AND release_id IS NULL))
           AND environment = ?`,
        [effectiveReleaseId, effectiveReleaseId, environment.toLowerCase()]
      );

      if (!created) {
        res
          .status(500)
          .json({ success: false, error: 'Failed to create/update environment config' });
        return;
      }

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'environment_config',
        resourceName: environment,
        releaseId: releaseId,
        details: { url },
      });

      res.json({ success: true, data: created });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/config/:releaseId/environments/:environment - Delete environment
router.delete(
  '/:releaseId/environments/:environment',
  async (req: Request<EnvironmentParams>, res: Response<ApiResponse<undefined>>): Promise<void> => {
    const { releaseId, environment } = req.params;

    try {
      const db = getDb();

      const effectiveReleaseId = releaseId === '0' || releaseId === 'global' ? null : releaseId;

      await db.run(
        `DELETE FROM environment_configs
         WHERE (release_id = ? OR (? IS NULL AND release_id IS NULL))
           AND environment = ?`,
        [effectiveReleaseId, effectiveReleaseId, environment.toLowerCase()]
      );

      logAudit({
        req,
        action: 'DELETE',
        resourceType: 'environment_config',
        resourceName: environment,
        releaseId: releaseId,
      });

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ================================
// Generic Configuration Endpoints
// ================================

// POST /api/config/:releaseId/:category - Add new option
router.post(
  '/:releaseId/:category',
  async (
    req: Request<CategoryParams, unknown, CreateOptionBody>,
    res: Response<ApiResponse<undefined>>
  ): Promise<void> => {
    const { key, display_name, result_type, default_value } = req.body;
    const { category, releaseId } = req.params;

    if (!key || !display_name) {
      res.status(400).json({ success: false, error: 'Key and Display Name are required' });
      return;
    }

    try {
      const db = getDb();

      // Get max order index for this release's options
      const maxOrder = await db.get<MaxOrderResult>(
        'SELECT MAX(order_index) as max_order FROM configuration_options WHERE category = ? AND release_id = ?',
        [category, releaseId]
      );
      const orderIndex = (maxOrder?.max_order || 0) + 1;

      await db.run(
        `INSERT INTO configuration_options (release_id, category, key, display_name, result_type, default_value, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          releaseId,
          category,
          key,
          display_name,
          result_type ?? null,
          default_value ?? null,
          orderIndex,
        ]
      );

      logAudit({
        req,
        action: 'CREATE',
        resourceType: `config_${category}`,
        resourceName: display_name,
        releaseId: releaseId,
      });

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
  async (
    req: Request<CategoryParams, unknown, BulkOptionsBody>,
    res: Response<ApiResponse<undefined>>
  ): Promise<void> => {
    const { category, releaseId } = req.params;
    const { options } = req.body;

    try {
      const db = getDb();

      // Start transaction
      await db.exec('BEGIN TRANSACTION');

      try {
        // Remove existing options for this release and category
        await db.run('DELETE FROM configuration_options WHERE category = ? AND release_id = ?', [
          category,
          releaseId,
        ]);

        // Insert new ones
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          await db.run(
            `INSERT INTO configuration_options (release_id, category, key, display_name, order_index)
             VALUES (?, ?, ?, ?, ?)`,
            [releaseId, category, opt.display_name, opt.display_name, i]
          );
        }

        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: `config_${category}`,
        releaseId: releaseId,
        details: { optionCount: options.length },
      });

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/config/:releaseId/:category/reorder - Reorder options
interface ReorderBody {
  ids: number[];
}

router.put(
  '/:releaseId/:category/reorder',
  async (
    req: Request<CategoryParams, unknown, ReorderBody>,
    res: Response<ApiResponse<undefined>>
  ): Promise<void> => {
    const { category, releaseId } = req.params;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'IDs array is required' });
      return;
    }

    try {
      const db = getDb();

      // Start transaction
      await db.exec('BEGIN TRANSACTION');

      try {
        for (let index = 0; index < ids.length; index++) {
          const id = ids[index];
          await db.run(
            'UPDATE configuration_options SET order_index = ? WHERE id = ? AND category = ?',
            [index, id, category]
          );
        }

        await db.exec('COMMIT');
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: `config_${category}`,
        releaseId: releaseId,
        details: { reordered: ids.length },
      });

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
  async (req: Request<DeleteParams>, res: Response<ApiResponse<undefined>>): Promise<void> => {
    try {
      const db = getDb();

      // Get config option info before deleting
      const config = await db.get<{ display_name: string; category: string }>(
        'SELECT display_name, category FROM configuration_options WHERE id = ?',
        [req.params.id]
      );

      await db.run('DELETE FROM configuration_options WHERE id = ?', [req.params.id]);

      logAudit({
        req,
        action: 'DELETE',
        resourceType: `config_${config?.category || 'option'}`,
        resourceId: parseInt(req.params.id),
        resourceName: config?.display_name,
        releaseId: req.params.releaseId,
      });

      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
