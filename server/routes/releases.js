import express from 'express';
import path from 'path';
import fs from 'fs';
import { getRegistryDb } from '../db/database.js';
import { initReleaseSchema } from '../db/migrations.js';
import { seedConfiguration } from '../db/seed.js';
import Database from 'better-sqlite3';

const router = express.Router();
const RELEASES_DB_DIR = process.env.RELEASES_DB_DIR || 'data/releases';

// GET /api/releases - List all releases
router.get('/', (req, res) => {
  try {
    const db = getRegistryDb();
    const releases = db.prepare('SELECT * FROM releases ORDER BY created_at DESC').all();
    res.json({ success: true, data: releases });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/releases - Create new release (duplicates data)
router.post('/', async (req, res) => {
  const { release_number, notes } = req.body;
  const user = req.user.eid;

  if (!release_number) {
    return res.status(400).json({ success: false, error: 'Release number is required' });
  }

  const registry = getRegistryDb();
  
  try {
    // Check if release number already exists
    const existing = registry.prepare('SELECT id FROM releases WHERE release_number = ?').get(release_number);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Release number already exists' });
    }

    // Find the latest active release to clone from
    const latestRelease = registry.prepare("SELECT id FROM releases WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get();

    // Insert new release into registry
    const stmt = registry.prepare('INSERT INTO releases (release_number, notes, created_by) VALUES (?, ?, ?)');
    const result = stmt.run(release_number, notes || '', user);
    const newReleaseId = result.lastInsertRowid;

    const newDbPath = path.join(RELEASES_DB_DIR, `${newReleaseId}.db`);

    if (latestRelease) {
      // Clone from latest release
      const oldDbPath = path.join(RELEASES_DB_DIR, `${latestRelease.id}.db`);
      if (fs.existsSync(oldDbPath)) {
        fs.copyFileSync(oldDbPath, newDbPath);
        
        // Update release_id in all cloned tables
        const newDb = new Database(newDbPath);
        newDb.prepare('UPDATE test_sets SET release_id = ?').run(newReleaseId);
        newDb.close();
      } else {
        // Fallback if file missing
        initReleaseSchema(newDbPath);
        seedConfiguration(newDbPath);
      }
    } else {
      // First release
      initReleaseSchema(newDbPath);
      seedConfiguration(newDbPath);
    }

    res.json({ 
      success: true, 
      data: { 
        id: newReleaseId, 
        release_number, 
        notes, 
        created_by: user 
      } 
    });
  } catch (err) {
    console.error('Error creating release:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/releases/:id - Get release details
router.get('/:id', (req, res) => {
  try {
    const db = getRegistryDb();
    const release = db.prepare('SELECT * FROM releases WHERE id = ?').get(req.params.id);
    if (!release) {
      return res.status(404).json({ success: false, error: 'Release not found' });
    }
    res.json({ success: true, data: release });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
