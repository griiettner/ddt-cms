import express from 'express';
import { getRegistryDb } from '../db/database.js';

const router = express.Router();

// GET /api/test-runs - List recent test runs (optionally filter by releaseId)
router.get('/', (req, res) => {
  const { releaseId, limit = 10 } = req.query;

  try {
    const db = getRegistryDb();
    let query = `
      SELECT
        tr.*,
        r.release_number
      FROM test_runs tr
      LEFT JOIN releases r ON tr.release_id = r.id
    `;
    const params = [];

    if (releaseId) {
      query += ' WHERE tr.release_id = ?';
      params.push(releaseId);
    }

    query += ' ORDER BY tr.executed_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const runs = db.prepare(query).all(...params);

    // Parse failed_details JSON
    const parsedRuns = runs.map(run => ({
      ...run,
      failed_details: run.failed_details ? JSON.parse(run.failed_details) : [],
    }));

    res.json({ success: true, data: parsedRuns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/test-runs/:id - Get a specific test run
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const db = getRegistryDb();
    const run = db.prepare(`
      SELECT
        tr.*,
        r.release_number
      FROM test_runs tr
      LEFT JOIN releases r ON tr.release_id = r.id
      WHERE tr.id = ?
    `).get(id);

    if (!run) {
      return res.status(404).json({ success: false, error: 'Test run not found' });
    }

    // Parse failed_details JSON
    run.failed_details = run.failed_details ? JSON.parse(run.failed_details) : [];

    res.json({ success: true, data: run });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/test-runs - Create a new test run
router.post('/', (req, res) => {
  const {
    releaseId,
    testSetId,
    testSetName,
    status,
    executedBy,
    durationMs,
    totalScenarios,
    totalSteps,
    passedSteps,
    failedSteps,
    failedDetails,
  } = req.body;

  if (!releaseId) {
    return res.status(400).json({ success: false, error: 'releaseId is required' });
  }

  try {
    const db = getRegistryDb();
    const stmt = db.prepare(`
      INSERT INTO test_runs (
        release_id,
        test_set_id,
        test_set_name,
        status,
        executed_by,
        duration_ms,
        total_scenarios,
        total_steps,
        passed_steps,
        failed_steps,
        failed_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      releaseId,
      testSetId || null,
      testSetName || null,
      status || 'running',
      executedBy || null,
      durationMs || 0,
      totalScenarios || 0,
      totalSteps || 0,
      passedSteps || 0,
      failedSteps || 0,
      failedDetails ? JSON.stringify(failedDetails) : null
    );

    res.json({
      success: true,
      data: { id: result.lastInsertRowid },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/test-runs/:id - Update a test run (for updating status after completion)
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const db = getRegistryDb();

    // Handle failed_details serialization
    if (updates.failedDetails !== undefined) {
      updates.failed_details = JSON.stringify(updates.failedDetails);
      delete updates.failedDetails;
    }

    // Convert camelCase to snake_case for database
    const fieldMap = {
      durationMs: 'duration_ms',
      totalScenarios: 'total_scenarios',
      totalSteps: 'total_steps',
      passedSteps: 'passed_steps',
      failedSteps: 'failed_steps',
      executedBy: 'executed_by',
      testSetId: 'test_set_id',
      testSetName: 'test_set_name',
    };

    const dbUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = fieldMap[key] || key;
      dbUpdates[dbKey] = value;
    }

    const fields = Object.keys(dbUpdates).map(f => `${f} = ?`).join(', ');
    const values = Object.values(dbUpdates);

    const stmt = db.prepare(`UPDATE test_runs SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
