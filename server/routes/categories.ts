import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { getRegistryDb } from '../db/database.js';
import type { CategoryRow, CountResult, DatabaseInstance } from '../types/index.js';

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
function buildPath(db: DatabaseInstance, parentId: number | null | undefined): string {
  if (!parentId) return '';

  interface ParentInfo {
    id: number;
    path: string;
  }
  const parent = db.prepare('SELECT id, path FROM categories WHERE id = ?').get(parentId) as
    | ParentInfo
    | undefined;
  if (!parent) return '';

  return parent.path ? `${parent.path}/${parent.id}` : `${parent.id}`;
}

/**
 * Get the level (depth) of a category based on its parent
 */
function getLevel(db: DatabaseInstance, parentId: number | null | undefined): number {
  if (!parentId) return 0;

  interface LevelInfo {
    level: number;
  }
  const parent = db.prepare('SELECT level FROM categories WHERE id = ?').get(parentId) as
    | LevelInfo
    | undefined;
  return parent ? parent.level + 1 : 0;
}

/**
 * Rebuild nested set values (lft, rgt) for the entire tree
 */
function rebuildNestedSet(db: DatabaseInstance): void {
  let counter = 0;

  interface NodeId {
    id: number;
  }

  function processNode(nodeId: number): void {
    const lft = ++counter;

    // Get all children
    const children = db
      .prepare('SELECT id FROM categories WHERE parent_id = ? ORDER BY name')
      .all(nodeId) as NodeId[];
    for (const child of children) {
      processNode(child.id);
    }

    const rgt = ++counter;
    db.prepare('UPDATE categories SET lft = ?, rgt = ? WHERE id = ?').run(lft, rgt, nodeId);
  }

  // Process all root nodes
  const roots = db
    .prepare('SELECT id FROM categories WHERE parent_id IS NULL ORDER BY name')
    .all() as NodeId[];
  for (const root of roots) {
    processNode(root.id);
  }
}

// GET /api/categories - List all categories as a tree
router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getRegistryDb();
    const categories = db
      .prepare(
        `
      SELECT * FROM categories ORDER BY lft, name
    `
      )
      .all() as CategoryRow[];

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
router.get('/flat', (req: Request, res: Response): void => {
  try {
    const db = getRegistryDb();
    const categories = db
      .prepare(
        `
      SELECT * FROM categories ORDER BY path, name
    `
      )
      .all() as CategoryRow[];

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
router.get('/:id', (req: Request<CategoryIdParams>, res: Response): void => {
  try {
    const db = getRegistryDb();
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as
      | CategoryRow
      | undefined;

    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    // Get children count
    const childrenCount = (
      db
        .prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?')
        .get(category.id) as CountResult
    ).count;

    const response: CategoryWithCount = { ...category, childrenCount };
    res.json({ success: true, data: response });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/categories - Create a new category
router.post('/', (req: Request<object, unknown, CreateCategoryBody>, res: Response): void => {
  const { name, description, parent_id } = req.body;

  if (!name) {
    res.status(400).json({ success: false, error: 'Category name is required' });
    return;
  }

  try {
    const db = getRegistryDb();

    // Build path and level based on parent
    const path = buildPath(db, parent_id);
    const level = getLevel(db, parent_id);

    const stmt = db.prepare(`
      INSERT INTO categories (parent_id, name, description, path, level)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(parent_id || null, name, description || '', path, level);

    // Rebuild nested set values
    rebuildNestedSet(db);

    const category = db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(result.lastInsertRowid) as CategoryRow;

    res.json({ success: true, data: category });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/categories/:id - Update category
router.patch(
  '/:id',
  (req: Request<CategoryIdParams, unknown, UpdateCategoryBody>, res: Response): void => {
    const { name, description, parent_id } = req.body;
    const { id } = req.params;

    try {
      const db = getRegistryDb();

      // Check if category exists
      const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
        | CategoryRow
        | undefined;
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
        const potentialParent = db
          .prepare('SELECT path FROM categories WHERE id = ?')
          .get(parent_id) as PathInfo | undefined;
        if (potentialParent && potentialParent.path && potentialParent.path.includes(`/${id}/`)) {
          res.status(400).json({ success: false, error: 'Cannot set a descendant as parent' });
          return;
        }
      }

      // Build new path and level
      const newPath = buildPath(db, parent_id);
      const newLevel = getLevel(db, parent_id);

      db.prepare(
        `
      UPDATE categories
      SET name = ?, description = ?, parent_id = ?, path = ?, level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
      ).run(
        name || existing.name,
        description !== undefined ? description : existing.description,
        parent_id !== undefined ? parent_id || null : existing.parent_id,
        newPath,
        newLevel,
        id
      );

      // Update paths of all descendants
      interface ChildInfo {
        id: number;
        name: string;
      }

      const updateDescendantPaths = (
        parentId: string | number,
        parentPath: string,
        parentLevel: number
      ): void => {
        const children = db
          .prepare('SELECT id, name FROM categories WHERE parent_id = ?')
          .all(parentId) as ChildInfo[];
        for (const child of children) {
          const childPath = parentPath ? `${parentPath}/${parentId}` : `${parentId}`;
          const childLevel = parentLevel + 1;
          db.prepare('UPDATE categories SET path = ?, level = ? WHERE id = ?').run(
            childPath,
            childLevel,
            child.id
          );
          updateDescendantPaths(child.id, childPath, childLevel);
        }
      };

      if (parent_id !== undefined) {
        updateDescendantPaths(id, newPath, newLevel);
      }

      // Rebuild nested set values
      rebuildNestedSet(db);

      const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow;
      res.json({ success: true, data: updated });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// DELETE /api/categories/:id - Delete category (only if no test sets use it)
router.delete('/:id', (req: Request<CategoryIdParams>, res: Response): void => {
  const { id } = req.params;

  try {
    const db = getRegistryDb();

    // Check if category exists
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
      | CategoryRow
      | undefined;
    if (!category) {
      res.status(404).json({ success: false, error: 'Category not found' });
      return;
    }

    // Check if category has children
    const childrenCount = (
      db
        .prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?')
        .get(id) as CountResult
    ).count;
    if (childrenCount > 0) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories. Delete or move children first.',
      });
      return;
    }

    // Note: We can't check test_sets usage here since they're in release DBs
    // The UI should handle this validation before allowing deletion

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    // Rebuild nested set values
    rebuildNestedSet(db);

    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
