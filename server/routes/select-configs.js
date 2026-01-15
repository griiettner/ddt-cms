import express from 'express';
import { getRegistryDb } from '../db/database.js';

const router = express.Router();

// GET /api/select-configs - List all select configs (optional ?type= filter)
router.get('/', (req, res) => {
  try {
    const db = getRegistryDb();
    const { type } = req.query;
    
    let query = 'SELECT * FROM select_configs';
    let params = [];
    
    if (type) {
      query += ' WHERE config_type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY name ASC';
    
    const configs = db.prepare(query).all(...params);
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

// GET /api/select-configs/:id - Get a specific config
router.get('/:id', (req, res) => {
  try {
    const db = getRegistryDb();
    const config = db.prepare('SELECT * FROM select_configs WHERE id = ?').get(req.params.id);
    if (!config) return res.status(404).json({ success: false, error: 'Config not found' });
    config.options = JSON.parse(config.options || '[]');
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/select-configs - Create a new select config
router.post('/', (req, res) => {
  const { name, options, config_type } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

  try {
    const db = getRegistryDb();
    const optionsJson = JSON.stringify(options || []);
    const type = config_type || 'custom_select';
    const stmt = db.prepare('INSERT INTO select_configs (name, options, config_type) VALUES (?, ?, ?)');
    const result = stmt.run(name, optionsJson, type);
    res.json({ success: true, data: { id: result.lastInsertRowid, name, options, config_type: type } });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'A config with this name already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/select-configs/:id - Update a select config
router.put('/:id', (req, res) => {
  const { name, options } = req.body;
  
  try {
    const db = getRegistryDb();
    const optionsJson = JSON.stringify(options || []);
    const stmt = db.prepare('UPDATE select_configs SET name = ?, options = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(name, optionsJson, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/select-configs/:id - Delete a select config
router.delete('/:id', (req, res) => {
  try {
    const db = getRegistryDb();
    db.prepare('DELETE FROM select_configs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
