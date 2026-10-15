// Perceived exertion, 1-5. Cardio only — strength logging is deliberately weight + reps with no
// per-set effort rating. One definition so the picker, the server-side validation and every
// label agree.
export const RPE_MIN = 1;
export const RPE_MAX = 5;

export const RPE_SCALE = [
  { value: 1, label: 'Very easy' },
  { value: 2, label: 'Easy' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Hard' },
  { value: 5, label: 'Maximal' }
];

const BY_VALUE = new Map(RPE_SCALE.map((r) => [r.value, r.label]));

/** Whole number inside the scale, or null. Anything else is treated as "not recorded". */
export function parseRpe(input) {
  if (input === '' || input == null) return null;
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= RPE_MIN && r <= RPE_MAX ? r : null;
}

export const rpeLabel = (v) => BY_VALUE.get(Number(v)) ?? null;
