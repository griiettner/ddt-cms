/**
 * Test Sets API Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler');

/**
 * GET /api/test-sets
 * List test sets (optionally filtered by release)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { releaseId } = req.query;

  let query = `
    SELECT
      ts.id,
      ts.release_id,
      ts.name,
      ts.description,
      ts.created_at,
      ts.created_by,
      ts.updated_at,
      r.release_number,
      COUNT(tc.id) as test_case_count
    FROM test_sets ts
    LEFT JOIN releases r ON ts.release_id = r.id
    LEFT JOIN test_cases tc ON ts.id = tc.test_set_id
  `;

  let params = [];

  if (releaseId) {
    query += ' WHERE ts.release_id = ?';
    params.push(releaseId);
  }

  query += ' GROUP BY ts.id ORDER BY ts.created_at DESC';

  const testSets = db.prepare(query).all(...params);
  res.json(testSets);
}));

/**
 * GET /api/test-sets/:id
 * Get test set by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const testSet = db.prepare(`
    SELECT
      ts.*,
      r.release_number,
      COUNT(tc.id) as test_case_count
    FROM test_sets ts
    LEFT JOIN releases r ON ts.release_id = r.id
    LEFT JOIN test_cases tc ON ts.id = tc.test_set_id
    WHERE ts.id = ?
    GROUP BY ts.id
  `).get(id);

  if (!testSet) {
    throw notFoundError('Test Set', id);
  }

  res.json(testSet);
}));

/**
 * POST /api/test-sets
 * Create new test set
 */
router.post('/', asyncHandler(async (req, res) => {
  const { release_id, name, description } = req.body;
  const username = req.user?.username || 'unknown';

  // Validation
  if (!release_id) {
    throw validationError('release_id is required');
  }
  if (!name || name.trim() === '') {
    throw validationError('name is required');
  }

  // Check if release exists
  const release = db.prepare('SELECT id FROM releases WHERE id = ?').get(release_id);
  if (!release) {
    throw notFoundError('Release', release_id);
  }

  // Insert test set
  const result = db.prepare(`
    INSERT INTO test_sets (release_id, name, description, created_by)
    VALUES (?, ?, ?, ?)
  `).run(release_id, name.trim(), description || null, username);

  // Return the newly created test set
  const newTestSet = db.prepare(`
    SELECT
      ts.*,
      r.release_number,
      0 as test_case_count
    FROM test_sets ts
    LEFT JOIN releases r ON ts.release_id = r.id
    WHERE ts.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(newTestSet);
}));

/**
 * PUT /api/test-sets/:id
 * Update test set
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  // Check if test set exists
  const existing = db.prepare('SELECT id FROM test_sets WHERE id = ?').get(id);
  if (!existing) {
    throw notFoundError('Test Set', id);
  }

  // Validation
  if (!name || name.trim() === '') {
    throw validationError('name is required');
  }

  // Update test set
  db.prepare(`
    UPDATE test_sets
    SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name.trim(), description || null, id);

  // Return updated test set
  const updated = db.prepare(`
    SELECT
      ts.*,
      r.release_number,
      COUNT(tc.id) as test_case_count
    FROM test_sets ts
    LEFT JOIN releases r ON ts.release_id = r.id
    LEFT JOIN test_cases tc ON ts.id = tc.test_set_id
    WHERE ts.id = ?
    GROUP BY ts.id
  `).get(id);

  res.json(updated);
}));

/**
 * DELETE /api/test-sets/:id
 * Delete test set (cascades to test cases and test steps)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if test set exists
  const testSet = db.prepare(`
    SELECT ts.*, COUNT(tc.id) as test_case_count
    FROM test_sets ts
    LEFT JOIN test_cases tc ON ts.id = tc.test_set_id
    WHERE ts.id = ?
    GROUP BY ts.id
  `).get(id);

  if (!testSet) {
    throw notFoundError('Test Set', id);
  }

  // Delete test set (cascade will handle test cases and test steps)
  db.prepare('DELETE FROM test_sets WHERE id = ?').run(id);

  res.json({
    message: 'Test set deleted successfully',
    deleted: {
      id: testSet.id,
      name: testSet.name,
      test_case_count: testSet.test_case_count
    }
  });
}));

module.exports = router;
