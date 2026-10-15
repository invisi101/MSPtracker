import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SCHEMA } from './schema.js';
import { FOODS } from './seed/foods.js';
import { EXERCISES } from './seed/exercises.js';
import { musclesFor } from './muscles.js';

let _db = null;

/** Lazy singleton — instantiated on first use (never at build time). */
export function getDb() {
  if (_db) return _db;
  const dir = process.env.DATA_DIR || './data';
  mkdirSync(dir, { recursive: true });
  // MSP_SQLITE_BINDING points at the native SQLite driver for this machine's chip. The packaged
  // Mac download carries one driver per chip type and its launcher picks; unset, the normal one loads.
  const nativeBinding = process.env.MSP_SQLITE_BINDING || undefined;
  _db = new Database(join(dir, 'tracker.db'), nativeBinding ? { nativeBinding } : {});
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(SCHEMA);
  migrate(_db);
  seed(_db);
  return _db;
}

// A session's own ordered exercise list, copied from the programme day when the session starts.
// It is what lets a session be reordered, take a one-off lift, and record that an exercise was
// part of the day but not yet done. exercise_log stays the set table — history, body maps and
// last-performance all read exercise_name from it — and points up to the list.
const SESSION_EXERCISE_SQL = `
CREATE TABLE IF NOT EXISTS session_exercise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'strength',
  target_sets INTEGER, rep_low INTEGER, rep_high INTEGER, rir TEXT, rest TEXT, note TEXT,
  muscles TEXT
);
CREATE INDEX IF NOT EXISTS idx_sex_session ON session_exercise(session_id, position);
`;

