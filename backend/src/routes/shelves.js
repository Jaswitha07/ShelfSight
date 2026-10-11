import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const shelfSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    location: z.string().min(1, 'Location is required').max(255)
  })
});

// GET /api/shelves
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM shelves ORDER BY name ASC');
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/shelves/:id
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM shelves WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shelf not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/shelves
router.post('/', authenticateToken, validate(shelfSchema), async (req, res, next) => {
  try {
    const { name, location } = req.body;
    const id = `shelf-${uuidv4().slice(0, 8)}`;
    const result = await query(
      `INSERT INTO shelves (id, name, location, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, name, location]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/shelves/:id
router.put('/:id', authenticateToken, validate(shelfSchema), async (req, res, next) => {
  try {
    const { name, location } = req.body;
    const result = await query(
      `UPDATE shelves 
       SET name = $1, location = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [name, location, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shelf not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/shelves/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM shelves WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Shelf not found' });
    }
    res.json({ success: true, message: 'Shelf deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
