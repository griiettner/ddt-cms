import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getRegistryDb } from '../db/database.js';
import type { MatchConfigRow, ApiResponse } from '../types/index.js';

const router: Router = express.Router();

// Request param types
interface IdParams {
  id: string;
}

// Request body types
interface CreateMatchConfigBody {
  name: string;
  options?: string[];
}

interface UpdateMatchConfigBody {
  name?: string;
  options?: string[];
}

// Response data types
interface MatchConfigWithOptions extends Omit<MatchConfigRow, 'options'> {
  options: string[];
}

interface CreateMatchConfigResponse {
  id: number | bigint;
  name: string;
  options: string[];
}

// GET /api/match-configs - List all match configs
router.get('/', (_req: Request, res: Response<ApiResponse<MatchConfigWithOptions[]>>): void => {
  try {
    const db = getRegistryDb();
    const configs = db
      .prepare('SELECT * FROM match_configs ORDER BY name ASC')
      .all() as MatchConfigRow[];
    // Parse options JSON for each config
    const parsed: MatchConfigWithOptions[] = configs.map((c) => ({
      ...c,
      options: JSON.parse(c.options || '[]') as string[],
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/match-configs/:id - Get a specific config
router.get(
  '/:id',
  (req: Request<IdParams>, res: Response<ApiResponse<MatchConfigWithOptions>>): void => {
    try {
      const db = getRegistryDb();
      const config = db.prepare('SELECT * FROM match_configs WHERE id = ?').get(req.params.id) as
        | MatchConfigRow
        | undefined;
      if (!config) {
        res.status(404).json({ success: false, error: 'Config not found' });
        return;
      }
      const parsed: MatchConfigWithOptions = {
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

// POST /api/match-configs - Create a new match config
router.post(
  '/',
  (
    req: Request<unknown, unknown, CreateMatchConfigBody>,
    res: Response<ApiResponse<CreateMatchConfigResponse>>
  ): void => {
    const { name, options } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    try {
      const db = getRegistryDb();
      const optionsJson = JSON.stringify(options || []);
      const stmt = db.prepare('INSERT INTO match_configs (name, options) VALUES (?, ?)');
      const result = stmt.run(name, optionsJson);
      res.json({
        success: true,
        data: { id: result.lastInsertRowid, name, options: options || [] },
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

// PUT /api/match-configs/:id - Update a match config
router.put(
  '/:id',
  (
    req: Request<IdParams, unknown, UpdateMatchConfigBody>,
    res: Response<ApiResponse<undefined>>
  ): void => {
    const { name, options } = req.body;

    try {
      const db = getRegistryDb();
      const optionsJson = JSON.stringify(options || []);
      const stmt = db.prepare(
        'UPDATE match_configs SET name = ?, options = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      stmt.run(name, optionsJson, req.params.id);
      res.json({ success: true, data: undefined });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/match-configs/:id - Delete a match config
router.delete('/:id', (req: Request<IdParams>, res: Response<ApiResponse<undefined>>): void => {
  try {
    const db = getRegistryDb();
    db.prepare('DELETE FROM match_configs WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: undefined });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
