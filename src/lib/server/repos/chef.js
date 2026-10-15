// Chef — deterministic meal-plan assembly from the recipe library, to hit the user's daily macros.
// The day's shape (breakfast or not, how many meals) comes from Settings; every meal is a recipe,
// all recipe portions scale together, and protein shakes / Greek yoghurt / fruit fill the gaps.
import { RECIPES } from '../seed/recipes.js';
import { getTargets } from './profile.js';
import { getDb } from '../db.js';

// Fixed filler items (up to 2×30 g-protein shakes, plus fruit & Greek yoghurt).
const FILLERS = {
  shake:   { name: 'Whey protein shake', detail: '1 big scoop in water', kcal: 140, protein_g: 30, fat_g: 2, carbs_g: 4, kind: 'shake' },
  yoghurt: { name: 'Greek yoghurt (150 g)', detail: 'plain, 2%', kcal: 90, protein_g: 15, fat_g: 4, carbs_g: 6, kind: 'yoghurt' },
  rice:    { name: 'Rice (150 g cooked)', detail: 'white / genmai', kcal: 234, protein_g: 4, fat_g: 0, carbs_g: 56, kind: 'carb' },
  banana:  { name: 'Banana', kcal: 105, protein_g: 1, fat_g: 0, carbs_g: 27, kind: 'fruit' },
  berries: { name: 'Berries (150 g)', kcal: 85, protein_g: 1, fat_g: 0, carbs_g: 20, kind: 'fruit' },
  apple:   { name: 'Apple', kcal: 95, protein_g: 0, fat_g: 0, carbs_g: 25, kind: 'fruit' },
  nuts:    { name: 'Almonds (15 g)', kcal: 87, protein_g: 3.2, fat_g: 7.5, carbs_g: 3.3, kind: 'fat' },
  oil:     { name: 'Olive oil (1 tsp)', detail: 'on the veg or salad', kcal: 40, protein_g: 0, fat_g: 4.5, carbs_g: 0, kind: 'fat' }
};
const FRUIT = [FILLERS.banana, FILLERS.berries, FILLERS.apple];

const M = (r) => ({ kcal: r.kcal || 0, protein_g: r.protein_g || 0, fat_g: r.fat_g || 0, carbs_g: r.carbs_g || 0 });
const addM = (a, b) => ({ kcal: a.kcal + b.kcal, protein_g: a.protein_g + b.protein_g, fat_g: a.fat_g + b.fat_g, carbs_g: a.carbs_g + b.carbs_g });
const roundM = (m) => ({ kcal: Math.round(m.kcal), protein_g: Math.round(m.protein_g), fat_g: Math.round(m.fat_g), carbs_g: Math.round(m.carbs_g) });
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

function pickMain(pool, avoidIds, avoidProtein) {
  let cand = pool.filter((r) => !avoidIds.includes(r.id));
  if (avoidProtein) {
    const diff = cand.filter((r) => r.protein_source !== avoidProtein);
    if (diff.length) cand = diff;
  }
  return cand.length ? rnd(cand) : (pool.length ? rnd(pool) : null);
}

function fill(base, T) {
  const items = [];
  let cur = { ...base };
  const cnt = (k) => items.filter((x) => x.kind === k).length;
  const push = (f) => { items.push(f); cur = addM(cur, M(f)); };
  const overKcal = () => cur.kcal > T.targetKcal + 150;   // loose ceiling; fat isn't targeted
  // protein → up to 2 shakes, then yoghurt if still short
  const nShakes = T.proteinG == null ? 0 : Math.max(0, Math.min(2, Math.round((T.proteinG - cur.protein_g) / 30)));
  for (let i = 0; i < nShakes; i++) push(FILLERS.shake);
  if (T.proteinG != null && T.proteinG - cur.protein_g > 8 && !overKcal()) push(FILLERS.yoghurt);
  // carbs → rice sides then fruit, until the carb target is met
  let g = 0;
  while (T.carbsG != null && T.carbsG - cur.carbs_g > 30 && cnt('carb') < 2 && !overKcal() && g++ < 3) push(FILLERS.rice);
  g = 0;
  while (T.carbsG != null && T.carbsG - cur.carbs_g > 12 && cnt('fruit') < 2 && !overKcal() && g++ < 3) push(rnd(FRUIT));
  // The fat target is treated as a floor to reach, not a leftover. Without this step nearly every
  // generated day comes in well under it.
  g = 0;
  while (T.fatG != null && T.fatG - cur.fat_g > 4 && cnt('fat') < 4 && !overKcal() && g++ < 5) {
    push(T.fatG - cur.fat_g >= 7 ? FILLERS.nuts : FILLERS.oil);
  }
  return { items, total: cur };
}

