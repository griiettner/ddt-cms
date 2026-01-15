import express from 'express';
import { getReleaseDb } from '../db/database.js';

const router = express.Router();

// GET /api/test-steps/:releaseId?scenarioId=X - List steps
router.get('/:releaseId', (req, res) => {
  const { scenarioId } = req.query;
  if (!scenarioId) {
    return res.status(400).json({ success: false, error: 'scenarioId is required' });
  }

  try {
    const db = getReleaseDb(req.params.releaseId);
    const steps = db.prepare('SELECT * FROM test_steps WHERE test_scenario_id = ? ORDER BY order_index ASC').all(scenarioId);
    res.json({ success: true, data: steps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/test-steps/:releaseId/bulk - Bulk update/sync steps for a scenario
router.post('/:releaseId/bulk', (req, res) => {
  const { scenarioId, steps } = req.body; // steps is an array of objects
  if (!scenarioId || !Array.isArray(steps)) {
    return res.status(400).json({ success: false, error: 'scenarioId and steps array are required' });
  }

  const db = getReleaseDb(req.params.releaseId);
  
  try {
    const sync = db.transaction((stepsToSync) => {
      // For POC, we'll just clear and re-insert to maintain order simple.
      // In prod, you'd do a proper diff (UPSERT).
      db.prepare('DELETE FROM test_steps WHERE test_scenario_id = ?').run(scenarioId);
      
      const insert = db.prepare(`
        INSERT INTO test_steps (
          test_scenario_id, order_index, step_definition, type, 
          element_id, action, action_result, required, expected_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stepsToSync.forEach((step, index) => {
        insert.run(
          scenarioId,
          index,
          step.step_definition || '',
          step.type || '',
          step.element_id || '',
          step.action || '',
          step.action_result || '',
          step.required ? 1 : 0,
          step.expected_results || ''
        );
      });
    });

    sync(steps);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
