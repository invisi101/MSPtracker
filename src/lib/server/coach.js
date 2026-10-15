// The AI assistant and AI food estimates — call the Anthropic Messages API directly (raw fetch,
// no SDK). Model defaults to claude-opus-4-8, which doesn't think unless asked, so the token
// budget goes to the answer (override with COACH_MODEL).
import { getProfile, getTargets } from './repos/profile.js';
import { targetsText } from './chef.js';
import { getDays, getExercises } from './repos/training.js';

const API = 'https://api.anthropic.com/v1/messages';
const MODEL = () => process.env.COACH_MODEL || 'claude-opus-4-8';
import { getApiKey } from './apikey.js';
const KEY = () => getApiKey();

// What the assistant is for. The user's numbers and programme come from their own coach; the
// assistant explains and supports that plan and never replaces it.
const GROUNDING = `
You are a friendly, practical assistant inside a training and nutrition tracker. The user follows a programme and daily targets set by their own coach, and records their food, weight and workouts here.

HOW TO HELP:
- Explain, encourage and help them carry out their coach's plan: logging, hitting their numbers, technique cues, food swaps, what a term means, how to read their own data.
- Never set or change their calories, macros, programme, sets, reps or loads, and never suggest a new plan. If they ask for one, or you think something in the plan is off, say it's a question for their coach and help them put it clearly.
- Use sound, mainstream exercise and nutrition knowledge for general questions. Neutral facts (e.g. "how many calories in a pint of Guinness") are fine.
- Metric units (kg, cm, g). Be concise and practical.`;

function userContext(profile, targets) {
  // Built from the database, so it is always the user's current programme and equipment.
  const days = getDays();
  const programme = days.length
    ? `${days.length}-day rotation: ${days.map((d) => d.name || d.label).join(', ')}.`
    : 'No programme entered yet.';
  const exercises = [...new Set(days.flatMap((d) => getExercises(d.id).map((e) => e.name)))];
  const about = profile.about?.trim() ? `\nIn their own words: ${profile.about.trim()}` : '';
  return `
ABOUT THE USER${profile.name?.trim() ? ` (${profile.name.trim()}, address them by name)` : ''}: weighs ${profile.weight_kg} kg.
${targetsText(targets)}${targets.prescription?.source ? ` Coach: ${targets.prescription.source}.` : ''}${targets.prescription?.notes ? `\nCoach's notes: ${targets.prescription.notes}` : ''}
Programme: ${programme}${exercises.length ? ` Lifts: ${exercises.join(', ')}.` : ''}${about}`;
}

export function coachConfigured() { return !!KEY(); }

export async function coachChat(history) {
  if (!KEY()) return { error: 'The AI assistant needs an Anthropic API key. Add one in Settings.' };
  const profile = getProfile(), targets = getTargets();
  const body = {
    model: MODEL(), max_tokens: 1200,
    system: GROUNDING + userContext(profile, targets),
    messages: history.map((m) => ({ role: m.role, content: m.content }))
  };
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'x-api-key': KEY(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return { error: `Coach API error ${res.status}` };
    const data = await res.json();
    if (data.stop_reason === 'refusal') return { error: 'The coach declined to answer that.' };
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return { text };
  } catch (e) {
    return { error: 'Could not reach the coach service.' };
  }
}

export async function estimateFood(description) {
  if (!KEY()) return { error: 'AI food estimates need an Anthropic API key. Add one in Settings.' };
  const sys = `Estimate the nutrition of the described food or drink. Metric units only.
Determine the PORTION as an amount + unit:
- If the text states a quantity, use it exactly. Examples: "300g steak" -> amount 300, unit "g"; "coca cola 330ml" -> amount 330, unit "ml"; "2 eggs" -> amount 2, unit "egg"; "a can of coke" -> amount 330, unit "ml".
- If NO quantity is given, assume ONE common single serving and return that. Examples: "steak" -> amount 200, unit "g"; "banana" -> amount 1, unit "medium"; "beer" -> amount 350, unit "ml"; "coffee, black" -> amount 250, unit "ml".
The kcal and macro numbers MUST be for exactly that amount+unit (NOT per 100 g).
Reply with ONLY a compact JSON object and nothing else: {"name": string, "amount": number, "unit": string, "kcal": number, "protein_g": number, "fat_g": number, "carbs_g": number}. No commentary, no code fences.`;
  const body = { model: MODEL(), max_tokens: 300, system: sys, messages: [{ role: 'user', content: description }] };
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'x-api-key': KEY(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return { error: `API error ${res.status}` };
    const data = await res.json();
    let text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    text = text.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    const j = JSON.parse(text);
    const amount = Number(j.amount) > 0 ? Number(j.amount) : 1;
    return { food: {
      name: j.name || description,
      amount, unit: (j.unit || 'serving').toString(),
      kcal: Math.round(j.kcal || 0), protein: +(+j.protein_g || 0).toFixed(1), fat: +(+j.fat_g || 0).toFixed(1), carbs: +(+j.carbs_g || 0).toFixed(1)
    } };
  } catch (e) {
    return { error: 'Could not estimate that — try naming it differently.' };
  }
}
