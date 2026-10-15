<script>
  import Page from '$lib/components/Page.svelte';
  import { dowDayMonthYear } from '$lib/date-fmt.js';

  let { data } = $props();
  let view = $derived(data.view);
  let sessions = $derived(data.sessions);
  let exercises = $derived(data.exercises);
  let ex = $derived(data.ex);
  let day = $derived(data.day);
  let exerciseSessions = $derived(data.exerciseSessions);

  const fmt = dowDayMonthYear;   // not new Date(d): that parses as UTC, the wrong day west of UTC
  const setStr = (s) => `${s.weight_kg ?? 'BW'}${s.weight_kg ? 'kg' : ''}×${s.reps}${s.rir != null ? `@${s.rir}` : ''}`;

  // A lift trained on two days is two entries. The day rides in its own query parameter, so the
  // separator below never reaches the URL — it only holds the pair together inside the <option>.
  const SEP = '||';   // a space would split "BB Back Squat" down the middle
  const keyOf = (e) => `${e.name}${SEP}${e.split ? e.dayName : ''}`;
  const labelOf = (e) => (e.split ? `${e.name} · ${e.dayName}` : e.name);
  const linkFor = (e) =>
    `/training/history?view=exercise&ex=${encodeURIComponent(e.name)}` +
    (e.split ? `&day=${encodeURIComponent(e.dayName)}` : '');

  // Which option is showing: match the day too, or both squat entries look selected.
  let current = $derived(exercises.find((e) => e.name === ex && (e.split ? e.dayName === day : !day)));

  function pickExercise(e) {
    const [name, d] = e.target.value.split(SEP);
    location.href = `/training/history?view=exercise&ex=${encodeURIComponent(name)}`
      + (d ? `&day=${encodeURIComponent(d)}` : '');
  }

  // top-set weight chart (oldest → newest)
  const chart = $derived.by(() => {
    const pts = [...exerciseSessions].reverse().filter((s) => s.top?.weight_kg != null)
      .map((s) => ({ t: new Date(s.date).getTime(), w: s.top.weight_kg }));
    if (pts.length < 2) return null;
    const W = 320, H = 120, PAD = 20;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t, ts = Math.max(1, t1 - t0);
    let mn = Math.min(...pts.map((p) => p.w)), mx = Math.max(...pts.map((p) => p.w));
    const pad = Math.max(1, (mx - mn) * 0.15); mn -= pad; mx += pad;
    const x = (t) => PAD + ((t - t0) / ts) * (W - 2 * PAD);
    const y = (w) => PAD + (1 - (w - mn) / (mx - mn)) * (H - 2 * PAD);
    return { W, H, line: pts.map((p) => `${x(p.t)},${y(p.w)}`).join(' '), dots: pts.map((p) => ({ cx: x(p.t), cy: y(p.w) })), mn: mn.toFixed(0), mx: mx.toFixed(0) };
  });
</script>

