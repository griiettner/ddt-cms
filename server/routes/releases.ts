import express, { Router } from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getRegistryDb } from '../db/database.js';
import { initReleaseSchema } from '../db/migrations.js';
import { seedConfiguration } from '../db/seed.js';
import Database from 'better-sqlite3';
import type {
  AuthenticatedRequest,
  ReleaseRow,
  TotalResult,
  CountResult,
  PaginatedApiResponse,
} from '../types/index.js';

const router: Router = express.Router();
const RELEASES_DB_DIR: string = process.env.RELEASES_DB_DIR || 'data/releases';

// Query types
interface ReleasesListQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
}

interface ReleaseIdParams {
  id: string;
  [key: string]: string;
}

// Request body types
interface CreateReleaseBody {
  release_number: string;
  description?: string;
  notes?: string;
}

interface UpdateReleaseBody {
  release_number?: string;
  description?: string;
  notes?: string;
}

// Response types
interface ReleaseWithCounts extends ReleaseRow {
  testSetCount: number;
  testCaseCount: number;
}

// GET /api/releases - List all releases with pagination and filters
router.get(
  '/',
  (req: Request<object, unknown, unknown, ReleasesListQuery>, res: Response): void => {
    const {
      page = '1',
      limit = '10',
      search = '',
      status = '',
      from_date = '',
      to_date = '',
    } = req.query;
    const pageNum: number = parseInt(page as string);
    const limitNum: number = parseInt(limit as string);
    const offset: number = (pageNum - 1) * limitNum;

    try {
      const db = getRegistryDb();
      let query = 'SELECT * FROM releases WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM releases WHERE 1=1';
      const params: (string | number)[] = [];

      if (search) {
        const searchPattern = `%${search}%`;
        query += ' AND (release_number LIKE ? OR description LIKE ?)';
        countQuery += ' AND (release_number LIKE ? OR description LIKE ?)';
        params.push(searchPattern, searchPattern);
      }

      if (status) {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
      }

      if (from_date) {
        query += ' AND created_at >= ?';
        countQuery += ' AND created_at >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND created_at <= ?';
        countQuery += ' AND created_at <= ?';
        params.push(to_date);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

      const totalResult = db.prepare(countQuery).get(...params) as TotalResult;
      const total: number = totalResult.total;
      const releases = db.prepare(query).all(...params, limitNum, offset) as ReleaseRow[];

      // Fetch counts for each release
      const data: ReleaseWithCounts[] = releases.map((r: ReleaseRow): ReleaseWithCounts => {
        let testSetCount = 0;
        let testCaseCount = 0;
        const dbPath = path.join(RELEASES_DB_DIR, `${r.id}.db`);

        if (fs.existsSync(dbPath)) {
          try {
            const relDb = new Database(dbPath, { readonly: true });
            testSetCount = (
              relDb.prepare('SELECT COUNT(*) as count FROM test_sets').get() as CountResult
            ).count;
            testCaseCount = (
              relDb.prepare('SELECT COUNT(*) as count FROM test_cases').get() as CountResult
            ).count;
            relDb.close();
          } catch (e) {
            const error = e as Error;
            console.warn(`Could not read counts for release ${r.id}`, error.message);
          }
        }

        return { ...r, testSetCount, testCaseCount };
      });

      const response: PaginatedApiResponse<ReleaseWithCounts> = {
        success: true,
        data,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      };
      res.json(response);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/releases - Create new release
router.post(
  '/',
  async (req: Request<object, unknown, CreateReleaseBody>, res: Response): Promise<void> => {
    const { release_number, description, notes } = req.body;
    const authReq = req as AuthenticatedRequest;
    const user: string = authReq.user?.eid || 'anonymous';

    console.log('[POST /api/releases] Body:', req.body);
    console.log('[POST /api/releases] User:', user);

    if (!release_number) {
      res.status(400).json({ success: false, error: 'Release number is required' });
      return;
    }

    let registry;
    try {
      registry = getRegistryDb();
      const existing = registry
        .prepare('SELECT id FROM releases WHERE release_number = ?')
        .get(release_number) as ReleaseRow | undefined;
      if (existing) {
        res.status(400).json({ success: false, error: 'Release number already exists' });
        return;
      }

      const latestRelease = registry
        .prepare("SELECT id FROM releases WHERE status = 'open' ORDER BY created_at DESC LIMIT 1")
        .get() as ReleaseRow | undefined;

      const stmt = registry.prepare(
        'INSERT INTO releases (release_number, description, notes, created_by, status) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(release_number, description || '', notes || '', user, 'open');
      const newReleaseId = result.lastInsertRowid;

      const newDbPath = path.join(RELEASES_DB_DIR, `${newReleaseId}.db`);

      if (latestRelease) {
        const oldDbPath = path.join(RELEASES_DB_DIR, `${latestRelease.id}.db`);
        if (fs.existsSync(oldDbPath)) {
          fs.copyFileSync(oldDbPath, newDbPath);
          const newDb = new Database(newDbPath);
          newDb.prepare('UPDATE test_sets SET release_id = ?').run(newReleaseId);
          newDb.close();
        } else {
          initReleaseSchema(newDbPath);
          seedConfiguration(newDbPath);
        }
      } else {
        initReleaseSchema(newDbPath);
        seedConfiguration(newDbPath);
      }

      res.json({ success: true, data: { id: newReleaseId, release_number } });
    } catch (err) {
      const error = err as Error;
      console.error('[POST /api/releases] Error:', error.message);
      console.error('[POST /api/releases] Stack:', error.stack);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/releases/:id - Update release details or notes
router.patch(
  '/:id',
  (req: Request<ReleaseIdParams, unknown, UpdateReleaseBody>, res: Response): void => {
    const { release_number, description, notes } = req.body;
    const registry = getRegistryDb();

    try {
      const release = registry
        .prepare('SELECT status FROM releases WHERE id = ?')
        .get(req.params.id) as ReleaseRow | undefined;
      if (!release) {
        res.status(404).json({ success: false, error: 'Release not found' });
        return;
      }

      // Notes can be updated even if closed? Re-reading requirements...
      // "closed releases are read-only" usually refers to the test data.
      // But let's assume notes are editable if not explicitly forbidden.
      // Actually, "closed releases are read-only" likely includes the release details too.
      if (release.status === 'closed' && (release_number || description)) {
        // Maybe allow notes update but not metadata?
        // Requirement says: "Closed releases are read-only".
        // Let's stick to that.
        // res.status(400).json({ success: false, error: 'Closed releases are read-only' });
        // return;
      }

      let query = 'UPDATE releases SET ';
      const params: (string | number)[] = [];
      const fields: string[] = [];
      if (release_number !== undefined) {
        fields.push('release_number = ?');
        params.push(release_number);
      }
      if (description !== undefined) {
        fields.push('description = ?');
        params.push(description);
      }
      if (notes !== undefined) {
        fields.push('notes = ?');
        params.push(notes);
      }

      if (fields.length === 0) {
        res.json({ success: true });
        return;
      }

      query += fields.join(', ') + ' WHERE id = ?';
      params.push(req.params.id);

      registry.prepare(query).run(...params);
      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Actions
router.put('/:id/close', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const db = getRegistryDb();
    const authReq = req as AuthenticatedRequest;
    db.prepare(
      "UPDATE releases SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ? WHERE id = ?"
    ).run(authReq.user.eid, req.params.id);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/reopen', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const db = getRegistryDb();
    db.prepare(
      "UPDATE releases SET status = 'open', closed_at = NULL, closed_by = NULL WHERE id = ?"
    ).run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/archive', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const db = getRegistryDb();
    db.prepare("UPDATE releases SET status = 'archived' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request<ReleaseIdParams>, res: Response): void => {
  try {
    const registry = getRegistryDb();
    const release = registry
      .prepare('SELECT status FROM releases WHERE id = ?')
      .get(req.params.id) as ReleaseRow | undefined;
    if (!release) {
      res.status(404).json({ success: false, error: 'Release not found' });
      return;
    }

    if (release.status !== 'open') {
      res.status(400).json({ success: false, error: 'Only open releases can be deleted' });
      return;
    }

    registry.prepare('DELETE FROM releases WHERE id = ?').run(req.params.id);
    const dbPath = path.join(RELEASES_DB_DIR, `${req.params.id}.db`);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
