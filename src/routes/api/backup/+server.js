import { getDb } from '$lib/server/db.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function GET() {
  getDb().pragma('wal_checkpoint(TRUNCATE)');
  const buf = readFileSync(join(process.env.DATA_DIR || './data', 'tracker.db'));
  const stamp = new Date().toLocaleDateString('en-CA');
  return new Response(buf, {
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="msp-tracker-backup-${stamp}.db"`
    }
  });
}
