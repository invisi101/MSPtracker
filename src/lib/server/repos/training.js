import { getDb } from '../db.js';
import { makeMatcher } from '../../exercise-names.js';
import { muscleTag } from '../../muscle-choices.js';
import { todayStr, shiftDay } from '../date.js';
import { activePrescription, blockSeriesStart } from './profile.js';

const ORDER = ['A', 'B', 'C', 'D'];

function sessionCountSince(since) {
  return getDb().prepare('SELECT COUNT(DISTINCT date) n FROM workout_session WHERE date >= ?').get(since).n;
}

/**
 * The programme in force on a date: the one the block covering that date points at. A block
 * with no programme of its own points at nothing and falls back to the programme marked active,
 * as does any date no block covers. So Training switches to a new block's programme on its start
 * date with nothing to press.
 */
export function programFor(date = todayStr()) {
  const db = getDb();
  const rx = activePrescription(date);
  if (rx?.program_id) {
    const p = db.prepare('SELECT * FROM program WHERE id = ?').get(rx.program_id);
    if (p) return p;
  }
  return legacyProgram();
}
function legacyProgram() {
  return getDb().prepare("SELECT * FROM program WHERE active=1 AND kind='block' ORDER BY id LIMIT 1").get();
}
export function getActiveProgram(date = todayStr()) {
  return programFor(date);
}
export function getDays(programId = getActiveProgram()?.id) {
  if (!programId) return [];
  return getDb().prepare('SELECT * FROM program_day WHERE program_id=? ORDER BY position').all(programId);
}
/**
 * Which week of its block a date falls in, for the programme that block runs — counted in 7-day
 * steps from the block's first day (a mid-block change of numbers doesn't restart the count). A
 * programme with phases (days marked "weeks 1-4", "weeks 5-8") repeats from week 1 once the block
 * outruns it, the usual instruction at the end of a fixed-length programme. Null when no block
 * covers the date, or the programme has no phases.
 */
