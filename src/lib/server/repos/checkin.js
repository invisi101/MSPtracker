import { getDb } from '../db.js';
import { todayStr, shiftDay } from '../date.js';
import { activePrescription, getTargets, blockSeriesStart } from './profile.js';
import { daysFor } from './training.js';

/**
 * The numbers a coach's weekly tracker asks for each Saturday.
 *
 * The week is SUNDAY to SATURDAY, matching the sheet — not a trailing 7 days. Those coincide
 * only on a Saturday, and the user reports on Saturday evening once the day's food is logged, so
 * anchoring to the calendar week is what keeps the app and the sheet in agreement all week.
 *
 * Averages are over DAYS THAT HAVE FOOD LOGGED, not over 7. A day the user forgot to log is absent
 * data, not a zero-calorie day; counting it as zero would drag the average down and report an
 * adherence failure that never happened. `daysLogged` is returned so the gap stays visible
 * rather than hiding inside the average.
 *
 * Targets come from getTargets(date), so the week is scored against the block that actually
 * covers it. A week no block covers has no targets, so its adherence figures are null.
 */
/**
 * The Sunday-to-Saturday week containing a date, matching the coach's tracker.
 *
 * getDay() is 0 for Sunday, and the date is parsed at LOCAL midnight — 'YYYY-MM-DD' on its own is
 * UTC, which lands on the previous day anywhere west of it.
 */
function calendarWeek(date) {
  const dow = new Date(date + 'T00:00:00').getDay();
  const start = shiftDay(date, -dow);
  return { start, end: shiftDay(start, 6), dow };
}

/**
 * The tracker's measurement block, in the sheet's own order and wording — these labels are what
 * the coach's sheet calls the rows, NOT what the app calls the sites, so the list pastes straight
 * down the column. `Weight` is the week's AVERAGE, which is the row the coach reads; the rest come
 * from the round of the tape.
 */
const TRACKER_SITES = [
  ['Chest', 'Chest'],
  ['R arm', 'Arm — right'],
  ['L arm', 'Arm — left'],
  ['2" above', 'Stomach — above navel'],
  ['Belly', 'Stomach — at navel'],
  ['2" below', 'Stomach — below navel'],
  ['Hips', 'Hips'],
  ['R thigh', 'Thigh — right'],
  ['L thigh', 'Thigh — left']
];

