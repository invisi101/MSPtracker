import { fail } from '@sveltejs/kit';
import { updateProfile } from '$lib/server/repos/profile.js';
import { addWeighin } from '$lib/server/repos/progress.js';
import { todayStr } from '$lib/server/date.js';
import { checkApiKey, saveApiKey } from '$lib/server/apikey.js';

const num = (v) => {
  const s = (v ?? '').toString().trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export const actions = {
  default: async ({ request }) => {
    const f = await request.formData();
    const v = Object.fromEntries(f);
    const weight = num(v.weight_kg), goal = num(v.goal_weight_kg);
    const errors = {};
    if (!(weight >= 30 && weight <= 300)) errors.weight_kg = 'In kilograms, between 30 and 300.';
    if (goal != null && !(goal >= 30 && goal <= 300)) errors.goal_weight_kg = 'In kilograms, or leave it blank.';
    // The key is optional. A wrong one is refused here, so a typo shows now rather than the first
    // time the assistant is asked something. If Anthropic can't be reached, it's kept anyway.
    const apiKey = (v.api_key ?? '').toString().trim();
    let keyNote = null;
    if (apiKey && !Object.keys(errors).length) {
      const c = await checkApiKey(apiKey);
      if (!c.ok && c.reason === 'invalid') errors.api_key = c.message;
      else if (!c.ok) keyNote = `${c.message} It's saved anyway; if the AI features don't work, check it in Settings.`;
    }
    const { api_key, ...safe } = v;   // never echo the key back into the page
    if (Object.keys(errors).length) return fail(400, { errors, values: safe });

    const today = todayStr();
    // Weigh-in first: it moves profile.weight_kg onto the 7-day average, which on day one is
    // simply this figure.
    addWeighin(today, weight);
    updateProfile({
      name: v.name, about: v.about, weight_kg: weight,
      goal_weight_kg: goal ?? null, data_from: today, setup_done: 1
    });
    if (apiKey) saveApiKey(apiKey);
    return { done: true, keySaved: !!apiKey, keyNote };
  }
};
