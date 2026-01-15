import express from 'express';
import { getReleaseDb } from '../db/database.js';

const router = express.Router();

// GET /api/config/:releaseId/types - List type options
router.get('/:releaseId/types', (req, res) => {
  try {
    const db = getReleaseDb(req.params.releaseId);
    const types = db.prepare("SELECT * FROM configuration_options WHERE category = 'type' AND is_active = 1 ORDER BY order_index ASC").all();
    res.json({ success: true, data: types });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/config/:releaseId/actions - List action options
router.get('/:releaseId/actions', (req, res) => {
  try {
    const db = getReleaseDb(req.params.releaseId);
    const actions = db.prepare("SELECT * FROM configuration_options WHERE category = 'action' AND is_active = 1 ORDER BY order_index ASC").all();
    res.json({ success: true, data: actions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/config/:releaseId/:category - Add new option
router.post('/:releaseId/:category', (req, res) => {
  const { key, display_name, result_type, default_value } = req.body;
  const { category, releaseId } = req.params;

  if (!key || !display_name) {
    return res.status(400).json({ success: false, error: 'Key and Display Name are required' });
  }

  try {
    const db = getReleaseDb(releaseId);
    
    // Get max order index
    const maxOrder = db.prepare('SELECT MAX(order_index) as max_order FROM configuration_options WHERE category = ?').get(category);
    const orderIndex = (maxOrder.max_order || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO configuration_options (category, key, display_name, result_type, default_value, order_index) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(category, key, display_name, result_type || null, default_value || null, orderIndex);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/config/:releaseId/:id - Delete option
router.delete('/:releaseId/:id', (req, res) => {
  try {
    const db = getReleaseDb(req.params.releaseId);
    db.prepare('DELETE FROM configuration_options WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
