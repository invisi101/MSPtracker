// One lift, one name. Per-lift history, form videos and the body map all key on an exercise's
// NAME, so "BB Squat" typed next to "BB Back Squat" silently starts a second, empty history.
// This works out which standard name a typed one means. Pure functions, used on the page (to
// show the user what will happen) and on the server (to actually save the standard name).
//
// matchExercise(typed, names) → one of
//   { kind: 'exact',   name }          already a standard name (case aside)
//   { kind: 'alias',   name }          a recognised variant; save it as `name`
//   { kind: 'suggest', options: [...] } close to some standard names, but not certain
//   { kind: 'new' }                    nothing like it; keep it as a new exercise
//   { kind: 'empty' }

const WORD = {
  barbell: 'bb', barbells: 'bb', dumbbell: 'db', dumbbells: 'db', dumbell: 'db', dumbells: 'db',
  kettlebell: 'kb', kettlebells: 'kb', bodyweight: 'bw', ezbar: 'ez bar', ez: 'ez',
  pulldown: 'pull down', pulldowns: 'pull down', pullup: 'pull up', pullups: 'pull up',
  pushup: 'push up', pushups: 'push up', chinup: 'chin up', chinups: 'chin up', stepup: 'step up',
  skull: 'skull', skullcrushers: 'skullcrusher', flyes: 'fly', flies: 'fly', flys: 'fly',
  triceps: 'tricep', biceps: 'bicep', lateral: 'lateral', lat: 'lat',
  ups: 'up', downs: 'down', one: '1', single: '1', alternate: 'alternating'
};
const PHRASE = [
  [/\bbody ?weight\b/g, 'bw'], [/\bskull ?crushers?\b/g, 'skullcrusher'], [/\bez[- ]?bar\b/g, 'ez bar'],
  [/\bromanian dead ?lifts?\b/g, 'rdl'], [/\bdead ?lifts?\b/g, 'deadlift'],
  [/\bw\/ ?1 ?sec(ond)? pause\b/g, ''], [/\bwith (a )?1 ?sec(ond)? pause\b/g, ''], [/\bpaused?\b/g, ''],
  [/\bsingle[- ]leg\b/g, 'singleleg'], [/\b(one|1)[- ]leg\b/g, 'singleleg']
];
const FILLER = new Set(['the', 'a', 'with', 'w', 'and', 'of']);
const EQUIPMENT = new Set(['bb', 'db', 'kb', 'bw', 'cable', 'machine', 'band', 'smith', 'landmine', 'trx', 'ez']);

