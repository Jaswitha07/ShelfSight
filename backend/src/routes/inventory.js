import express from 'express';
import { query } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { recordInventoryObservation } from '../services/inventoryService.js';

const router = express.Router();

// POST /api/inventory/snapshot - records an inventory observation snapshot manually or programmatically
router.post('/snapshot', authenticateToken, async (req, res, next) => {
  try {
    const { productId, cameraId, shelfId, detectedCount, confidence, imageUrl, sourceType } = req.body;
    if (!productId || detectedCount === undefined) {
      return res.status(400).json({ success: false, error: 'productId and detectedCount are required' });
    }
    const result = await recordInventoryObservation({
      productId,
      cameraId: cameraId || null,
      shelfId: shelfId || null,
      detectedCount: parseInt(detectedCount, 10),
      confidence: confidence !== undefined ? parseFloat(confidence) : 1.0,
      imageUrl: imageUrl || null,
      sourceType: sourceType || 'manual'
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory - returns current inventory status (latest snapshot per active product)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { status, category, shelf_id } = req.query;

    // Subquery to get latest snapshot per product
    let sql = `
      WITH latest_snapshots AS (
        SELECT DISTINCT ON (product_id) *
        FROM inventory_snapshots
        ORDER BY product_id, created_at DESC
      )
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.sku,
        p.min_visible_stock,
        p.detection_prompt,
        p.reference_image,
        p.is_active,
        s.name as shelf_name,
        s.location as shelf_location,
        COALESCE(ls.detected_count, 0) as current_count,
        COALESCE(ls.status, CASE WHEN p.min_visible_stock > 0 THEN 'OUT_OF_STOCK' ELSE 'NORMAL' END) as current_status,
        ls.confidence,
        ls.created_at as last_detected_at,
        ls.source_type,
        c.camera_name,
        ls.image_url as latest_image_url
      FROM products p
      LEFT JOIN shelves s ON p.shelf_id = s.id
      LEFT JOIN latest_snapshots ls ON p.id = ls.product_id
      LEFT JOIN cameras c ON ls.camera_id = c.camera_id
      WHERE p.is_active = TRUE
    `;

    const params = [];
    if (status) {
      params.push(status.toUpperCase());
      sql += ` AND ls.status = $${params.length}`;
    }

    if (category) {
      params.push(category);
      sql += ` AND p.category = $${params.length}`;
    }

    if (shelf_id) {
      params.push(shelf_id);
      sql += ` AND p.shelf_id = $${params.length}`;
    }

    sql += ' ORDER BY p.name ASC';

    const result = await query(sql, params);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory/history - historical snapshot timeline
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const { product_id, camera_id, limit = 50 } = req.query;

    let sql = `
      SELECT 
        snap.*,
        p.name as product_name,
        p.sku,
        p.category,
        s.name as shelf_name,
        c.camera_name
      FROM inventory_snapshots snap
      JOIN products p ON snap.product_id = p.id
      LEFT JOIN shelves s ON snap.shelf_id = s.id
      LEFT JOIN cameras c ON snap.camera_id = c.camera_id
      WHERE 1=1
    `;

    const params = [];
    if (product_id) {
      params.push(product_id);
      sql += ` AND snap.product_id = $${params.length}`;
    }

    if (camera_id) {
      params.push(camera_id);
      sql += ` AND snap.camera_id = $${params.length}`;
    }

    params.push(parseInt(limit, 10) || 50);
    sql += ` ORDER BY snap.created_at DESC LIMIT $${params.length}`;

    const result = await query(sql, params);
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

export default router;
