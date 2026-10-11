import { createApp } from './app.js';
import { config } from './config/index.js';
import { initDb } from './db/db.js';

async function bootstrap() {
  try {
    console.log('====================================================');
    console.log('  Starting ShelfSight Retail Monitoring Backend');
    console.log('====================================================');

    // Initialize database (PostgreSQL or PGlite)
    await initDb();

    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`[HTTP] ShelfSight Backend listening on port ${config.port}`);
      console.log(`[HTTP] Health check available at: http://localhost:${config.port}/api/health`);
      console.log(`[CONFIG] CORS origin: ${config.corsOrigin}`);
      console.log(`[CONFIG] Vision URL: ${config.visionUrl}`);
    });

    // Graceful shutdown
    const handleShutdown = (signal) => {
      console.log(`[SYSTEM] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[SYSTEM] ShelfSight Backend closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    console.error('[FATAL] Failed to start ShelfSight backend:', err);
    process.exit(1);
  }
}

bootstrap();
