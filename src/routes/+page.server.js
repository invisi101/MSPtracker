import { getProfile, getTargets } from '$lib/server/repos/profile.js';
import { getDb } from '$lib/server/db.js';
import { todayStr, shiftDay } from '$lib/server/date.js';
import { addWeighin, MEASURE_SITES, getWeighins, rollingAverages } from '$lib/server/repos/progress.js';
import { checkInWeek, weekProgress } from '$lib/server/repos/checkin.js';
import { fail } from '@sveltejs/kit';

export function load() {
  const db = getDb();
  const today = todayStr();
  const weekAgo = shiftDay(today, -6);
  const profile = getProfile();
  const targets = getTargets();

  const totals = db.prepare(`
    SELECT COALESCE(SUM(kcal),0) kcal, COALESCE(SUM(protein),0) protein,
           COALESCE(SUM(fat),0) fat, COALESCE(SUM(carbs),0) carbs, COALESCE(SUM(fibre),0) fibre
    FROM food_log WHERE date = ?`).get(today);

  const latestWeight = db.prepare('SELECT weight_kg, date FROM weighins ORDER BY date DESC LIMIT 1').get();

  // Drives the weekly measurement reminder. How many distinct SITES were recorded on each recent
  // date, not just whether any were — the reminder only clears once the full round is done.
  // Keyed by date so the page can look up its own clock's today; an installed PWA can sit open
  // across midnight, so the server's idea of "today" isn't authoritative here.
  const sitesByDate = Object.fromEntries(
    db.prepare(
      `SELECT date, COUNT(DISTINCT site) n FROM measurements
        WHERE date >= date('now','localtime','-21 days') GROUP BY date`
    ).all().map((r) => [r.date, r.n])
  );
  const lastMeasured = db.prepare('SELECT MAX(date) d FROM measurements').get()?.d ?? null;

  // The same 7-day trailing average the Progress page leads with, so the two never disagree.
  const roll = rollingAverages(getWeighins());

  return {
    profile,
    targets,
    // Whether the coach's numbers cover today. Without them there are no targets to score against,
    // and the Saturday check-in card has nothing to report.
    onBlock: targets.has,
    coachBlock: targets.has,
    totals,
    latestWeight,
    avgWeight: roll.length ? roll[roll.length - 1].avg : null,
    checkin: checkInWeek(today),
    lastMeasured,
    sitesByDate,
    totalSites: MEASURE_SITES.length,
    today,
    // Dates and values only, so the form can warn before overwriting a day already logged.
    weighins: db.prepare('SELECT date, weight_kg FROM weighins ORDER BY date DESC').all(),
    week: weekProgress(today)
  };
}

export const actions = {
  weighin: async ({ request }) => {
    const f = await request.formData();
    const kg = Number(f.get('weight_kg'));
    const date = (f.get('date') || '').toString().trim() || todayStr();
    if (!Number.isFinite(kg) || kg <= 0) return fail(400, { error: 'weight required' });
    addWeighin(date, kg);
    return { ok: true };
  }
};
