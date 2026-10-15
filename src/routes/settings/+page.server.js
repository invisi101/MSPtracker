import { apiKeyStatus, checkApiKey, saveApiKey, removeApiKey } from '$lib/server/apikey.js';
import { getMealShape, setMealShape, MEALS_MIN, MEALS_MAX } from '$lib/server/repos/chef.js';
import {
  getProfile, updateProfile, getTargets, activePrescription,
  savePrescription, splitPrescription, listPrescriptions, setPrescriptionActive, deletePrescription
} from '$lib/server/repos/profile.js';
import {
  getProgramme, saveDay, saveDayExercises, addDay, deleteDay, listExercises,
  listProgrammes, createPreset, renamePreset, deletePreset, setBlockProgramme, dropUnusedProgramme, startBlockProgramme
} from '$lib/server/repos/training.js';
import { getDb } from '$lib/server/db.js';
import { todayStr, shiftDay } from '$lib/server/date.js';
import { fail, redirect } from '@sveltejs/kit';

export function load({ url }) {
  return {
    apiKey: apiKeyStatus(),
    mealShape: getMealShape(), mealsRange: [MEALS_MIN, MEALS_MAX],
    profile: getProfile(),
    targets: getTargets(),
    prescriptions: listPrescriptions(),
    // The block in force TODAY — not simply the newest active one, which may not have started yet.
    currentBlock: activePrescription() ?? null,
    // Settings can open any programme — a block's or a saved workout — with ?prog=<id>. Without
    // one it opens the programme Training is running today.
    programme: getProgramme(Number(url.searchParams.get('prog')) || undefined) ?? getProgramme(),
    programmes: listProgrammes(),
    exercises: listExercises()
  };
}

