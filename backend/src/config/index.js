import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend/.env or root/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'shelfsight_default_jwt_secret_key_2026',
  visionUrl: process.env.VISION_URL || 'http://localhost:8000',
  databaseUrl: process.env.DATABASE_URL || '',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  isProduction: process.env.NODE_ENV === 'production'
};
