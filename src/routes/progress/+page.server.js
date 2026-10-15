import * as P from '$lib/server/repos/progress.js';
import { liftProgress } from '$lib/server/repos/training.js';
import { getProfile, getTargets } from '$lib/server/repos/profile.js';
import { saveUpload } from '$lib/server/uploads.js';
import { todayStr } from '$lib/server/date.js';
import { fail } from '@sveltejs/kit';

export function load() {
  const weighins = P.getWeighins();
  return {
    weighins,
    roll: P.rollingAverages(weighins),
    trend: P.weeklyTrend(weighins),
    latest: P.latestWeighin(),
    measurements: P.getMeasurements(),
    latestMeasure: P.latestMeasurements(),
    sites: P.MEASURE_SITES,
    photos: P.getPhotos(),
    adherence: P.dailyAdherence(),
    profile: getProfile(),
    targets: getTargets(),
    // The block drives this page: its dates and goal weight are what the plan line is drawn from.
    block: P.blockGoal(),
    lifts: liftProgress(),
    today: todayStr()
  };
}

const num = (v) => (v === '' || v == null ? null : Number(v));

export const actions = {
  measurement: async ({ request }) => {
    const f = await request.formData();
    const cm = num(f.get('value_cm'));
    if (!cm || !Number.isFinite(cm)) return fail(400, { error: 'value required' });
    if (!P.MEASURE_SITES.includes(f.get('site'))) return fail(400, { error: 'pick a site' });
    P.addMeasurement(f.get('date') || todayStr(), f.get('site'), cm);
    return { ok: true };
  },
  delMeasurement: async ({ request }) => { P.deleteMeasurement(Number((await request.formData()).get('id'))); return { ok: true }; },

  photo: async ({ request }) => {
    const f = await request.formData();
    const name = await saveUpload(f.get('photo'));
    if (!name) return fail(400, { error: 'no image' });
    P.addPhoto(f.get('date') || todayStr(), name);
    return { ok: true };
  },
  delPhoto: async ({ request }) => { P.deletePhoto(Number((await request.formData()).get('id'))); return { ok: true }; }
};