export function programWeek(date = todayStr(), programId = programFor(date)?.id) {
  const db = getDb();
  // A day marked only "from week 5" still bounds the programme; MAX(week_to) alone would come back
  // empty and switch phase filtering off, showing every phase from week 1.
  const len = db.prepare('SELECT MAX(COALESCE(week_to, week_from)) n FROM program_day WHERE program_id = ?').get(programId)?.n;
  if (!len) return null;
  const rx = activePrescription(date);
  if (!rx?.start_date || rx.program_id !== programId) return null;
  const start = blockSeriesStart(rx.name, rx.start_date);
  const days = Math.round((new Date(date + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000);
  if (days < 0) return null;
  const blockWeek = Math.floor(days / 7) + 1;
  return { blockWeek, week: ((blockWeek - 1) % len) + 1, length: len };
}

/** The days on offer on a date: the whole programme, or only the current phase's days. */
export function daysFor(date = todayStr()) {
  const p = programFor(date);
  if (!p) return [];
  const days = getDays(p.id);
  const pw = programWeek(date, p.id);
  if (!pw) return days;
  return days.filter((d) => (d.week_from ?? 1) <= pw.week && pw.week <= (d.week_to ?? Infinity));
}

export function getExercises(dayId) {
  return getDb().prepare('SELECT * FROM program_exercise WHERE day_id=? ORDER BY position').all(dayId);
}

export function deleteSet(id) { getDb().prepare('DELETE FROM exercise_log WHERE id=?').run(id); }

/** Correct a set that was logged wrong — the weight typed a digit out, the reps miscounted. */
export function updateSet(id, { weight, reps, rir }) {
  return getDb().prepare(
    'UPDATE exercise_log SET weight_kg=@weight, reps=@reps, rir=@rir WHERE id=@id'
  ).run({ id, weight: weight ?? null, reps, rir: rir ?? null }).changes;
}

/** Bin a whole session. Its sets go with it, so nothing is left pointing at a session that is
 *  no longer there. */
export function deleteSession(id) {
  const db = getDb();
  return db.transaction(() => {
    db.prepare('DELETE FROM exercise_log WHERE session_id=?').run(id);
    return db.prepare('DELETE FROM workout_session WHERE id=?').run(id).changes;
  })();
}

/**
 * The last time this lift was performed — scoped to one programme day when `dayName` is given.
 *
 * A lift can sit on Workout A at 3-5 reps and on Workout C at 8-10. Unscoped, Workout A's card
 * would report Workout C's 45 kg × 8 as "last time", inviting a comparison against a set that was
 * never meant to match. A day with no prior appearance of the lift says so rather than borrowing
 * the other day's numbers.
 */
export function lastPerformance(exerciseName, excludeSessionId, dayName = null) {
  const row = getDb().prepare(
    `SELECT el.session_id, ws.date FROM exercise_log el
       JOIN workout_session ws ON ws.id = el.session_id
       ${JOIN_DAY}
     WHERE el.exercise_name = ? AND el.session_id != ?
       AND (? IS NULL OR ${DAY_EXPR} = ?)
     ORDER BY ws.date DESC, el.session_id DESC LIMIT 1`
  ).get(exerciseName, excludeSessionId ?? -1, dayName, dayName);
  if (!row) return null;
  const sets = getDb().prepare('SELECT * FROM exercise_log WHERE session_id=? AND exercise_name=? ORDER BY set_no')
    .all(row.session_id, exerciseName);
  return { date: row.date, sets };
}

/** One programme, days with their exercises — what the Settings editor edits. Defaults to the
 *  one in force today. */
export function getProgramme(programId = getActiveProgram()?.id) {
  const p = programId ? getDb().prepare('SELECT * FROM program WHERE id = ?').get(programId) : null;
  if (!p) return null;
  const days = getDays(p.id).map((d) => ({ ...d, exercises: getExercises(d.id) }));
  return { ...p, days };
}

export function saveDay({ id, name, title, week_from = null, week_to = null }) {
  return getDb().prepare('UPDATE program_day SET name=@name, title=@title, week_from=@week_from, week_to=@week_to WHERE id=@id')
    .run({ id, name: name || null, title: title || null, week_from, week_to }).changes;
}

/** Replace one day's exercise list wholesale. Logged sets key on the exercise NAME, not on these
 *  rows, so rewriting the prescription never touches what was actually performed. */
export function listExercises() {
  return getDb().prepare(
    'SELECT name, category, home, video_url, source, muscles FROM exercise ORDER BY position'
  ).all();
}

/**
 * The name to save for a typed lift. A certain match (same lift, different spelling) becomes the
 * standard name, so its history joins up. Anything else is kept exactly as typed and added to the
 * exercise list as the user's own, with the muscle THEY said it mainly works (never a guess from
 * the name), so it is offered next time.
 * The page asks "did you mean…?" before it gets here; reaching here with a near-miss means the
 * user chose to keep their own name.
 */
export function resolveExerciseName(typed, muscle = null) {
  const db = getDb();
  const raw = String(typed ?? '').trim();
  if (!raw) return raw;
  const m = makeMatcher(db.prepare('SELECT name FROM exercise').all().map((r) => r.name))(raw);
  if (m.kind === 'exact' || m.kind === 'alias') return m.name;
  const pos = db.prepare('SELECT COALESCE(MAX(position), 0) + 1 p FROM exercise').get().p;
  db.prepare(`INSERT INTO exercise (name, category, home, video_url, source, muscles, position)
              VALUES (?, NULL, 0, NULL, 'custom', ?, ?) ON CONFLICT(name) DO NOTHING`)
    .run(raw, muscleTag(muscle), pos);
  return raw;
}

export function saveDayExercises(dayId, list) {
  const db = getDb();
  // Muscles come from the shared exercise database, matched on name, so the body map keeps
  // working when a lift is picked from the list rather than typed with muscles by hand.
  const lookup = db.prepare('SELECT muscles FROM exercise WHERE lower(name) = lower(?)');
  const ins = db.prepare(`INSERT INTO program_exercise
    (day_id, position, name, slot, prescription, sets, rep_low, rep_high, rir, rest, muscles, note)
    VALUES (@day_id, @position, @name, @slot, @prescription, @sets, @rep_low, @rep_high, @rir, @rest, @muscles, @note)`);
  return db.transaction(() => {
    db.prepare('DELETE FROM program_exercise WHERE day_id=?').run(dayId);
    list.filter((e) => (e.name ?? '').trim()).forEach((e, i) => {
      e = { ...e, name: resolveExerciseName(e.name, e.muscle) };
      const sets = e.sets ?? null, lo = e.rep_low ?? null, hi = e.rep_high ?? null;
      ins.run({
        day_id: dayId, position: i, name: e.name.trim(), slot: e.slot || null,
        // Kept in sync so the training page's existing prescription line still reads correctly.
        prescription: e.prescription
          || [sets && `${sets}x`, lo && hi ? `${lo}-${hi}` : lo || '', e.rir ? ` @${e.rir}` : '']
             .filter(Boolean).join('') || '—',
        sets, rep_low: lo, rep_high: hi, rir: e.rir || null,
        rest: e.rest || null,
        note: (e.note ?? '').trim() || null,
        muscles: e.muscles || lookup.get(e.name.trim())?.muscles || null
      });
    });
  })();
}

export function addDay({ programId = getActiveProgram()?.id, name, title }) {
  const db = getDb();
  const p = programId ? db.prepare('SELECT * FROM program WHERE id = ?').get(programId) : null;
  if (!p) return null;
  const rows = getDays(p.id);
  // A fresh, unused label within this programme. History keys on programme + label, so it must
  // avoid every label this programme has ever used -- including days since deleted, whose
  // sessions are still in workout_session.
  const used = new Set([
    ...db.prepare('SELECT DISTINCT label l FROM program_day WHERE program_id = ?').all(p.id),
    ...db.prepare('SELECT DISTINCT day_label l FROM workout_session WHERE day_label IS NOT NULL AND program_id = ?').all(p.id)
  ].map((r) => r.l));
  let label = null;
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(65 + i);
    if (!used.has(c)) { label = c; break; }
  }
  if (!label) label = `D${Date.now().toString(36)}`;   // 26 days used is absurd, but don't collide
  return db.prepare(
    'INSERT INTO program_day (program_id, label, name, title, position) VALUES (?,?,?,?,?)'
  ).run(p.id, label, name || null, title || null, rows.length).lastInsertRowid;
}

export function deleteDay(id) {
  return getDb().prepare('DELETE FROM program_day WHERE id=?').run(id).changes;
}

/** Session name and date across a range — what the training calendar draws. */
export function sessionsBetween(from, to) {
  return getDb().prepare(
    `SELECT ws.id, ws.date, ws.day_label, ${DAY_NAME}, pd.title
       FROM workout_session ws
       ${JOIN_DAY}
      WHERE ws.date BETWEEN ? AND ? ORDER BY ws.date, ws.id`
  ).all(from, to);
}

/*
 * The most recently trained session — what the Training picker shows so you can see at a glance
 * which day you did last, and therefore which one comes next.
 *
 * "Trained" means at least one set was actually logged: starting a session and walking away
 * leaves an empty row behind, and calling that the last workout would point at the wrong day.
 */
export function lastLoggedSession() {
  // One-off workouts (program.one_off) sit outside the block's rotation: doing one must not move
  // "next up" or read as the last day of the programme trained.
  return getDb().prepare(
    `SELECT ws.id, ws.date, ws.day_label, ${DAY_NAME}, COUNT(el.id) sets
       FROM workout_session ws
       LEFT JOIN exercise_log el ON el.session_id = ws.id
       ${JOIN_DAY}
      WHERE ws.program_id IS NULL OR ws.program_id NOT IN (SELECT id FROM program WHERE one_off = 1)
      GROUP BY ws.id HAVING sets > 0
      ORDER BY ws.date DESC, ws.id DESC LIMIT 1`
  ).get() ?? null;
}

export function recentSessions(limit = 10) {
  return getDb().prepare(
    `SELECT ws.*, ${DAY_NAME}, COUNT(el.id) sets, COUNT(DISTINCT el.exercise_name) exercises
     FROM workout_session ws
     LEFT JOIN exercise_log el ON el.session_id = ws.id
     LEFT JOIN program_day pd ON pd.program_id = ws.program_id AND pd.label = ws.day_label
     GROUP BY ws.id ORDER BY ws.date DESC, ws.id DESC LIMIT ?`
  ).all(limit);
}

/** Full training history (newest first), every session with its sets grouped by exercise. */
export function allSessions() {
  const db = getDb();
  const sessions = db.prepare(
    `SELECT ws.*, ${DAY_NAME} FROM workout_session ws ${JOIN_DAY} ORDER BY ws.date DESC, ws.id DESC`
  ).all();

  // `exercises` is re-sorted below into the PROGRAMME day's order, not the session's: however
  // the lifts were actually performed (or reordered on the day), history must read in the
  // workout's own order. Lifts that aren't on the programme day
  // (one-off additions, old names from before a swap) follow the programmed ones, in
  // session order. Exercises that were part of the session but never logged are still included.
  //
  // Grouped with a Map, not a plain object: session_exercise ids are integers, and a plain object
  // re-orders integer-like keys numerically, silently discarding the ORDER BY position.
  const rows = db.prepare(
    `SELECT se.session_id, se.id AS sex_id, se.position, se.name, se.log_note,
            COALESCE(se.kind, 'strength') AS kind,
            el.set_no, el.weight_kg, el.reps, el.rir
       FROM session_exercise se
       LEFT JOIN exercise_log el ON el.session_exercise_id = se.id
      ORDER BY se.session_id, se.position, el.set_no, el.id`
  ).all();
  const bySessionEx = new Map();
  for (const r of rows) {
    if (!bySessionEx.has(r.session_id)) bySessionEx.set(r.session_id, new Map());
    const m = bySessionEx.get(r.session_id);
    if (!m.has(r.sex_id)) m.set(r.sex_id, { name: r.name, kind: r.kind, note: r.log_note, sets: [] });
    if (r.set_no != null) m.get(r.sex_id).sets.push(r);
  }

  // The programme's order per day, first occurrence of a name winning. Matching is by name,
  // case-insensitively — the same convention as /checkin-training.
  const progOrder = new Map();
  for (const r of db.prepare('SELECT day_id, name FROM program_exercise ORDER BY day_id, position, id').all()) {
    if (!progOrder.has(r.day_id)) progOrder.set(r.day_id, new Map());
    const m = progOrder.get(r.day_id);
    if (!m.has(r.name.toLowerCase())) m.set(r.name.toLowerCase(), m.size);
  }

  return sessions.map((s) => {
    const list = [...(bySessionEx.get(s.id)?.values() ?? [])];
    const order = s.day_id != null ? progOrder.get(s.day_id) : null;
    const exercises = order
      ? list
          .map((e, i) => ({ rank: order.get(e.name.toLowerCase()) ?? Infinity, i, e }))
          .sort((a, b) => a.rank - b.rank || a.i - b.i)
          .map((x) => x.e)
      : list;
    return {
      ...s,
      exercises,
      setCount: exercises.reduce((n, e) => n + e.sets.length, 0)
    };
  });
}

/**
 * Every lift that has been logged, once per programme day it was logged on.
 *
 * `split` marks the lifts trained on more than one day — the picker appends the day to those and
 * leaves the rest as a bare name, so the list only grows the extra words where they carry meaning.
 * Same convention as the Progress page's per-lift cards.
 */
export function loggedExerciseNames() {
  const rows = getDb().prepare(
    `SELECT DISTINCT el.exercise_name AS name, ${DAY_NAME}
       FROM exercise_log el
       JOIN workout_session ws ON ws.id = el.session_id
       ${JOIN_DAY}
      ORDER BY el.exercise_name, day_name`
  ).all();
  const days = new Map();
  for (const r of rows) days.set(r.name, (days.get(r.name) ?? 0) + 1);
  return rows.map((r) => ({ name: r.name, dayName: r.day_name, split: days.get(r.name) > 1 }));
}

/** All sessions containing an exercise (newest first) with each session's top set. Restricted to
 *  one programme day when `dayName` is given. */
export function exerciseHistory(name, dayName = null) {
  const rows = getDb().prepare(
    `SELECT el.*, ws.date, ws.day_label, ${DAY_NAME}
       FROM exercise_log el
       JOIN workout_session ws ON ws.id = el.session_id
       ${JOIN_DAY}
      WHERE el.exercise_name = ? AND (? IS NULL OR ${DAY_EXPR} = ?)
      ORDER BY ws.date DESC, el.set_no`
  ).all(name, dayName, dayName);
  // A Map, not an object: integer-like keys make a plain object iterate in ASCENDING NUMERIC
  // order, which would silently discard the query's `date DESC` and hand the page its history
  // oldest-first (breaking the top-set chart, which reverses this list expecting newest-first).
  const bySession = new Map();
  for (const r of rows) {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, { session_id: r.session_id, date: r.date, day_label: r.day_label, day_name: r.day_name, sets: [] });
    bySession.get(r.session_id).sets.push(r);
  }
  const sessions = [...bySession.values()];
  for (const s of sessions) s.top = [...s.sets].sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0) || (b.reps || 0) - (a.reps || 0))[0];
  return sessions;
}

