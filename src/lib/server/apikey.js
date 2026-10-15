// The Anthropic API key behind the AI assistant, the AI chef and AI food estimates.
// Entered by the user (welcome screen or Settings) and kept in this app's own database, which
// lives only on their computer. ANTHROPIC_API_KEY in the environment works as a fallback.
// Everything else in the app works without a key.
import { getDb } from './db.js';

const ROW = 'anthropic_api_key';

export function getApiKey() {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(ROW);
  return row?.value || process.env.ANTHROPIC_API_KEY || '';
}

/** Where the key in use comes from, and its last four characters for display. Never the key. */
export function apiKeyStatus() {
  const own = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(ROW)?.value;
  const key = own || process.env.ANTHROPIC_API_KEY || '';
  return { set: !!key, source: own ? 'app' : key ? 'environment' : null, last4: key ? key.slice(-4) : null };
}

export function saveApiKey(key) {
  getDb().prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(ROW, key.trim());
}

export function removeApiKey() {
  getDb().prepare('DELETE FROM settings WHERE key = ?').run(ROW);
}

/**
 * Ask Anthropic whether a key works, using the free model-list call (no tokens spent).
 * → { ok: true } | { ok: false, reason: 'invalid' | 'unreachable', message }
 */
export async function checkApiKey(key) {
  const k = (key ?? '').trim();
  if (!k) return { ok: false, reason: 'invalid', message: 'Paste a key first.' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': k, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403)
      return { ok: false, reason: 'invalid', message: "Anthropic didn't accept that key. Check it was copied in full." };
    return { ok: false, reason: 'unreachable', message: `Anthropic answered with an error (${res.status}), so the key couldn't be checked.` };
  } catch {
    return { ok: false, reason: 'unreachable', message: "Couldn't reach Anthropic to check the key. Is this computer online?" };
  }
}
