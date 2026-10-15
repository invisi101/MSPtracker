import { getTargets } from '$lib/server/repos/profile.js';
import {
  getDayLog, dayTotals, logFoodById, logManual, deleteLog, updateLog,
  addCustomFood, listCustomFoods, deleteCustomFood, findFoodByName, updateCustomFood, updateLogQty, getLogEntry
} from '$lib/server/repos/food.js';
import { fail } from '@sveltejs/kit';
import { todayStr } from '$lib/server/date.js';

export function load({ url }) {
  const date = url.searchParams.get('date') || todayStr();
  const entries = getDayLog(date);
  const slots = ['breakfast', 'lunch', 'snack', 'dinner', 'other'];
  const grouped = Object.fromEntries(slots.map((s) => [s, entries.filter((e) => e.slot === s)]));
  const targets = getTargets(date);
  return {
    date, targets, totals: dayTotals(date), grouped, slots, customFoods: listCustomFoods(),
    // Which block this day is scored against — null when no block covers it (no targets that day).
    blockName: targets.source === 'prescription' ? (targets.prescription?.name ?? 'Block') : null
  };
}

export const actions = {
  log: async ({ request }) => {
    const f = await request.formData();
    const date = f.get('date') || todayStr();
    const slot = f.get('slot') || 'other';
    const foodId = Number(f.get('foodId'));
    const qty = Number(f.get('qty'));
    if (!foodId || !qty || qty <= 0) return fail(400, { error: 'Pick a food and quantity' });
    logFoodById({ date, slot, foodId, qty });
    return { ok: true };
  },

  manual: async ({ request }) => {
    const f = await request.formData();
    const date = f.get('date') || todayStr();
    const slot = f.get('slot') || 'other';
    const name = (f.get('name') || '').toString().trim();
    const kcal = Number(f.get('kcal'));
    if (!name || !kcal) return fail(400, { error: 'Name and calories required' });
    logManual({
      date, slot, name, qty: 1, kcal,
      protein: Number(f.get('protein')) || 0,
      fat: Number(f.get('fat')) || 0,
      carbs: Number(f.get('carbs')) || 0,
      source: 'manual'
    });
    return { ok: true };
  },

  delete: async ({ request }) => {
    const f = await request.formData();
    deleteLog(Number(f.get('id')));
    return { ok: true };
  },

  // Edit a logged entry's macros. kcal is derived from them (Atwater), same as on save.
  editLog: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    if (!id) return fail(400, { error: 'Unknown entry' });
    const entry = getLogEntry(id);
    if (!entry) return fail(400, { error: 'Unknown entry' });
    const n = (k) => { const v = Number(f.get(k)); return Number.isFinite(v) && v > 0 ? v : 0; };

    // An entry from the food database is edited by AMOUNT and re-scaled from that food, exactly as
    // it was logged. Editing its macros by hand would recompute calories as 4/4/9, overstating
    // anything whose label discounts fibre.
    if (entry.food_id) {
      const qty = n('qty');
      if (!qty) return fail(400, { error: 'Amount required' });
      updateLogQty(id, qty);
      return { ok: true };
    }

    const name = (f.get('name') || '').toString().trim();
    if (!name) return fail(400, { error: 'Name required' });
    updateLog(id, { name, kcal: n('kcal') || null, protein: n('protein'), fat: n('fat'), carbs: n('carbs') });
    return { ok: true };
  },

  saveFood: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id')) || null;
    const name = (f.get('name') || '').toString().trim();
    const n = (k) => { const v = Number(f.get(k)); return Number.isFinite(v) && v > 0 ? v : 0; };
    const protein = n('protein'), fat = n('fat'), carbs = n('carbs');
    if (!name) return fail(400, { formError: 'Name required' });
    if (!protein && !fat && !carbs) return fail(400, { formError: 'Enter at least one of protein, fat or carbs' });
    if (findFoodByName(name, id)) return fail(400, { formError: `"${name}" already exists` });
    const b = (f.get('basis') || '').toString();
    const basis = b === 'unit' ? 'unit' : b === 'ml' ? 'ml' : '100g';
    // Calories are derived, not entered — Atwater factors (P 4, F 9, C 4). Fibre isn't tracked.
    const rec = {
      name, basis,
      unit_label: basis === 'unit' ? (f.get('unit_label') || '').toString().trim() || '1 portion' : null,
      kcal: Math.round(protein * 4 + fat * 9 + carbs * 4), protein, fat, carbs, fibre: 0
    };
    if (id) {
      if (!updateCustomFood(id, rec)) return fail(400, { formError: 'That food can’t be edited here' });
      return { updated: name };
    }
    addCustomFood({ ...rec, tags: 'custom,my-meal' });
    return { saved: name };
  },

  delFood: async ({ request }) => {
    const f = await request.formData();
    try {
      deleteCustomFood(Number(f.get('id')));
    } catch {
      return fail(400, { formError: 'That food is used by a saved meal, so it was kept' });
    }
    return { ok: true };
  }
};