function migrate(db) {
  db.exec(SESSION_EXERCISE_SQL);

  const sesCols = db.prepare('PRAGMA table_info(workout_session)').all().map((c) => c.name);
  // day_id pins the session to the programme day it came from, so renaming or reordering days
  // later can't re-point old sessions. finished_at is what makes a session in-progress or done.
  if (!sesCols.includes('day_id')) db.exec('ALTER TABLE workout_session ADD COLUMN day_id INTEGER');
  if (!sesCols.includes('day_name')) db.exec('ALTER TABLE workout_session ADD COLUMN day_name TEXT');
  if (!sesCols.includes('finished_at')) db.exec('ALTER TABLE workout_session ADD COLUMN finished_at TEXT');

  // The user's own note on a lift for next time ("next week, add 2.5 kg"). Separate from `note`, which
  // is the programme's setup instruction ("per leg") copied in at session start.
  const sexCols = db.prepare('PRAGMA table_info(session_exercise)').all().map((c) => c.name);
  if (!sexCols.includes('log_note')) db.exec('ALTER TABLE session_exercise ADD COLUMN log_note TEXT');

  const logCols = db.prepare('PRAGMA table_info(exercise_log)').all().map((c) => c.name);
  if (!logCols.includes('session_exercise_id')) db.exec('ALTER TABLE exercise_log ADD COLUMN session_exercise_id INTEGER');

  // Sessions logged before day_id/day_name existed: point them at their programme day so they
  // read "Day 2" rather than "Day B" everywhere the name is shown.
  db.exec(`UPDATE workout_session SET
             day_id   = COALESCE(day_id,   (SELECT pd.id   FROM program_day pd WHERE pd.program_id = workout_session.program_id AND pd.label = workout_session.day_label)),
             day_name = COALESCE(day_name, (SELECT pd.name FROM program_day pd WHERE pd.program_id = workout_session.program_id AND pd.label = workout_session.day_label))
           WHERE day_id IS NULL OR day_name IS NULL`);

  backfillSessionExercises(db);

  // profile.weight_kg is the weight the AI is told; put it on the 7-day average now, and after any
  // import that replaced the weigh-ins wholesale. The same window syncProfileWeight uses: the seven
  // calendar days ending at the latest reading (not the last seven readings, which reach further
  // back whenever there are gaps).
  db.exec(`UPDATE profile SET weight_kg = (
             SELECT ROUND(ROUND(AVG(weight_kg), 2), 1) FROM weighins
              WHERE date >  date((SELECT MAX(date) FROM weighins), '-7 days')
                AND date <= (SELECT MAX(date) FROM weighins))
           WHERE EXISTS (SELECT 1 FROM weighins)`);
  const exCols = db.prepare('PRAGMA table_info(program_exercise)').all().map((c) => c.name);
  if (!exCols.includes('muscles')) db.exec('ALTER TABLE program_exercise ADD COLUMN muscles TEXT');
  if (!exCols.includes('rest')) db.exec('ALTER TABLE program_exercise ADD COLUMN rest TEXT');
  // A cue that rides along into the session ("per leg", "add weight once you hit 12").
  if (!exCols.includes('note')) db.exec('ALTER TABLE program_exercise ADD COLUMN note TEXT');
  const dayCols = db.prepare('PRAGMA table_info(program_day)').all().map((c) => c.name);
  if (!dayCols.includes('title')) db.exec('ALTER TABLE program_day ADD COLUMN title TEXT');
  // Display name, separate from `label`. Renaming a day must never orphan its history, and
  // workout_session.day_label / exercise_log key on the label — so the label stays put.
  if (!dayCols.includes('name')) db.exec('ALTER TABLE program_day ADD COLUMN name TEXT');
  // A day can belong to a range of weeks of its block ("weeks 1-4", "weeks 5-8"), for programmes
  // whose workouts change part-way. Both NULL = every week.
  if (!dayCols.includes('week_from')) db.exec('ALTER TABLE program_day ADD COLUMN week_from INTEGER');
  if (!dayCols.includes('week_to')) db.exec('ALTER TABLE program_day ADD COLUMN week_to INTEGER');
  const proCols = db.prepare('PRAGMA table_info(profile)').all().map((c) => c.name);
  if (!proCols.includes('goal_weight_kg')) db.exec('ALTER TABLE profile ADD COLUMN goal_weight_kg REAL');
  if (!proCols.includes('deload_until')) db.exec('ALTER TABLE profile ADD COLUMN deload_until TEXT');
  if (!proCols.includes('name')) db.exec('ALTER TABLE profile ADD COLUMN name TEXT');
  if (!proCols.includes('about')) db.exec('ALTER TABLE profile ADD COLUMN about TEXT');
  // A database from before the welcome screen already has a real profile in it, so it counts as
  // set up. A brand-new one gets the column from the schema with 0, and goes through /welcome.
  if (!proCols.includes('setup_done')) {
    db.exec('ALTER TABLE profile ADD COLUMN setup_done INTEGER NOT NULL DEFAULT 0');
    db.exec('UPDATE profile SET setup_done = 1');
  }
  // Legacy column, kept so older databases still match the schema. Every block is the coach's and
  // stays 0; nothing sets it to 1 now.
  const rxCols = db.prepare('PRAGMA table_info(prescription)').all().map((c) => c.name);
  if (!rxCols.includes('managed')) db.exec('ALTER TABLE prescription ADD COLUMN managed INTEGER NOT NULL DEFAULT 0');
  // Workout presets. A programme is either a BLOCK's own copy (what Training runs and sessions
  // point at) or a PRESET kept on the shelf to start a block from. Every programme that already
  // exists is a block's. A block points at its copy through program_id; NULL — every block made
  // before presets existed — falls back to the programme marked active.
  const progCols = db.prepare('PRAGMA table_info(program)').all().map((c) => c.name);
  if (!progCols.includes('kind')) db.exec("ALTER TABLE program ADD COLUMN kind TEXT NOT NULL DEFAULT 'block'");
  if (!progCols.includes('from_preset')) db.exec('ALTER TABLE program ADD COLUMN from_preset TEXT');
  // One-off presets: a workout done now and then INSIDE a block (a week with room for only one session),
  // never the programme a block runs. Training lists them separately and the block's rotation
  // ignores them.
  if (!progCols.includes('one_off')) db.exec('ALTER TABLE program ADD COLUMN one_off INTEGER NOT NULL DEFAULT 0');
  if (!rxCols.includes('program_id')) db.exec('ALTER TABLE prescription ADD COLUMN program_id INTEGER REFERENCES program(id)');
  // Legacy columns, kept so older databases still match the schema. Nothing acts on them now.
  if (!rxCols.includes('phase')) db.exec('ALTER TABLE prescription ADD COLUMN phase TEXT');
  if (!rxCols.includes('deficit')) db.exec('ALTER TABLE prescription ADD COLUMN deficit REAL');
  if (!rxCols.includes('target_pct')) db.exec('ALTER TABLE prescription ADD COLUMN target_pct REAL');

  // Legacy columns, kept so older databases still match the schema. Nothing acts on them now.
  if (!proCols.includes('data_from')) {
    db.exec('ALTER TABLE profile ADD COLUMN data_from TEXT');
    db.exec(`UPDATE profile SET data_from = (
               SELECT start_date FROM prescription
                WHERE active = 1 AND start_date IS NOT NULL
                ORDER BY start_date DESC LIMIT 1)`);
  }
  if (!proCols.includes('target_pct_per_week')) {
    db.exec('ALTER TABLE profile ADD COLUMN target_pct_per_week REAL');
    db.exec('UPDATE profile SET target_pct_per_week = ROUND(deficit/(weight_kg*11.0),2) WHERE target_pct_per_week IS NULL AND deficit IS NOT NULL AND weight_kg > 0');
  }
}

