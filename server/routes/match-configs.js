import express from 'express';
import { getRegistryDb } from '../db/database.js';

const router = express.Router();

// GET /api/match-configs - List all match configs
router.get('/', (req, res) => {
  try {
    const db = getRegistryDb();
    const configs = db.prepare('SELECT * FROM match_configs ORDER BY name ASC').all();
    // Parse options JSON for each config
    const parsed = configs.map(c => ({
      ...c,
      options: JSON.parse(c.options || '[]')
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/match-configs/:id - Get a specific config
router.get('/:id', (req, res) => {
  try {
    const db = getRegistryDb();
    const config = db.prepare('SELECT * FROM match_configs WHERE id = ?').get(req.params.id);
    if (!config) return res.status(404).json({ success: false, error: 'Config not found' });
    config.options = JSON.parse(config.options || '[]');
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/match-configs - Create a new match config
router.post('/', (req, res) => {
  const { name, options } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

  try {
    const db = getRegistryDb();
    const optionsJson = JSON.stringify(options || []);
    const stmt = db.prepare('INSERT INTO match_configs (name, options) VALUES (?, ?)');
    const result = stmt.run(name, optionsJson);
    res.json({ success: true, data: { id: result.lastInsertRowid, name, options } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'A config with this name already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/match-configs/:id - Update a match config
router.put('/:id', (req, res) => {
  const { name, options } = req.body;
  
  try {
    const db = getRegistryDb();
    const optionsJson = JSON.stringify(options || []);
    const stmt = db.prepare('UPDATE match_configs SET name = ?, options = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(name, optionsJson, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/match-configs/:id - Delete a match config
router.delete('/:id', (req, res) => {
  try {
    const db = getRegistryDb();
    db.prepare('DELETE FROM match_configs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
