<script>
  import { FRONT_OUTLINE, BACK_OUTLINE, FRONT_PATHS, BACK_PATHS } from '$lib/bodymap-paths.js';

  // muscles: array of tokens. A leading "~" marks a SECONDARY muscle.
  let { muscles = [] } = $props();

  // Muscle token → SVG regions (F = front view, B = back view). Anatomy-corrected:
  //  side_delt → front only (lateral raise = side delt), calves → back only, adductors → front only.
  const TOKEN_MAP = {
    chest: ['F:chest'], front_delt: ['F:deltoids'], rear_delt: ['B:deltoids'],
    side_delt: ['F:deltoids'], biceps: ['F:biceps'],
    triceps: ['F:triceps', 'B:triceps'], forearm: ['F:forearm', 'B:forearm'],
    traps: ['F:trapezius', 'B:trapezius'], lats: ['B:upper_back'],
    lower_back: ['B:lower_back'], glutes: ['B:gluteal'], hamstrings: ['B:hamstring'],
    quads: ['F:quadriceps'], adductors: ['F:adductors'],
    calves: ['B:calves'], abs: ['F:abs'], obliques: ['F:obliques']
  };

  const on = $derived.by(() => {
    const fP = new Set(), fS = new Set(), bP = new Set(), bS = new Set();
    for (const raw of muscles) {
      const secondary = raw.startsWith('~');
      const tok = secondary ? raw.slice(1) : raw;
      for (const r of TOKEN_MAP[tok] || []) {
        const [view, region] = r.split(':');
        if (view === 'F') (secondary ? fS : fP).add(region);
        else (secondary ? bS : bP).add(region);
      }
    }
    for (const r of fP) fS.delete(r); // primary wins over secondary
    for (const r of bP) bS.delete(r);
    return { fP, fS, bP, bS };
  });

  const PRIMARY = '#ef4444', SECONDARY = '#7c3535', BASE = '#222d40', OUTLINE = '#ffffff';
  const STRUCT = new Set(['hands', 'feet', 'head', 'ankles', 'knees', 'tibialis', 'neck', 'abs', 'obliques']);
  const STRUCTCOLOR = '#171f2e';
  const parts = ['common', 'left', 'right'];
  const col = (region, P, S) =>
    P.has(region) ? PRIMARY : S.has(region) ? SECONDARY : STRUCT.has(region) ? STRUCTCOLOR : BASE;
</script>

<svg viewBox="30 80 1410 1320" class="w-3/4 mx-auto block" role="img" aria-label="Muscles worked this session">
  {#each Object.entries(FRONT_PATHS) as [region, seg]}
    {#each parts as p}
      {#each seg[p] ?? [] as d}<path {d} fill={col(region, on.fP, on.fS)} />{/each}
    {/each}
  {/each}
  <path d={FRONT_OUTLINE} fill="none" stroke={OUTLINE} stroke-width="2.5" />

  {#each Object.entries(BACK_PATHS) as [region, seg]}
    {#each parts as p}
      {#each seg[p] ?? [] as d}<path {d} fill={col(region, on.bP, on.bS)} />{/each}
    {/each}
  {/each}
  <path d={BACK_OUTLINE} fill="none" stroke={OUTLINE} stroke-width="2.5" />

  <text x="360" y="1385" font-size="34" fill="#cbd5e1" text-anchor="middle" font-weight="600">FRONT</text>
  <text x="1085" y="1385" font-size="34" fill="#cbd5e1" text-anchor="middle" font-weight="600">BACK</text>
</svg>