/**
 * Give every pre-existing session the exercise list it never had, derived from the sets already
 * logged against it. Order follows the order the sets were entered, which is the order the user trained
 * them; targets are pulled from the programme day where the names match.
 *
 * Runs only for sessions that have no list yet, so it is safe on every boot and does nothing once
 * the migration has happened.
 */
function backfillSessionExercises(db) {
  const orphans = db.prepare(
    `SELECT DISTINCT el.session_id FROM exercise_log el
      WHERE el.session_exercise_id IS NULL`
  ).all().map((r) => r.session_id);
  if (!orphans.length) return;

  const names = db.prepare(
    `SELECT exercise_name, MIN(id) first_id FROM exercise_log
      WHERE session_id = ? GROUP BY exercise_name ORDER BY first_id`
  );
  const prescribed = db.prepare(
    `SELECT pe.sets AS sets, pe.rep_low, pe.rep_high, pe.rir, pe.rest, pe.muscles
       FROM program_exercise pe
       JOIN program_day pd ON pd.id = pe.day_id
       JOIN workout_session ws ON ws.day_label = pd.label AND ws.program_id = pd.program_id
      WHERE ws.id = ? AND lower(pe.name) = lower(?) LIMIT 1`
  );
  const insSex = db.prepare(
    `INSERT INTO session_exercise (session_id, position, name, target_sets, rep_low, rep_high, rir, rest, muscles)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );
  const link = db.prepare(
    'UPDATE exercise_log SET session_exercise_id = ? WHERE session_id = ? AND exercise_name = ?'
  );

  db.transaction(() => {
    for (const sid of orphans) {
      names.all(sid).forEach((row, i) => {
        const p = prescribed.get(sid, row.exercise_name) ?? {};
        const sexId = insSex.run(sid, i, row.exercise_name,
          p.sets ?? null, p.rep_low ?? null, p.rep_high ?? null, p.rir ?? null, p.rest ?? null, p.muscles ?? null
        ).lastInsertRowid;
        link.run(sexId, sid, row.exercise_name);
      });
    }
  })();
}

function seed(db) {
  // A placeholder profile row so every page has one to read. setup_done = 0 sends the first visit
  // to /welcome, which replaces it with the user's own details.
  const hasProfile = db.prepare('SELECT COUNT(*) n FROM profile').get().n;
  if (!hasProfile) {
    db.prepare(`INSERT INTO profile
      (id, sex, weight_kg, body_fat_pct, activity_multiplier, phase, setup_done)
      VALUES (1, 'male', 75, 20, 1.5, 'maintain', 0)`).run();
  }

  // Curated food database — additive, and it RE-SYNCS corrected macros.
  // Insert-only would mean a fixed value (e.g. a bad kcal figure) could never reach an existing
  // database: the name already exists, so the corrected row is skipped forever. Curated rows are
  // therefore updated in place when the seed disagrees. Rows the user made or the AI estimated
  // (source 'custom' / 'ai') are never touched — those are the user's data, not ours.
  const existing = db.prepare("SELECT id, source, basis, kcal, protein, fat, carbs, fibre, tags, name_ja, unit_label FROM foods WHERE name = ? LIMIT 1");
  const ins = db.prepare(`INSERT INTO foods
    (name, name_ja, brand, basis, unit_label, kcal, protein, fat, carbs, fibre, tags, source)
    VALUES (@name, @name_ja, @brand, @basis, @unit_label, @kcal, @protein, @fat, @carbs, @fibre, @tags, 'curated')`);
  const upd = db.prepare(`UPDATE foods SET name_ja=@name_ja, brand=@brand, basis=@basis, unit_label=@unit_label,
    kcal=@kcal, protein=@protein, fat=@fat, carbs=@carbs, fibre=@fibre, tags=@tags WHERE id=@id`);
  const tx = db.transaction((rows) => {
    for (const f of rows) {
      const rec = { name_ja: null, brand: null, unit_label: null, fibre: 0, tags: null, ...f };
      const cur = existing.get(rec.name);
      if (!cur) { ins.run(rec); continue; }
      if (cur.source !== 'curated') continue; // user's own entry wins
      // Compare every synced field, not just the macros — `tags` drives search discoverability,
      // so a tag-only edit has to propagate too.
      const changed =
        ['kcal', 'protein', 'fat', 'carbs', 'fibre'].some((k) => Math.abs((cur[k] ?? 0) - rec[k]) > 0.001) ||
        ['basis', 'tags', 'name_ja', 'unit_label'].some((k) => (cur[k] ?? null) !== (rec[k] ?? null));
      if (changed) upd.run({ ...rec, id: cur.id });
    }
  });
  tx(FOODS);

  // Exercise database — the library rows are REPLACED wholesale when the seed changes, so a lift
  // dropped from the seed disappears here too. Nothing references these rows by id (programmes and
  // logged sets store the NAME), so replacing them is safe. The user's own exercises (source
  // 'custom') are kept, and sit after the library. Re-seed only when the library's count or its
  // first/last name disagree.
  const lib = "source != 'custom'";
  const exCount = db.prepare(`SELECT COUNT(*) n FROM exercise WHERE ${lib}`).get().n;
  const exFirst = db.prepare(`SELECT name FROM exercise WHERE ${lib} ORDER BY position LIMIT 1`).get()?.name;
  const exLast = db.prepare(`SELECT name FROM exercise WHERE ${lib} ORDER BY position DESC LIMIT 1`).get()?.name;
  if (!(exCount === EXERCISES.length && exFirst === EXERCISES[0].name
        && exLast === EXERCISES[EXERCISES.length - 1].name)) {
    const insEx = db.prepare(
      `INSERT INTO exercise (name, category, home, video_url, source, muscles, position)
       VALUES (?,?,?,?,?,?,?)`
    );
    db.transaction(() => {
      db.prepare(`DELETE FROM exercise WHERE ${lib}`).run();
      // A custom lift the library now has under the same name becomes the library's.
      const dropCustom = db.prepare("DELETE FROM exercise WHERE source = 'custom' AND lower(name) = lower(?)");
      EXERCISES.forEach((e) => dropCustom.run(e.name));
      EXERCISES.forEach((e, i) => insEx.run(
        e.name, e.category, e.home, e.video, e.source ?? 'library',
        musclesFor(e.name, e.category), i
      ));
      db.prepare("UPDATE exercise SET position = position + ? WHERE source = 'custom' AND position < ?")
        .run(EXERCISES.length, EXERCISES.length);
    })();
  }

  // Repairs muscle tags written by an earlier, wrong ordering of the keyword rules: leg
  // curls tagged as biceps, the bent-over lateral raise as side delts. Re-tag only rows that still
  // carry exactly the wrong value, so anything set by hand is left alone. Runs harmlessly every boot.
  const retag = [
    ['%leg curl%', 'biceps,~forearm'], ['%hamstring curl%', 'biceps,~forearm'], ['%nordic%', 'biceps,~forearm'],
    ['%bent-over lateral raise%', 'side_delt,~rear_delt']
  ];
  db.transaction(() => {
    for (const [like, wrong] of retag) for (const t of ['exercise', 'program_exercise', 'session_exercise']) {
      const rows = db.prepare(`SELECT DISTINCT name FROM ${t} WHERE lower(name) LIKE ? AND muscles = ?`).all(like, wrong);
      for (const r of rows) db.prepare(`UPDATE ${t} SET muscles = ? WHERE name = ? AND muscles = ?`).run(musclesFor(r.name), r.name, wrong);
    }
  })();

  // No programme is seeded: a new user picks a preset (or builds their own) when they create
  // their first block.
}
