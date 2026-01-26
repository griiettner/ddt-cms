import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db/database.js';
import type { DatabaseWrapper } from '../db/database.js';
import type { CategoryRow, CountResult } from '../types/index.js';
import { logAudit } from '../utils/auditLogger.js';

const router: Router = express.Router();

// Param types
interface CategoryIdParams {
  id: string;
}

// Request body types
interface CreateCategoryBody {
  name: string;
  description?: string;
  parent_id?: number | null;
}

interface UpdateCategoryBody {
  name?: string;
  description?: string;
  parent_id?: number | null;
}

// Response types
interface CategoryWithChildren extends CategoryRow {
  children: CategoryWithChildren[];
}

interface CategoryWithCount extends CategoryRow {
  childrenCount: number;
}

interface CategoryFlat extends CategoryRow {
  displayName: string;
}

/**
 * Build the path string for a category based on its parent
 */
async function buildPath(
  db: DatabaseWrapper,
  parentId: number | null | undefined
): Promise<string> {
  if (!parentId) return '';

  interface ParentInfo {
    id: number;
    path: string;
  }
  const parent = await db.get<ParentInfo>('SELECT id, path FROM categories WHERE id = ?', [
    parentId,
  ]);
  if (!parent) return '';

  return parent.path ? `${parent.path}/${parent.id}` : `${parent.id}`;
}

/**
 * Get the level (depth) of a category based on its parent
 */
async function getLevel(db: DatabaseWrapper, parentId: number | null | undefined): Promise<number> {
  if (!parentId) return 0;

  interface LevelInfo {
    level: number;
  }
  const parent = await db.get<LevelInfo>('SELECT level FROM categories WHERE id = ?', [parentId]);
  return parent ? parent.level + 1 : 0;
}

/**
 * Rebuild nested set values (lft, rgt) for the entire tree
 */
async function rebuildNestedSet(db: DatabaseWrapper): Promise<void> {
  let counter = 0;

  interface NodeId {
    id: number;
  }

  async function processNode(nodeId: number): Promise<void> {
    const lft = ++counter;

    // Get all children
    const children = await db.all<NodeId>(
      'SELECT id FROM categories WHERE parent_id = ? ORDER BY name',
      [nodeId]
    );
    for (const child of children) {
      await processNode(child.id);
    }

    const rgt = ++counter;
    await db.run('UPDATE categories SET lft = ?, rgt = ? WHERE id = ?', [lft, rgt, nodeId]);
  }

  // Process all root nodes
  const roots = await db.all<NodeId>(
    'SELECT id FROM categories WHERE parent_id IS NULL ORDER BY name'
  );
  for (const root of roots) {
    await processNode(root.id);
  }
}

