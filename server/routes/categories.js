import express from 'express';
import { getRegistryDb } from '../db/database.js';

const router = express.Router();

/**
 * Build the path string for a category based on its parent
 */
function buildPath(db, parentId) {
  if (!parentId) return '';

  const parent = db.prepare('SELECT id, path FROM categories WHERE id = ?').get(parentId);
  if (!parent) return '';

  return parent.path ? `${parent.path}/${parent.id}` : `${parent.id}`;
}

/**
 * Get the level (depth) of a category based on its parent
 */
function getLevel(db, parentId) {
  if (!parentId) return 0;

  const parent = db.prepare('SELECT level FROM categories WHERE id = ?').get(parentId);
  return parent ? parent.level + 1 : 0;
}

/**
 * Rebuild nested set values (lft, rgt) for the entire tree
 */
function rebuildNestedSet(db) {
  let counter = 0;

  function processNode(nodeId) {
    const lft = ++counter;

    // Get all children
    const children = db.prepare('SELECT id FROM categories WHERE parent_id = ? ORDER BY name').all(nodeId);
    for (const child of children) {
      processNode(child.id);
    }

    const rgt = ++counter;
    db.prepare('UPDATE categories SET lft = ?, rgt = ? WHERE id = ?').run(lft, rgt, nodeId);
  }

  // Process all root nodes
  const roots = db.prepare('SELECT id FROM categories WHERE parent_id IS NULL ORDER BY name').all();
  for (const root of roots) {
    processNode(root.id);
  }
}

// GET /api/categories - List all categories as a tree
router.get('/', (req, res) => {
  try {
    const db = getRegistryDb();
    const categories = db.prepare(`
      SELECT * FROM categories ORDER BY lft, name
    `).all();

    // Build tree structure
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }));
    };

    const tree = buildTree(categories);

    res.json({ success: true, data: categories, tree });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/categories/flat - List all categories flat (for dropdowns)
router.get('/flat', (req, res) => {
  try {
    const db = getRegistryDb();
    const categories = db.prepare(`
      SELECT * FROM categories ORDER BY path, name
    `).all();

    // Add indented display name for dropdowns
    const data = categories.map(cat => ({
      ...cat,
      displayName: cat.level > 0 ? `${'— '.repeat(cat.level)}${cat.name}` : cat.name
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/categories/:id - Get category details
router.get('/:id', (req, res) => {
  try {
    const db = getRegistryDb();
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Get children count
    const childrenCount = db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?').get(category.id).count;

    res.json({ success: true, data: { ...category, childrenCount } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/categories - Create a new category
router.post('/', (req, res) => {
  const { name, description, parent_id } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Category name is required' });
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

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/categories/:id - Update category
router.patch('/:id', (req, res) => {
  const { name, description, parent_id } = req.body;
  const { id } = req.params;

  try {
    const db = getRegistryDb();

    // Check if category exists
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Prevent setting parent to self or descendant
    if (parent_id) {
      if (parent_id == id) {
        return res.status(400).json({ success: false, error: 'Category cannot be its own parent' });
      }

      // Check if new parent is a descendant
      const potentialParent = db.prepare('SELECT path FROM categories WHERE id = ?').get(parent_id);
      if (potentialParent && potentialParent.path && potentialParent.path.includes(`/${id}/`)) {
        return res.status(400).json({ success: false, error: 'Cannot set a descendant as parent' });
      }
    }

    // Build new path and level
    const newPath = buildPath(db, parent_id);
    const newLevel = getLevel(db, parent_id);

    db.prepare(`
      UPDATE categories
      SET name = ?, description = ?, parent_id = ?, path = ?, level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || existing.name,
      description !== undefined ? description : existing.description,
      parent_id !== undefined ? (parent_id || null) : existing.parent_id,
      newPath,
      newLevel,
      id
    );

    // Update paths of all descendants
    const updateDescendantPaths = (parentId, parentPath, parentLevel) => {
      const children = db.prepare('SELECT id, name FROM categories WHERE parent_id = ?').all(parentId);
      for (const child of children) {
        const childPath = parentPath ? `${parentPath}/${parentId}` : `${parentId}`;
        const childLevel = parentLevel + 1;
        db.prepare('UPDATE categories SET path = ?, level = ? WHERE id = ?').run(childPath, childLevel, child.id);
        updateDescendantPaths(child.id, childPath, childLevel);
      }
    };

    if (parent_id !== undefined) {
      updateDescendantPaths(id, newPath, newLevel);
    }

    // Rebuild nested set values
    rebuildNestedSet(db);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/categories/:id - Delete category (only if no test sets use it)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const db = getRegistryDb();

    // Check if category exists
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Check if category has children
    const childrenCount = db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?').get(id).count;
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories. Delete or move children first.'
      });
    }

    // Note: We can't check test_sets usage here since they're in release DBs
    // The UI should handle this validation before allowing deletion

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    // Rebuild nested set values
    rebuildNestedSet(db);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
