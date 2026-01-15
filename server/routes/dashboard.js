import express from 'express';
import { getDashboardStats } from '../utils/dashboard.js';

const router = express.Router();

// GET /api/dashboard/:releaseId? - Get dashboard stats
router.get('/:releaseId?', (req, res) => {
  try {
    const stats = getDashboardStats(req.params.releaseId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
