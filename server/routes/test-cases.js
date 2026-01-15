import express from 'express';
import { getReleaseDb } from '../db/database.js';

const router = express.Router();

// GET /api/test-cases/:releaseId?testSetId=X - List test cases for a set
router.get('/:releaseId', (req, res) => {
  const { testSetId } = req.query;
  if (!testSetId) {
    return res.status(400).json({ success: false, error: 'testSetId query parameter is required' });
  }

  try {
    const db = getReleaseDb(req.params.releaseId);
    const testCases = db.prepare('SELECT * FROM test_cases WHERE test_set_id = ? ORDER BY order_index ASC').all(testSetId);
    res.json({ success: true, data: testCases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/test-cases/:releaseId - Create test case
router.post('/:releaseId', (req, res) => {
  const { testSetId, name, description, order_index } = req.body;
  if (!testSetId || !name) {
    return res.status(400).json({ success: false, error: 'testSetId and name are required' });
  }

  try {
    const db = getReleaseDb(req.params.releaseId);
    const stmt = db.prepare('INSERT INTO test_cases (test_set_id, name, description, order_index) VALUES (?, ?, ?, ?)');
    
    // Use transaction to ensure both case and scenario are created
    const createWithScenario = db.transaction((tsId, n, desc, idx) => {
      const result = stmt.run(tsId, n, desc, idx);
      const caseId = result.lastInsertRowid;
      
      // Auto-create default scenario
      db.prepare('INSERT INTO test_scenarios (test_case_id, name, description) VALUES (?, ?, ?)')
        .run(caseId, 'Default Scenario', 'Auto-created default scenario');
      
      return caseId;
    });

    const newId = createWithScenario(testSetId, name, description || '', order_index || 0);
    
    res.json({ 
      success: true, 
      data: { id: newId, test_set_id: testSetId, name, description, order_index } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update, Delete, Reorder...
// (Skipping detailed implementation for now to focus on the structure)

// GET /api/test-scenarios/:releaseId?testCaseId=X - List scenarios for a case
router.get('/scenarios/:releaseId', (req, res) => {
    const { testCaseId } = req.query;
    if (!testCaseId) return res.status(400).json({ success: false, error: 'testCaseId is required' });
    try {
        const db = getReleaseDb(req.params.releaseId);
        const scenarios = db.prepare('SELECT * FROM test_scenarios WHERE test_case_id = ?').all(testCaseId);
        res.json({ success: true, data: scenarios });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
