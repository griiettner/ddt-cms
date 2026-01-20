import express from 'express';
import { getReleaseDb, getRegistryDb } from '../db/database.js';

const router = express.Router();

// Helper to get category info from registry DB
function getCategoryInfo(categoryId) {
    if (!categoryId) return null;
    try {
        const registryDb = getRegistryDb();
        return registryDb.prepare('SELECT id, name, path, level FROM categories WHERE id = ?').get(categoryId);
    } catch {
        return null;
    }
}

// GET /api/test-sets/:releaseId - List all test sets for a release with pagination and filters
router.get('/:releaseId', (req, res) => {
    let { page = 1, limit = 10, search = '', category_id, category_ids } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    try {
        const db = getReleaseDb(req.params.releaseId);
        let query = 'SELECT * FROM test_sets WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM test_sets WHERE 1=1';
        const params = [];

        if (search) {
            const searchPattern = `%${search}%`;
            query += ' AND (name LIKE ? OR description LIKE ?)';
            countQuery += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(searchPattern, searchPattern);
        }

        // Handle multiple category IDs (comma-separated)
        if (category_ids) {
            const ids = category_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
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

        const totalResult = db.prepare(countQuery).get(...params);
        const total = totalResult ? totalResult.total : 0;
        const testSets = db.prepare(query).all(...params, limit, offset);

        // Fetch counts for each test set and category info
        const data = testSets.map(ts => {
            const caseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE test_set_id = ?').get(ts.id).count;
            const scenarioCount = db.prepare('SELECT COUNT(*) as count FROM test_scenarios ts JOIN test_cases tc ON ts.test_case_id = tc.id WHERE tc.test_set_id = ?').get(ts.id).count;
            const category = getCategoryInfo(ts.category_id);
            return {
                ...ts,
                caseCount,
                scenarioCount,
                category
            };
        });

        res.json({
            success: true,
            data,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/test-sets/:releaseId - Create a new test set
router.post('/:releaseId', (req, res) => {
    const { name, description, category_id } = req.body;
    const { releaseId } = req.params;
    const user = req.user.eid;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Test set name is required' });
    }

    try {
        const db = getReleaseDb(releaseId);
        const stmt = db.prepare('INSERT INTO test_sets (release_id, name, description, category_id, created_by) VALUES (?, ?, ?, ?, ?)');
        const result = stmt.run(releaseId, name, description || '', category_id || null, user);

        const category = getCategoryInfo(category_id);
        res.json({ success: true, data: { id: result.lastInsertRowid, name, category } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/test-sets/:releaseId/:id - Get test set details
router.get('/:releaseId/:id', (req, res) => {
    try {
        const db = getReleaseDb(req.params.releaseId);
        const testSet = db.prepare('SELECT * FROM test_sets WHERE id = ?').get(req.params.id);
        if (!testSet) return res.status(404).json({ success: false, error: 'Test set not found' });

        const category = getCategoryInfo(testSet.category_id);
        res.json({ success: true, data: { ...testSet, category } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /api/test-sets/:releaseId/:id - Update test set
router.patch('/:releaseId/:id', (req, res) => {
    const { name, description, category_id } = req.body;
    try {
        const db = getReleaseDb(req.params.releaseId);

        // Build dynamic update query
        const updates = [];
        const params = [];

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
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        params.push(req.params.id);
        const stmt = db.prepare(`UPDATE test_sets SET ${updates.join(', ')} WHERE id = ?`);
        stmt.run(...params);

        const updated = db.prepare('SELECT * FROM test_sets WHERE id = ?').get(req.params.id);
        const category = getCategoryInfo(updated?.category_id);
        res.json({ success: true, data: { ...updated, category } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/test-sets/:releaseId/:id - Delete test set
router.delete('/:releaseId/:id', (req, res) => {
    try {
        const db = getReleaseDb(req.params.releaseId);
        db.prepare('DELETE FROM test_sets WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
