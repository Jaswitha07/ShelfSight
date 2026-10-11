import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from '../config/index.js';
import { query } from '../db/db.js';

/**
 * Fetch all active products formatted for vision detector
 */
export async function getActiveProductsForVision() {
  const result = await query(`
    SELECT id, name, category, sku, min_visible_stock, detection_prompt, reference_image
    FROM products
    WHERE is_active = TRUE
    ORDER BY name ASC
  `);
  return result.rows;
}

/**
 * Call Vision service to detect items in an image
 */
export async function analyzeImageWithVision(imagePath) {
  const activeProducts = await getActiveProductsForVision();

  const formData = new FormData();
  formData.append('file', fs.createReadStream(imagePath));
  formData.append('products_json', JSON.stringify(activeProducts));

  try {
    const response = await axios.post(`${config.visionUrl}/detect/image`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30s timeout
    });

    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      const error = new Error('Vision AI service is currently unavailable. Please ensure the Python vision service is running.');
      error.status = 503;
      throw error;
    }
    const message = err.response?.data?.detail || err.message || 'Vision analysis failed';
    const error = new Error(`Vision AI error: ${message}`);
    error.status = err.response?.status || 500;
    throw error;
  }
}

/**
 * Call Vision service to analyze a video with tracking and frame skip
 */
export async function analyzeVideoWithVision(videoPath) {
  const activeProducts = await getActiveProductsForVision();

  const formData = new FormData();
  formData.append('file', fs.createReadStream(videoPath));
  formData.append('products_json', JSON.stringify(activeProducts));

  try {
    const response = await axios.post(`${config.visionUrl}/detect/video`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 180000 // 3 minutes timeout for video processing
    });

    return response.data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      const error = new Error('Vision AI service is currently unavailable. Please ensure the Python vision service is running.');
      error.status = 503;
      throw error;
    }
    const message = err.response?.data?.detail || err.message || 'Video analysis failed';
    const error = new Error(`Vision AI error: ${message}`);
    error.status = err.response?.status || 500;
    throw error;
  }
}
