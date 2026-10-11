import express from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { imageUpload, videoUpload } from '../middleware/upload.js';
import { analyzeImageWithVision, analyzeVideoWithVision } from '../services/visionClient.js';
import { recordInventoryObservation } from '../services/inventoryService.js';
import { query } from '../db/db.js';
import { config } from '../config/index.js';

const router = express.Router();

// POST /api/vision/image
router.post('/image', authenticateToken, imageUpload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }

    const { camera_id, shelf_id } = req.body;
    const uploadedImagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    // Call Python FastAPI vision service
    const visionResult = await analyzeImageWithVision(uploadedImagePath);

    // Save annotated image if provided
    let annotatedImageUrl = imageUrl;
    if (visionResult.annotated_image_base64) {
      const annotatedFilename = `annotated-${req.file.filename}`;
      const annotatedFilePath = path.join(config.uploadDir, annotatedFilename);
      const buffer = Buffer.from(visionResult.annotated_image_base64, 'base64');
      fs.writeFileSync(annotatedFilePath, buffer);
      annotatedImageUrl = `/uploads/${annotatedFilename}`;
    }

    // Process counts and save inventory observations
    const productCounts = visionResult.counts || {}; // { [productId]: { count, confidence, name } }
    const unrecognizedItems = visionResult.unrecognized || [];
    const observations = [];
    const alertsCreated = [];

    // For all products returned in counts
    for (const [productId, info] of Object.entries(productCounts)) {
      const record = await recordInventoryObservation({
        productId,
        cameraId: camera_id || null,
        shelfId: shelf_id || null,
        detectedCount: info.count,
        confidence: info.confidence || 0.9,
        imageUrl: annotatedImageUrl,
        sourceType: 'image'
      });

      observations.push(record.snapshot);
      if (record.alertCreated) {
        alertsCreated.push(record.alertCreated);
      }

      // Store individual detections
      if (info.boxes && Array.isArray(info.boxes)) {
        for (const box of info.boxes) {
          await query(
            `INSERT INTO detections 
             (detection_id, snapshot_id, product_id, label, confidence, box_x1, box_y1, box_x2, box_y2, is_recognized, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, CURRENT_TIMESTAMP)`,
            [
              `det-${uuidv4().slice(0, 8)}`,
              record.snapshot.snapshot_id,
              productId,
              info.name || 'product',
              box.confidence || info.confidence || 0.9,
              box.x1,
              box.y1,
              box.x2,
              box.y2
            ]
          );
        }
      }
    }

    // Save unrecognized detections
    if (unrecognizedItems.length > 0 && observations.length > 0) {
      const baseSnapshotId = observations[0].snapshot_id;
      for (const unrec of unrecognizedItems) {
        await query(
          `INSERT INTO detections 
           (detection_id, snapshot_id, product_id, label, confidence, box_x1, box_y1, box_x2, box_y2, is_recognized, created_at)
           VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, false, CURRENT_TIMESTAMP)`,
          [
            `det-${uuidv4().slice(0, 8)}`,
            baseSnapshotId,
            unrec.label || 'Unrecognized item',
            unrec.confidence || 0.5,
            unrec.x1,
            unrec.y1,
            unrec.x2,
            unrec.y2
          ]
        );
      }
    }

    res.json({
      success: true,
      data: {
        original_image: imageUrl,
        annotated_image: annotatedImageUrl,
        annotated_base64: visionResult.annotated_image_base64 || null,
        image_width: visionResult.image_width || 1280,
        image_height: visionResult.image_height || 720,
        counts: productCounts,
        visible_items: visionResult.visible_items || [],
        all_detections: visionResult.all_detections || [],
        shelf_summary: visionResult.shelf_summary || null,
        total_items_seen: visionResult.shelf_summary?.total_items_seen || 0,
        unrecognized: unrecognizedItems,
        snapshots: observations,
        alerts_created: alertsCreated
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/vision/video
router.post('/video', authenticateToken, videoUpload.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file uploaded.' });
    }

    const { camera_id, shelf_id } = req.body;
    const uploadedVideoPath = req.file.path;
    const videoUrl = `/uploads/${req.file.filename}`;

    // Call Python FastAPI vision service
    const visionResult = await analyzeVideoWithVision(uploadedVideoPath);

    // Save annotated video if returned as file path or base64
    let annotatedVideoUrl = videoUrl;
    if (visionResult.annotated_video_filename) {
      annotatedVideoUrl = `/uploads/${visionResult.annotated_video_filename}`;
    }

    const productCounts = visionResult.counts || {};
    const unrecognizedItems = visionResult.unrecognized || [];
    const observations = [];
    const alertsCreated = [];

    for (const [productId, info] of Object.entries(productCounts)) {
      const record = await recordInventoryObservation({
        productId,
        cameraId: camera_id || null,
        shelfId: shelf_id || null,
        detectedCount: info.count,
        confidence: info.confidence || 0.85,
        imageUrl: annotatedVideoUrl,
        sourceType: 'video'
      });

      observations.push(record.snapshot);
      if (record.alertCreated) {
        alertsCreated.push(record.alertCreated);
      }
    }

    res.json({
      success: true,
      data: {
        original_video: videoUrl,
        annotated_video: annotatedVideoUrl,
        counts: productCounts,
        visible_items: visionResult.visible_items || [],
        unrecognized: unrecognizedItems,
        snapshots: observations,
        alerts_created: alertsCreated,
        tracking_summary: visionResult.tracking_summary || {}
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/vision/register-item (1-Click add detected shelf item to product inventory)
router.post('/register-item', authenticateToken, async (req, res, next) => {
  try {
    const { name, category, detection_prompt, min_visible_stock, shelf_id } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }

    const cleanName = name.trim();
    const cleanCat = (category || 'General Retail').trim();
    const cleanPrompt = (detection_prompt || cleanName).trim().toLowerCase();
    const minStock = Number(min_visible_stock) || 3;
    const cleanSku = `SKU-${cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const prodId = `prod-${uuidv4().slice(0, 8)}`;

    const insertRes = await query(
      `INSERT INTO products (id, name, category, sku, min_visible_stock, shelf_id, detection_prompt, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [prodId, cleanName, cleanCat, cleanSku, minStock, shelf_id || null, cleanPrompt]
    );

    res.status(201).json({
      success: true,
      data: insertRes.rows[0],
      message: `"${cleanName}" has been successfully added to monitored inventory!`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
