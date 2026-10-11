import express from 'express';
import { query } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/summary - returns live aggregated statistics and chart data
router.get('/summary', authenticateToken, async (req, res, next) => {
  try {
    // 1. Total products and status breakdown based on latest snapshots
    const inventoryRes = await query(`
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (product_id) *
        FROM inventory_snapshots
        ORDER BY product_id, created_at DESC
      )
      SELECT 
        p.id,
        p.name,
        p.category,
        p.min_visible_stock,
        COALESCE(ls.detected_count, 0) as current_count,
        COALESCE(ls.status, CASE WHEN p.min_visible_stock > 0 THEN 'OUT_OF_STOCK' ELSE 'NORMAL' END) as current_status
      FROM products p
      LEFT JOIN latest_snapshots ls ON p.id = ls.product_id
      WHERE p.is_active = TRUE
    `);

    const products = inventoryRes.rows;
    const totalProducts = products.length;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    const categoryMap = {};

    products.forEach((p) => {
      if (p.current_status === 'NORMAL') inStock++;
      else if (p.current_status === 'LOW_STOCK') lowStock++;
      else if (p.current_status === 'OUT_OF_STOCK') outOfStock++;

      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { category: p.category, inStock: 0, lowStock: 0, outOfStock: 0 };
      }
      if (p.current_status === 'NORMAL') categoryMap[p.category].inStock++;
      else if (p.current_status === 'LOW_STOCK') categoryMap[p.category].lowStock++;
      else if (p.current_status === 'OUT_OF_STOCK') categoryMap[p.category].outOfStock++;
    });

    // 2. Active cameras count
    const camRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('online', 'simulated') THEN 1 END) as active
      FROM cameras
    `);
    const activeCameras = parseInt(camRes.rows[0]?.active || '0', 10);
    const totalCameras = parseInt(camRes.rows[0]?.total || '0', 10);

    // 3. Recent Alerts
    const alertsRes = await query(`
      SELECT 
        a.*,
        p.name as product_name,
        c.camera_name
      FROM alerts a
      LEFT JOIN products p ON a.product_id = p.id
      LEFT JOIN cameras c ON a.camera_id = c.camera_id
      ORDER BY a.created_at DESC
      LIMIT 5
    `);

    // 4. Recent Detections / Snapshots
    const detectionsRes = await query(`
      SELECT 
        snap.*,
        p.name as product_name,
        p.sku,
        c.camera_name,
        s.name as shelf_name
      FROM inventory_snapshots snap
      JOIN products p ON snap.product_id = p.id
      LEFT JOIN cameras c ON snap.camera_id = c.camera_id
      LEFT JOIN shelves s ON snap.shelf_id = s.id
      ORDER BY snap.created_at DESC
      LIMIT 8
    `);

    // 5. Detection timeline for chart (last 7 data points or grouped by hour/date)
    const timelineRes = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:00') as time_bucket,
        COUNT(*) as total_observations,
        SUM(detected_count) as total_visible_units,
        COUNT(CASE WHEN status = 'LOW_STOCK' THEN 1 END) as low_stock_events,
        COUNT(CASE WHEN status = 'OUT_OF_STOCK' THEN 1 END) as out_of_stock_events
      FROM inventory_snapshots
      GROUP BY time_bucket
      ORDER BY time_bucket DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      summary: {
        totalProducts,
        inStock,
        lowStock,
        outOfStock,
        activeCameras,
        totalCameras,
        unresolvedAlerts: alertsRes.rows.filter(a => a.status !== 'resolved').length
      },
      statusDistribution: [
        { name: 'Normal / In Stock', value: inStock, color: '#10b981' },
        { name: 'Low Stock', value: lowStock, color: '#f59e0b' },
        { name: 'Out of Stock', value: outOfStock, color: '#ef4444' }
      ],
      categoryBreakdown: Object.values(categoryMap),
      timeline: timelineRes.rows.reverse(),
      recentAlerts: alertsRes.rows,
      recentDetections: detectionsRes.rows
    });
  } catch (err) {
    next(err);
  }
});

export default router;
