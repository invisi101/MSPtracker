import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const uploadsDir = () => join(process.env.DATA_DIR || './data', 'uploads');
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

export async function saveUpload(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) return null;
  mkdirSync(uploadsDir(), { recursive: true });
  let ext = extname(file.name || '').toLowerCase();
  if (!ALLOWED.includes(ext)) ext = '.jpg';
  const name = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
  writeFileSync(join(uploadsDir(), name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export function readUpload(name) {
  const p = join(uploadsDir(), basename(name));
  return existsSync(p) ? readFileSync(p) : null;
}

export function removeUpload(name) {
  if (!name) return;
  const p = join(uploadsDir(), basename(name));
  if (existsSync(p)) unlinkSync(p);
}