// Protein and fat are treated as FLOORS; carbs and total kcal are the flex. Without the fat term
// the picker would choose days sitting well under the fat target.
function score(total, T) {
  const P = T.proteinG, F = T.fatG, C = T.carbsG;
  return (
    (P == null ? 0 : 2.0 * Math.abs(total.protein_g - P) + (total.protein_g < P - 5 ? 40 : 0)) +
    (C == null ? 0 : 0.6 * Math.abs(total.carbs_g - C) + (total.carbs_g < C - 20 ? 20 : 0)) +
    (F == null ? 0 : 1.5 * Math.max(0, F - total.fat_g) + (total.fat_g < F - 5 ? 40 : 0)) +
    0.12 * Math.abs(total.kcal - T.targetKcal) +
    (total.kcal > T.targetKcal + 250 ? (total.kcal - T.targetKcal - 250) * 0.6 : 0)
  );
}

// ---- The shape of the day ----------------------------------------------------------------------
export const MEALS_MIN = 2, MEALS_MAX = 6;
const DEFAULT_SHAPE = { breakfast: false, meals: 2 };

export function getMealShape() {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'chef_meals'").get();
  let s = {};
  try { s = JSON.parse(row?.value ?? '{}'); } catch { s = {}; }
  const meals = Math.min(MEALS_MAX, Math.max(MEALS_MIN, Math.round(Number(s.meals) || DEFAULT_SHAPE.meals)));
  return { breakfast: s.breakfast ?? DEFAULT_SHAPE.breakfast, meals };
}

export function setMealShape({ breakfast, meals }) {
  const shape = { breakfast: !!breakfast, meals: Math.min(MEALS_MAX, Math.max(MEALS_MIN, Math.round(Number(meals) || 2))) };
  getDb().prepare("INSERT INTO settings (key, value) VALUES ('chef_meals', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(JSON.stringify(shape));
  return shape;
}

/**
 * The meals in time order. Dinner always; breakfast if chosen; lunch once there is room; every
 * meal beyond those is a snack, spread between the main meals rather than piled at the end.
 *   breakfast, 3 → Breakfast, Lunch, Dinner      no breakfast, 3 → Lunch, Snack, Dinner
 *   breakfast, 5 → Breakfast, Snack, Lunch, Snack, Dinner
 */
export function mealSlots({ breakfast, meals }) {
  const core = breakfast ? (meals >= 3 ? ['Breakfast', 'Lunch', 'Dinner'] : ['Breakfast', 'Dinner']) : ['Lunch', 'Dinner'];
  const snacks = meals - core.length;
  const out = [];
  // per[i] = snacks after core meal i. Round-robin from the first gap, so the between-meal gaps
  // fill before the evening one (the last).
  const per = core.map(() => 0);
  for (let k = 0; k < snacks; k++) per[k % core.length]++;
  core.forEach((c, i) => { out.push(c); for (let k = 0; k < per[i]; k++) out.push('Snack'); });
  return out;
}

// Every recipe portion in a plan is scaled by one factor, in quarter servings, so a five-meal day
// isn't five full meals' worth of food.
const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5];
const scaleM = (m, f) => ({ kcal: m.kcal * f, protein_g: m.protein_g * f, fat_g: m.fat_g * f, carbs_g: m.carbs_g * f });

