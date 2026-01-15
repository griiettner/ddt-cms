import express from 'express';
import { getReleaseDb } from '../db/database.js';

const router = express.Router();

// GET /api/test-sets/:releaseId - List all test sets for a release with pagination and filters
router.get('/:releaseId', (req, res) => {
    let { page = 1, limit = 10, search = '' } = req.query;
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

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        
        const totalResult = db.prepare(countQuery).get(...params);
        const total = totalResult ? totalResult.total : 0;
        const testSets = db.prepare(query).all(...params, limit, offset);

        // Fetch counts for each test set
        const data = testSets.map(ts => {
            const caseCount = db.prepare('SELECT COUNT(*) as count FROM test_cases WHERE test_set_id = ?').get(ts.id).count;
            const scenarioCount = db.prepare('SELECT COUNT(*) as count FROM test_scenarios ts JOIN test_cases tc ON ts.test_case_id = tc.id WHERE tc.test_set_id = ?').get(ts.id).count;
            return {
                ...ts,
                caseCount,
                scenarioCount
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
    const { name, description } = req.body;
    const { releaseId } = req.params;
    const user = req.user.eid;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Test set name is required' });
    }

    try {
        const db = getReleaseDb(releaseId);
        const stmt = db.prepare('INSERT INTO test_sets (release_id, name, description, created_by) VALUES (?, ?, ?, ?)');
        const result = stmt.run(releaseId, name, description || '', user);
        
        res.json({ success: true, data: { id: result.lastInsertRowid, name } });
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
        res.json({ success: true, data: testSet });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PATCH /api/test-sets/:releaseId/:id - Update test set
router.patch('/:releaseId/:id', (req, res) => {
    const { name, description } = req.body;
    try {
        const db = getReleaseDb(req.params.releaseId);
        const stmt = db.prepare('UPDATE test_sets SET name = ?, description = ? WHERE id = ?');
        stmt.run(name, description || '', req.params.id);
        res.json({ success: true });
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
