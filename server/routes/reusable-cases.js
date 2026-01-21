/**
 * Reusable Cases API Routes
 * Global test case templates that can be copied to any release
 */
import express from 'express';
import { getRegistryDb, getReleaseDb } from '../db/database.js';

const router = express.Router();

// GET /api/reusable-cases - List all reusable cases
router.get('/', (req, res) => {
  try {
    const db = getRegistryDb();
    const cases = db.prepare(`
      SELECT
        rc.*,
        (SELECT COUNT(*) FROM reusable_case_steps WHERE reusable_case_id = rc.id) as step_count
      FROM reusable_cases rc
      ORDER BY rc.name ASC
    `).all();

    res.json({ success: true, data: cases });
  } catch (err) {
    console.error('Error listing reusable cases:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reusable-cases/:id - Get a reusable case with its steps
router.get('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const db = getRegistryDb();

    const reusableCase = db.prepare(`
      SELECT * FROM reusable_cases WHERE id = ?
    `).get(id);

    if (!reusableCase) {
      return res.status(404).json({ success: false, error: 'Reusable case not found' });
    }

    const steps = db.prepare(`
      SELECT * FROM reusable_case_steps
      WHERE reusable_case_id = ?
      ORDER BY order_index ASC
    `).all(id);

    res.json({
      success: true,
      data: { ...reusableCase, steps }
    });
  } catch (err) {
    console.error('Error getting reusable case:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reusable-cases - Create a new reusable case
router.post('/', (req, res) => {
  const { name, description, steps } = req.body;
  const user = req.user?.eid || 'anonymous';

  if (!name) {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  try {
    const db = getRegistryDb();

    // Create the reusable case
    const result = db.prepare(`
      INSERT INTO reusable_cases (name, description, created_by)
      VALUES (?, ?, ?)
    `).run(name, description || '', user);

    const reusableCaseId = result.lastInsertRowid;

    // Insert steps if provided
    if (steps && steps.length > 0) {
      const insertStep = db.prepare(`
        INSERT INTO reusable_case_steps (
          reusable_case_id, order_index, step_definition, type, element_id,
          action, action_result, select_config_id, match_config_id, required, expected_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      steps.forEach((step, index) => {
        insertStep.run(
          reusableCaseId,
          step.order_index ?? index,
          step.step_definition || '',
          step.type || null,
          step.element_id || null,
          step.action || null,
          step.action_result || null,
          step.select_config_id || null,
          step.match_config_id || null,
          step.required ? 1 : 0,
          step.expected_results || null
        );
      });
    }

    res.json({
      success: true,
      data: { id: reusableCaseId, name }
    });
  } catch (err) {
    console.error('Error creating reusable case:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/reusable-cases/:id - Update a reusable case
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const db = getRegistryDb();

    const existing = db.prepare('SELECT id FROM reusable_cases WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Reusable case not found' });
    }

    db.prepare(`
      UPDATE reusable_cases
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description || '', id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating reusable case:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/reusable-cases/:id - Delete a reusable case
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const db = getRegistryDb();

    const existing = db.prepare('SELECT id FROM reusable_cases WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Reusable case not found' });
    }

    // Steps are deleted automatically via CASCADE
    db.prepare('DELETE FROM reusable_cases WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting reusable case:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reusable-cases/:id/copy-to - Copy a reusable case to a test set
router.post('/:id/copy-to', (req, res) => {
  const { id } = req.params;
  const { releaseId, testSetId } = req.body;

  if (!releaseId || !testSetId) {
    return res.status(400).json({
      success: false,
      error: 'releaseId and testSetId are required'
    });
  }

  try {
    const registryDb = getRegistryDb();
    const releaseDb = getReleaseDb(releaseId);

    // Get the reusable case
    const reusableCase = registryDb.prepare(`
      SELECT * FROM reusable_cases WHERE id = ?
    `).get(id);

    if (!reusableCase) {
      return res.status(404).json({ success: false, error: 'Reusable case not found' });
    }

    // Get the steps
    const steps = registryDb.prepare(`
      SELECT * FROM reusable_case_steps
      WHERE reusable_case_id = ?
      ORDER BY order_index ASC
    `).all(id);

    // Get max order_index for test cases in this test set
    const maxOrder = releaseDb.prepare(`
      SELECT COALESCE(MAX(order_index), -1) as max_order
      FROM test_cases WHERE test_set_id = ?
    `).get(testSetId);
    const newOrderIndex = (maxOrder?.max_order ?? -1) + 1;

    // Create the test case in the release database
    const caseResult = releaseDb.prepare(`
      INSERT INTO test_cases (test_set_id, name, description, order_index)
      VALUES (?, ?, ?, ?)
    `).run(testSetId, reusableCase.name, reusableCase.description || '', newOrderIndex);

    const newCaseId = caseResult.lastInsertRowid;

    // Create a default scenario for this case
    const scenarioResult = releaseDb.prepare(`
      INSERT INTO test_scenarios (test_case_id, name, order_index)
      VALUES (?, ?, 0)
    `).run(newCaseId, 'Default Scenario');

    const newScenarioId = scenarioResult.lastInsertRowid;

    // Copy the steps to the new scenario
    if (steps.length > 0) {
      const insertStep = releaseDb.prepare(`
        INSERT INTO test_steps (
          test_scenario_id, order_index, step_definition, type, element_id,
          action, action_result, select_config_id, match_config_id, required, expected_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      steps.forEach((step) => {
        insertStep.run(
          newScenarioId,
          step.order_index,
          step.step_definition || '',
          step.type || null,
          step.element_id || null,
          step.action || null,
          step.action_result || null,
          step.select_config_id || null,
          step.match_config_id || null,
          step.required ? 1 : 0,
          step.expected_results || null
        );
      });
    }

    res.json({
      success: true,
      data: {
        caseId: newCaseId,
        scenarioId: newScenarioId,
        stepsCopied: steps.length
      }
    });
  } catch (err) {
    console.error('Error copying reusable case:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reusable-cases/from-case - Create a reusable case from an existing test case
router.post('/from-case', (req, res) => {
  const { releaseId, caseId, name, description } = req.body;
  const user = req.user?.eid || 'anonymous';

  if (!releaseId || !caseId) {
    return res.status(400).json({
      success: false,
      error: 'releaseId and caseId are required'
    });
  }

  try {
    const registryDb = getRegistryDb();
    const releaseDb = getReleaseDb(releaseId);

    // Get the test case
    const testCase = releaseDb.prepare(`
      SELECT * FROM test_cases WHERE id = ?
    `).get(caseId);

    if (!testCase) {
      return res.status(404).json({ success: false, error: 'Test case not found' });
    }

    // Get all scenarios and their steps for this case
    const scenarios = releaseDb.prepare(`
      SELECT * FROM test_scenarios WHERE test_case_id = ? ORDER BY order_index ASC
    `).all(caseId);

    // Collect all steps from all scenarios
    const allSteps = [];
    let stepIndex = 0;
    for (const scenario of scenarios) {
      const steps = releaseDb.prepare(`
        SELECT * FROM test_steps WHERE test_scenario_id = ? ORDER BY order_index ASC
      `).all(scenario.id);

      for (const step of steps) {
        allSteps.push({ ...step, order_index: stepIndex++ });
      }
    }

    // Create the reusable case
    const reusableName = name || testCase.name;
    const reusableDesc = description || testCase.description;

    const result = registryDb.prepare(`
      INSERT INTO reusable_cases (name, description, created_by)
      VALUES (?, ?, ?)
    `).run(reusableName, reusableDesc || '', user);

    const reusableCaseId = result.lastInsertRowid;

    // Insert all steps
    if (allSteps.length > 0) {
      const insertStep = registryDb.prepare(`
        INSERT INTO reusable_case_steps (
          reusable_case_id, order_index, step_definition, type, element_id,
          action, action_result, select_config_id, match_config_id, required, expected_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      allSteps.forEach((step) => {
        insertStep.run(
          reusableCaseId,
          step.order_index,
          step.step_definition || '',
          step.type || null,
          step.element_id || null,
          step.action || null,
          step.action_result || null,
          step.select_config_id || null,
          step.match_config_id || null,
          step.required ? 1 : 0,
          step.expected_results || null
        );
      });
    }

    res.json({
      success: true,
      data: {
        id: reusableCaseId,
        name: reusableName,
        stepsCopied: allSteps.length
      }
    });
  } catch (err) {
    console.error('Error creating reusable case from test case:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reusable-cases/:id/steps - Get steps for a reusable case
router.get('/:id/steps', (req, res) => {
  const { id } = req.params;

  try {
    const db = getRegistryDb();
    const steps = db.prepare(`
      SELECT * FROM reusable_case_steps
      WHERE reusable_case_id = ?
      ORDER BY order_index ASC
    `).all(id);

    res.json({ success: true, data: steps });
  } catch (err) {
    console.error('Error getting reusable case steps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reusable-cases/:id/steps - Add a step to a reusable case
router.post('/:id/steps', (req, res) => {
  const { id } = req.params;
  const step = req.body;

  try {
    const db = getRegistryDb();

    // Get max order_index
    const maxOrder = db.prepare(`
      SELECT COALESCE(MAX(order_index), -1) as max_order
      FROM reusable_case_steps WHERE reusable_case_id = ?
    `).get(id);
    const newOrderIndex = (maxOrder?.max_order ?? -1) + 1;

    const result = db.prepare(`
      INSERT INTO reusable_case_steps (
        reusable_case_id, order_index, step_definition, type, element_id,
        action, action_result, select_config_id, match_config_id, required, expected_results
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      step.order_index ?? newOrderIndex,
      step.step_definition || '',
      step.type || null,
      step.element_id || null,
      step.action || null,
      step.action_result || null,
      step.select_config_id || null,
      step.match_config_id || null,
      step.required ? 1 : 0,
      step.expected_results || null
    );

    res.json({
      success: true,
      data: { id: result.lastInsertRowid, order_index: newOrderIndex }
    });
  } catch (err) {
    console.error('Error adding step to reusable case:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/reusable-cases/:id/steps/:stepId - Update a step in a reusable case
router.patch('/:id/steps/:stepId', (req, res) => {
  const { id, stepId } = req.params;
  const updates = req.body;

  try {
    const db = getRegistryDb();

    const fields = Object.keys(updates).map(f => `${f} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`
      UPDATE reusable_case_steps
      SET ${fields}
      WHERE id = ? AND reusable_case_id = ?
    `).run(...values, stepId, id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating reusable case step:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/reusable-cases/:id/steps/:stepId - Delete a step from a reusable case
router.delete('/:id/steps/:stepId', (req, res) => {
  const { id, stepId } = req.params;

  try {
    const db = getRegistryDb();
    db.prepare(`
      DELETE FROM reusable_case_steps
      WHERE id = ? AND reusable_case_id = ?
    `).run(stepId, id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting reusable case step:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/reusable-cases/:id/steps/reorder - Reorder steps in a reusable case
router.put('/:id/steps/reorder', (req, res) => {
  const { id } = req.params;
  const { steps } = req.body; // Array of { id, order_index }

  try {
    const db = getRegistryDb();

    const updateStep = db.prepare(`
      UPDATE reusable_case_steps
      SET order_index = ?
      WHERE id = ? AND reusable_case_id = ?
    `);

    const reorderTransaction = db.transaction((stepsToReorder) => {
      stepsToReorder.forEach((step, index) => {
        updateStep.run(index, step.id, id);
      });
    });

    reorderTransaction(steps);

    res.json({ success: true });
  } catch (err) {
    console.error('Error reordering reusable case steps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/reusable-cases/:id/steps - Sync all steps (bulk update)
router.put('/:id/steps', (req, res) => {
  const { id } = req.params;
  const { steps } = req.body;

  try {
    const db = getRegistryDb();

    const syncTransaction = db.transaction((stepsToSync) => {
      // Delete existing steps
      db.prepare('DELETE FROM reusable_case_steps WHERE reusable_case_id = ?').run(id);

      // Insert new steps
      const insertStep = db.prepare(`
        INSERT INTO reusable_case_steps (
          reusable_case_id, order_index, step_definition, type, element_id,
          action, action_result, select_config_id, match_config_id, required, expected_results
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stepsToSync.forEach((step, index) => {
        insertStep.run(
          id,
          step.order_index ?? index,
          step.step_definition || '',
          step.type || null,
          step.element_id || null,
          step.action || null,
          step.action_result || null,
          step.select_config_id || null,
          step.match_config_id || null,
          step.required ? 1 : 0,
          step.expected_results || null
        );
      });
    });

    syncTransaction(steps);

    res.json({ success: true });
  } catch (err) {
    console.error('Error syncing reusable case steps:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
