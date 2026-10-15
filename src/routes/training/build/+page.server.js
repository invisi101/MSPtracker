import { fail, redirect } from '@sveltejs/kit';
import { listExercises, listProgrammes, createPresetWithDays, setBlockProgramme, startBlockProgramme } from '$lib/server/repos/training.js';
import { activePrescription } from '$lib/server/repos/profile.js';

export function load() {
  const rx = activePrescription();
  return {
    names: listExercises().map((e) => e.name),
    presetNames: listProgrammes().filter((p) => p.kind === 'preset').map((p) => p.name),
    block: rx ? { id: rx.id, name: rx.name ?? 'your block', hasWorkouts: !!rx.program_id } : null
  };
}

const int = (v) => {
  const n = Number(String(v ?? '').trim());
  return String(v ?? '').trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export const actions = {
  default: async ({ request }) => {
    const f = await request.formData();
    let w;
    try { w = JSON.parse(f.get('workout') || '{}'); } catch { return fail(400, { error: 'Could not read the workout.' }); }
    const name = (w.name || '').trim();
    if (!name) return fail(400, { error: 'Give the workout a name.' });
    const days = (w.days || []).map((d) => ({
      name: d.name,
      exercises: (d.exercises || []).filter((e) => (e.name || '').trim()).map((e) => ({
        name: e.name, muscle: e.muscle || null, sets: int(e.sets), rep_low: int(e.rep_low), rep_high: int(e.rep_high) ?? int(e.rep_low),
        rir: (e.rir || '').toString().trim() || null, rest: (e.rest || '').toString().trim() || null
      }))
    })).filter((d) => d.exercises.length);
    if (!days.length) return fail(400, { error: 'Add at least one exercise.' });

    let presetId;
    try { presetId = createPresetWithDays(name, days); } catch (e) { return fail(400, { error: e.message }); }

    if (w.useNow) {
      const rx = activePrescription();
      if (rx) {
        try {
          if (rx.program_id) setBlockProgramme(rx.id, { presetId });
          else startBlockProgramme(rx.id, presetId);
        } catch (e) { return fail(400, { error: `Saved as a preset, but it couldn't be put into use: ${e.message}` }); }
      }
    }
    redirect(303, `/training?built=${encodeURIComponent(name)}${w.useNow ? '&inuse=1' : ''}`);
  }
};
