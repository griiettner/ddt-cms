import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { SelectConfigRow, ApiResponse } from '../types/index.js';

const router: Router = express.Router();

// Request param types
interface IdParams {
  id: string;
}

// Query types
interface ListQuery {
  type?: string;
}

// Request body types
interface CreateSelectConfigBody {
  name: string;
  options?: string[];
  config_type?: string;
}

interface UpdateSelectConfigBody {
  name?: string;
  options?: string[];
}

// Response data types
interface SelectConfigWithOptions extends Omit<SelectConfigRow, 'options'> {
  options: string[];
}

interface CreateSelectConfigResponse {
  id: number | bigint;
  name: string;
  options: string[];
  config_type: string;
}

// GET /api/select-configs - List all select configs (optional ?type= filter)
router.get(
  '/',
  async (
    req: Request<unknown, unknown, unknown, ListQuery>,
    res: Response<ApiResponse<SelectConfigWithOptions[]>>
  ): Promise<void> => {
    try {
      const db = getDb();
      const { type } = req.query;

      let query = 'SELECT * FROM select_configs';
      const params: string[] = [];

      if (type) {
        query += ' WHERE config_type = ?';
        params.push(type);
      }

      query += ' ORDER BY name ASC';

      const configs = await db.all<SelectConfigRow>(query, params);
      // Parse options JSON for each config
      const parsed: SelectConfigWithOptions[] = configs.map((c) => ({
        ...c,
        options: JSON.parse(c.options || '[]') as string[],
      }));
      res.json({ success: true, data: parsed });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/select-configs/:id - Get a specific config
router.get(
  '/:id',
  async (
    req: Request<IdParams>,
    res: Response<ApiResponse<SelectConfigWithOptions>>
  ): Promise<void> => {
    try {
      const db = getDb();
      const config = await db.get<SelectConfigRow>('SELECT * FROM select_configs WHERE id = ?', [
        req.params.id,
      ]);
      if (!config) {
        res.status(404).json({ success: false, error: 'Config not found' });
        return;
      }
      const parsed: SelectConfigWithOptions = {
        ...config,
        options: JSON.parse(config.options || '[]') as string[],
      };
      res.json({ success: true, data: parsed });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/select-configs - Create a new select config
router.post(
  '/',
  async (
    req: Request<unknown, unknown, CreateSelectConfigBody>,
    res: Response<ApiResponse<CreateSelectConfigResponse>>
  ): Promise<void> => {
    const { name, options, config_type } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    try {
      const db = getDb();
      const optionsJson = JSON.stringify(options || []);
      const type = config_type || 'custom_select';
      const result = await db.run(
        'INSERT INTO select_configs (name, options, config_type) VALUES (?, ?, ?)',
        [name, optionsJson, type]
      );
      res.json({
        success: true,
        data: {
          id: Number(result.lastInsertRowid),
          name,
          options: options || [],
          config_type: type,
        },
      });
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('UNIQUE constraint')) {
        res.status(400).json({ success: false, error: 'A config with this name already exists' });
        return;
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PUT /api/select-configs/:id - Update a select config
router.put(
  '/:id',
  async (
    req: Request<IdParams, unknown, UpdateSelectConfigBody>,
    res: Response<ApiResponse<undefined>>
  ): Promise<void> => {
    const { name, options } = req.body;

    try {
      const db = getDb();
      const optionsJson = JSON.stringify(options || []);
      await db.run(
        'UPDATE select_configs SET name = ?, options = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name || '', optionsJson, req.params.id]
      );
      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/select-configs/:id - Delete a select config
router.delete(
  '/:id',
  async (req: Request<IdParams>, res: Response<ApiResponse<undefined>>): Promise<void> => {
    try {
      const db = getDb();
      await db.run('DELETE FROM select_configs WHERE id = ?', [req.params.id]);
      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
