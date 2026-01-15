import express from 'express';
import { getReleaseDb, getRegistryDb } from '../db/database.js';

const router = express.Router();

// GET /api/export/:releaseId - Export all data for a release
router.get('/:releaseId', (req, res) => {
    try {
        const db = getReleaseDb(req.params.releaseId);
        const registry = getRegistryDb();
        
        // Get release info
        const release = registry.prepare('SELECT * FROM releases WHERE id = ?').get(req.params.releaseId);
        if (!release) return res.status(404).json({ success: false, error: 'Release not found' });

        // Get test sets
        const testSets = db.prepare('SELECT * FROM test_sets').all();
        
        // Build nested structure
        const exportData = {
            release: release.release_number,
            generated_at: new Date().toISOString(),
            test_sets: testSets.map(ts => {
                const cases = db.prepare('SELECT * FROM test_cases WHERE test_set_id = ? ORDER BY order_index ASC').all(ts.id);
                
                return {
                    id: ts.id,
                    name: ts.name,
                    test_cases: cases.map(tc => {
                        // Get scenarios (custom logic: usually 1, but we'll map all)
                        const scenarios = db.prepare('SELECT * FROM test_scenarios WHERE test_case_id = ? ORDER BY order_index ASC').all(tc.id);
                        
                        return {
                            id: tc.id,
                            name: tc.name,
                            scenarios: scenarios.map(sc => {
                                const steps = db.prepare('SELECT * FROM test_steps WHERE test_scenario_id = ? ORDER BY order_index ASC').all(sc.id);
                                return {
                                    id: sc.id,
                                    name: sc.name,
                                    steps: steps.map(s => ({
                                        description: s.step_definition,
                                        type: s.type,
                                        element: s.element_id,
                                        action: s.action,
                                        result: s.action_result,
                                        required: Boolean(s.required),
                                        expected: s.expected_results
                                    }))
                                };
                            })
                        };
                    })
                };
            })
        };

        res.json({ success: true, data: exportData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
