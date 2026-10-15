import { getDb } from '../db.js';
import { todayStr, shiftDay } from '../date.js';

export function getProfile() {
  return getDb().prepare('SELECT * FROM profile WHERE id = 1').get();
}

// Sanity bounds, so a fat-fingered value (814 instead of 81.4) can't be stored and passed on to
// the AI as fact. Out-of-range values are ignored rather than clamped — a wrong number shouldn't be
// quietly turned into a different wrong number.
const BOUNDS = {
  age: [14, 100], height_cm: [120, 230], weight_kg: [30, 300], body_fat_pct: [3, 70],
  activity_multiplier: [1.2, 2.4], protein_per_kg: [0.8, 4], fat_g: [20, 200], goal_weight_kg: [30, 300],
  deficit: [-1000, 1500], target_pct_per_week: [0, 2]
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function updateProfile(patch) {
  const cur = getProfile();
  const clean = {};
  for (const [k, v] of Object.entries(patch)) {
    // A legacy date column (see schema). null clears it; a malformed date is ignored rather than stored.
    if (k === 'data_from') {
      if (v === null || v === '' || ISO_DATE.test(v)) clean[k] = v || null;
      continue;
    }
    // Free text: trimmed, and blank clears it.
    if (k === 'name' || k === 'about') { clean[k] = (v ?? '').toString().trim().slice(0, k === 'name' ? 60 : 2000) || null; continue; }
    if (k === 'sex') { if (v === 'male' || v === 'female') clean[k] = v; continue; }
    if (k === 'phase') { if (['cut', 'maintain', 'bulk'].includes(v)) clean[k] = v; continue; }
    if (k === 'setup_done') { clean[k] = v ? 1 : 0; continue; }
    // No target rate is a real answer outside a cut (maintain, bulk), so null is allowed to clear it.
    if (k === 'target_pct_per_week' && v === null) { clean[k] = null; continue; }
    if (k === 'goal_weight_kg' && v === null) { clean[k] = null; continue; }
    const b = BOUNDS[k];
    if (b && (!Number.isFinite(v) || v < b[0] || v > b[1])) continue; // reject, keep the old value
    clean[k] = v;
  }
  const next = { ...cur, ...clean };
  getDb().prepare(`UPDATE profile SET
    sex=@sex, age=@age, height_cm=@height_cm, weight_kg=@weight_kg, body_fat_pct=@body_fat_pct,
    activity_multiplier=@activity_multiplier, phase=@phase, protein_per_kg=@protein_per_kg,
    fat_g=@fat_g, deficit=@deficit, target_pct_per_week=@target_pct_per_week,
    goal_weight_kg=@goal_weight_kg, data_from=@data_from, name=@name, about=@about,
    setup_done=@setup_done, updated_at=datetime('now','localtime') WHERE id=1`).run(next);
  return getProfile();
}

/** The prescription in force on a date, if any. Undated rows count as always in force. */
export function activePrescription(date = todayStr()) {
  return getDb().prepare(
    `SELECT * FROM prescription
      WHERE active = 1
        AND (start_date IS NULL OR start_date <= @d)
        AND (end_date   IS NULL OR end_date   >= @d)
      ORDER BY COALESCE(start_date, '0000-00-00') DESC, id DESC LIMIT 1`
  ).get({ d: date });
}

/**
 * The targets in force on a date: the coach's numbers from the block covering it, nothing else.
 *
 * `has` is false when no block covers the date; every target is then null and pages say so rather
 * than inventing numbers. Within a block, any macro the coach didn't give is null too. Calories are
 * the coach's figure, or worked out from all three macros when only those were given.
 */
export function getTargets(date = todayStr()) {
  const rx = activePrescription(date);
  if (!rx) return { has: false, source: 'none', targetKcal: null, proteinG: null, fatG: null, carbsG: null, prescription: null };
  const P = rx.protein_g ?? null, F = rx.fat_g ?? null, C = rx.carbs_g ?? null;
  const fromMacros = P != null && F != null && C != null ? Math.round(P * 4 + F * 9 + C * 4) : null;
  return {
    has: true, source: 'prescription',
    targetKcal: rx.kcal != null ? Math.round(rx.kcal) : fromMacros,
    proteinG: P, fatG: F, carbsG: C,
    prescription: rx
  };
}

/**
 * When the block a date falls in actually BEGAN.
 *
 * A block can be several rows — one per set of numbers the coach has given inside it — and they
 * share a name. Week numbers, the Progress window and the starting weight all run from the first
 * of them, because the block itself never restarted; only its macros changed.
 */
export function blockSeriesStart(name, fallback = null) {
  if (!name) return fallback;
  const r = getDb().prepare(
    'SELECT MIN(start_date) d FROM prescription WHERE lower(name) = lower(?) AND start_date IS NOT NULL'
  ).get(name);
  return r?.d ?? fallback;
}

/** The far end of the same series — the date the block was always going to run to. */
export function blockSeriesEnd(name, fallback = null) {
  if (!name) return fallback;
  const r = getDb().prepare(
    'SELECT MAX(end_date) d FROM prescription WHERE lower(name) = lower(?) AND end_date IS NOT NULL'
  ).get(name);
  return r?.d ?? fallback;
}

/**
 * The coach changing the numbers part-way through a block.
 *
 * Editing the block in place would be wrong: targets are looked up BY DATE, so raising protein on
 * a block that started three weeks ago rescores all three weeks against the new figure and turns
 * weeks actually hit into weeks apparently missed. The past has to keep the targets it was
 * judged against at the time.
 *
 * So the running block is CLOSED the day before the new numbers take effect, and a new block opens
 * on that date carrying the rest of the original's run. Nothing already logged changes.
 */
export function splitPrescription(rx) {
  const db = getDb();
  const old = db.prepare('SELECT * FROM prescription WHERE id = ?').get(rx.id);
  if (!old) throw new Error('that block no longer exists');
  const from = rx.from;
  if (!from) throw new Error('pick the date the new numbers start');
  if (old.start_date && from <= old.start_date) {
    throw new Error('the new numbers must start after the block did — otherwise just edit it');
  }
  if (old.end_date && from > old.end_date) {
    throw new Error('that date is after the block ends — add a new block instead');
  }
  db.transaction(() => {
    db.prepare('UPDATE prescription SET end_date = ? WHERE id = ?').run(shiftDay(from, -1), old.id);
    savePrescription({
      // The SAME name: a three-month block stays one block when the numbers inside it change.
      name: old.name, source: rx.source || old.source,
      start_date: from, end_date: old.end_date,
      // Legacy flag, carried over as given (every block is the coach's, so 0).
      active: true, managed: rx.managed ?? 0, allowSameName: true,
      // Same block, same programme: new macros don't change what the user trains.
      program_id: old.program_id,
      // Legacy columns, carried over unchanged.
      phase: old.phase, target_pct: old.target_pct, deficit: rx.deficit ?? old.deficit,
      kcal: rx.kcal, protein_g: rx.protein_g, fat_g: rx.fat_g, carbs_g: rx.carbs_g,
      notes: rx.notes
    });
  })();
}

export function savePrescription(rx) {
  const db = getDb();
  const rec = {
    id: rx.id ?? null,
    name: rx.name || null, source: rx.source || null,
    start_date: rx.start_date || null, end_date: rx.end_date || null,
    active: rx.active ? 1 : 0,
    // Legacy flag (see schema); every block is the coach's, so this is 0.
    managed: rx.managed ? 1 : 0,
    kcal: rx.kcal ?? null, protein_g: rx.protein_g ?? null,
    fat_g: rx.fat_g ?? null, carbs_g: rx.carbs_g ?? null,
    notes: rx.notes || null,
    // Set on creation only. Which programme a block runs is changed through setBlockProgramme.
    program_id: rx.program_id ?? null,
    // Legacy columns (see schema). Set on creation only; nothing acts on them now.
    phase: rx.phase ?? null, deficit: rx.deficit ?? null, target_pct: rx.target_pct ?? null
  };
  // Names have to stay unique: the app resolves a block by date, but everything OUTSIDE it —
  // backups, anything reading the export — matches on the name, and two blocks
  // called "Block 1" make those silently ambiguous. Checked excluding the row being saved, so
  // editing a block and keeping its name is fine; only a NEW block can collide.
  //
  // The exception is a CONTINUATION: a coach changing the macros half way through does not start a
  // new block, it carries the same one on with different numbers. Those rows deliberately share
  // a name, and the app reads same-name rows as one block (see blockSeriesStart).
  //
  // Editing a row that is ALREADY part of a series keeps its name too: the clash it would find is
  // its own continuation, not another block.
  if (rec.name && !rx.allowSameName) {
    const own = rec.id ? db.prepare('SELECT name FROM prescription WHERE id = ?').get(rec.id) : null;
    const keepingSeriesName = own && (own.name ?? '').toLowerCase() === rec.name.toLowerCase();
    const clash = !keepingSeriesName && db.prepare(
      'SELECT id FROM prescription WHERE lower(name) = lower(?) AND id IS NOT ? LIMIT 1'
    ).get(rec.name, rec.id);
    if (clash) throw new Error(`a block called "${rec.name}" already exists`);
  }

  return db.transaction(() => {
    if (rec.id) {
      // Moving a block's dates follows the same rule as creating one: it may not quietly share days
      // with another live block (the later start would silently win them).
      if (rec.active) deactivateOverlapping(rec);
      // The legacy columns (managed, phase, deficit, target_pct) are not in this UPDATE: editing a
      // block leaves them as they were.
      db.prepare(`UPDATE prescription SET name=@name, source=@source, start_date=@start_date,
        end_date=@end_date, active=@active, kcal=@kcal, protein_g=@protein_g, fat_g=@fat_g,
        carbs_g=@carbs_g, notes=@notes WHERE id=@id`).run(rec);
      return rec.id;
    }
    if (rec.active) deactivateOverlapping(rec);
    return db.prepare(`INSERT INTO prescription
      (name, source, start_date, end_date, active, managed, kcal, protein_g, fat_g, carbs_g, notes, program_id, phase, deficit, target_pct)
      VALUES (@name, @source, @start_date, @end_date, @active, @managed, @kcal, @protein_g, @fat_g, @carbs_g, @notes, @program_id, @phase, @deficit, @target_pct)`
    ).run(rec).lastInsertRowid;
  })();
}

/**
 * Only deactivate blocks this one actually COLLIDES with. Planning the next block in advance must
 * not silently switch off the block still running -- the rest of it would quietly lose its
 * targets. Two blocks that don't share any dates can both stay live; they're
 * resolved by date, so there's nothing ambiguous about it. The block's own series never collides
 * with itself (its rows don't share dates anyway, but a name match makes that certain).
 */
function deactivateOverlapping(rec) {
  getDb().prepare(
    `UPDATE prescription SET active = 0
      WHERE id IS NOT @id
        AND (@name IS NULL OR name IS NULL OR lower(name) <> lower(@name))
        AND (start_date IS NULL OR @end   IS NULL OR start_date <= @end)
        AND (end_date   IS NULL OR @start IS NULL OR end_date   >= @start)`
  ).run({ id: rec.id, name: rec.name, start: rec.start_date, end: rec.end_date });
}

/** "Use" / "Turn off" in Settings. Turning a block on switches off only the blocks it overlaps. */
export function setPrescriptionActive(id, active) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM prescription WHERE id = ?').get(id);
  if (!row) return 0;
  return db.transaction(() => {
    if (active) deactivateOverlapping(row);
    return db.prepare('UPDATE prescription SET active = ? WHERE id = ?').run(active ? 1 : 0, id).changes;
  })();
}

export function listPrescriptions() {
  return getDb().prepare('SELECT * FROM prescription ORDER BY active DESC, id DESC').all();
}

export function deletePrescription(id) {
  return getDb().prepare('DELETE FROM prescription WHERE id = ?').run(id).changes;
}

