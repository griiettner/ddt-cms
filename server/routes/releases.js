/**
 * Releases API Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { asyncHandler, validationError, notFoundError } = require('../middleware/errorHandler');

/**
 * GET /api/releases
 * List all releases
 */
router.get('/', asyncHandler(async (req, res) => {
  const releases = db.prepare(`
    SELECT id, release_number, description, status, created_at, created_by, archived_at, archived_by
    FROM releases
    ORDER BY created_at DESC
  `).all();

  res.json(releases);
}));

/**
 * GET /api/releases/:id
 * Get release by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const release = db.prepare(`
    SELECT id, release_number, description, status, created_at, created_by, archived_at, archived_by
    FROM releases
    WHERE id = ?
  `).get(id);

  if (!release) {
    throw notFoundError('Release', id);
  }

  res.json(release);
}));

/**
 * POST /api/releases
 * Create new release (with optional data duplication from previous release)
 */
router.post('/', asyncHandler(async (req, res) => {
  const { release_number, description, duplicate_from } = req.body;
  const username = req.user?.username || 'unknown';

  // Validation
  if (!release_number) {
    throw validationError('release_number is required');
  }

  // Check if release number already exists
  const existing = db.prepare('SELECT id FROM releases WHERE release_number = ?').get(release_number);
  if (existing) {
    throw validationError(`Release ${release_number} already exists`);
  }

  // Create new release
  const insertRelease = db.prepare(`
    INSERT INTO releases (release_number, description, status, created_by)
    VALUES (?, ?, 'active', ?)
  `);

  const result = insertRelease.run(release_number, description || null, username);
  const newReleaseId = result.lastInsertRowid;

  // If duplicate_from is specified, copy all data from that release
  if (duplicate_from) {
    duplicateReleaseData(duplicate_from, newReleaseId, username);
  }

  // Return the newly created release
  const newRelease = db.prepare('SELECT * FROM releases WHERE id = ?').get(newReleaseId);
  res.status(201).json(newRelease);
}));

/**
 * PUT /api/releases/:id/archive
 * Archive a release
 */
router.put('/:id/archive', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const username = req.user?.username || 'unknown';

  const release = db.prepare('SELECT id FROM releases WHERE id = ?').get(id);
  if (!release) {
    throw notFoundError('Release', id);
  }

  db.prepare(`
    UPDATE releases
    SET status = 'archived', archived_at = CURRENT_TIMESTAMP, archived_by = ?
    WHERE id = ?
  `).run(username, id);

  const updated = db.prepare('SELECT * FROM releases WHERE id = ?').get(id);
  res.json(updated);
}));

/**
 * Helper function to duplicate release data
 */
function duplicateReleaseData(fromReleaseId, toReleaseId, username) {
  // Get all test sets from source release
  const testSets = db.prepare(`
    SELECT id, name, description
    FROM test_sets
    WHERE release_id = ?
  `).all(fromReleaseId);

  for (const testSet of testSets) {
    // Create new test set
    const newTestSetResult = db.prepare(`
      INSERT INTO test_sets (release_id, name, description, created_by)
      VALUES (?, ?, ?, ?)
    `).run(toReleaseId, testSet.name, testSet.description, username);

    const newTestSetId = newTestSetResult.lastInsertRowid;

    // Get all test cases from this test set
    const testCases = db.prepare(`
      SELECT id, name, description, order_index, is_active
      FROM test_cases
      WHERE test_set_id = ?
    `).all(testSet.id);

    for (const testCase of testCases) {
      // Create new test case
      const newTestCaseResult = db.prepare(`
        INSERT INTO test_cases (test_set_id, name, description, order_index, is_active, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(newTestSetId, testCase.name, testCase.description, testCase.order_index, testCase.is_active, username);

      const newTestCaseId = newTestCaseResult.lastInsertRowid;

      // Get all test steps from this test case
      const testSteps = db.prepare(`
        SELECT order_index, step_definition, type, element_id, action, action_result, required, expected_results
        FROM test_steps
        WHERE test_case_id = ?
      `).all(testCase.id);

      // Insert all test steps
      const insertStep = db.prepare(`
        INSERT INTO test_steps (
          test_case_id, order_index, step_definition, type, element_id,
          action, action_result, required, expected_results, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const step of testSteps) {
        insertStep.run(
          newTestCaseId,
          step.order_index,
          step.step_definition,
          step.type,
          step.element_id,
          step.action,
          step.action_result,
          step.required,
          step.expected_results,
          username
        );
      }
    }
  }

  console.log(`Duplicated ${testSets.length} test sets from release ${fromReleaseId} to ${toReleaseId}`);
}

module.exports = router;