export function checkInWeek(date = todayStr()) {
  const db = getDb();
  const { start, end } = calendarWeek(date);
  // Averages stop at TODAY, never at the week's end. Users often plan meals a day or two ahead, and a
  // planned day is not an eaten day — counting it would fold food not yet eaten into the average
  // the user steers by, and into the figure sent to the coach. On Saturday the two coincide anyway.
  const upto = date < end ? date : end;

  const days = db.prepare(
    `SELECT date, SUM(kcal) kcal, SUM(protein) protein FROM food_log
      WHERE date BETWEEN ? AND ? GROUP BY date HAVING SUM(kcal) > 0 ORDER BY date`
  ).all(start, upto);

  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const avgKcal = mean(days.map((d) => d.kcal));
  const avgProtein = mean(days.map((d) => d.protein));

  const weights = db.prepare('SELECT weight_kg FROM weighins WHERE date BETWEEN ? AND ?')
    .all(start, upto).map((w) => w.weight_kg);
  const avgWeight = mean(weights);

  // Scored against the week's END — the block being reported on.
  const t = getTargets(end);
  const pct = (have, target) => (have != null && target > 0 ? Math.round((have / target) * 100) : null);

  // Days that have actually happened. A Thursday has no Friday to be missing, so "3 days not
  // logged" mid-week would be counting the future as a failure.
  const elapsed = Math.min(7, Math.round(
    (new Date(date + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000) + 1);

  // The most recent full round on or before the week's end — never a future one, so previewing an
  // earlier week shows the tape as it stood then. The date travels with it so the card can say so
  // when the round wasn't taken on the day.
  const measDate = db.prepare('SELECT MAX(date) d FROM measurements WHERE date <= ?').get(upto)?.d ?? null;
  const bySite = Object.fromEntries(
    (measDate ? db.prepare('SELECT site, value_cm FROM measurements WHERE date = ?').all(measDate) : [])
      .map((r) => [r.site, r.value_cm])
  );

  return {
    start,
    end,
    measDate,
    tracker: [
      { label: 'Weight', value: avgWeight == null ? null : +avgWeight.toFixed(2) },
      ...TRACKER_SITES.map(([label, site]) => ({ label, value: bySite[site] ?? null }))
    ],
    daysElapsed: elapsed,
    daysLogged: days.length,
    daysMissing: Math.max(0, elapsed - days.length),
    weighDays: weights.length,
    avgKcal: avgKcal == null ? null : Math.round(avgKcal),
    avgProtein: avgProtein == null ? null : Math.round(avgProtein),
    avgWeight: avgWeight == null ? null : +avgWeight.toFixed(2),
    targetKcal: t.targetKcal,
    proteinMin: t.proteinG,
    kcalAdherence: pct(avgKcal, t.targetKcal),
    proteinAdherence: pct(avgProtein, t.proteinG),
    blockName: t.source === 'prescription' ? (t.prescription?.name ?? 'Block') : null,
    complete: days.length >= elapsed
  };
}

/**
 * One exercise's sets in the training tracker's cell format: load then reps per set —
 * "120*10, 9, 8" — a load change starting a new "110*11" chunk, no units. A set with no load
 * logged (chin-ups, bodyweight lunges) prints as "BW*8".
 */
function trackerCell(sets) {
  const fmtLoad = (w) => String(+w.toFixed(2));
  const parts = [];
  let load = null;
  for (const s of sets) {
    if (s.reps == null) continue;
    const w = s.weight_kg || null;
    if (parts.length && w === load) parts.push(String(s.reps));
    else {
      load = w;
      parts.push(w == null ? `BW*${s.reps}` : `${fmtLoad(w)}*${s.reps}`);
    }
  }
  return parts.join(', ');
}

/**
 * The week's training, one line per exercise, formatted for the coach's training tracker.
 *
 * The same Sunday–Saturday week as the rest of the check-in. The lines follow the PROGRAMME day's
 * exercise order, not the session's own: the sheet's rows are fixed, and pasting a column only
 * works if line N is always sheet row N — reordering lifts mid-session must not reorder the
 * paste. A programme exercise with no sets logged stays as an empty line for the same reason,
 * and anything logged that ISN'T on the programme day (a one-off addition) has no row on the
 * sheet at all, so it is returned separately in `extras` and kept out of the copied column.
 * An ad-hoc session has no programme day to anchor to and falls back to its own order.
 */
export function trainingWeek(date = todayStr()) {
  const db = getDb();
  const { start, end } = calendarWeek(date);

  const sessions = db.prepare(
    `SELECT id, date, day_id, day_name FROM workout_session WHERE date BETWEEN ? AND ? ORDER BY date, id`
  ).all(start, end);

  const progStmt = db.prepare(
    'SELECT name FROM program_exercise WHERE day_id = ? ORDER BY position, id'
  );
  const exStmt = db.prepare(
    'SELECT id, name FROM session_exercise WHERE session_id = ? ORDER BY position, id'
  );
  const setStmt = db.prepare(
    'SELECT weight_kg, reps FROM exercise_log WHERE session_exercise_id = ? ORDER BY set_no, id'
  );

  return {
    start,
    end,
    sessions: sessions.map((s) => {
      const logged = exStmt.all(s.id).map((e) => ({
        id: e.id,
        name: e.name,
        cell: trackerCell(setStmt.all(e.id))
      }));

      const progNames = s.day_id ? progStmt.all(s.day_id).map((p) => p.name) : [];
      let exercises = logged;
      let extras = [];
      if (progNames.length) {
        const byName = new Map(logged.map((e) => [e.name.toLowerCase(), e]));
        const used = new Set();
        exercises = progNames.map((name, i) => {
          const hit = byName.get(name.toLowerCase());
          if (hit) used.add(hit.id);
          return { id: `p${i}`, name, cell: hit?.cell ?? '' };
        });
        extras = logged.filter((e) => !used.has(e.id) && e.cell);
      }

      return { id: s.id, date: s.date, dayName: s.day_name ?? 'Session', exercises, extras };
    })
  };
}

/**
 * Where today sits inside the block: "Block 1, week 1, day 4".
 *
 * Weeks run Sunday–Saturday to match the coach's tracker, so week 1 is the first FULL Sunday week
 * of the block. A block that opens on a Saturday — that lone day is the tail of the previous
 * calendar week, so counting it as its own week would have every later week numbered one ahead of
 * the sheet. It clamps to week 1 rather than showing a "week 0".
 *
 * `day` is the day of that week, Sunday = 1, which is what makes "4/7 weigh-ins" and "day 4" agree.
 */
export function blockPosition(date = todayStr()) {
  const p = activePrescription(date);
  const { start: weekStart, end: weekEnd, dow } = calendarWeek(date);
  const day = dow + 1;

  if (!p || !p.start_date) return { hasBlock: false, name: null, week: null, day, weekStart, weekEnd };

  // From when the BLOCK began, not this row: a mid-block change of numbers adds a second row with
  // the same name, and week 6 must stay week 6 rather than restarting at week 1.
  const startDate = blockSeriesStart(p.name, p.start_date);

  const days = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  const week = Math.max(1, Math.floor(days(startDate, weekStart) / 7) + 1);

  return { hasBlock: true, name: p.name, week, day, weekStart, weekEnd, startDate };
}

/**
 * This calendar week's tallies, for the Home strip. Counted Sunday-to-today, never to the week's
 * end — a Wednesday has no Friday to be missing, and counting the rest of the week as failures
 * would show "3/7" as though days already went unlogged.
 *
 * The workout denominator is the number of days in the programme, not a fixed 7: the target is
 * "did I get through the rotation", which is 4 for a four-day programme.
 */
export function weekProgress(date = todayStr()) {
  const db = getDb();
  const { weekStart, weekEnd, week, name, hasBlock, day } = blockPosition(date);
  const upto = date < weekEnd ? date : weekEnd;

  const count = (t) => db.prepare(
    `SELECT COUNT(DISTINCT date) n FROM ${t} WHERE date BETWEEN ? AND ?`
  ).get(weekStart, upto).n;

  // The days on offer this week: a programme whose days change by week counts only this week's.
  const sessionTarget = daysFor(date).length || 3;

  return {
    hasBlock, name, week, day, weekStart, weekEnd,
    weighDays: count('weighins'),
    nutritionDays: count('food_log'),
    sessions: count('workout_session'),
    sessionTarget
  };
}