// GET /api/categories - List all categories as a tree
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const categories = await db.all<CategoryRow>(`SELECT * FROM categories ORDER BY lft, name`);

    // Build tree structure
    const buildTree = (
      items: CategoryRow[],
      parentId: number | null = null
    ): CategoryWithChildren[] => {
      return items
        .filter((item) => item.parent_id === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };

    const tree = buildTree(categories);

    res.json({ success: true, data: categories, tree });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/categories/flat - List all categories flat (for dropdowns)
router.get('/flat', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const categories = await db.all<CategoryRow>(`SELECT * FROM categories ORDER BY path, name`);

    // Add indented display name for dropdowns
    const data: CategoryFlat[] = categories.map(
      (cat: CategoryRow): CategoryFlat => ({
        ...cat,
        displayName: cat.level > 0 ? `${'— '.repeat(cat.level)}${cat.name}` : cat.name,
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/categories/:id - Get category details
router.get('/:id', async (req: Request<CategoryIdParams>, res: Response): Promise<void> => {
  try {
    const db = getDb();
    const category = await db.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [
      req.params.id,
    ]);

    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    // Get children count
    const countResult = await db.get<CountResult>(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [category.id]
    );
    const childrenCount = countResult?.count ?? 0;

    const response: CategoryWithCount = { ...category, childrenCount };
    res.json({ success: true, data: response });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/categories - Create a new category
router.post(
  '/',
  async (req: Request<object, unknown, CreateCategoryBody>, res: Response): Promise<void> => {
    const { name, description, parent_id } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Category name is required' });
      return;
    }

    try {
      const db = getDb();

      // Build path and level based on parent
      const path = await buildPath(db, parent_id);
      const level = await getLevel(db, parent_id);

      const result = await db.run(
        `INSERT INTO categories (parent_id, name, description, path, level)
       VALUES (?, ?, ?, ?, ?)`,
        [parent_id ?? null, name, description || '', path, level]
      );

      // Rebuild nested set values
      await rebuildNestedSet(db);

      const newId = Number(result.lastInsertRowid);
      const category = await db.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [newId]);

      logAudit({
        req,
        action: 'CREATE',
        resourceType: 'category',
        resourceId: newId,
        resourceName: name,
      });

      res.json({ success: true, data: category });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// PATCH /api/categories/:id - Update category
router.patch(
  '/:id',
  async (
    req: Request<CategoryIdParams, unknown, UpdateCategoryBody>,
    res: Response
  ): Promise<void> => {
    const { name, description, parent_id } = req.body;
    const { id } = req.params;

    try {
      const db = getDb();

      // Check if category exists
      const existing = await db.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Category not found' });
        return;
      }

      // Prevent setting parent to self or descendant
      if (parent_id) {
        if (parent_id == parseInt(id)) {
          res.status(400).json({ success: false, error: 'Category cannot be its own parent' });
          return;
        }

        // Check if new parent is a descendant
        interface PathInfo {
          path: string;
        }
        const potentialParent = await db.get<PathInfo>('SELECT path FROM categories WHERE id = ?', [
          parent_id,
        ]);
        if (potentialParent && potentialParent.path && potentialParent.path.includes(`/${id}/`)) {
          res.status(400).json({ success: false, error: 'Cannot set a descendant as parent' });
          return;
        }
      }

      // Build new path and level
      const newPath = await buildPath(db, parent_id);
      const newLevel = await getLevel(db, parent_id);

      await db.run(
        `UPDATE categories
         SET name = ?, description = ?, parent_id = ?, path = ?, level = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          name || existing.name,
          description !== undefined ? description : existing.description,
          parent_id !== undefined ? (parent_id ?? null) : existing.parent_id,
          newPath,
          newLevel,
          id,
        ]
      );

      // Update paths of all descendants
      interface ChildInfo {
        id: number;
        name: string;
      }

      const updateDescendantPaths = async (
        parentId: string | number,
        parentPath: string,
        parentLevel: number
      ): Promise<void> => {
        const children = await db.all<ChildInfo>(
          'SELECT id, name FROM categories WHERE parent_id = ?',
          [parentId]
        );
        for (const child of children) {
          const childPath = parentPath ? `${parentPath}/${parentId}` : `${parentId}`;
          const childLevel = parentLevel + 1;
          await db.run('UPDATE categories SET path = ?, level = ? WHERE id = ?', [
            childPath,
            childLevel,
            child.id,
          ]);
          await updateDescendantPaths(child.id, childPath, childLevel);
        }
      };

      if (parent_id !== undefined) {
        await updateDescendantPaths(id, newPath, newLevel);
      }

      // Rebuild nested set values
      await rebuildNestedSet(db);

      const updated = await db.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);

      logAudit({
        req,
        action: 'UPDATE',
        resourceType: 'category',
        resourceId: parseInt(id),
        resourceName: updated?.name,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/categories/:id - Delete category (only if no test sets use it)
router.delete('/:id', async (req: Request<CategoryIdParams>, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const db = getDb();

    // Check if category exists
    const category = await db.get<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    // Check if category has children
    const countResult = await db.get<CountResult>(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [id]
    );
    const childrenCount = countResult?.count ?? 0;
    if (childrenCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories. Delete or move children first.',
      });
      return;
    }

    // Note: We can't check test_sets usage here since they're in release DBs
    // The UI should handle this validation before allowing deletion

    await db.run('DELETE FROM categories WHERE id = ?', [id]);

    // Rebuild nested set values
    await rebuildNestedSet(db);

    logAudit({
      req,
      action: 'DELETE',
      resourceType: 'category',
      resourceId: parseInt(id),
      resourceName: category.name,
    });

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
