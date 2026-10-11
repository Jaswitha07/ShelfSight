import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/error.js';

// Route imports
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import cameraRoutes from './routes/cameras.js';
import shelfRoutes from './routes/shelves.js';
import visionRoutes from './routes/vision.js';
import inventoryRoutes from './routes/inventory.js';
import alertRoutes from './routes/alerts.js';
import dashboardRoutes from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Helmet with relaxed resource policy for uploaded images/videos
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS configured from env
  app.use(cors({
    origin: config.corsOrigin === '*' ? true : [config.corsOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files for uploaded images and videos
  app.use('/uploads', express.static(config.uploadDir));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      product: 'ShelfSight',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cameras', cameraRoutes);
  app.use('/api/shelves', shelfRoutes);
  app.use('/api/vision', visionRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // 404 handler for unmatched routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
