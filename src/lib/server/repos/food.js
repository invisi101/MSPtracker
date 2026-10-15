import { getDb } from '../db.js';

export function searchFoods(q, limit = 25) {
  const db = getDb();
  if (!q || !q.trim()) {
    return db.prepare('SELECT * FROM foods ORDER BY name LIMIT ?').all(limit);
  }
  const term = `%${q.trim()}%`;
  return db.prepare(
    `SELECT * FROM foods WHERE name LIKE ? OR name_ja LIKE ? OR tags LIKE ? ORDER BY
       CASE WHEN name LIKE ? THEN 0 ELSE 1 END, name LIMIT ?`
  ).all(term, term, term, `${q.trim()}%`, limit);
}

export function getFood(id) {
  return getDb().prepare('SELECT * FROM foods WHERE id = ?').get(id);
}

export function addCustomFood(f) {
  const r = getDb().prepare(
    `INSERT INTO foods (name, basis, unit_label, kcal, protein, fat, carbs, fibre, tags, source)
     VALUES (@name, @basis, @unit_label, @kcal, @protein, @fat, @carbs, @fibre, @tags, @source)`
  ).run({
    unit_label: null, fibre: 0, tags: 'custom', source: 'custom', basis: '100g', ...f
  });
  return r.lastInsertRowid;
}

export function listCustomFoods() {
  return getDb().prepare("SELECT * FROM foods WHERE source = 'custom' ORDER BY name").all();
}

/** exceptId lets a food keep its own name while being edited. */
export function findFoodByName(name, exceptId = null) {
  return getDb()
    .prepare('SELECT * FROM foods WHERE lower(name) = lower(?) AND id IS NOT ? LIMIT 1')
    .get((name || '').trim(), exceptId);
}

/**
 * Edit one of the user's own foods. Existing log entries are left alone on purpose —
 * they hold what was actually eaten, so a corrected recipe must not rewrite history.
 */
export function updateCustomFood(id, f) {
  return getDb().prepare(
    `UPDATE foods SET name=@name, basis=@basis, unit_label=@unit_label, kcal=@kcal,
       protein=@protein, fat=@fat, carbs=@carbs, fibre=@fibre
     WHERE id=@id AND source='custom'`
  ).run({ id, ...f }).changes;
}

/**
 * Delete one of the user's own foods. Past log entries keep their copied name and macros,
 * so history stays intact — only the link back to the (now gone) food is dropped.
 * Curated foods are not deletable from here.
 */
export function deleteCustomFood(id) {
  const db = getDb();
  return db.transaction(() => {
    const inMeal = db.prepare('SELECT COUNT(*) n FROM meal_items WHERE food_id = ?').get(id).n;
    if (inMeal) throw new Error('food is used by a saved meal');
    db.prepare('UPDATE food_log SET food_id = NULL WHERE food_id = ?').run(id);
    return db.prepare("DELETE FROM foods WHERE id = ? AND source = 'custom'").run(id).changes;
  })();
}

/** Scale a food's macros by quantity. 100g basis → qty is grams; unit basis → qty is #units. */
export function macrosFor(food, qty) {
  const factor = food.basis === 'unit' ? qty : qty / 100;
  return {
    kcal: food.kcal * factor,
    protein: food.protein * factor,
    fat: food.fat * factor,
    carbs: food.carbs * factor,
    fibre: (food.fibre || 0) * factor
  };
}

export function logFoodById({ date, slot, foodId, qty }) {
  const food = getFood(foodId);
  if (!food) throw new Error('food not found');
  const m = macrosFor(food, qty);
  return getDb().prepare(
    `INSERT INTO food_log (date, slot, food_id, name, qty, kcal, protein, fat, carbs, fibre, source)
     VALUES (@date, @slot, @food_id, @name, @qty, @kcal, @protein, @fat, @carbs, @fibre, 'db')`
  ).run({ date, slot, food_id: foodId, name: food.name, qty, ...round(m) }).lastInsertRowid;
}

export function logManual({ date, slot, name, qty = 1, kcal, protein = 0, fat = 0, carbs = 0, fibre = 0, source = 'manual' }) {
  return getDb().prepare(
    `INSERT INTO food_log (date, slot, food_id, name, qty, kcal, protein, fat, carbs, fibre, source)
     VALUES (@date, @slot, NULL, @name, @qty, @kcal, @protein, @fat, @carbs, @fibre, @source)`
  ).run({ date, slot, name, qty, ...round({ kcal, protein, fat, carbs, fibre }), source }).lastInsertRowid;
}

export function getDayLog(date) {
  // basis/unit_label ride along from the source food so an entry can say what its qty MEANS
  // ("200 g", "2 scoops") and be re-scaled on edit. Null for ad-hoc entries, which have no source.
  return getDb().prepare(
    `SELECT fl.*, f.basis, f.unit_label
       FROM food_log fl LEFT JOIN foods f ON f.id = fl.food_id
      WHERE fl.date = ? ORDER BY fl.id`
  ).all(date);
}

export function getLogEntry(id) {
  return getDb().prepare('SELECT * FROM food_log WHERE id = ?').get(id);
}

/**
 * Re-scale a logged entry to a new amount, from the food it came from.
 *
 * Same path logging uses, which matters: it takes the food's STORED kcal rather than recomputing
 * 4/4/9. Deriving would inflate anything whose label already discounts fibre — almonds by 43 kcal
 * per 100 g.
 */
export function updateLogQty(id, qty) {
  const e = getLogEntry(id);
  if (!e || !e.food_id) return 0;
  const food = getFood(e.food_id);
  if (!food) return 0;
  const m = macrosFor(food, qty);
  return getDb().prepare(
    `UPDATE food_log SET qty=@qty, kcal=@kcal, protein=@protein, fat=@fat, carbs=@carbs, fibre=@fibre
      WHERE id=@id`
  ).run({ id, qty, ...round(m) }).changes;
}

export function dayTotals(date) {
  return getDb().prepare(
    `SELECT COALESCE(SUM(kcal),0) kcal, COALESCE(SUM(protein),0) protein,
            COALESCE(SUM(fat),0) fat, COALESCE(SUM(carbs),0) carbs, COALESCE(SUM(fibre),0) fibre
     FROM food_log WHERE date = ?`
  ).get(date);
}

export function deleteLog(id) {
  getDb().prepare('DELETE FROM food_log WHERE id = ?').run(id);
}

/**
 * Correct a single logged entry in place. Only the eaten macros are touched — the
 * link back to any source food and the original qty are left alone, so this stays a
 * record of what was actually eaten. kcal is derived (Atwater 4/9/4), never passed in.
 */
export function updateLog(id, { name, kcal = null, protein = 0, fat = 0, carbs = 0 }) {
  return getDb().prepare(
    `UPDATE food_log SET name=@name, kcal=@kcal, protein=@protein, fat=@fat, carbs=@carbs
     WHERE id=@id`
  ).run({
    id, name,
    // Fall back to Atwater only when no kcal is supplied.
    kcal: kcal != null ? Math.round(kcal) : Math.round(protein * 4 + fat * 9 + carbs * 4),
    protein: r1(protein), fat: r1(fat), carbs: r1(carbs)
  }).changes;
}

const r1 = (n) => Math.round(n * 10) / 10;
const round = (m) => ({ kcal: Math.round(m.kcal), protein: r1(m.protein), fat: r1(m.fat), carbs: r1(m.carbs), fibre: r1(m.fibre) });
