import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('  Starting ShelfSight AI Retail Monitoring System (All Services)');
console.log('================================================================');

const pythonExe = path.resolve(__dirname, 'vision_venv/Scripts/python.exe');

// 1. Vision Service (FastAPI)
console.log('[SPAWN] Launching Vision AI Service (Port 8000)...');
const vision = spawn(
  pythonExe,
  ['-m', 'uvicorn', 'app:app', '--host', '0.0.0.0', '--port', '8000', '--app-dir', 'vision'],
  { stdio: 'inherit', shell: true }
);

// 2. Backend Service (Express)
console.log('[SPAWN] Launching Backend REST API (Port 5000)...');
const backend = spawn('npm', ['start'], {
  cwd: path.resolve(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// 3. Frontend Dev Server (Vite)
console.log('[SPAWN] Launching Frontend Dashboard (Port 5173)...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n[SYSTEM] Terminating all ShelfSight services...');
  try { vision.kill(); } catch (e) {}
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