/* ---------------------------------------------------------------------------------------------
 * Session-centric training.
 *
 * A session owns an ordered exercise list copied from the programme day when it starts, and sets
 * hang off that list. exercise_log is the set table and carries exercise_name, so history, body
 * maps and lastPerformance can read it directly.
 * ------------------------------------------------------------------------------------------- */

/**
 * The programme's days, each with its exercise list — the shape the training picker needs so it
 * can show what a day contains before you commit to starting it.
 */
export function listDays({ date = todayStr(), all = false } = {}) {
  const db = getDb();
  // Training offers only the current phase's days; the export lists the whole programme.
  const days = all ? getDays() : daysFor(date);
  const ex = db.prepare('SELECT * FROM program_exercise ORDER BY day_id, position, id').all();
  const by = {};
  for (const e of ex) (by[e.day_id] ||= []).push(e);
  return days.map((d) => ({ ...d, exercises: by[d.id] || [] }));
}

/** Sessions on a given date, newest first, with how much is logged against each. */
/*
 * What a session is CALLED comes from the programme day, not from the snapshot stored on the
 * session. The user names their own templates — "Workout A" today, maybe "Push / Pull / Abs" next block —
 * and a rename has to show up on history too, or the same session is called two different things
 * depending on which page you're looking at.
 *
 * Joined on the LABEL, which is the stable key: day ids change whenever the programme is
 * re-imported, but A–D do not. ws.day_name is kept as the fallback so a day deleted from the
 * programme still reports the name it had, and an unnamed day reads "Workout A" rather than blank.
 */
