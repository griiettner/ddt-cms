import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type {
  AuthenticatedRequest,
  TestSetRow,
  CategoryRow,
  TotalResult,
  CountResult,
} from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

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

// Extended category info with display path
interface CategoryWithDisplayPath extends CategoryRow {
  displayPath: string;
}

// Response types
interface TestSetWithDetails extends TestSetRow {
  caseCount: number;
  scenarioCount: number;
  category: CategoryWithDisplayPath | null;
}

// Helper to get category info with full display path
async function getCategoryInfo(
  categoryId: number | null | undefined
): Promise<CategoryWithDisplayPath | null> {
  if (!categoryId) return null;
  try {
    const db = getDb();
    const category = await db.get<CategoryRow>(
      'SELECT id, name, path, level FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!category) return null;

    // Build the display path from ancestor IDs
    let displayPath = category.name;

    if (category.path) {
      // path contains ancestor IDs like "1/2/3"
      const ancestorIds = category.path.split('/').filter((id) => id);
      if (ancestorIds.length > 0) {
        const placeholders = ancestorIds.map(() => '?').join(',');
        const ancestors = await db.all<{ id: number; name: string }>(
          `SELECT id, name FROM categories WHERE id IN (${placeholders})`,
          ancestorIds.map((id) => parseInt(id))
        );

        // Create a map for quick lookup
        const ancestorMap = new Map(ancestors.map((a) => [a.id, a.name]));

        // Build path in order
        const pathNames = ancestorIds
          .map((id) => ancestorMap.get(parseInt(id)) || '')
          .filter((name) => name);
        pathNames.push(category.name);
        displayPath = pathNames.join(' / ');
      }
    }

    return { ...category, displayPath };
  } catch {
    return null;
  }
}

// GET /api/test-sets/:releaseId - List all test sets for a release with pagination and filters
router.get(
  '/:releaseId',
  async (
    req: Request<ReleaseIdParams, unknown, unknown, TestSetsListQuery>,
    res: Response
  ): Promise<void> => {
    const { page = '1', limit = '10', search = '', category_id, category_ids } = req.query;
    const pageNum: number = parseInt(page as string);
    const limitNum: number = parseInt(limit as string);
    const offset: number = (pageNum - 1) * limitNum;
    const releaseId = req.params.releaseId;

    try {
      const db = getDb();
      let query = 'SELECT * FROM test_sets WHERE release_id = ?';
      let countQuery = 'SELECT COUNT(*) as total FROM test_sets WHERE release_id = ?';
      const params: (string | number)[] = [releaseId];

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

      const totalResult = await db.get<TotalResult>(countQuery, params);
      const total: number = totalResult ? totalResult.total : 0;
      const testSets = await db.all<TestSetRow>(query, [...params, limitNum, offset]);

      // Fetch counts for each test set and category info
      const data: TestSetWithDetails[] = [];
      for (const ts of testSets) {
        const caseCountResult = await db.get<CountResult>(
          'SELECT COUNT(*) as count FROM test_cases WHERE test_set_id = ?',
          [ts.id]
        );
        const caseCount = caseCountResult?.count ?? 0;

        const scenarioCountResult = await db.get<CountResult>(
          'SELECT COUNT(*) as count FROM test_scenarios ts JOIN test_cases tc ON ts.test_case_id = tc.id WHERE tc.test_set_id = ?',
          [ts.id]
        );
        const scenarioCount = scenarioCountResult?.count ?? 0;

        const category = await getCategoryInfo(ts.category_id);
        data.push({
          ...ts,
          caseCount,
          scenarioCount,
          category,
        });
      }

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
  async (
    req: Request<ReleaseIdParams, unknown, CreateTestSetBody>,
    res: Response
  ): Promise<void> => {
    const { name, description, category_id } = req.body;
    const { releaseId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const user: string = authReq.user?.eid || 'anonymous';

    if (!name) {
      res.status(400).json({ success: false, error: 'Test set name is required' });
      return;
    }

    try {
      const db = getDb();
      const result = await db.run(
        'INSERT INTO test_sets (release_id, name, description, category_id, created_by) VALUES (?, ?, ?, ?, ?)',
        [releaseId, name, description || '', category_id || null, user]
      );

      const category = await getCategoryInfo(category_id);

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'test_set',
        resourceId: Number(result.lastInsertRowid),
        resourceName: name,
        releaseId: releaseId,
      });

      res.json({ success: true, data: { id: Number(result.lastInsertRowid), name, category } });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/test-sets/:releaseId/:id - Get test set details
router.get(
  '/:releaseId/:id',
  async (req: Request<TestSetIdParams>, res: Response): Promise<void> => {
    try {
      const db = getDb();
      const testSet = await db.get<TestSetRow>(
        'SELECT * FROM test_sets WHERE id = ? AND release_id = ?',
        [req.params.id, req.params.releaseId]
      );
      if (!testSet) {
        res.status(404).json({ success: false, error: 'Test set not found' });
        return;
      }

      const category = await getCategoryInfo(testSet.category_id);
      res.json({ success: true, data: { ...testSet, category } });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/test-sets/:releaseId/:id - Update test set
router.patch(
  '/:releaseId/:id',
  async (
    req: Request<TestSetIdParams, unknown, UpdateTestSetBody>,
    res: Response
  ): Promise<void> => {
    const { name, description, category_id } = req.body;
    try {
      const db = getDb();

      // Fetch the old test set data for audit logging
      const oldTestSet = await db.get<TestSetRow>(
        'SELECT * FROM test_sets WHERE id = ? AND release_id = ?',
        [req.params.id, req.params.releaseId]
      );

      if (!oldTestSet) {
        res.status(404).json({ success: false, error: 'Test set not found' });
        return;
      }

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

      params.push(req.params.id, req.params.releaseId);
      await db.run(
        `UPDATE test_sets SET ${updates.join(', ')} WHERE id = ? AND release_id = ?`,
        params
      );

      const updated = await db.get<TestSetRow>('SELECT * FROM test_sets WHERE id = ?', [
        req.params.id,
      ]);
      const category = await getCategoryInfo(updated?.category_id);

      // Build old and new value objects for changed fields
      const oldValue: Record<string, unknown> = {};
      const newValue: Record<string, unknown> = {};
      if (name !== undefined && name !== oldTestSet.name) {
        oldValue.name = oldTestSet.name;
        newValue.name = name;
      }
      if (description !== undefined && description !== oldTestSet.description) {
        oldValue.description = oldTestSet.description;
        newValue.description = description;
      }
      if (category_id !== undefined && category_id !== oldTestSet.category_id) {
        oldValue.category_id = oldTestSet.category_id;
        newValue.category_id = category_id;
      }

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'test_set',
        resourceId: parseInt(req.params.id),
        resourceName: updated?.name,
        releaseId: req.params.releaseId,
        oldValue: Object.keys(oldValue).length > 0 ? oldValue : null,
        newValue: Object.keys(newValue).length > 0 ? newValue : null,
      });

      res.json({ success: true, data: { ...updated, category } });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/test-sets/:releaseId/:id - Delete test set
router.delete(
  '/:releaseId/:id',
  async (req: Request<TestSetIdParams>, res: Response): Promise<void> => {
    try {
      const db = getDb();

      // Get test set name before deleting for audit log
      const testSet = await db.get<{ name: string }>(
        'SELECT name FROM test_sets WHERE id = ? AND release_id = ?',
        [req.params.id, req.params.releaseId]
      );

      await db.run('DELETE FROM test_sets WHERE id = ? AND release_id = ?', [
        req.params.id,
        req.params.releaseId,
      ]);

      logAudit({
        req,
        action: 'DELETE',
        resourceType: 'test_set',
        resourceId: parseInt(req.params.id),
        resourceName: testSet?.name,
        releaseId: req.params.releaseId,
      });

      res.json({ success: true });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