const num = (v) => {
  if (v == null) return null;
  const s = v.toString().trim();
  if (s === '') return null;                    // blank means "not set"
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export const actions = {
  startBlockProgramme: async ({ request }) => {
    const f = await request.formData();
    try {
      const pid = startBlockProgramme(num(f.get('rxId')), num(f.get('presetId')));
      throw redirect(303, `/settings?prog=${pid}#programmes`);
    } catch (e) {
      if (e?.status === 303) throw e;
      return fail(400, { progError: e.message });
    }
  },

  saveKey: async ({ request }) => {
    const key = ((await request.formData()).get('api_key') || '').toString().trim();
    const c = await checkApiKey(key);
    if (!c.ok && c.reason === 'invalid') return fail(400, { keyError: c.message });
    saveApiKey(key);
    return { keySaved: true, keyNote: c.ok ? null : `${c.message} It's saved anyway.` };
  },
  removeKey: async () => { removeApiKey(); return { keyRemoved: true }; },

  saveMeals: async ({ request }) => {
    const f = await request.formData();
    return { mealsSaved: true, shape: setMealShape({ breakfast: f.get('breakfast') === '1', meals: Number(f.get('meals')) }) };
  },

  save: async ({ request }) => {
    const f = await request.formData();
    const patch = {};
    for (const k of ['name', 'about']) if (f.has(k)) patch[k] = (f.get(k) ?? '').toString();
    // Blank clears the goal weight; it's only a marker on Home and Progress.
    if (f.has('goal_weight_kg')) patch.goal_weight_kg = num(f.get('goal_weight_kg'));
    updateProfile(patch);
    return { saved: true };
  },

  // A coach's numbers. Each macro is optional (coaches don't always set all three), but the day
  // needs calories: given directly, or worked out from all three macros.
  savePrescription: async ({ request }) => {
    const f = await request.formData();
    const kcal = num(f.get('kcal'));
    const protein_g = num(f.get('protein_g'));
    const fat_g = num(f.get('fat_g'));
    const carbs_g = num(f.get('carbs_g'));
    if (kcal == null && (protein_g == null || fat_g == null || carbs_g == null)) {
      return fail(400, { rxError: 'Enter the calories, or all three macros so the calories can be worked out.' });
    }
    const start = (f.get('start_date') || '').toString().trim();
    const end = (f.get('end_date') || '').toString().trim();
    if (start && end && end < start) {
      return fail(400, { rxError: 'The end date must be after the start date.' });
    }
    try {
      const id = num(f.get('id'));
      const savedId = savePrescription({
        id,
        name: (f.get('name') || '').toString().trim(),
        source: (f.get('source') || '').toString().trim(),
        start_date: start, end_date: end,
        active: f.get('active') != null,
        kcal, protein_g, fat_g, carbs_g,
        notes: (f.get('notes') || '').toString().trim()
      });
      setBlockProgramme(savedId, { presetId: num(f.get('presetId')), isNew: !id });
    } catch (e) {
      // Duplicate name is the expected one here; surfaced on the form rather than as a 500.
      return fail(400, { rxError: e.message });
    }
    return { rxSaved: true };
  },

  // The coach changed the numbers mid-block. Never an in-place edit — see splitPrescription.
  splitPrescription: async ({ request }) => {
    const f = await request.formData();
    const kcal = num(f.get('kcal'));
    const protein_g = num(f.get('protein_g'));
    const fat_g = num(f.get('fat_g'));
    const carbs_g = num(f.get('carbs_g'));
    if (kcal == null && (protein_g == null || fat_g == null || carbs_g == null)) {
      return fail(400, { rxError: 'Enter the calories, or all three macros so the calories can be worked out.' });
    }
    try {
      splitPrescription({
        id: num(f.get('id')),
        from: (f.get('from') || '').toString().trim(),
        name: (f.get('name') || '').toString().trim(),
        source: (f.get('source') || '').toString().trim(),
        kcal, protein_g, fat_g, carbs_g,
        notes: (f.get('notes') || '').toString().trim()
      });
    } catch (e) {
      return fail(400, { rxError: e.message });
    }
    return { rxSplit: true };
  },

  togglePrescription: async ({ request }) => {
    const f = await request.formData();
    setPrescriptionActive(Number(f.get('id')), f.get('active') === '1');
    return { ok: true };
  },

  saveDay: async ({ request }) => {
    const f = await request.formData();
    const id = Number(f.get('id'));
    if (!id) return fail(400, { dayError: 'Unknown day' });
    const wf = num(f.get('week_from')), wt = num(f.get('week_to'));
    if (wf != null && wt != null && wt < wf) return fail(400, { dayError: 'The last week must come after the first.' });
    saveDay({ id, name: (f.get('name') || '').toString().trim(), title: (f.get('title') || '').toString().trim(),
              week_from: wf, week_to: wt });
    let list = [];
    try { list = JSON.parse(f.get('exercises') || '[]'); } catch { return fail(400, { dayError: 'Could not read the exercises' }); }
    if (!Array.isArray(list)) return fail(400, { dayError: 'Could not read the exercises' });
    const same = (e) => (e.origName ?? '').trim().toLowerCase() === (e.name ?? '').trim().toLowerCase();
    saveDayExercises(id, list.map((e) => ({
      // A swapped exercise gets its muscles looked up afresh; a kept one keeps what it had.
      name: e.name, muscle: e.muscle ?? null, slot: e.slot, rir: e.rir, rest: e.rest, muscles: same(e) ? e.muscles : null, note: e.note,
      sets: num(e.sets), rep_low: num(e.rep_low), rep_high: num(e.rep_high)
    })));
    return { daySaved: true };
  },

  addDay: async ({ request }) => {
    const f = await request.formData();
    addDay({ programId: num(f.get('programId')) ?? undefined, name: (f.get('name') || '').toString().trim() || 'New day', title: '' });
    return { ok: true };
  },

  // A preset: blank, or a copy of the programme being looked at. The page opens it straight after.
  newPreset: async ({ request }) => {
    const f = await request.formData();
    try {
      const id = createPreset((f.get('name') || '').toString(), num(f.get('fromId')));
      return { presetCreated: Number(id) };
    } catch (e) {
      return fail(400, { presetError: e.message });
    }
  },

  renamePreset: async ({ request }) => {
    const f = await request.formData();
    try {
      renamePreset(num(f.get('id')), (f.get('name') || '').toString());
    } catch (e) {
      return fail(400, { presetError: e.message });
    }
    return { presetRenamed: true };
  },

  deletePreset: async ({ request }) => {
    deletePreset(num((await request.formData()).get('id')));
    return { presetDeleted: true };
  },

  deleteDay: async ({ request }) => {
    deleteDay(Number((await request.formData()).get('id')));
    return { ok: true };
  },

  deletePrescription: async ({ request }) => {
    const id = Number((await request.formData()).get('id'));
    const pid = getDb().prepare('SELECT program_id FROM prescription WHERE id = ?').get(id)?.program_id;
    deletePrescription(id);
    dropUnusedProgramme(pid);
    return { ok: true };
  }
};