const DAY_EXPR = "COALESCE(pd.name, ws.day_name, 'Workout ' || ws.day_label)";
const DAY_NAME = `${DAY_EXPR} AS day_name`;
const JOIN_DAY = 'LEFT JOIN program_day pd ON pd.program_id = ws.program_id AND pd.label = ws.day_label';

export function sessionsOn(date) {
  return getDb().prepare(
    `SELECT ws.*, ${DAY_NAME}, COUNT(el.id) sets
       FROM workout_session ws
       LEFT JOIN exercise_log el ON el.session_id = ws.id
       ${JOIN_DAY}
      WHERE ws.date = ? GROUP BY ws.id ORDER BY ws.id DESC`
  ).all(date);
}

/** One session with its exercise list and each exercise's sets. */
export function sessionDetail(id) {
  const db = getDb();
  const session = db.prepare(
    `SELECT ws.*, ${DAY_NAME} FROM workout_session ws ${JOIN_DAY} WHERE ws.id = ?`
  ).get(id);
  if (!session) return null;
  const exercises = db.prepare(
    'SELECT * FROM session_exercise WHERE session_id = ? ORDER BY position, id'
  ).all(id);
  const sets = db.prepare(
    `SELECT * FROM exercise_log WHERE session_id = ? AND session_exercise_id IS NOT NULL
      ORDER BY session_exercise_id, set_no, id`
  ).all(id);
  const by = {};
  for (const s of sets) (by[s.session_exercise_id] ||= []).push(s);
  return { session, exercises: exercises.map((e) => ({ ...e, sets: by[e.id] || [] })) };
}

/**
 * Start (or resume) a session for a programme day.
 *
 * Resumes an existing session for the same day and date even if it was finished, reopening it.
 * Starting a second one would split the day's work across two sessions — and "remembered another
 * exercise after finishing" is far likelier than genuinely training the same day twice.
 */
