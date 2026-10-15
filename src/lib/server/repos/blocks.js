// Creating a block: a date range with the coach's daily numbers and the workouts it runs.
import { getDb } from '../db.js';
import { shiftDay } from '../date.js';
import { savePrescription } from './profile.js';
import { setBlockProgramme } from './training.js';

/** The next free "Block N" name. Block names must be unique. */
export function nextBlockName() {
  const names = getDb().prepare('SELECT name FROM prescription').all().map((r) => (r.name ?? '').toLowerCase());
  let n = 1;
  while (names.includes(`block ${n}`)) n += 1;
  return `Block ${n}`;
}

/** Any live block whose dates cross these. Open-ended blocks (no dates) count as covering. */
export function overlapping(startDate, endDate, excludeId = null) {
  return getDb().prepare(
    `SELECT id, name, start_date, end_date FROM prescription
      WHERE active = 1 AND id IS NOT ?
        AND (start_date IS NULL OR start_date <= @end)
        AND (end_date IS NULL OR end_date >= @start)
      ORDER BY start_date LIMIT 1`
  ).get(excludeId, { start: startDate, end: endDate });
}

const num = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

class Refused extends Error { constructor(result) { super(result.reason); this.result = result; } }

/**
 * Create a block from the coach's numbers, all or nothing.
 * input: { name, startDate, endDate, shortenBlockId?, kcal, protein_g, fat_g, carbs_g, source, notes, presetId? }
 * shortenBlockId ends an overlapping earlier block the day before this one starts. presetId gives the
 * block a copy of one of the user's saved workouts; without it the block carries on with the
 * workouts running now, or has none until some are added in Settings.
 */
export function createCoachBlock(input) {
  const db = getDb();
  const { name, startDate, endDate, shortenBlockId = null, presetId = null } = input;
  if (!startDate || !endDate) return { ok: false, reason: 'Pick a start and an end date.' };
  if (endDate < startDate) return { ok: false, reason: 'The end date is before the start date.' };
  const m = { kcal: num(input.kcal), protein_g: num(input.protein_g), fat_g: num(input.fat_g), carbs_g: num(input.carbs_g) };
  if (m.kcal == null && (m.protein_g == null || m.fat_g == null || m.carbs_g == null)) {
    return { ok: false, reason: 'Enter the calories, or all three macros so the calories can be worked out.' };
  }
  // better-sqlite3 rolls back only when the transaction throws, so refusals after a write throw.
  const refuse = (r) => { throw new Refused(r); };
  try {
    return db.transaction(() => {
      if (shortenBlockId) {
        const old = db.prepare('SELECT * FROM prescription WHERE id = ?').get(shortenBlockId);
        if (!old) refuse({ ok: false, reason: 'The block to shorten no longer exists.' });
        if (!old.start_date || old.start_date >= startDate) {
          refuse({ ok: false, reason: `"${old.name}" starts on or after ${startDate}, so it can't be ended before it.` });
        }
        db.prepare('UPDATE prescription SET end_date = ? WHERE id = ?').run(shiftDay(startDate, -1), old.id);
      }
      const clash = overlapping(startDate, endDate);
      if (clash) refuse({ ok: false, reason: `Those dates overlap "${clash.name ?? 'another block'}".` });
      const id = savePrescription({
        name: (name || '').trim() || nextBlockName(), source: (input.source || '').trim() || 'Coach',
        start_date: startDate, end_date: endDate, active: 1, managed: 0, ...m,
        notes: (input.notes || '').trim()
      });
      const programId = setBlockProgramme(id, { presetId: num(presetId), isNew: true });
      return { ok: true, id: Number(id), programId: programId ? Number(programId) : null };
    })();
  } catch (e) {
    if (e instanceof Refused) return e.result;
    if (/already exists/.test(e.message)) return { ok: false, reason: e.message[0].toUpperCase() + e.message.slice(1) + '.' };
    throw e;
  }
}
