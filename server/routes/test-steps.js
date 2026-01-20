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

// PATCH /api/test-steps/:releaseId/:id - Partial update a step
router.patch('/:releaseId/:id', (req, res) => {
  const { releaseId, id } = req.params;
  const updates = req.body;

  try {
    const db = getReleaseDb(releaseId);
    const fields = Object.keys(updates).map(f => `${f} = ?`).join(', ');
    const values = Object.values(updates).map(val => {
      if (val === undefined) return null;
      if (typeof val === 'boolean') return val ? 1 : 0;
      return val;
    });
    
    const stmt = db.prepare(`UPDATE test_steps SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/test-steps/:releaseId/:id - Delete a step
router.delete('/:releaseId/:id', (req, res) => {
  const { releaseId, id } = req.params;

  try {
    const db = getReleaseDb(releaseId);

    // Get the step to find its scenario and order
    const step = db.prepare('SELECT test_scenario_id, order_index FROM test_steps WHERE id = ?').get(id);
    if (!step) {
      return res.status(404).json({ success: false, error: 'Step not found' });
    }

    db.transaction(() => {
      // Delete the step
      db.prepare('DELETE FROM test_steps WHERE id = ?').run(id);

      // Reorder remaining steps
      db.prepare(`
        UPDATE test_steps
        SET order_index = order_index - 1
        WHERE test_scenario_id = ? AND order_index > ?
      `).run(step.test_scenario_id, step.order_index);
    })();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/test-steps/:releaseId/sync - Full sync steps (reorders, bulk additions)
router.post('/:releaseId/sync', (req, res) => {
  const { scenarioId, steps } = req.body;
  if (!scenarioId || !Array.isArray(steps)) return res.status(400).json({ success: false, error: 'Invalid data' });

  try {
    const db = getReleaseDb(req.params.releaseId);
    db.transaction(() => {
      db.prepare('DELETE FROM test_steps WHERE test_scenario_id = ?').run(scenarioId);
      const insert = db.prepare(`
        INSERT INTO test_steps (
          test_scenario_id, order_index, step_definition, type,
          element_id, action, action_result, required, expected_results,
          select_config_id, match_config_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      steps.forEach((s, i) => {
        insert.run(
          scenarioId,
          i,
          s.step_definition || '',
          s.type || '',
          s.element_id || '',
          s.action || '',
          s.action_result || '',
          s.required ? 1 : 0,
          s.expected_results || '',
          s.select_config_id || null,
          s.match_config_id || null
        );
      });
    })();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