export function startSession(date, dayId) {
  const db = getDb();
  const day = dayId ? db.prepare('SELECT * FROM program_day WHERE id = ?').get(dayId) : null;
  // A dayId that doesn't resolve means a stale link or a programme that was rebuilt underneath
  // the page — day ids change when the programme is re-imported. Silently opening an empty
  // ad-hoc session hides that; a blank session is only ever created when none was asked for.
  if (dayId && !day) throw new Error(`no programme day with id ${dayId}`);

  if (day) {
    const existing = db.prepare(
      'SELECT id FROM workout_session WHERE date = ? AND day_label = ? AND program_id IS ? ORDER BY id LIMIT 1'
    ).get(date, day.label, day.program_id);
    if (existing) { reopenSession(existing.id); return existing.id; }
  }

  // A session belongs to the programme its day came from; an ad-hoc one to whatever is in force.
  const prog = day ? { id: day.program_id } : getActiveProgram(date);
  return db.transaction(() => {
    const sid = db.prepare(
      `INSERT INTO workout_session (date, day_label, day_id, day_name, program_id)
       VALUES (?,?,?,?,?)`
    ).run(date, day?.label ?? null, day?.id ?? null, day?.name ?? 'Ad-hoc session', prog?.id ?? null).lastInsertRowid;

    const ins = db.prepare(
      `INSERT INTO session_exercise (session_id, position, name, target_sets, rep_low, rep_high, rir, rest, muscles, note)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    );
    if (day) {
      const planned = db.prepare(
        'SELECT * FROM program_exercise WHERE day_id = ? ORDER BY position, id'
      ).all(day.id);
      planned.forEach((e, i) => ins.run(sid, i, e.name, e.sets, e.rep_low, e.rep_high, e.rir, e.rest, e.muscles, e.note ?? null));
      carryNotes(sid);
    }
    return sid;
  })();
}

/**
 * Notes for next time: what the user wrote on a lift, and on the session as a whole, the last
 * time they did THIS day is copied into the new session, where they can keep, edit or clear it.
 * So a note lasts until it is changed, and each session keeps the note as it stood that day.
 * Same day only, like "Last" and "Best": Workout A's squat and Workout C's squat are separate.
 */
function carryNotes(sid) {
  const db = getDb();
  const dayOf = db.prepare(`SELECT ws.date, ${DAY_EXPR} AS day FROM workout_session ws ${JOIN_DAY} WHERE ws.id = ?`).get(sid);
  if (!dayOf?.day) return;
  const prevSession = db.prepare(
    `SELECT ws.notes FROM workout_session ws ${JOIN_DAY}
      WHERE ws.id != ? AND ${DAY_EXPR} = ? AND ws.date <= ?
      ORDER BY ws.date DESC, ws.id DESC LIMIT 1`
  ).get(sid, dayOf.day, dayOf.date);
  if (prevSession?.notes) db.prepare('UPDATE workout_session SET notes = ? WHERE id = ?').run(prevSession.notes, sid);
  for (const se of db.prepare('SELECT id, name FROM session_exercise WHERE session_id = ?').all(sid)) carryLiftNote(se.id, se.name, sid, dayOf);
}
function carryLiftNote(seId, name, sid, dayOf) {
  const db = getDb();
  const prev = db.prepare(
    `SELECT se.log_note FROM session_exercise se
       JOIN workout_session ws ON ws.id = se.session_id ${JOIN_DAY}
      WHERE se.session_id != ? AND lower(se.name) = lower(?) AND ${DAY_EXPR} = ? AND ws.date <= ?
      ORDER BY ws.date DESC, ws.id DESC LIMIT 1`
  ).get(sid, name, dayOf.day, dayOf.date);
  if (prev?.log_note) db.prepare('UPDATE session_exercise SET log_note = ? WHERE id = ?').run(prev.log_note, seId);
}

const cleanNote = (t) => { const x = String(t ?? '').trim(); return x ? x.slice(0, 2000) : null; };
/** Save (or clear, when blank) the note on one lift in a session. */
export function setLiftNote(sessionExerciseId, text) {
  return getDb().prepare('UPDATE session_exercise SET log_note = ? WHERE id = ?').run(cleanNote(text), sessionExerciseId).changes;
}
/** Save (or clear, when blank) the note on a whole session. */
export function setSessionNote(sessionId, text) {
  return getDb().prepare('UPDATE workout_session SET notes = ? WHERE id = ?').run(cleanNote(text), sessionId).changes;
}

export function finishSession(id) {
  // LOCAL time, not UTC. datetime('now') returns UTC, and the page renders this by slicing the
  // clock straight out of the string — so a session finished at 12:53 local time in UTC+9 would display as 03:53.
  return getDb().prepare(
    "UPDATE workout_session SET finished_at = datetime('now','localtime') WHERE id = ?"
  ).run(id).changes;
}
export function reopenSession(id) {
  return getDb().prepare('UPDATE workout_session SET finished_at = NULL WHERE id = ?').run(id).changes;
}

export function sessionExercise(id) {
  return getDb().prepare('SELECT * FROM session_exercise WHERE id = ?').get(id);
}

/** Add a one-off exercise to a session — swapping a lift, or something the plan didn't list. */
export function addSessionExercise(sessionId, name, muscle = null) {
  const db = getDb();
  name = resolveExerciseName(name, muscle);
  const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 p FROM session_exercise WHERE session_id = ?')
    .get(sessionId).p;
  // Muscles come from the shared exercise database so the body map keeps working for
  // substitutions, not just for exercises the programme happens to list.
  const known = db.prepare('SELECT muscles FROM exercise WHERE lower(name) = lower(?)').get(name);
  const id = db.prepare(
    'INSERT INTO session_exercise (session_id, position, name, muscles) VALUES (?,?,?,?)'
  ).run(sessionId, pos, name, known?.muscles ?? null).lastInsertRowid;
  // A lift added on the day still picks up its note from last time on this day.
  const dayOf = db.prepare(`SELECT ws.date, ${DAY_EXPR} AS day FROM workout_session ws ${JOIN_DAY} WHERE ws.id = ?`).get(sessionId);
  if (dayOf?.day && dayOf.day !== 'Ad-hoc session') carryLiftNote(id, name, sessionId, dayOf);
  return id;
}

/** Remove an exercise from a session, and any sets logged against it. */
export function removeSessionExercise(id) {
  const db = getDb();
  return db.transaction(() => {
    db.prepare('DELETE FROM exercise_log WHERE session_exercise_id = ?').run(id);
    return db.prepare('DELETE FROM session_exercise WHERE id = ?').run(id).changes;
  })();
}

/** Move an exercise up or down by swapping positions with its neighbour. */
export function moveSessionExercise(id, dir) {
  const db = getDb();
  const me = db.prepare('SELECT * FROM session_exercise WHERE id = ?').get(id);
  if (!me) return 0;
  const neighbour = db.prepare(
    `SELECT * FROM session_exercise WHERE session_id = ? AND position ${dir === 'up' ? '<' : '>'} ?
      ORDER BY position ${dir === 'up' ? 'DESC' : 'ASC'} LIMIT 1`
  ).get(me.session_id, me.position);
  if (!neighbour) return 0;
  return db.transaction(() => {
    const upd = db.prepare('UPDATE session_exercise SET position = ? WHERE id = ?');
    upd.run(neighbour.position, me.id);
    upd.run(me.position, neighbour.id);
    return 1;
  })();
}

/** Log a set against a session exercise. exercise_name is denormalised onto the row so readers
 *  (history, body map, last performance) can work from the set table alone. */
export function addSetFor(sessionExerciseId, { weightKg, reps, rir }) {
  const db = getDb();
  const se = db.prepare('SELECT * FROM session_exercise WHERE id = ?').get(sessionExerciseId);
  if (!se) return null;
  const n = db.prepare('SELECT COUNT(*) n FROM exercise_log WHERE session_exercise_id = ?')
    .get(sessionExerciseId).n;
  return db.prepare(
    `INSERT INTO exercise_log (session_id, session_exercise_id, exercise_name, set_no, weight_kg, reps, rir)
     VALUES (?,?,?,?,?,?,?)`
  ).run(se.session_id, sessionExerciseId, se.name, n + 1, weightKg ?? null, reps, rir ?? null).lastInsertRowid;
}

export function getSet(id) {
  // kind rides along from the session exercise: the edit action must decide which columns to
  // write from what is STORED, never from a hidden form field the client could change.
  return getDb().prepare(
    `SELECT el.*, COALESCE(se.kind, 'strength') AS kind
       FROM exercise_log el LEFT JOIN session_exercise se ON se.id = el.session_exercise_id
      WHERE el.id = ?`
  ).get(id);
}

/**
 * Heaviest set ever recorded for a lift, for the "best" line on each card — scoped to one
 * programme day when `dayName` is given, for the same reason as `lastPerformance`. A heavy day's
 * triples will always outweigh a light day's eights, so one shared "best" is a target the light
 * day can never beat and the heavy day always holds.
 */
export function bestSet(name, dayName = null) {
  return getDb().prepare(
    `SELECT el.weight_kg, el.reps, ws.date FROM exercise_log el
       JOIN workout_session ws ON ws.id = el.session_id
       ${JOIN_DAY}
      WHERE lower(el.exercise_name) = lower(?) AND el.weight_kg IS NOT NULL
        AND (? IS NULL OR ${DAY_EXPR} = ?)
      ORDER BY el.weight_kg DESC, el.reps DESC LIMIT 1`
  ).get(name, dayName, dayName);
}

/** Every exercise name the app knows — programme, library and anything logged before. */
export function knownExerciseNames() {
  return getDb().prepare(
    `SELECT DISTINCT name FROM (
       SELECT name FROM exercise
       UNION SELECT name FROM program_exercise
       UNION SELECT exercise_name AS name FROM exercise_log
     ) ORDER BY name`
  ).all().map((r) => r.name);
}

/** lowercased name -> video_url. Keyed lower so a template typed with different capitalisation
 *  still finds its video. */
export function videoMap() {
  return Object.fromEntries(
    getDb().prepare("SELECT name, video_url FROM exercise WHERE video_url IS NOT NULL AND video_url != ''")
      .all().map((r) => [r.name.toLowerCase(), r.video_url])
  );
}

/**
 * Per-lift history, for the Progress page.
 *
 * Returns THE SETS AS LOGGED ("120*10, 9, 8"): the only account of a session that cannot be
 * wrong. An estimated 1RM rides alongside each session for the trend line, but only as the
 * supporting act: best-set Epley reads four sets of eight as a regression from two sets of ten,
 * so as the headline it would paint a 60% rise in work as a 2 kg loss, in red.
 *
 * Grouped by lift AND by the day it was trained on. A lift can sit on Workout A at 3-5 reps and
 * on Workout C at 8-10; merged into one series they zig-zag against each other, and adding a kilo
 * on the heavy day draws as a fall because the last point was a light-day set. `split` marks the
 * lifts where the day has to be kept separate.
 *
 * Bodyweight sets (chin-ups, say) are kept; they simply carry no estimate and no tonnage.
 */
export function liftProgress() {
  const rows = getDb().prepare(
    // The day's CURRENT name, as the training card uses, so renaming a day doesn't split a lift.
    `SELECT el.exercise_name AS name, ws.date, ${DAY_EXPR} AS dayName,
            el.weight_kg AS weight, el.reps, sx.rep_low AS repLow, sx.rep_high AS repHigh
       FROM exercise_log el
       JOIN workout_session ws ON ws.id = el.session_id
       ${JOIN_DAY}
       LEFT JOIN session_exercise sx ON sx.id = el.session_exercise_id
      WHERE el.reps > 0
      ORDER BY ws.date, el.id`
  ).all();

  const groups = new Map();      // name + day -> group
  const daysByLift = new Map();  // name -> the days it appears on
  const all = new Map();         // name -> every session of it, across days

  for (const r of rows) {
    const day = r.dayName ?? '';
    if (!daysByLift.has(r.name)) daysByLift.set(r.name, new Set());
    daysByLift.get(r.name).add(day);

    const key = `${r.name}\u0000${day}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { name: r.name, dayName: r.dayName ?? null, repLow: null, repHigh: null, byDate: new Map() }));
    // Last one logged wins, so an edited rep range shows the current intent.
    if (r.repLow != null) { g.repLow = r.repLow; g.repHigh = r.repHigh; }

    let s = g.byDate.get(r.date);
    if (!s) g.byDate.set(r.date, (s = { date: r.date, sets: [] }));
    s.sets.push({ weight: r.weight > 0 ? r.weight : null, reps: r.reps });

    // Every session of the lift, whatever the day or programme: the one continuous history that
    // carries across blocks. Only shown for lifts trained on more than one day.
    let a = all.get(r.name);
    if (!a) all.set(r.name, (a = { name: r.name, dayName: null, combined: true, repLow: null, repHigh: null, byDate: new Map() }));
    let as = a.byDate.get(r.date);
    if (!as) a.byDate.set(r.date, (as = { date: r.date, sets: [] }));
    as.sets.push({ weight: r.weight > 0 ? r.weight : null, reps: r.reps });
  }
  for (const [name, a] of all) if ((daysByLift.get(name)?.size ?? 1) > 1) groups.set(`${name}\u0000*all`, a);

  return [...groups.values()]
    .map((g) => {
      const sessions = [...g.byDate.values()].map((s) => {
        const loaded = s.sets.filter((x) => x.weight != null);
        const e1rm = loaded.length ? Math.max(...loaded.map((x) => x.weight * (1 + x.reps / 30))) : null;
        return {
          date: s.date,
          sets: s.sets,
          reps: s.sets.reduce((n, x) => n + x.reps, 0),
          topWeight: loaded.length ? Math.max(...loaded.map((x) => x.weight)) : null,
          volume: loaded.length ? Math.round(loaded.reduce((n, x) => n + x.weight * x.reps, 0)) : null,
          e1rm: e1rm == null ? null : Math.round(e1rm * 10) / 10
        };
      });
      return {
        name: g.name,
        dayName: g.dayName,
        split: (daysByLift.get(g.name)?.size ?? 1) > 1,
        combined: !!g.combined,
        repLow: g.repLow,
        repHigh: g.repHigh,
        sessions
      };
    })
    .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name));
}

