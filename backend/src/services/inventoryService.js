import { query } from '../db/db.js';
import { v4 as uuidv4 } from 'uuid';
import { notificationManager } from './notifier.js';

/**
 * Pure function to compute inventory status according to business rules:
 * - count == 0 -> OUT_OF_STOCK
 * - count <= min_visible_stock -> LOW_STOCK
 * - otherwise -> NORMAL
 *
 * @param {number} count - number of simultaneously visible units
 * @param {number} minVisibleStock - minimum desired visible stock
 * @returns {'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL'}
 */
export function computeInventoryStatus(count, minVisibleStock) {
  if (count <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (count <= minVisibleStock) {
    return 'LOW_STOCK';
  }
  return 'NORMAL';
}

/**
 * Get latest snapshot for a specific product
 */
export async function getLatestSnapshotForProduct(productId) {
  const result = await query(
    `SELECT * FROM inventory_snapshots 
     WHERE product_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [productId]
  );
  return result.rows[0] || null;
}

/**
 * Record an inventory observation snapshot and trigger transition alerts if status changed to LOW or OUT.
 */
export async function recordInventoryObservation({
  productId,
  cameraId = null,
  shelfId = null,
  detectedCount,
  confidence = 1.0,
  imageUrl = null,
  sourceType = 'image'
}) {
  // Fetch product to get name, min_visible_stock, etc.
  const prodRes = await query('SELECT * FROM products WHERE id = $1', [productId]);
  if (prodRes.rows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }
  const product = prodRes.rows[0];
  const minStock = product.min_visible_stock;
  const newStatus = computeInventoryStatus(detectedCount, minStock);

  // Check previous status for transition detection
  const previousSnapshot = await getLatestSnapshotForProduct(productId);
  const previousStatus = previousSnapshot ? previousSnapshot.status : null;

  const snapshotId = `snap-${uuidv4().slice(0, 8)}`;

  // Insert snapshot
  const snapResult = await query(
    `INSERT INTO inventory_snapshots 
     (snapshot_id, camera_id, shelf_id, product_id, detected_count, min_visible_stock, status, confidence, image_url, source_type, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      snapshotId,
      cameraId,
      shelfId || product.shelf_id,
      productId,
      detectedCount,
      minStock,
      newStatus,
      confidence,
      imageUrl,
      sourceType
    ]
  );

  const snapshot = snapResult.rows[0];

  // ALERT LOGIC:
  // Create alerts ONLY on status TRANSITIONS into LOW STOCK or OUT OF STOCK
  let alertCreated = null;
  const isTransitionToLow = newStatus === 'LOW_STOCK' && previousStatus !== 'LOW_STOCK';
  const isTransitionToOut = newStatus === 'OUT_OF_STOCK' && previousStatus !== 'OUT_OF_STOCK';

  if (isTransitionToOut) {
    const alertData = {
      type: 'OUT_OF_STOCK',
      product_id: productId,
      camera_id: cameraId,
      message: `${product.name} (SKU: ${product.sku}) is OUT OF STOCK (0 visible units detected).`
    };
    alertCreated = await notificationManager.dispatch(alertData);
  } else if (isTransitionToLow) {
    const alertData = {
      type: 'LOW_STOCK',
      product_id: productId,
      camera_id: cameraId,
      message: `${product.name} (SKU: ${product.sku}) is LOW ON STOCK (${detectedCount} visible units, threshold: ${minStock}).`
    };
    alertCreated = await notificationManager.dispatch(alertData);
  }

  return {
    snapshot,
    previousStatus,
    newStatus,
    alertCreated
  };
}