/** Build a day's plan. tier 'simple'|'fancy'; keepDinnerId fixes the dinner; avoidIds discourages repeats. */
export function generatePlan({ tier = 'simple', keepDinnerId = null, avoidIds = [] } = {}) {
  const T = getTargets();
  if (!T.has || T.targetKcal == null) return null;
  const shape = getMealShape();
  const slots = mealSlots(shape);
  const usable = (r) => r.protein_source && r.protein_source !== 'none' && r.japan_ok !== false && r.kcal;
  const mains = RECIPES.filter((r) => ['lunch', 'dinner', 'either'].includes(r.meal) && usable(r));
  const simple = mains.filter((r) => r.tier === 'simple');
  const fancy = mains.filter((r) => r.tier === 'fancy');
  const breakfasts = RECIPES.filter((r) => r.meal === 'breakfast' && usable(r));
  const snackPool = RECIPES.filter((r) => r.meal === 'snack' && usable(r));
  const pool = {
    Dinner: tier === 'fancy' ? (fancy.length ? fancy : simple) : simple,   // fancy = the effort dinner
    Lunch: simple,                                                          // lunch stays quick either way
    Breakfast: breakfasts.filter((r) => r.tier === 'simple').length ? breakfasts.filter((r) => r.tier === 'simple') : breakfasts,
    Snack: snackPool.filter((r) => r.kcal <= 450).length ? snackPool.filter((r) => r.kcal <= 450) : snackPool
  };

  // Collect the best-scoring version of each distinct combination, then pick randomly among the
  // top few — near-optimal macros AND variety on repeat taps.
  const byCombo = {};
  for (let a = 0; a < 200; a++) {
    const dinner = keepDinnerId ? mains.find((r) => r.id === keepDinnerId) : pickMain(pool.Dinner, avoidIds);
    if (!dinner) continue;
    const used = [dinner.id];
    const chosen = [];
    let ok = true;
    for (const s of slots) {
      if (s === 'Dinner') { chosen.push(dinner); continue; }
      const r = pickMain(pool[s], [...used, ...avoidIds], s === 'Lunch' ? dinner.protein_source : null);
      if (!r) { ok = false; break; }
      used.push(r.id); chosen.push(r);
    }
    if (!ok) continue;
    const base = chosen.reduce((m, r) => addM(m, M(r)), { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 });
    for (const portion of PORTIONS) {
      const { items, total } = fill(scaleM(base, portion), T);
      const sc = score(total, T) + (portion === 1 ? 0 : 5);   // a whole serving, all else equal
      const key = chosen.map((r) => r.id).join('-');
      if (!byCombo[key] || sc < byCombo[key].sc) byCombo[key] = { sc, chosen, portion, items, total };
    }
  }
  const cands = Object.values(byCombo).sort((a, b) => a.sc - b.sc);
  if (!cands.length) return null;
  const best = cands[Math.floor(Math.random() * Math.min(6, cands.length))];

  const p = best.portion;
  const meals = [
    ...slots.map((slot, i) => {
      const r = best.chosen[i];
      return { slot, portion: p, recipe: p === 1 ? r : { ...r, ...roundM(scaleM(M(r), p)) } };
    }),
    ...best.items.map((f) => ({ slot: 'Extra', filler: f }))
  ];
  const total = roundM(best.total);
  const target = { kcal: T.targetKcal, protein_g: T.proteinG, fat_g: T.fatG, carbs_g: T.carbsG };
  const d = (k) => (target[k] == null ? null : total[k] - target[k]);
  const delta = { kcal: d('kcal'), protein_g: d('protein_g'), fat_g: d('fat_g'), carbs_g: d('carbs_g') };
  const dinner = best.chosen[slots.indexOf('Dinner')];
  return { tier, shape, meals, total, target, delta, dinnerId: dinner.id };
}

// --- Ask-the-chef message history ---
export function getChefMessages(limit = 40) {
  return getDb().prepare('SELECT * FROM chef_messages ORDER BY id DESC LIMIT ?').all(limit).reverse();
}
export function addChefMessage(role, content) {
  getDb().prepare('INSERT INTO chef_messages (role, content) VALUES (?,?)').run(role, content);
}
export function clearChefMessages() { getDb().prepare('DELETE FROM chef_messages').run(); }
