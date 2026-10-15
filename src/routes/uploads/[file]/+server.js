import { readUpload } from '$lib/server/uploads.js';
import { error } from '@sveltejs/kit';

const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic' };

export function GET({ params }) {
  const buf = readUpload(params.file);
  if (!buf) throw error(404, 'Not found');
  const ext = params.file.slice(params.file.lastIndexOf('.')).toLowerCase();
  return new Response(buf, {
    headers: { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'private, max-age=86400' }
  });
}
