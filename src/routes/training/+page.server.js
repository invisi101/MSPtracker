import * as T from '$lib/server/repos/training.js';
import { todayStr } from '$lib/server/date.js';
import { parseDuration } from '$lib/format.js';
import { parseRpe } from '$lib/rpe.js';
import { fail, redirect } from '@sveltejs/kit';

export function load({ url }) {
  const date = todayStr();
  const today = T.sessionsOn(date);

  // /training always opens the picker. A session is only shown when one is asked for by id.
  // Auto-opening today's session would make the picker unreachable for the rest of the day;
  // choosing is the point of the page, so it costs one tap to resume and zero taps to pick.
  const activeId = Number(url.searchParams.get('session')) || null;
  const detail = activeId ? T.sessionDetail(activeId) : null;

  // Last time and best ever are scoped to THIS day. A lift can be 3-5 reps on Workout A and 8-10
  // on Workout C; one merged pair of figures compares sets that were never meant to be compared.
  const dayName = detail?.session?.day_name ?? null;
  const splitLifts = new Set(
    T.loggedExerciseNames().filter((e) => e.split).map((e) => e.name)
  );

  const cards = (detail?.exercises ?? []).map((e) => ({
    ...e,
    last: T.lastPerformance(e.name, detail.session.id, dayName),
    best: T.bestSet(e.name, dayName),
    // Only worth naming the day on lifts that actually appear on more than one.
    split: splitLifts.has(e.name)
  }));

  // Calendar month, from ?month=YYYY-MM, defaulting to the month we're in. Kept in the URL so
  // paging back and forth survives a reload and works without JavaScript.
  const asked = url.searchParams.get('month') ?? '';
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : date.slice(0, 7);
  const [my, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(my, mm, 0).getDate();
  const pad = (n) => String(n).padStart(2, '0');
  const shiftMonth = (n) => {
    const d = new Date(my, mm - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  };

  return {
    date,
    calendar: {
      month,
      prev: shiftMonth(-1),
      next: shiftMonth(1),
      daysInMonth,
      // 0 = Sunday, matching the Sunday-to-Saturday week the Saturday check-in uses.
      firstDow: new Date(my, mm - 1, 1).getDay(),
      label: new Date(my, mm - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      sessions: T.sessionsBetween(`${month}-01`, `${month}-${pad(daysInMonth)}`)
    },
    workouts: T.listDays({ date }),
    // Done now and then inside a block; never part of its rotation.
    oneOffs: T.listOneOffs(),
    // Week of the block, for a programme whose workouts change part-way (null otherwise).
    programWeek: T.programWeek(date),
    todaySessions: today,
    lastLogged: T.lastLoggedSession(),
    session: detail?.session ?? null,
    cards,
    known: T.knownExerciseNames(),
    videos: T.videoMap(),
    exercises: T.listExercises()
  };
}

const num = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const actions = {
  start: async ({ request }) => {
    const f = await request.formData();
    // 'workoutId' is the programme DAY id, despite the field's name.
    const dayId = Number(f.get('workoutId')) || null;
    const id = T.startSession(todayStr(), dayId);
    throw redirect(303, `/training?session=${id}`);
  },

  addSet: async ({ request }) => {
    const f = await request.formData();
    const sexId = Number(f.get('sessionExerciseId'));
    if (!sexId) return fail(400, { error: 'unknown exercise' });

    // Trust the stored kind, not a hidden form field — the client can't be allowed to decide
    // which columns a row writes to.
    const ex = T.sessionExercise(sexId);
    if (!ex) return fail(400, { error: 'unknown exercise' });

    if (ex.kind === 'cardio') {
      const durationSec = parseDuration(f.get('duration'));
      const distanceKm = num(f.get('distance'));
      const rpe = parseRpe(f.get('rpe'));
      // At least one of the three has to be present, or the entry records nothing at all.
      if (durationSec == null && (distanceKm == null || distanceKm <= 0) && rpe == null) {
        return fail(400, { error: 'enter a time, a distance or an RPE' });
      }
      T.addSetFor(sexId, {
        durationSec,
        distanceKm: distanceKm != null && distanceKm > 0 ? distanceKm : null,
        rpe
      });
      return { ok: true };
    }

    const reps = num(f.get('reps'));
    // NaN is not null: without the finite check a non-numeric entry slips straight into the log.
    if (reps == null || !Number.isFinite(reps) || reps <= 0) return fail(400, { error: 'reps required' });
    const weight = num(f.get('weight'));
    T.addSetFor(sexId, { weightKg: weight != null && weight >= 0 ? weight : null, reps: Math.round(reps) });
    return { ok: true };
  },

  editSet: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    const existing = T.getSet(id);
    if (!existing) return fail(400, { error: 'unknown entry' });

    // Kind comes from the stored exercise, never the form — the same rule as logging.
    if (existing.kind === 'cardio') {
      const durationSec = parseDuration(f.get('duration'));
      const distanceKm = num(f.get('distance'));
      const rpe = parseRpe(f.get('rpe'));
      if (durationSec == null && (distanceKm == null || distanceKm <= 0) && rpe == null) {
        return fail(400, { error: 'enter a time, a distance or an RPE' });
      }
      T.updateSet(id, { weight: null, reps: existing.reps, rir: existing.rir });
      return { ok: true };
    }

    const reps = num(f.get('reps'));
    if (reps == null || !Number.isFinite(reps) || reps <= 0) return fail(400, { error: 'reps required' });
    const weight = num(f.get('weight'));
    T.updateSet(id, { weight: weight != null && weight >= 0 ? weight : null, reps: Math.round(reps), rir: existing.rir });
    return { ok: true };
  },

  deleteSet: async ({ request }) => {
    T.deleteSet(Number((await request.formData()).get('id')));
    return { ok: true };
  },

  addExercise: async ({ request }) => {
    const f = await request.formData();
    const name = (f.get('name') || '').toString().trim();
    if (!name) return fail(400, { error: 'name required' });
    T.addSessionExercise(Number(f.get('sessionId')), name, (f.get('muscle') || '').toString() || null);
    return { ok: true };
  },

  removeExercise: async ({ request }) => {
    T.removeSessionExercise(Number((await request.formData()).get('id')));
    return { ok: true };
  },

  move: async ({ request }) => {
    const f = await request.formData();
    T.moveSessionExercise(Number(f.get('id')), f.get('dir') === 'up' ? 'up' : 'down');
    return { ok: true };
  },

  // Notes save quietly on their own (no page refresh), so typing one never moves the screen.
  liftNote: async ({ request }) => {
    const f = await request.formData();
    T.setLiftNote(Number(f.get('id')), f.get('note'));
    return { ok: true };
  },
  sessionNote: async ({ request }) => {
    const f = await request.formData();
    T.setSessionNote(Number(f.get('id')), f.get('note'));
    return { ok: true };
  },

  finish: async ({ request }) => {
    T.finishSession(Number((await request.formData()).get('id')));
    throw redirect(303, '/training');
  },

  reopen: async ({ request }) => {
    const id = Number((await request.formData()).get('id'));
    T.reopenSession(id);
    throw redirect(303, `/training?session=${id}`);
  },

  deleteSession: async ({ request }) => {
    T.deleteSession(Number((await request.formData()).get('id')));
    throw redirect(303, '/training');
  }
};
