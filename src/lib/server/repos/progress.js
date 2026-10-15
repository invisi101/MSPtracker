import { getDb } from '../db.js';
import { todayStr } from '../date.js';
import { activePrescription, getTargets, blockSeriesStart, blockSeriesEnd } from './profile.js';
import { removeUpload } from '../uploads.js';

// --- Weigh-ins ---
export function addWeighin(date, kg) {
  getDb().prepare(`INSERT INTO weighins (date, weight_kg) VALUES (?,?)
    ON CONFLICT(date) DO UPDATE SET weight_kg=excluded.weight_kg`).run(date, kg);
  syncProfileWeight();
}

/**
 * Keep profile.weight_kg on the 7-day average.
 *
 * That field is the weight the AI coach and chef are told the user is. Left on the figure entered
 * when the profile was created, it would go further out of date with every kilo lost.
 *
 * The 7-day average, not the last reading — a single heavy morning shouldn't move it. With no
 * weigh-ins at all the stored value is left alone, since a hand-entered starting weight is better
 * than nothing.
 */
export function syncProfileWeight() {
  const db = getDb();
  const roll = rollingAverages(getWeighins());
  if (!roll.length) return null;
  const kg = Math.round(roll[roll.length - 1].avg * 10) / 10;
  db.prepare('UPDATE profile SET weight_kg = ? WHERE id = 1').run(kg);
  return kg;
}
export function getWeighins() { return getDb().prepare('SELECT * FROM weighins ORDER BY date').all(); }
export function latestWeighin() { return getDb().prepare('SELECT * FROM weighins ORDER BY date DESC LIMIT 1').get(); }
export function deleteWeighin(id) {
  getDb().prepare('DELETE FROM weighins WHERE id=?').run(id);
  syncProfileWeight();   // removing a reading changes the 7-day average
}

/** Trailing 7-day rolling average for each weigh-in date (smooths out day-to-day water swings). */
export function rollingAverages(weighins) {
  const out = [];
  for (let i = 0; i < weighins.length; i++) {
    const end = new Date(weighins[i].date);
    const start = new Date(end); start.setDate(start.getDate() - 6);
    const window = weighins.filter((w) => { const d = new Date(w.date); return d >= start && d <= end; });
    const avg = window.reduce((s, w) => s + w.weight_kg, 0) / window.length;
    out.push({ date: weighins[i].date, avg: +avg.toFixed(2) });
  }
  return out;
}

/**
 * Weekly average change: this week's 7-day average vs the 7-day average from ~a week ago.
 *
 * The comparison point must be the NEWEST weigh-in at least 7 days back. Scanning forward
 * (Array.find on a date-ascending list) returns the OLDEST one instead, so the window grows
 * with every day of the diet and reports the whole-diet average — a two-week stall would still
 * read as on target.
 */
export function weeklyTrend(weighins) {
  if (weighins.length < 8) return null;
  const roll = rollingAverages(weighins);
  const last = roll[roll.length - 1];
  const gapDays = (r) => (new Date(last.date) - new Date(r.date)) / 86400000;
  let prev = null;
  for (let i = roll.length - 1; i >= 0; i--) {
    if (gapDays(roll[i]) >= 7) { prev = roll[i]; break; }
  }
  if (!prev) return null;
  const days = (new Date(last.date) - new Date(prev.date)) / 86400000;
  const perWeek = ((last.avg - prev.avg) / days) * 7;
  return { fromAvg: prev.avg, toAvg: last.avg, kgPerWeek: +perWeek.toFixed(2), spanDays: Math.round(days) };
}

// --- Measurements ---
// The nine circumference sites the Progress page offers.
export const MEASURE_SITES = [
  'Chest',
  'Arm — left',
  'Arm — right',
  'Stomach — above navel',
  'Stomach — at navel',
  'Stomach — below navel',
  'Hips',
  'Thigh — left',
  'Thigh — right'
];
/** Re-measuring a site on the same day REPLACES that day's value rather than adding a second
 *  row. The table has no UNIQUE(date,site) (unlike weighins), so without this a correction would
 *  leave two rows and latestMeasurements()' GROUP BY would pick between them arbitrarily. */
