import { query } from '../db/db.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base Notifier Interface
 */
export class BaseNotifier {
  async send(alert) {
    throw new Error('Notifier must implement send(alert)');
  }
}

/**
 * In-App Database Notifier
 * Stores notifications in the `alerts` table.
 */
export class InAppNotifier extends BaseNotifier {
  async send(alertData) {
    const alertId = alertData.alert_id || `alt-${uuidv4().slice(0, 8)}`;
    const sql = `
      INSERT INTO alerts (alert_id, type, product_id, camera_id, message, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'new', CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const params = [
      alertId,
      alertData.type,
      alertData.product_id || null,
      alertData.camera_id || null,
      alertData.message
    ];
    const result = await query(sql, params);
    console.log(`[ALERT] InApp notification created: [${alertData.type}] ${alertData.message}`);
    return result.rows[0];
  }
}

/**
 * Notification Manager to dispatch alerts to all active notifiers
 */
export class NotificationManager {
  constructor() {
    this.notifiers = [new InAppNotifier()];
  }

  registerNotifier(notifier) {
    this.notifiers.push(notifier);
  }

  async dispatch(alertData) {
    const results = [];
    for (const notifier of this.notifiers) {
      try {
        const res = await notifier.send(alertData);
        results.push(res);
      } catch (err) {
        console.error('[ALERT] Failed to dispatch via notifier:', err.message);
      }
    }
    return results[0]; // primary in-app alert row
  }
}

export const notificationManager = new NotificationManager();
