// The muscles a user can name for an exercise the app doesn't know. Values are the body map's
// muscle tags; 'none' means "not sure", which leaves the lift off the body map.
export const MUSCLE_CHOICES = [
  ['chest', 'Chest'], ['lats', 'Back (lats)'], ['upper_back', 'Upper back'], ['traps', 'Traps'],
  ['front_delt', 'Front shoulders'], ['side_delt', 'Side shoulders'], ['rear_delt', 'Rear shoulders'],
  ['biceps', 'Biceps'], ['triceps', 'Triceps'], ['forearm', 'Forearms'],
  ['quads', 'Quads'], ['hamstrings', 'Hamstrings'], ['glutes', 'Glutes'], ['adductors', 'Inner thighs'],
  ['calves', 'Calves'], ['lower_back', 'Lower back'], ['abs', 'Abs'], ['obliques', 'Obliques'],
  ['none', 'Not sure']
];
const VALID = new Set(MUSCLE_CHOICES.map(([v]) => v));
/** What to store for a user's answer: the tag, or null for "not sure" or anything unknown. */
export const muscleTag = (v) => (VALID.has(v) && v !== 'none' ? v : null);
