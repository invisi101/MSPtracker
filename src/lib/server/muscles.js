/**
 * Exercise -> muscle keys, for the body map.
 *
 * The map's vocabulary is fixed by BodyMap.svelte and the seeded programme: a bare name is a
 * PRIMARY mover, a `~` prefix is secondary.
 *
 *   primary    biceps calves chest front_delt glutes hamstrings lats quads side_delt triceps
 *   secondary  ~adductors ~biceps ~forearm ~front_delt ~hamstrings ~lower_back ~rear_delt
 *              ~traps ~triceps ~quads ~glutes ~chest
 *
 * Driven off each exercise's category, which is already a movement pattern, so the whole library
 * is covered by a couple of dozen rules rather than one hand-written line per exercise. A few
 * exercises are then corrected by name where the pattern misleads — a hip thrust is filed under Hinge but is glute-dominant, and
 * a chin-up loads the biceps far more than a lat pulldown does.
 */
const BY_CATEGORY = {
  'Squat (Quad Primary)': 'quads,glutes,~hamstrings,~adductors,~lower_back',
  'Quad Primary': 'quads,glutes,~hamstrings,~adductors,~lower_back',
  'Quad Accessory': 'quads,~glutes,~hamstrings',
  'Hinge Primary': 'hamstrings,glutes,~lower_back,~traps,~forearm',
  'Hinge/Hamstring Primary': 'hamstrings,glutes,~lower_back,~traps,~forearm',
  'Hamstring Accessory': 'hamstrings,~glutes',
  Calves: 'calves',
  'Horizontal Push (Chest)': 'chest,~front_delt,~triceps',
  'Horizontal Push': 'chest,~front_delt,~triceps',
  'Chest Accessory': 'chest,~front_delt',
  'Horizontal Pull (Back)': 'lats,~biceps,~rear_delt,~traps,~forearm',
  'Horizontal Pull': 'lats,~biceps,~rear_delt,~traps,~forearm',
  'Vertical Pull (Back)': 'lats,~biceps,~rear_delt,~forearm',
  'Vertical Pull': 'lats,~biceps,~rear_delt,~forearm',
  'Vertical Pull (Back) / Vertical Pull': 'lats,~biceps,~rear_delt,~forearm',
  'Vertical Push (Shoulders)': 'front_delt,~side_delt,~triceps',
  'Vertical Push': 'front_delt,~side_delt,~triceps',
  'Shoulder Accessory': 'side_delt,~rear_delt',
  Biceps: 'biceps,~forearm',
  Triceps: 'triceps',
  'Triceps / Horizontal Push': 'triceps,~chest,~front_delt'
};

// Matched case-insensitively on the exercise name containing the key.
const BY_NAME = [
  ['hip thrust', 'glutes,~hamstrings,~quads'],
  ['glute bridge', 'glutes,~hamstrings'],
  ['chin-up', 'lats,biceps,~rear_delt,~forearm'],
  ['chin up', 'lats,biceps,~rear_delt,~forearm'],
  // Must come before the generic 'curl': first match wins, or every leg curl reads as a biceps curl.
  ['leg curl', 'hamstrings'],
  ['hamstring curl', 'hamstrings'],
  ['nordic', 'hamstrings'],
  ['bicep', 'biceps,~forearm'],
  ['curl', 'biceps,~forearm'],
  ['skullcrusher', 'triceps'],
  ['tricep', 'triceps'],
  ['dip', 'triceps,~chest,~front_delt'],
  ['calf', 'calves'],
  // Bent over, a lateral raise is a rear-delt exercise; before the generic 'lateral raise'.
  ['bent-over lateral raise', 'rear_delt,~traps'],
  ['lateral raise', 'side_delt,~rear_delt'],
  ['lat raise', 'side_delt,~rear_delt'],
  ['reverse fly', 'rear_delt,~traps'],
  ['pull-apart', 'rear_delt,~traps'],
  ['face pull', 'rear_delt,~traps,~biceps'],
  ['shrug', 'traps,~forearm'],
  ['leg extension', 'quads'],
  ['abduction', 'glutes'],
  ['lunge', 'quads,glutes,~hamstrings'],
  ['split squat', 'quads,glutes,~hamstrings'],
  ['step-up', 'quads,glutes,~hamstrings'],
  ['back extension', 'lower_back,~glutes,~hamstrings'],
  ['good morning', 'hamstrings,~glutes,~lower_back'],
  ['plank', 'abs,~obliques'],
  ['crunch', 'abs'],
  ['sit-up', 'abs'],
  ['leg raise', 'abs,~obliques'],
  ['fly', 'chest,~front_delt'],
  ['pullover', 'lats,~chest,~triceps']
];

export function musclesFor(name = '', category = '') {
  const n = String(name).toLowerCase();
  for (const [key, muscles] of BY_NAME) if (n.includes(key)) return muscles;
  return BY_CATEGORY[category] ?? null;
}