/* ---------------------------------------------------------------------------------------------
 * Presets.
 *
 * A preset is a programme kept on the shelf (program.kind = 'preset'). Nothing trains from a
 * preset directly: picking one for a block COPIES it, and the block runs its copy. The design chose
 * this so a swap made during a block (no room for hip thrusts, a sore shoulder) changes only that
 * block, and the preset stays as designed for next time. Sessions only ever point at block
 * copies, so presets can be edited, renamed or deleted without touching any history.
 * ------------------------------------------------------------------------------------------- */

/** Every programme worth showing in Settings, with the blocks that run each one. */
export function listProgrammes(date = todayStr()) {
  const db = getDb();
  const legacy = legacyProgram()?.id ?? null;
  const current = programFor(date)?.id ?? null;
  const blocks = new Map();
  for (const r of db.prepare(
    "SELECT name, start_date, end_date, program_id FROM prescription WHERE active = 1 ORDER BY COALESCE(start_date, '0000-00-00')"
  ).all()) {
    const pid = r.program_id ?? legacy;
    if (pid == null) continue;
    if (!blocks.has(pid)) blocks.set(pid, []);
    const list = blocks.get(pid);
    // Rows sharing a name are one block whose macros changed part-way (see splitPrescription).
    const same = list.find((b) => (b.name ?? '').toLowerCase() === (r.name ?? '').toLowerCase());
    if (same) same.end_date = r.end_date;
    else list.push({ name: r.name, start_date: r.start_date, end_date: r.end_date });
  }
  const days = new Map(db.prepare('SELECT program_id, COUNT(*) n FROM program_day GROUP BY program_id').all()
    .map((r) => [r.program_id, r.n]));
  return db.prepare('SELECT * FROM program ORDER BY id').all()
    .map((p) => ({
      id: p.id, name: p.name, kind: p.kind, from_preset: p.from_preset, one_off: !!p.one_off,
      days: days.get(p.id) ?? 0,
      blocks: blocks.get(p.id) ?? [],
      current: p.id === current
    }))
    // A block copy no block uses any more (its block was deleted or moved to another preset)
    // only holds history now — nothing left to edit.
    .filter((p) => p.kind === 'preset' || p.blocks.length || p.id === legacy || p.current)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'preset' ? 1 : -1)
      || (a.kind === 'preset' ? a.name.localeCompare(b.name)
        : (a.blocks[0]?.start_date ?? '').localeCompare(b.blocks[0]?.start_date ?? '')));
}

