import { generatePlan, getMealShape, getChefMessages, addChefMessage, clearChefMessages } from '$lib/server/repos/chef.js';
import { askChef, suggestFill, chefConfigured } from '$lib/server/chef.js';
import { logManual, dayTotals, getDayLog } from '$lib/server/repos/food.js';
import { getTargets } from '$lib/server/repos/profile.js';
import { todayStr } from '$lib/server/date.js';
import { fail } from '@sveltejs/kit';

// What's eaten today vs target — the deterministic basis for "Fill the rest of my day".
function dayStatus() {
  const t = getTargets();
  const tot = dayTotals(todayStr());
  const r1 = (n) => Math.round(n * 10) / 10;
  const left = (target, eaten) => (target == null ? null : Math.round(target - eaten));
  return {
    has: t.has,
    target: { kcal: t.targetKcal, protein: t.proteinG, fat: t.fatG, carbs: t.carbsG },
    eaten: { kcal: Math.round(tot.kcal), protein: r1(tot.protein), fat: r1(tot.fat), carbs: r1(tot.carbs) },
    remaining: {
      kcal: left(t.targetKcal, tot.kcal), protein: left(t.proteinG, tot.protein),
      fat: left(t.fatG, tot.fat), carbs: left(t.carbsG, tot.carbs)
    }
  };
}

export function load() {
  return { messages: getChefMessages(), configured: chefConfigured(), day: dayStatus(), shape: getMealShape() };
}

const SLOT = { Breakfast: 'breakfast', Lunch: 'lunch', Snack: 'snack', Dinner: 'dinner', Extra: 'snack' };

export const actions = {
  plan: async ({ request }) => {
    const f = await request.formData();
    const tier = f.get('tier') === 'fancy' ? 'fancy' : 'simple';
    const keepDinnerId = f.get('keepDinnerId') ? Number(f.get('keepDinnerId')) : null;
    let avoidIds = [];
    try { avoidIds = JSON.parse(f.get('avoidIds') || '[]'); } catch { avoidIds = []; }
    const plan = generatePlan({ tier, keepDinnerId, avoidIds });
    if (!plan) return fail(400, { error: getTargets().has ? 'Could not build a plan.' : "Add your coach's calories first, in Settings. Meal plans are built to land on them." });
    return { plan };
  },

  logDay: async ({ request }) => {
    const f = await request.formData();
    let plan;
    try { plan = JSON.parse(f.get('plan')); } catch { return fail(400, { error: 'bad plan' }); }
    const date = todayStr();
    for (const m of plan.meals || []) {
      const src = m.recipe || m.filler;
      if (!src) continue;
      logManual({
        date, slot: SLOT[m.slot] || 'other', name: src.name, qty: 1,
        kcal: Math.round(src.kcal || 0), protein: Math.round(src.protein_g || 0),
        fat: Math.round(src.fat_g || 0), carbs: Math.round(src.carbs_g || 0), source: 'ai'
      });
    }
    return { logged: true, count: (plan.meals || []).length };
  },

  fillDay: async () => {
    const date = todayStr();
    const reply = await suggestFill({ targets: getTargets(), totals: dayTotals(date), log: getDayLog(date) });
    if (reply.error) return fail(400, { error: reply.error });
    return { fill: reply.text };
  },

  chat: async ({ request }) => {
    const f = await request.formData();
    const text = (f.get('message') || '').toString().trim();
    if (!text) return fail(400, { error: 'empty' });
    addChefMessage('user', text);
    const reply = await askChef(getChefMessages());
    addChefMessage('assistant', reply.error ? `⚠️ ${reply.error}` : reply.text);
    return { ok: true };
  },
  clearChat: async () => { clearChefMessages(); return { ok: true }; }
};