<Page title="History">
  <div class="flex gap-2">
    <a href="/training/history?view=sessions" class="flex-1 text-center py-2 rounded-lg text-sm {view === 'sessions' ? 'text-[#0b0f17] font-semibold' : 'text-[var(--color-text)] bg-[var(--color-surface-2)]'}" style={view === 'sessions' ? 'background:var(--color-accent)' : ''}>All sessions</a>
    <a href={current ? linkFor(current) : exercises[0] ? linkFor(exercises[0]) : '/training/history?view=exercise'} class="flex-1 text-center py-2 rounded-lg text-sm {view === 'exercise' ? 'text-[#0b0f17] font-semibold' : 'text-[var(--color-text)] bg-[var(--color-surface-2)]'}" style={view === 'exercise' ? 'background:var(--color-accent)' : ''}>By exercise</a>
  </div>
  <a href="/training" class="text-xs text-[var(--color-accent)]">← back to today's workout</a>

  {#if view === 'sessions'}
    {#if !sessions.length}
      <div class="card p-4 text-sm text-[var(--color-muted)]">No sessions logged yet. Your full history will build here — scroll back as far as you like.</div>
    {/if}
    {#each sessions as s}
      <!-- id so the calendar's /training/history#session-<id> link lands on the right card. -->
      <div class="card p-4" id="session-{s.id}">
        <div class="flex items-center justify-between mb-2">
          <!-- The day's NAME, not its label. The label (A–D) is the stable key history is filed
               under; "Day 2" is what the programme calls it and what the user recognises. -->
          <span class="font-semibold text-[var(--color-text)]">{s.day_name ?? (s.day_label ? `Workout ${s.day_label}` : 'Session')}</span>
          <span class="text-xs text-[var(--color-muted)]">{fmt(s.date)} · {s.setCount} sets</span>
        </div>
        <div class="space-y-1.5">
          <!-- Programme-day order, whatever order the lifts were actually done in — allSessions()
               sorts it; rendering the raw logs here would leak execution order. -->
          {#each s.exercises.filter((e) => e.sets.length) as e}
            <div class="text-sm">
              <span class="text-[var(--color-text)]">{e.name}</span>
              <span class="text-[var(--color-muted)] ml-1">{e.sets.map(setStr).join('  ·  ')}</span>
              {#if e.note}<div class="text-xs text-[var(--color-text)] mt-0.5 pl-2 border-l-2 border-[var(--color-accent)] whitespace-pre-line">{e.note}</div>{/if}
            </div>
          {/each}
        </div>
        {#if s.notes}
          <div class="mt-2 text-sm text-[var(--color-text)] rounded-lg px-2.5 py-2 whitespace-pre-line" style="background:var(--color-surface-2)">
            <span class="text-xs text-[var(--color-muted)] block mb-0.5">Session notes</span>{s.notes}
          </div>
        {/if}
        <!-- The session view opens on any session, however old — this is the only way to reach it. -->
        <div class="mt-2 pt-2 border-t border-[var(--color-border)] text-right">
          <a href={`/training?session=${s.id}`}
             class="inline-block py-1.5 px-2 -mr-2 text-sm font-medium text-[var(--color-accent)]">
            Edit session →
          </a>
        </div>
      </div>
    {/each}
  {:else}
    <div class="card p-4 space-y-3">
      <select onchange={pickExercise} class="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base">
        {#each exercises as e}<option value={keyOf(e)} selected={e === current}>{labelOf(e)}</option>{/each}
      </select>
      {#if current?.split}
        <!-- The same lift on two days is two different prescriptions. Say which one is on screen,
             or the chart above reads as a single trend that keeps jumping. -->
        <div class="text-xs text-[var(--color-muted)]">Showing {current.dayName} only.</div>
      {/if}
      {#if chart}
        <div>
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} class="w-full" style="height:120px">
            <polyline points={chart.line} fill="none" stroke="var(--color-accent-2)" stroke-width="2" />
            {#each chart.dots as d}<circle cx={d.cx} cy={d.cy} r="2.5" fill="var(--color-accent-2)" />{/each}
            <text x="3" y="12" font-size="9" fill="var(--color-faint)">{chart.mx}kg</text>
            <text x="3" y={chart.H - 4} font-size="9" fill="var(--color-faint)">{chart.mn}kg</text>
          </svg>
          <div class="text-xs text-[var(--color-muted)]">Top set over time</div>
        </div>
      {/if}
    </div>
    {#each exerciseSessions as s}
      <div class="card p-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-[var(--color-text)]">{fmt(s.date)} <span class="text-[var(--color-faint)]">· {s.day_name ?? s.day_label}</span></span>
          {#if s.top}<span class="text-sm font-semibold text-[var(--color-accent-2)]">{setStr(s.top)}</span>{/if}
        </div>
        <div class="text-xs text-[var(--color-muted)] mt-1">{s.sets.map(setStr).join('  ·  ')}</div>
      </div>
    {/each}
  {/if}
</Page>