/** Copy a programme wholesale — days keep their letters, exercises keep every field. */
function copyProgramme(fromId, { name, kind, fromPreset = null }) {
  const db = getDb();
  return db.transaction(() => {
    const pid = db.prepare('INSERT INTO program (name, active, kind, from_preset) VALUES (?, 0, ?, ?)')
      .run(name, kind, fromPreset).lastInsertRowid;
    for (const d of getDays(fromId)) {
      const dayId = db.prepare(
        'INSERT INTO program_day (program_id, label, name, title, position, week_from, week_to) VALUES (?,?,?,?,?,?,?)'
      ).run(pid, d.label, d.name, d.title, d.position, d.week_from ?? null, d.week_to ?? null).lastInsertRowid;
      db.prepare(`INSERT INTO program_exercise
          (day_id, position, name, slot, prescription, sets, rep_low, rep_high, rir, rest, muscles, note)
        SELECT ?, position, name, slot, prescription, sets, rep_low, rep_high, rir, rest, muscles, note
          FROM program_exercise WHERE day_id = ? ORDER BY position, id`).run(dayId, d.id);
    }
    return pid;
  })();
}

function presetNameTaken(name, exceptId = null) {
  return !!getDb().prepare(
    "SELECT 1 FROM program WHERE kind = 'preset' AND lower(name) = lower(?) AND id IS NOT ?"
  ).get(name, exceptId);
}