export function addMeasurement(date, site, cm) {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM measurements WHERE date=? AND site=?').run(date, site);
    db.prepare('INSERT INTO measurements (date, site, value_cm) VALUES (?,?,?)').run(date, site, cm);
  })();
}
export function getMeasurements() { return getDb().prepare('SELECT * FROM measurements ORDER BY date DESC, site').all(); }
export function latestMeasurements() {
  return getDb().prepare(`SELECT site, value_cm, date FROM measurements m
    WHERE date = (SELECT MAX(date) FROM measurements WHERE site=m.site) GROUP BY site`).all();
}
export function deleteMeasurement(id) { getDb().prepare('DELETE FROM measurements WHERE id=?').run(id); }

// --- Photos ---
export function addPhoto(date, path) { getDb().prepare('INSERT INTO photos (date, path) VALUES (?,?)').run(date, path); }
export function getPhotos() { return getDb().prepare('SELECT * FROM photos ORDER BY date DESC, id DESC').all(); }
export function getPhoto(id) { return getDb().prepare('SELECT * FROM photos WHERE id=?').get(id); }
export function deletePhoto(id) {
  const row = getDb().prepare('SELECT path FROM photos WHERE id=?').get(id);
  getDb().prepare('DELETE FROM photos WHERE id=?').run(id);
  if (row) removeUpload(row.path);   // otherwise the file leaks on disk forever
}

/**
 * Each logged day as a percentage of that day's target.
 *
 * The target is looked up per date via getTargets(date), not read from one table: it has to be
 * whatever the coach's numbers were that day. Days no block covers have nothing to be scored
 * against, so they are left out rather than counted as a miss.
 *
 * As a percentage rather than raw grams, the 100% reference line is flat. Plotting raw values
 * would need a stepped target line that jumps at every block boundary.
 */
export function dailyAdherence() {
  const rows = getDb().prepare(
    `SELECT date, SUM(kcal) kcal, SUM(protein) protein, SUM(fat) fat, SUM(carbs) carbs
       FROM food_log GROUP BY date ORDER BY date`
  ).all();

  const pct = (have, target) => (target > 0 ? Math.round((have / target) * 1000) / 10 : null);
  return rows.flatMap((r) => {
    const t = getTargets(r.date);
    if (!t.has) return [];
    return [{
      date: r.date,
      kcal: pct(r.kcal, t.targetKcal),
      protein: pct(r.protein, t.proteinG),
      fat: pct(r.fat, t.fatG),
      carbs: pct(r.carbs, t.carbsG)
    }];
  });
}

/**
 * The block the user is running, in the shape the Progress page plots a plan line from.
 *
 * The app stores the block (dates, macros) on `prescription` and the goal weight on the profile, so
 * this joins the two. The block's START WEIGHT isn't stored anywhere — it is taken from the
 * 7-day average on the day the block began, falling back to the nearest weigh-in. That is truer
 * than a number typed in weeks ago: the plan line should start from where the user actually was.
 */
export function blockGoal() {
  const db = getDb();
  // The block covering today (date-bounded — "active" alone is not enough); once it has run out,
  // the last one there was. Progress is framed on a block from its first day to its last, so a
  // finished block stays readable rather than silently widening to "everything" the day after.
  const today = todayStr();
  const p = activePrescription(today) ?? db.prepare(
    `SELECT * FROM prescription WHERE active = 1 AND start_date IS NOT NULL
      ORDER BY start_date DESC, id DESC LIMIT 1`
  ).get();
  const goalWeightKg = db.prepare('SELECT goal_weight_kg g FROM profile WHERE id = 1').get()?.g ?? null;
  if (!p || !p.start_date || !p.end_date) {
    return { hasBlock: false, name: null, goalWeightKg, startDate: null, endDate: null, startWeightKg: null };
  }

  // When the block BEGAN, which is not this row's start date if the numbers were changed
  // part-way through — those rows share a name and are one block.
  const startDate = blockSeriesStart(p.name, p.start_date);
  const endDate = blockSeriesEnd(p.name, p.end_date);

  const roll = rollingAverages(getWeighins());
  // The rolling point on or after the block start; if the block began before any weigh-in, the
  // first one there is.
  const at = roll.find((r) => r.date >= startDate) ?? roll[0] ?? null;

  return {
    hasBlock: true,
    name: p.name,
    source: p.source,
    startDate,
    endDate,
    ended: endDate < today,
    goalWeightKg,
    startWeightKg: at?.avg ?? null
  };
}