function singular(w) {
  if (w.length <= 3 || /ss$/.test(w)) return w;
  if (/(ss|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}

/** The comparison form of a name: lower case, one spelling per word, singular, no filler. */
export function normalise(name) {
  let s = ` ${String(name ?? '').toLowerCase()} `;
  for (const [re, to] of PHRASE) s = s.replace(re, to);
  s = s.replace(/[^a-z0-9]+/g, ' ');
  const words = s.trim().split(/\s+/).filter(Boolean)
    .flatMap((w) => (WORD[w] ?? w).split(' '))
    .map(singular)
    .filter((w) => !FILLER.has(w));
  return words.join(' ');
}
const sortedKey = (n) => normalise(n).split(' ').sort().join(' ');

// Variants that mean a standard lift but don't reduce to it by spelling alone. Written as people
// type them; keys are normalised when the table is built.
const ALIASES = {
  'BB Back Squat': ['squat', 'back squat', 'bb squat', 'barbell squat'],
  'BB Deadlift': ['deadlift', 'conventional deadlift'],
  'BB RDL': ['rdl', 'romanian deadlift'],
  'BB Bench Press': ['bench press', 'bench', 'flat bench press', 'bb flat bench press'],
  'BB Incline Press': ['bb incline bench press', 'incline bench press'],
  'BB Overhead Press': ['overhead press', 'ohp', 'bb ohp', 'military press', 'standing bb overhead press', 'standing overhead press'],
  'BB Row': ['bb rows', 'barbell bent over row', 'bent over row', 'bb bent over row'],
  'BB Hip Thrust': ['hip thrust', 'barbell hip thrust'],
  'BB Bicep Curl': ['barbell curl', 'bb curl'],
  'BB Close-Grip Bench Press': ['close grip bench press'],
  'DB Bench Press': ['db flat press', 'db flat presses', 'db press', 'dumbbell bench press'],
  'DB Incline Press': ['db incline bench press', 'incline db press'],
  'DB Lunge': ['lunge', 'static db lunge', 'db walking lunge', 'walking lunge', 'db lunges'],
  'DB Calf Raise': ['calf raise', 'calf raises db', 'standing calf raise', 'standing 1 leg bodyweight + db calf raise'],
  'DB Lateral Raise': ['lateral raise', 'db lat raise', 'side raise', 'db side raise'],
  'DB Bicep Curl': ['db curl', 'dumbbell curl', 'db supinated curl', 'bicep curl'],
  'DB Hammer Curl': ['hammer curl', 'bicep db hammer curl'],
  'DB Skullcrusher': ['tricep lying db skullcrusher'],
  'DB Incline Curl': ['incline db curl', 'bicep incline bench db curl', 'incline curl'],
  'DB Chest Fly': ['db fly', 'chest fly', 'db flat fly'],
  'DB Chest-Supported Row': ['chest supported db row'],
  'DB Seated Shoulder Press': ['seated db overhead press', 'seated db shoulder press'],
  'DB Bulgarian Split Squat': ['bulgarian split squat', 'split squat', 'bulgarian split squats db'],
  'Lat Pull-down': ['lat pull down', 'pull down', 'lat pull downs w/1sec pause', 'wide grip lat pull down'],
  '1-Arm Lat Pull-down': ['single arm pull down', '1 arm pull down', 'single arm lat pull down'],
  'Cable Seated Row': ['seated row', 'seated cable row', 'seated row machine', 'machine seated row', 'cable row'],
  'Cable Triceps Pressdown': ['tricep pressdown', 'tricep pushdown', 'cable tricep pushdown', 'pushdown'],
  'Cable Overhead Triceps Extension': ['overhead cable triceps extension', 'triceps cable overhead extension'],
  'Cable 1-Arm Rope Triceps Extension': ['single arm rope tricep extension'],
  'KB Swing': ['swing', 'kettlebell swing', 'russian swing'],
  'Chin-up': ['chin up'],
  'Pull-up': ['pull up'],
  'Push-up': ['push up', 'press up'],
  'Goblet Squat': ['db goblet squat', 'kb goblet squat']
};

/**
 * Build a matcher over a list of standard names (the exercise library). Alias entries only count
 * when their target is in the list, so a trimmed library can't send a name somewhere missing.
 */
export function makeMatcher(names) {
  const byNorm = new Map(), bySorted = new Map(), alias = new Map();
  for (const n of names) {
    byNorm.set(normalise(n), n);
    bySorted.set(sortedKey(n), n);
  }
  const have = new Set(names);
  for (const [std, vs] of Object.entries(ALIASES)) {
    if (!have.has(std)) continue;
    for (const v of vs) { alias.set(normalise(v), std); alias.set(sortedKey(v), std); }
  }
  const lowerSet = new Map(names.map((n) => [n.toLowerCase(), n]));
  const tokens = names.map((n) => ({ n, t: new Set(normalise(n).split(' ')) }));

  return function match(typed) {
    const raw = String(typed ?? '').trim();
    if (!raw) return { kind: 'empty' };
    const exact = lowerSet.get(raw.toLowerCase());
    if (exact) return { kind: 'exact', name: exact };
    const norm = normalise(raw), sorted = sortedKey(raw);
    const hit = byNorm.get(norm) ?? bySorted.get(sorted) ?? alias.get(norm) ?? alias.get(sorted);
    if (hit) return { kind: 'alias', name: hit };

    // Close, not certain: share most of the words. Different equipment is a different lift,
    // so a name that says "DB" never suggests a "BB" one.
    const t = new Set(norm.split(' '));
    const eq = [...t].filter((w) => EQUIPMENT.has(w));
    const scored = tokens.map(({ n, t: u }) => {
      const ueq = [...u].filter((w) => EQUIPMENT.has(w));
      if (eq.length && ueq.length && !eq.some((w) => ueq.includes(w))) return { n, s: 0 };
      const inter = [...t].filter((w) => u.has(w)).length;
      return { n, s: inter / (t.size + u.size - inter) };
    }).filter((x) => x.s >= 0.34).sort((a, b) => b.s - a.s).slice(0, 3);
    if (scored.length) return { kind: 'suggest', options: scored.map((x) => x.n) };
    return { kind: 'new' };
  };
}

/** The name to SAVE: the standard one when certain, otherwise exactly what was typed (trimmed). */
export function standardName(typed, match) {
  const m = match(typed);
  return m.kind === 'exact' || m.kind === 'alias' ? m.name : String(typed ?? '').trim();
}
