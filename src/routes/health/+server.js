import { json } from '@sveltejs/kit';

export function GET() {
  return json({ ok: true, app: 'msp-tracker', ts: new Date().toISOString() });
}
