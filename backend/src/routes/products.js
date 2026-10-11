import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';

const router = express.Router();

const productCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  category: z.string().min(1, 'Category is required').max(100),
  sku: z.string().min(1, 'SKU is required').max(100),
  min_visible_stock: z.coerce.number().int().min(0).default(3),
  shelf_id: z.string().optional().nullable(),
  detection_prompt: z.string().min(1, 'Detection prompt is required').max(255),
  reference_image: z.string().optional().nullable(),
  is_active: z.coerce.boolean().default(true)
});

// GET /api/products
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { active, category, shelf_id } = req.query;
    let sql = `
      SELECT p.*, s.name as shelf_name, s.location as shelf_location
      FROM products p
      LEFT JOIN shelves s ON p.shelf_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (active !== undefined) {
      params.push(active === 'true');
      sql += ` AND p.is_active = $${params.length}`;
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
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, s.name as shelf_name, s.location as shelf_location
       FROM products p
       LEFT JOIN shelves s ON p.shelf_id = s.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/products (supports multipart with file upload or JSON)
router.post('/', authenticateToken, imageUpload.single('reference_image_file'), async (req, res, next) => {
  try {
    const parsed = productCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ success: false, error: `Validation error: ${errorMsg}` });
    }

    const { name, category, sku, min_visible_stock, shelf_id, detection_prompt, is_active } = parsed.data;

    // Check SKU uniqueness
    const existing = await query('SELECT id FROM products WHERE sku = $1', [sku]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, error: `A product with SKU "${sku}" already exists.` });
    }

    let reference_image = parsed.data.reference_image || null;
    if (req.file) {
      reference_image = `/uploads/${req.file.filename}`;
    }

    const id = `prod-${uuidv4().slice(0, 8)}`;

    const result = await query(
      `INSERT INTO products 
       (id, name, category, sku, min_visible_stock, shelf_id, reference_image, detection_prompt, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, name, category, sku, min_visible_stock, shelf_id || null, reference_image, detection_prompt, is_active]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', authenticateToken, imageUpload.single('reference_image_file'), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const current = existing.rows[0];
    const name = req.body.name ?? current.name;
    const category = req.body.category ?? current.category;
    const sku = req.body.sku ?? current.sku;
    const min_visible_stock = req.body.min_visible_stock !== undefined ? parseInt(req.body.min_visible_stock, 10) : current.min_visible_stock;
    const shelf_id = req.body.shelf_id !== undefined ? (req.body.shelf_id || null) : current.shelf_id;
    const detection_prompt = req.body.detection_prompt ?? current.detection_prompt;
    const is_active = req.body.is_active !== undefined ? (req.body.is_active === 'true' || req.body.is_active === true) : current.is_active;

    let reference_image = current.reference_image;
    if (req.file) {
      reference_image = `/uploads/${req.file.filename}`;
    } else if (req.body.reference_image !== undefined) {
      reference_image = req.body.reference_image;
    }

    // If SKU changed, check uniqueness
    if (sku !== current.sku) {
      const skuCheck = await query('SELECT id FROM products WHERE sku = $1 AND id != $2', [sku, req.params.id]);
      if (skuCheck.rows.length > 0) {
        return res.status(409).json({ success: false, error: `SKU "${sku}" is already in use by another product.` });
      }
    }

    const result = await query(
      `UPDATE products
       SET name = $1, category = $2, sku = $3, min_visible_stock = $4, shelf_id = $5,
           reference_image = $6, detection_prompt = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, category, sku, min_visible_stock, shelf_id, reference_image, detection_prompt, is_active, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