/** A new preset — empty, or a copy of an existing programme (a block's or another preset). */
export function createPreset(name, fromId = null) {
  name = (name ?? '').trim();
  if (!name) throw new Error('Give the preset a name.');
  if (presetNameTaken(name)) throw new Error(`There's already a preset called "${name}".`);
  if (fromId) return copyProgramme(fromId, { name, kind: 'preset' });
  return getDb().prepare("INSERT INTO program (name, active, kind) VALUES (?, 0, 'preset')").run(name).lastInsertRowid;
}

export function renamePreset(id, name) {
  name = (name ?? '').trim();
  if (!name) throw new Error('Give the preset a name.');
  if (presetNameTaken(name, id)) throw new Error(`There's already a preset called "${name}".`);
  return getDb().prepare("UPDATE program SET name = ? WHERE id = ? AND kind = 'preset'").run(name, id).changes;
}

/** Bin a preset. Blocks started from it have their own copies, so nothing else changes. */
export function deletePreset(id) {
  const db = getDb();
  return db.transaction(() => {
    // Only a one-off can have sessions logged under it. They keep their own name (day_name) and
    // their sets; they just stop pointing at a programme that is no longer there.
    db.prepare('UPDATE workout_session SET program_id = NULL, day_id = NULL WHERE program_id = ?').run(id);
    return db.prepare("DELETE FROM program WHERE id = ? AND kind = 'preset'").run(id).changes;
  })();
}

/** One-off workouts: preset days that can be started any day without touching the block. */
export function listOneOffs() {
  const db = getDb();
  const days = db.prepare(
    `SELECT pd.*, p.name AS program_name FROM program_day pd JOIN program p ON p.id = pd.program_id
      WHERE p.kind = 'preset' AND p.one_off = 1 ORDER BY p.name, pd.position`
  ).all();
  const ex = db.prepare('SELECT * FROM program_exercise WHERE day_id = ? ORDER BY position, id');
  return days.map((d) => ({ ...d, exercises: ex.all(d.id) }));
}

/**
 * Give a block its programme.
 *
 * With a preset: the block gets a fresh copy of it, replacing whatever it ran before. Without one,
 * a NEW block carries on with the programme in force the day before it starts — still as its own
 * copy, so changing one block's programme never reaches into another's. An existing block given
 * no preset keeps what it has.
 */
export function setBlockProgramme(rxId, { presetId = null, isNew = false } = {}) {
  const db = getDb();
  const rx = db.prepare('SELECT * FROM prescription WHERE id = ?').get(rxId);
  if (!rx) return null;
  let source = null, fromPreset = null;
  if (presetId) {
    const preset = db.prepare("SELECT * FROM program WHERE id = ? AND kind = 'preset'").get(presetId);
    if (!preset) throw new Error('That preset no longer exists.');
    if (preset.one_off) throw new Error(`${preset.name} is a one-off workout, not a programme for a block.`);
    source = preset.id; fromPreset = preset.name;
  } else if (isNew && !rx.program_id) {
    source = programFor(shiftDay(rx.start_date ?? todayStr(), -1))?.id ?? null;
    if (source) fromPreset = db.prepare('SELECT from_preset FROM program WHERE id = ?').get(source)?.from_preset ?? null;
  }
  if (!source) return rx.program_id;
  const old = rx.program_id;
  const pid = copyProgramme(source, { name: rx.name || fromPreset || 'Block programme', kind: 'block', fromPreset });
  db.prepare('UPDATE prescription SET program_id = ? WHERE id = ?').run(pid, rx.id);
  if (old) dropUnusedProgramme(old);
  return pid;
}

/**
 * A whole preset in one go, from the Build a workout page: a name, and days each holding their
 * lifts. Lift names go through resolveExerciseName like everywhere else. All or nothing.
 */
export function createPresetWithDays(name, days) {
  const db = getDb();
  return db.transaction(() => {
    const pid = createPreset(name);
    days.forEach((d, i) => {
      const dayId = db.prepare(
        'INSERT INTO program_day (program_id, label, name, title, position) VALUES (?, ?, ?, ?, ?)'
      ).run(pid, String.fromCharCode(65 + i), (d.name || '').trim() || `Day ${i + 1}`, null, i).lastInsertRowid;
      saveDayExercises(dayId, d.exercises);
    });
    return pid;
  })();
}

/**
 * Give a block that has no workouts its programme after the fact: a copy of a preset, or an empty
 * one to build from scratch with + Day. A block can be created with "create my own later", and
 * this is the later.
 */
export function startBlockProgramme(rxId, presetId = null) {
  const db = getDb();
  const rx = db.prepare('SELECT * FROM prescription WHERE id = ?').get(rxId);
  if (!rx) throw new Error('That block no longer exists.');
  if (rx.program_id) throw new Error(`${rx.name ?? 'This block'} already has workouts.`);
  if (presetId) return setBlockProgramme(rxId, { presetId });
  const pid = db.prepare("INSERT INTO program (name, active, kind) VALUES (?, 0, 'block')")
    .run(rx.name || 'Block programme').lastInsertRowid;
  db.prepare('UPDATE prescription SET program_id = ? WHERE id = ?').run(pid, rx.id);
  return pid;
}

/**
 * Tidy away a block's copy once nothing needs it: no block runs it and no session was logged
 * under it. One that holds history stays — sessions read their day names through it.
 */
export function dropUnusedProgramme(id) {
  const db = getDb();
  if (!id) return 0;
  const p = db.prepare("SELECT * FROM program WHERE id = ? AND kind = 'block' AND active = 0").get(id);
  if (!p) return 0;
  if (db.prepare('SELECT 1 FROM prescription WHERE program_id = ?').get(id)) return 0;
  if (db.prepare('SELECT 1 FROM workout_session WHERE program_id = ?').get(id)) return 0;
  return db.prepare('DELETE FROM program WHERE id = ?').run(id).changes;
}
