import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbClient = null;
let dbType = 'unknown';

export async function initDb() {
  if (dbClient) return dbClient;

  // Try PostgreSQL via DATABASE_URL if configured
  if (config.databaseUrl && config.databaseUrl.trim() !== '') {
    try {
      console.log('[DB] Attempting PostgreSQL connection via DATABASE_URL...');
      const pool = new pg.Pool({
        connectionString: config.databaseUrl,
        connectionTimeoutMillis: 3000
      });
      // Test connection
      await pool.query('SELECT 1');
      console.log('[DB] Connected to PostgreSQL database successfully.');
      dbClient = pool;
      dbType = 'postgres';
      await applySchema();
      return dbClient;
    } catch (err) {
      console.warn('[DB] Could not connect to PostgreSQL via DATABASE_URL:', err.message);
      console.log('[DB] Falling back to embedded PGlite for local zero-config database...');
    }
  }

  // Fallback to embedded PGlite
  try {
    console.log('[DB] Initializing embedded PGlite database...');
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = path.resolve(__dirname, '../../data/pglite');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const pglite = new PGlite(dataDir);
    dbClient = pglite;
    dbType = 'pglite';
    console.log('[DB] Embedded PGlite initialized at:', dataDir);
    await applySchema();
    return dbClient;
  } catch (err) {
    console.error('[DB] Failed to initialize PGlite:', err);
    throw err;
  }
}

export async function exec(sql) {
  if (!dbClient) {
    await initDb();
  }
  if (typeof dbClient.exec === 'function') {
    return dbClient.exec(sql);
  }
  return dbClient.query(sql);
}

async function applySchema() {
  try {
    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('[DB] schema.sql not found at:', schemaPath);
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Check if tables already exist
    const checkTable = await dbClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'products'
    `);

    if (!checkTable.rows || checkTable.rows.length === 0) {
      console.log('[DB] First run detected. Executing database/schema.sql...');
      if (typeof dbClient.exec === 'function') {
        await dbClient.exec(schemaSql);
      } else {
        await dbClient.query(schemaSql);
      }
      console.log('[DB] Schema applied successfully.');
    } else {
      console.log('[DB] Schema verified (tables exist).');
    }
  } catch (err) {
    console.error('[DB] Error applying schema.sql:', err.message);
    throw err;
  }
}

export async function query(text, params = []) {
  if (!dbClient) {
    await initDb();
  }
  return dbClient.query(text, params);
}

export function getDbType() {
  return dbType;
}

export default {
  initDb,
  query,
  getDbType
};
