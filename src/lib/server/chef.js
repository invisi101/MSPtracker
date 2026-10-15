// "Ask the chef" — grounded AI for cooking help. Raw fetch to the Anthropic Messages API (no SDK).
import { getProfile, getTargets } from './repos/profile.js';
import { getMealShape, mealSlots } from './repos/chef.js';

const API = 'https://api.anthropic.com/v1/messages';
const MODEL = () => process.env.COACH_MODEL || 'claude-opus-4-8';
import { getApiKey } from './apikey.js';
const KEY = () => getApiKey();

const GROUNDING = `
You are the user's personal chef — practical, upbeat, and time-aware. They are busy and want TASTY, SIMPLE, VARIED food; no gourmet, no fuss.
HARD RULES:
- Keep it simple and quick unless they ask for something involved. Prefer their staple foods and things easy to buy where they live.
- Give macros (kcal + protein/fat/carbs) when you suggest a dish or swap, and say they're estimates. Favour high-protein, portion-aware answers unless their targets say otherwise.
- Metric units (g, ml, °C). Be concise: ingredients as a short list, method as a few numbered steps.
- Sweet things are budgeted rather than banned — if the day's numbers leave room, a treat is fine.
- If they ask how to cook something from their recipe book or a variation, just give them the concise recipe.`;

/** The coach's daily targets in words, saying plainly which ones the coach hasn't set. */
export function targetsText(t) {
  if (!t?.has) return 'They have no daily targets from their coach entered yet.';
  const parts = [t.targetKcal != null && `${t.targetKcal} kcal`, t.proteinG != null && `${t.proteinG} g protein`,
                 t.fatG != null && `${t.fatG} g fat`, t.carbsG != null && `${t.carbsG} g carbs`].filter(Boolean);
  return parts.length ? `Daily targets set by their coach: ${parts.join(', ')}.` : 'Their coach has set no daily numbers.';
}

function ctx(p, t) {
  const name = p.name?.trim() ? ` The user's name is ${p.name.trim()}; address them by it.` : '';
  const about = p.about?.trim() ? `\nIn their own words: ${p.about.trim()}` : '';
  const shape = getMealShape();
  const meals = ` They eat ${shape.meals} meals a day (${mealSlots(shape).join(', ').toLowerCase()})${shape.breakfast ? '' : ' and skip breakfast'}.`;
  return `\nTHE USER TODAY: ${p.weight_kg} kg. ${targetsText(t)} There is an 89-recipe library in the app (simple & fancy, high-protein).${meals}${name}${about}`;
}

export function chefConfigured() { return !!KEY(); }

// One place for the Anthropic call so askChef and suggestFill can't drift apart.
// effort:low keeps this cheap and quick — plenty for meal suggestions — and, on any
// always-thinking model (e.g. claude-fable-5 via COACH_MODEL), stops the whole
// max_tokens budget being spent on thinking and leaving an empty answer.
async function callChef(body) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'x-api-key': KEY(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ output_config: { effort: 'low' }, ...body })
    });
    if (!res.ok) return { error: `Chef API error ${res.status}` };
    const data = await res.json();
    if (data.stop_reason === 'refusal') return { error: 'The chef declined to answer that.' };
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return { text };
  } catch (e) {
    return { error: 'Could not reach the chef service.' };
  }
}

export async function askChef(history) {
  if (!KEY()) return { error: 'The AI chef needs an Anthropic API key. Add one in Settings.' };
  const profile = getProfile(), targets = getTargets();
  return callChef({
    model: MODEL(), max_tokens: 2000,
    system: GROUNDING + ctx(profile, targets),
    messages: history.map((m) => ({ role: m.role, content: m.content }))
  });
}

// "Fill the rest of my day" — given what's already logged, suggest a few options to land on the
// coach's targets. The remaining numbers are computed here (deterministic); the AI only chooses
// foods and scales servings. Macros the coach didn't set are left out rather than guessed.
export async function suggestFill({ targets: t, totals, log }) {
  if (!KEY()) return { error: 'The AI chef needs an Anthropic API key. Add one in Settings.' };
  if (!t?.has || t.targetKcal == null) return { error: "Add your coach's calories first. The chef plans the rest of the day against them." };
  const r0 = (n) => Math.round(n);
  const rem = {
    kcal: r0(t.targetKcal - totals.kcal),
    protein: t.proteinG != null ? r0(t.proteinG - totals.protein) : null,
    fat: t.fatG != null ? r0(t.fatG - totals.fat) : null,
    carbs: t.carbsG != null ? r0(t.carbsG - totals.carbs) : null
  };
  const overFat = rem.fat != null && rem.fat < 0;
  const eaten = log.length
    ? log.map((e) => `${e.name} — ${r0(e.kcal)} kcal, ${e.protein}P/${e.carbs}C/${e.fat}F`).join('; ')
    : 'nothing yet';
  const user = `What should I eat for the REST of today to land on my targets?

${targetsText(t)}
Eaten so far: ${eaten}.
Totals so far: ${r0(totals.kcal)} kcal · ${r0(totals.protein)}P / ${r0(totals.fat)}F / ${r0(totals.carbs)}C.
REMAINING to hit target: ${[`${rem.kcal} kcal`, rem.protein != null && `${rem.protein} g protein`, rem.carbs != null && `${rem.carbs} g carbs`,
  rem.fat != null && !overFat && `${rem.fat} g fat`].filter(Boolean).join(', ')}.${overFat ? ` NOTE: I am already ${-rem.fat} g over my fat target for the day, so keep ADDED fat as low as possible.` : ''}

Give me 3 distinct options for the rest of the day. Rules:
- ${overFat
      ? 'Because fat is already over, favour LEAN protein (chicken breast, white fish, whey, egg white, 0% Greek yoghurt) and low-fat carbs (rice, potato, oats, fruit), and keep added fat minimal.'
      : 'Keep fat sensible and in line with the target if there is one.'}
- Protein comes first — get close to any remaining protein even if that runs kcal slightly over.
- Adjust serving sizes freely to hit the numbers; give SPECIFIC metric amounts (e.g. "180 g chicken breast + 200 g cooked rice").
- It is fine if an option can't hit every macro — say the trade-off in one short line (e.g. "lands protein, ~120 kcal under").
- Each option: a short title, the foods with serving sizes, then its estimated total (kcal + P/C/F, note they're estimates). Keep it tight, no preamble.`;

  return callChef({ model: MODEL(), max_tokens: 2000, system: GROUNDING + ctx(getProfile(), t), messages: [{ role: 'user', content: user }] });
}
