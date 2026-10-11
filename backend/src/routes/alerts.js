import express from 'express';
import { query } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/alerts
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;

    let sql = `
      SELECT 
        a.*,
        p.name as product_name,
        p.sku as product_sku,
        p.category as product_category,
        c.camera_name,
        c.location as camera_location
      FROM alerts a
      LEFT JOIN products p ON a.product_id = p.id
      LEFT JOIN cameras c ON a.camera_id = c.camera_id
      WHERE 1=1
    `;

    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    params.push(parseInt(limit, 10) || 50);
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const result = await query(sql, params);

    // Also get counts for summary badges
    const countsRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
      FROM alerts
    `);

    res.json({
      success: true,
      stats: countsRes.rows[0],
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE alerts 
       SET status = 'read' 
       WHERE alert_id = $1 
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:id/resolve
router.put('/:id/resolve', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE alerts 
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP 
       WHERE alert_id = $1 
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
