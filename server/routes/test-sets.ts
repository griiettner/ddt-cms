import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getReleaseDb, getRegistryDb } from '../db/database.js';
import type {
  AuthenticatedRequest,
  TestSetRow,
  CategoryRow,
  TotalResult,
  CountResult,
} from '../types/index.js';

const router: Router = express.Router();

// Query types
interface TestSetsListQuery {
  page?: string;
  limit?: string;
  search?: string;
  category_id?: string;
  category_ids?: string;
}

interface ReleaseIdParams {
  releaseId: string;
  [key: string]: string;
}

interface TestSetIdParams {
  releaseId: string;
  id: string;
  [key: string]: string;
}

// Request body types
interface CreateTestSetBody {
  name: string;
  description?: string;
  category_id?: number | null;
}

interface UpdateTestSetBody {
  name?: string;
  description?: string;
  category_id?: number | null;
}

// Response types
interface TestSetWithDetails extends TestSetRow {
  caseCount: number;
  scenarioCount: number;
  category: CategoryRow | null;
}

// Helper to get category info from registry DB
function getCategoryInfo(categoryId: number | null | undefined): CategoryRow | null {
  if (!categoryId) return null;
  try {
    const registryDb = getRegistryDb();
    return registryDb
      .prepare('SELECT id, name, path, level FROM categories WHERE id = ?')
      .get(categoryId) as CategoryRow | null;
  } catch {
    return null;
  }
}

// GET /api/test-sets/:releaseId - List all test sets for a release with pagination and filters
router.get(
  '/:releaseId',
  (req: Request<ReleaseIdParams, unknown, unknown, TestSetsListQuery>, res: Response): void => {
    const { page = '1', limit = '10', search = '', category_id, category_ids } = req.query;
    const pageNum: number = parseInt(page as string);
    const limitNum: number = parseInt(limit as string);
    const offset: number = (pageNum - 1) * limitNum;

    try {
      const db = getReleaseDb(req.params.releaseId);
      let query = 'SELECT * FROM test_sets WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM test_sets WHERE 1=1';
      const params: (string | number)[] = [];

      if (search) {
        const searchPattern = `%${search}%`;
        query += ' AND (name LIKE ? OR description LIKE ?)';
        countQuery += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(searchPattern, searchPattern);
      }

      // Handle multiple category IDs (comma-separated)
      if (category_ids) {
        const ids = category_ids
          .split(',')
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          query += ` AND category_id IN (${placeholders})`;
          countQuery += ` AND category_id IN (${placeholders})`;
          params.push(...ids);
        }
      } else if (category_id) {
        // Single category filter (backwards compatibility)
        query += ' AND category_id = ?';
        countQuery += ' AND category_id = ?';
        params.push(category_id);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

      const totalResult = db.prepare(countQuery).get(...params) as TotalResult | undefined;
      const total: number = totalResult ? totalResult.total : 0;
      const testSets = db.prepare(query).all(...params, limitNum, offset) as TestSetRow[];

      // Fetch counts for each test set and category info
      const data: TestSetWithDetails[] = testSets.map((ts: TestSetRow): TestSetWithDetails => {
        const caseCount = (
          db
            .prepare('SELECT COUNT(*) as count FROM test_cases WHERE test_set_id = ?')
            .get(ts.id) as CountResult
        ).count;
        const scenarioCount = (
          db
            .prepare(
              'SELECT COUNT(*) as count FROM test_scenarios ts JOIN test_cases tc ON ts.test_case_id = tc.id WHERE tc.test_set_id = ?'
            )
            .get(ts.id) as CountResult
        ).count;
        const category = getCategoryInfo(ts.category_id);
        return {
          ...ts,
          caseCount,
          scenarioCount,
          category,
        };
      });

      res.json({
        success: true,
        data,
        pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/test-sets/:releaseId - Create a new test set
router.post(
  '/:releaseId',
  (req: Request<ReleaseIdParams, unknown, CreateTestSetBody>, res: Response): void => {
    const { name, description, category_id } = req.body;
    const { releaseId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const user: string = authReq.user.eid;

    if (!name) {
      res.status(400).json({ success: false, error: 'Test set name is required' });
      return;
    }

    try {
      const db = getReleaseDb(releaseId);
      const stmt = db.prepare(
        'INSERT INTO test_sets (release_id, name, description, category_id, created_by) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(releaseId, name, description || '', category_id || null, user);

      const category = getCategoryInfo(category_id);
      res.json({ success: true, data: { id: result.lastInsertRowid, name, category } });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-sets/:releaseId/:id - Get test set details
router.get('/:releaseId/:id', (req: Request<TestSetIdParams>, res: Response): void => {
  try {
    const db = getReleaseDb(req.params.releaseId);
    const testSet = db.prepare('SELECT * FROM test_sets WHERE id = ?').get(req.params.id) as
      | TestSetRow
      | undefined;
    if (!testSet) {
      res.status(404).json({ success: false, error: 'Test set not found' });
      return;
    }

    const category = getCategoryInfo(testSet.category_id);
    res.json({ success: true, data: { ...testSet, category } });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/test-sets/:releaseId/:id - Update test set
router.patch(
  '/:releaseId/:id',
  (req: Request<TestSetIdParams, unknown, UpdateTestSetBody>, res: Response): void => {
    const { name, description, category_id } = req.body;
    try {
      const db = getReleaseDb(req.params.releaseId);

      // Build dynamic update query
      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (category_id !== undefined) {
        updates.push('category_id = ?');
        params.push(category_id || null);
      }

      if (updates.length === 0) {
        res.status(400).json({ success: false, error: 'No fields to update' });
        return;
      }

      params.push(req.params.id);
      const stmt = db.prepare(`UPDATE test_sets SET ${updates.join(', ')} WHERE id = ?`);
      stmt.run(...params);

      const updated = db.prepare('SELECT * FROM test_sets WHERE id = ?').get(req.params.id) as
        | TestSetRow
        | undefined;
      const category = getCategoryInfo(updated?.category_id);
      res.json({ success: true, data: { ...updated, category } });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-sets/:releaseId/:id - Delete test set
router.delete('/:releaseId/:id', (req: Request<TestSetIdParams>, res: Response): void => {
  try {
    const db = getReleaseDb(req.params.releaseId);
    db.prepare('DELETE FROM test_sets WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
