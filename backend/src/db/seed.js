import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { initDb, query, exec } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedDatabase(isDemo = true) {
  console.log('[SEED] Initializing DB...');
  await initDb();

  // Create demo user
  const demoPassword = 'password123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(demoPassword, salt);

  await query(`
    INSERT INTO users (id, username, email, password_hash, role)
    VALUES ('usr-admin', 'manager', 'manager@shelfsight.store', $1, 'store_manager')
    ON CONFLICT (id) DO UPDATE SET password_hash = $1
  `, [passwordHash]);

  console.log('[SEED] Demo user seeded: manager@shelfsight.store / password123');

  // Read database/seeds.sql
  const seedsPath = path.resolve(__dirname, '../../../database/seeds.sql');
  if (fs.existsSync(seedsPath)) {
    const seedsSql = fs.readFileSync(seedsPath, 'utf8');
    await exec(seedsSql);
    console.log('[SEED] Demo shelves, cameras, products, snapshots, and alerts seeded from seeds.sql');
  }

  // Ensure uploads directory exists
  const demoUploadsDir = path.resolve(__dirname, '../../uploads/demo');
  if (!fs.existsSync(demoUploadsDir)) {
    fs.mkdirSync(demoUploadsDir, { recursive: true });
  }

  console.log('[SEED] Database seeding complete.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('Seed execution finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed execution failed:', err);
      process.exit(1);
    });
}
