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
      const scenarioResult = db.prepare('INSERT INTO test_scenarios (test_case_id, name, description) VALUES (?, ?, ?)')
        .run(caseId, 'Default Scenario', 'Auto-created default scenario');
      
      return { caseId, scenarioId: scenarioResult.lastInsertRowid };
    });

    const { caseId, scenarioId } = createWithScenario(testSetId, name, description || '', order_index || 0);
    
    res.json({ 
      success: true, 
      data: { id: caseId, scenarioId, test_set_id: testSetId, name, description, order_index } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/test-cases/:releaseId/:id - Update test case
router.patch('/:releaseId/:id', (req, res) => {
  const { releaseId, id } = req.params;
  const { name, description } = req.body;

  try {
    const db = getReleaseDb(releaseId);
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

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(id);
    db.prepare(`UPDATE test_cases SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/test-cases/:releaseId/:id - Delete test case and all scenarios/steps
router.delete('/:releaseId/:id', (req, res) => {
  const { releaseId, id } = req.params;

  try {
    const db = getReleaseDb(releaseId);

    // Verify the test case exists before delete
    const existingCase = db.prepare('SELECT id, name FROM test_cases WHERE id = ?').get(id);
    if (!existingCase) {
      console.log(`[DELETE] Test case ${id} not found in release ${releaseId}`);
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    console.log(`[DELETE] Deleting test case ${id} (${existingCase.name}) from release ${releaseId}`);

    const result = db.transaction(() => {
      // Get all scenarios for this test case
      const scenarios = db.prepare('SELECT id FROM test_scenarios WHERE test_case_id = ?').all(id);
      console.log(`[DELETE] Found ${scenarios.length} scenarios to delete`);

      // Delete steps for each scenario
      for (const scenario of scenarios) {
        const stepsDeleted = db.prepare('DELETE FROM test_steps WHERE test_scenario_id = ?').run(scenario.id);
        console.log(`[DELETE] Deleted ${stepsDeleted.changes} steps for scenario ${scenario.id}`);
      }

      // Delete all scenarios
      const scenariosDeleted = db.prepare('DELETE FROM test_scenarios WHERE test_case_id = ?').run(id);
      console.log(`[DELETE] Deleted ${scenariosDeleted.changes} scenarios`);

      // Delete the test case
      const caseDeleted = db.prepare('DELETE FROM test_cases WHERE id = ?').run(id);
      console.log(`[DELETE] Deleted ${caseDeleted.changes} test case(s)`);

      return caseDeleted.changes;
    })();

    if (result === 0) {
      console.log(`[DELETE] Warning: No rows deleted for test case ${id}`);
    }

    res.json({ success: true, deleted: result > 0 });
  } catch (err) {
    console.error(`[DELETE] Error deleting test case ${id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/test-cases/scenarios/:releaseId?testCaseId=X - List scenarios for a case
router.get('/scenarios/:releaseId', (req, res) => {
    const { testCaseId } = req.query;
    if (!testCaseId) return res.status(400).json({ success: false, error: 'testCaseId is required' });
    try {
        const db = getReleaseDb(req.params.releaseId);
        const scenarios = db.prepare('SELECT * FROM test_scenarios WHERE test_case_id = ?').all(testCaseId);
        res.json({ success: true, data: scenarios });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/test-cases/scenarios/:releaseId - Create scenario
router.post('/scenarios/:releaseId', (req, res) => {
    const { testCaseId, name, description } = req.body;
    try {
        const db = getReleaseDb(req.params.releaseId);
        const stmt = db.prepare('INSERT INTO test_scenarios (test_case_id, name, description) VALUES (?, ?, ?)');
        const result = stmt.run(testCaseId, name, description || '');
        res.json({ success: true, data: { id: result.lastInsertRowid } });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/test-cases/all-scenarios/:releaseId?testSetId=X - List ALL scenarios for a test set
router.get('/all-scenarios/:releaseId', (req, res) => {
    const { testSetId } = req.query;
    if (!testSetId) return res.status(400).json({ success: false, error: 'testSetId is required' });
    try {
        const db = getReleaseDb(req.params.releaseId);
        const scenarios = db.prepare(`
            SELECT ts.*, tc.name as case_name 
            FROM test_scenarios ts
            JOIN test_cases tc ON ts.test_case_id = tc.id
            WHERE tc.test_set_id = ?
            ORDER BY tc.order_index ASC, ts.order_index ASC
        `).all(testSetId);
        res.json({ success: true, data: scenarios });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/test-cases/scenarios/:releaseId/:id - Update scenario
router.patch('/scenarios/:releaseId/:id', (req, res) => {
    const { releaseId, id } = req.params;
    const updates = req.body;
    try {
        const db = getReleaseDb(releaseId);
        const fields = Object.keys(updates).map(f => `${f} = ?`).join(', ');
        const values = Object.values(updates);
        const stmt = db.prepare(`UPDATE test_scenarios SET ${fields} WHERE id = ?`);
        stmt.run(...values, id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/test-cases/scenarios/:releaseId/:id - Delete scenario and steps
router.delete('/scenarios/:releaseId/:id', (req, res) => {
    const { releaseId, id } = req.params;
    try {
        const db = getReleaseDb(releaseId);
        db.transaction(() => {
            // Delete steps first
            db.prepare('DELETE FROM test_steps WHERE test_scenario_id = ?').run(id);
            // Delete scenario
            db.prepare('DELETE FROM test_scenarios WHERE id = ?').run(id);
        })();
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
