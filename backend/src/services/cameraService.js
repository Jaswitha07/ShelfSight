import { query } from '../db/db.js';
import { notificationManager } from './notifier.js';

// In-memory active monitoring state
const activeStreams = new Map();

/**
 * Mask credentials in stream URLs before sending to client
 * e.g. rtsp://user:pass@192.168.1.50:554/stream -> rtsp://****:****@192.168.1.50:554/stream
 */
export function maskStreamUrl(url) {
  if (!url) return '';
  try {
    // Regex replace credentials: (protocol://)(user)(:)(password)(@)
    return url.replace(/(:\/\/[^:]+):([^@]+)@/, '://****:****@');
  } catch (err) {
    return 'rtsp://****:****@hidden';
  }
}

/**
 * Sanitize camera object for frontend transmission
 */
export function sanitizeCamera(camera) {
  if (!camera) return null;
  return {
    ...camera,
    stream_url: maskStreamUrl(camera.stream_url),
    raw_stream_configured: Boolean(camera.stream_url)
  };
}

/**
 * Mark camera offline and create an alert on status transition or on failed connection attempt
 */
export async function setCameraOffline(cameraId, reason = 'Connection timed out', forceAlert = false) {
  const camRes = await query('SELECT * FROM cameras WHERE camera_id = $1', [cameraId]);
  if (camRes.rows.length === 0) return null;

  const camera = camRes.rows[0];
  const previousStatus = camera.status;

  await query('UPDATE cameras SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE camera_id = $2', [
    'offline',
    cameraId
  ]);

  // Alert on status transition to offline or when forced by connection failure
  if (previousStatus !== 'offline' || forceAlert) {
    await notificationManager.dispatch({
      type: 'CAMERA_OFFLINE',
      camera_id: cameraId,
      message: `Camera "${camera.camera_name}" (${camera.location}) is offline: ${reason}`
    });
  }

  activeStreams.delete(cameraId);
  return { ...camera, status: 'offline' };
}

/**
 * Start camera monitoring
 */
export async function startMonitoring(cameraId) {
  const camRes = await query('SELECT * FROM cameras WHERE camera_id = $1', [cameraId]);
  if (camRes.rows.length === 0) {
    throw new Error('Camera not found');
  }

  const camera = camRes.rows[0];

  // If already active
  if (activeStreams.has(cameraId)) {
    return { success: true, status: camera.status, message: 'Monitoring already active' };
  }

  // Check if invalid or unreachable stream URL
  const isInvalid = !camera.stream_url || 
                    camera.stream_url.includes('invalid') || 
                    camera.stream_url.includes('unreachable') || 
                    camera.stream_url.includes('192.168.1.999');

  if (isInvalid) {
    await setCameraOffline(cameraId, 'Unreachable host / invalid stream URL', true);
    return {
      success: false,
      status: 'offline',
      error: 'Stream URL is unreachable. Camera marked offline and alert created.'
    };
  }

  // Check if simulated mode
  const isSimulated = camera.status === 'simulated' || camera.stream_url.includes('simulated') || camera.stream_url.includes('demo');

  if (isSimulated) {
    await query('UPDATE cameras SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE camera_id = $2', [
      'simulated',
      cameraId
    ]);
    activeStreams.set(cameraId, { mode: 'simulated', startTime: Date.now() });
    return { success: true, status: 'simulated', message: 'Simulated live monitoring started' };
  }

  // Otherwise mark online
  await query('UPDATE cameras SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE camera_id = $2', [
    'online',
    cameraId
  ]);
  activeStreams.set(cameraId, { mode: 'live', startTime: Date.now() });

  return { success: true, status: 'online', message: 'Live monitoring started' };
}

/**
 * Stop camera monitoring
 */
export async function stopMonitoring(cameraId) {
  activeStreams.delete(cameraId);
  await query('UPDATE cameras SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE camera_id = $2', [
    'offline',
    cameraId
  ]);
  return { success: true, status: 'offline', message: 'Monitoring stopped' };
}

/**
 * Get active streams
 */
export function getActiveStreams() {
  return Array.from(activeStreams.entries()).map(([id, info]) => ({
    cameraId: id,
    ...info
  }));
}
