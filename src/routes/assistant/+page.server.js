import { getMessages, addMessage, clearMessages } from '$lib/server/repos/assistant.js';
import { coachChat, estimateFood, coachConfigured } from '$lib/server/coach.js';
import { logManual } from '$lib/server/repos/food.js';
import { todayStr } from '$lib/server/date.js';
import { fail } from '@sveltejs/kit';

export function load() {
  return { messages: getMessages(), configured: coachConfigured() };
}

export const actions = {
  chat: async ({ request }) => {
    const f = await request.formData();
    const text = (f.get('message') || '').toString().trim();
    if (!text) return fail(400, { error: 'empty' });
    addMessage('user', text);
    const reply = await coachChat(getMessages());
    addMessage('assistant', reply.error ? `⚠️ ${reply.error}` : reply.text);
    return { ok: true };
  },
  clearChat: async () => { clearMessages(); return { ok: true }; },

  estimate: async ({ request }) => {
    const f = await request.formData();
    const desc = (f.get('description') || '').toString().trim();
    if (!desc) return fail(400, { error: 'empty' });
    const r = await estimateFood(desc);
    if (r.error) return fail(400, { error: r.error });
    return { estimate: r.food };
  },
  logEstimate: async ({ request }) => {
    const f = await request.formData();
    // A blank or garbled figure is logged as 0 rather than NaN, which would poison every total.
    const n = (k) => { const v = Number(f.get(k)); return Number.isFinite(v) && v >= 0 ? v : 0; };
    logManual({
      date: todayStr(), slot: f.get('slot') || 'other', name: f.get('name'), qty: 1,
      kcal: n('kcal'), protein: n('protein'), fat: n('fat'), carbs: n('carbs'),
      source: 'ai'
    });
    return { logged: true };
  }
};
