import { fail, redirect } from '@sveltejs/kit';
import { listPrescriptions } from '$lib/server/repos/profile.js';
import { nextBlockName, createCoachBlock } from '$lib/server/repos/blocks.js';
import { listProgrammes, getProgramme, programFor } from '$lib/server/repos/training.js';
import { todayStr, shiftDay } from '$lib/server/date.js';

export function load() {
  const blocks = listPrescriptions().filter((r) => r.active);
  // Default: the day after the latest block ends (or today), for twelve weeks.
  const lastEnd = blocks.map((r) => r.end_date).filter(Boolean).sort().at(-1) ?? null;
  const start = lastEnd && lastEnd >= todayStr() ? shiftDay(lastEnd, 1) : todayStr();
  const presets = listProgrammes().filter((p) => p.kind === 'preset' && !p.one_off)
    .map((p) => ({ id: p.id, name: p.name, days: getProgramme(p.id).days.map((d) => ({ name: d.name, exercises: d.exercises.map((e) => e.name) })) }));
  const current = programFor();
  return {
    defaults: { name: nextBlockName(), startDate: start, endDate: shiftDay(start, 84) },
    blocks: blocks.map((r) => ({ id: r.id, name: r.name, start_date: r.start_date, end_date: r.end_date })),
    presets,
    current: current ? { id: current.id, name: current.name } : null
  };
}

export const actions = {
  default: async ({ request }) => {
    const f = await request.formData();
    let input;
    try { input = JSON.parse(f.get('payload') || '{}'); } catch { return fail(400, { error: 'Could not read the form.' }); }
    const r = createCoachBlock(input);
    if (!r.ok) return fail(400, { error: r.reason });
    redirect(303, `/settings?prog=${r.programId ?? ''}&created=${encodeURIComponent(input.name || '')}`);
  }
};
