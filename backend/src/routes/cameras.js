import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  sanitizeCamera,
  startMonitoring,
  stopMonitoring,
  setCameraOffline
} from '../services/cameraService.js';

const router = express.Router();

const cameraCreateSchema = z.object({
  body: z.object({
    camera_name: z.string().min(1, 'Camera name is required').max(100),
    location: z.string().min(1, 'Location is required').max(255),
    stream_url: z.string().min(1, 'Stream URL is required').max(500),
    status: z.enum(['online', 'offline', 'simulated', 'error']).default('offline')
  })
});

const cameraUpdateSchema = z.object({
  body: z.object({
    camera_name: z.string().min(1).max(100).optional(),
    location: z.string().min(1).max(255).optional(),
    stream_url: z.string().min(1).max(500).optional(),
    status: z.enum(['online', 'offline', 'simulated', 'error']).optional()
  })
});

// GET /api/cameras (all stream_urls masked)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM cameras ORDER BY camera_name ASC');
    const sanitized = result.rows.map(sanitizeCamera);
    res.json({ success: true, count: sanitized.length, data: sanitized });
  } catch (err) {
    next(err);
  }
});

// GET /api/cameras/:id (masked stream_url)
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM cameras WHERE camera_id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }
    res.json({ success: true, data: sanitizeCamera(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /api/cameras
router.post('/', authenticateToken, validate(cameraCreateSchema), async (req, res, next) => {
  try {
    const { camera_name, location, stream_url, status } = req.body;
    const cameraId = `cam-${uuidv4().slice(0, 8)}`;

    const result = await query(
      `INSERT INTO cameras (camera_id, camera_name, location, stream_url, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [cameraId, camera_name, location, stream_url, status || 'offline']
    );

    res.status(201).json({ success: true, data: sanitizeCamera(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cameras/:id
router.put('/:id', authenticateToken, validate(cameraUpdateSchema), async (req, res, next) => {
  try {
    const existing = await query('SELECT * FROM cameras WHERE camera_id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    const current = existing.rows[0];
    const camera_name = req.body.camera_name ?? current.camera_name;
    const location = req.body.location ?? current.location;
    const stream_url = req.body.stream_url ?? current.stream_url;
    const status = req.body.status ?? current.status;

    const result = await query(
      `UPDATE cameras
       SET camera_name = $1, location = $2, stream_url = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE camera_id = $5
       RETURNING *`,
      [camera_name, location, stream_url, status, req.params.id]
    );

    res.json({ success: true, data: sanitizeCamera(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cameras/:id
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM cameras WHERE camera_id = $1 RETURNING camera_id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }
    res.json({ success: true, message: 'Camera deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/cameras/:id/start
router.post('/:id/start', authenticateToken, async (req, res, next) => {
  try {
    const monitoringResult = await startMonitoring(req.params.id);
    const camRes = await query('SELECT * FROM cameras WHERE camera_id = $1', [req.params.id]);
    res.json({
      success: monitoringResult.success,
      status: monitoringResult.status,
      message: monitoringResult.message,
      error: monitoringResult.error,
      camera: sanitizeCamera(camRes.rows[0])
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cameras/:id/stop
router.post('/:id/stop', authenticateToken, async (req, res, next) => {
  try {
    const stopResult = await stopMonitoring(req.params.id);
    const camRes = await query('SELECT * FROM cameras WHERE camera_id = $1', [req.params.id]);
    res.json({
      success: stopResult.success,
      message: stopResult.message,
      camera: sanitizeCamera(camRes.rows[0])
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/cameras/:id/status
router.get('/:id/status', authenticateToken, async (req, res, next) => {
  try {
    const camRes = await query('SELECT camera_id, camera_name, status, updated_at FROM cameras WHERE camera_id = $1', [
      req.params.id
    ]);
    if (camRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }
    res.json({ success: true, data: camRes.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
