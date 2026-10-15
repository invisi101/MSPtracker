<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import Page from '$lib/components/Page.svelte';
  import LineChart from '$lib/components/LineChart.svelte';
  import { ts, fullDate } from '$lib/date-fmt.js';

  let { data } = $props();
  let weighins = $derived(data.weighins);
  let roll = $derived(data.roll);
  let trend = $derived(data.trend);
  let measurements = $derived(data.measurements);
  let sites = $derived(data.sites);
  let photos = $derived(data.photos);
  let targets = $derived(data.targets);
  let block = $derived(data.block);
  let adherence = $derived(data.adherence);

  // Weigh-ins are logged on Home, the first thing done each morning; this page holds the
  // trend, measurements and photos. `localToday` stays because the goal maths needs today's date
  // from the BROWSER clock: as an installed PWA this page can sit open across midnight.
  const localToday = () => new Date().toLocaleDateString('en-CA');

  const after = () => async ({ update }) => {
    await update({ reset: true });
    await invalidateAll();
  };
  // Takes either an ISO 'YYYY-MM-DD' or a Date. The string form is parsed at local midnight,
  // never as UTC, so a date never renders as the day before.
  const fmt = (d) =>
    (d instanceof Date ? d : new Date(d + 'T00:00:00'))
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });

  // "Sat Aug 8" — built by hand because en-GB gives "Sat, 8 Aug" and en-US inserts a comma.
  const fmtDow = (d) => {
    const t = new Date(d + 'T00:00:00');
    const wd = t.toLocaleDateString('en-US', { weekday: 'short' });
    const mo = t.toLocaleDateString('en-US', { month: 'short' });
    return `${wd} ${mo} ${t.getDate()}`;
  };
  const last = $derived(weighins.length ? weighins[weighins.length - 1] : null);

  // ---- Photo viewer ----------------------------------------------------------
  // Thumbnails are square-cropped so the grid stays tidy; the viewer shows the whole,
  // uncropped image. Index into `photos` (newest first), or null when closed.
  let photoIndex = $state(null);
  // The photo awaiting a delete confirmation. Deleting is irreversible AND removes the file from
  // disk, so a stray tap on a 24px ✕ shouldn't be enough to lose a progress shot.
  let confirmPhoto = $state(null);
  const openPhoto = (i) => (photoIndex = i);
  const closePhoto = () => (photoIndex = null);
  const stepPhoto = (d) => {
    if (photoIndex == null || !photos.length) return;
    photoIndex = (photoIndex + d + photos.length) % photos.length;   // wraps at both ends
  };
  function onKey(e) {
    // The confirmation sits on top of the viewer, so it gets first claim on Escape.
    if (confirmPhoto) { if (e.key === 'Escape') confirmPhoto = null; return; }
    if (photoIndex == null) return;
    if (e.key === 'Escape') closePhoto();
    else if (e.key === 'ArrowLeft') stepPhoto(-1);
    else if (e.key === 'ArrowRight') stepPhoto(1);
  }
  // Clear the prompt once the delete has actually gone through.
  const afterDelete = () => async ({ update }) => {
    await update({ reset: true });
    await invalidateAll();
    confirmPhoto = null;
  };
  // Stop the page behind the overlay scrolling under a swipe.
  $effect(() => {
    if (photoIndex == null && !confirmPhoto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  });
  // A deleted photo shortens the list; without this the viewer can point past the end.
  $effect(() => { if (photoIndex != null && photoIndex >= photos.length) photoIndex = photos.length ? photos.length - 1 : null; });

  // `ts` is shared with the rest of the app so the weight series, the plan line and every other
  // page agree about where a day starts.

  // "Block" is the default and the point of the page: the run the user is actually on, starting the
  // day it started. The rolling windows stay for looking further back, but nothing here opens on
  // a period that straddles two blocks and averages them together.
  const WINDOWS = [['Block', 'block'], ['1M', 30], ['3M', 91], ['1Y', 365], ['All', null]];
  let win = $state(block?.hasBlock ? 'Block' : '1M');
  const cutoff = $derived.by(() => {
    const w = WINDOWS.find((x) => x[0] === win);
    if (!w) return 0;
    if (w[1] === 'block') return block?.startDate ? ts(block.startDate) : 0;
    return w[1] != null ? Date.now() - w[1] * 86400000 : 0;
  });
  // The Block view is bounded at BOTH ends. Every other window is "the last N days", which ends
  // today by definition, but a block ends on the day it ends: after it finishes, the block view
  // still shows that block's own dates rather than growing on into the next one.
  const cutoffTo = $derived.by(() => {
    const w = WINDOWS.find((x) => x[0] === win);
    return w && w[1] === 'block' && block?.endDate ? ts(block.endDate) : Infinity;
  });
  const inWindow = (d) => { const t = ts(d); return t >= cutoff && t <= cutoffTo; };

  // One hue per body AREA rather than per site, so left/right pairs read as a pair and the hues
  // stay far enough apart to tell apart (worst pair 16.8 in OKLab against a floor of 15; nine
  // separate hues came out at 4.1). Each chart is titled with its site name, so colour supports
  // the label rather than carrying it.
  const AREA_COLOR = [
    [/^Chest/,   '#38bdf8'],
    [/^Arm/,     '#f472b6'],
    [/^Stomach/, '#fbbf24'],
    [/^Hips/,    '#34d399'],
    [/^Thigh/,   '#e2e8f0']
  ];
  const measColor = (site) => (AREA_COLOR.find(([re]) => re.test(site)) ?? [null, 'var(--color-accent-2)'])[1];
  // LOCAL midnight, not UTC. Every date in the database is a local calendar date
  // (toLocaleDateString('en-CA')), and `new Date('2026-08-04')` parses as UTC midnight — which in
  // any timezone off UTC puts the weight series hours out of step with the plan line and makes the
  // two disagree about where a day starts.
  // Weight series (7-day avg + daily dots + target-pace line), filtered to the window
  const wSeries = $derived(roll.filter((r) => inWindow(r.date)).map((r) => ({ t: ts(r.date), v: r.avg })));
  const wDots = $derived(weighins.filter((w) => inWindow(w.date)).map((w) => ({ t: ts(w.date), v: w.weight_kg })));
  // ---- Lift progress ---------------------------------------------------------
  // The sets as logged are the headline; the estimate is a small trend underneath it. Split by the
  // day a lift was trained on, because Back Squat runs 3-5 reps on one day and 8-10 on another and
  // a merged line makes a heavier day look like a fall.
  let liftKey = $state(null);
  const keyOf = (l) => `${l.name}\u0000${l.combined ? '*all' : l.dayName ?? ''}`;
  const liftsInWindow = $derived(
    (data.lifts ?? [])
      .map((l) => ({ ...l, sessions: l.sessions.filter((s) => inWindow(s.date)) }))
      .filter((l) => l.sessions.length)
      // On a tie, a lift's "all days" entry ranks above its per-day entries.
      .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name) || (b.combined ? 1 : 0) - (a.combined ? 1 : 0))
  );
  // Default to whichever lift has the most history in view; falls back as the window changes.
  const lift = $derived(liftsInWindow.find((l) => keyOf(l) === liftKey) ?? liftsInWindow[0] ?? null);
  // Only name the day when the same lift is trained on more than one, or every label carries noise.
  const liftLabel = (l) =>
    l.combined ? `${l.name} · all days`
    : l.split && l.dayName
      ? `${l.name} · ${l.dayName}${l.repLow ? ` (${l.repLow}\u2013${l.repHigh})` : ''}`
      : l.name;

  // "36 kg × 5, 5, 5", and "120 kg × 9, 8 · 110 kg × 11" when the load changed mid-exercise —
  // the usual notation for reporting sets.
  function setLine(sets) {
    const runs = [];
    for (const s of sets) {
      const last = runs[runs.length - 1];
      if (last && last.weight === s.weight) last.reps.push(s.reps);
      else runs.push({ weight: s.weight, reps: [s.reps] });
    }
    return runs
      .map((r) => `${r.weight == null ? 'bodyweight' : `${r.weight} kg`} × ${r.reps.join(', ')}`)
      .join('  ·  ');
  }

  // Session vs the one before it, in the terms progression is actually made of: load on the bar,
  // and reps done at it. Red is reserved for an actual step backwards — more sets at the same load
  // is progress, which an estimated-1RM delta would call a loss.
  const liftDelta = $derived.by(() => {
    if (!lift || lift.sessions.length < 2) return null;
    const prev = lift.sessions[lift.sessions.length - 2];
    const now = lift.sessions[lift.sessions.length - 1];
    // All days mixes heavy and light days, so raw load would read a light day as a drop. Compare the
    // estimated max instead, which puts different rep ranges on one scale.
    if (lift.combined && now.e1rm != null && prev.e1rm != null) {
      const de = Math.round((now.e1rm - prev.e1rm) * 10) / 10;
      return { text: de === 0 ? 'same est. max' : `${de > 0 ? '+' : ''}${de} kg est. max`, tone: de > 0 ? 'good' : de < 0 ? 'warn' : 'muted', since: prev.date };
    }
    const dw = Math.round(((now.topWeight ?? 0) - (prev.topWeight ?? 0)) * 10) / 10;
    const dr = now.reps - prev.reps;
    const text = [
      dw === 0 ? 'same load' : `${dw > 0 ? '+' : ''}${dw} kg`,
      dr === 0 ? 'same reps' : `${dr > 0 ? '+' : ''}${dr} reps`
    ].join(' · ');
    const tone =
      dw > 0 || (dw === 0 && dr > 0) ? 'good'
      : (dw < 0 && dr <= 0) || (dw === 0 && dr < 0) ? 'warn'
      : 'muted';
    return { text, tone, since: prev.date };
  });

  const liftSeries = $derived(
    lift ? lift.sessions.filter((s) => s.e1rm != null).map((s) => ({ t: ts(s.date), v: s.e1rm })) : []
  );

  // ---- Journey so far --------------------------------------------------------
  // How far through the block the user is, measured from where they actually started it rather
  // than from their first ever weigh-in — the block is the frame for this page.
  const journey = $derived.by(() => {
    const start = block?.startWeightKg, goal = block?.goalWeightKg;
    if (start == null || goal == null || current == null || start === goal) return null;
    // Signed the same way in both directions: `done` is progress TOWARDS the goal and `toGo` is
    // what's left, whether the goal is below the start (losing) or above it (gaining).
    const gaining = goal > start;
    const total = Math.abs(start - goal);
    const done = gaining ? current - start : start - current;
    return {
      goal, gaining,
      done: +Math.abs(done).toFixed(1),
      toGo: +Math.abs(current - goal).toFixed(1),
      startDate: block.startDate, start,
      pct: Math.max(0, Math.min(100, Math.round((done / total) * 100)))
    };
  });

  // ---- Goal ------------------------------------------------------------------
  // The plan is a straight line from where the goal was set (anchor) to (target date, goal
  // weight). Everything below is derived from those two points — no stored rate, so the
  // direction can't be entered backwards.
  const DAY = 86400000;
  const midnight = ts;   // one definition, so the plan line and the weight series can't drift
  const goal = $derived.by(() => {
    const { goalWeightKg: gw, startDate, endDate, startWeightKg: w0 } = block;
    if (gw == null || !startDate || !endDate || w0 == null) return null;
    const t0 = midnight(startDate), t1 = midnight(endDate);
    if (t1 <= t0) return null;
    return {
      gw, t0, t1, w0, startDate, endDate,
      name: block.name ?? null,
      weightAt: (t) => w0 + ((gw - w0) * (t - t0)) / (t1 - t0)
    };
  });

  // Where the plan says you should be today, versus where you are.
  const goalStatus = $derived.by(() => {
    if (!goal || current == null) return null;
    const now = midnight(localToday());
    const daysLeft = Math.round((goal.t1 - now) / DAY);
    const toGo = +(current - goal.gw).toFixed(1);            // + = still to lose
    const losing = goal.gw < goal.w0;                        // direction of the plan
    const reached = losing ? current <= goal.gw : current >= goal.gw;

    // Needed from HERE, which is the number that actually matters day to day.
    const neededPerWeek = daysLeft > 0 ? ((goal.gw - current) / (daysLeft / 7)) : null;

    // Kilograms against the plan line stays useful once the plan has actually been running.
    const elapsed = Math.round((now - goal.t0) / DAY);
    const aheadKg = elapsed >= 7 ? +(goal.weightAt(Math.min(now, goal.t1)) - current).toFixed(1) : null;

    return {
      daysLeft, toGo, reached, neededPerWeek, losing, elapsed,
      ahead: aheadKg == null ? null : (losing ? aheadKg : -aheadKg)
    };
  });

  // The dashed plan line, clipped to the visible window. Anchored to real dates, so it does NOT
  // move when the 1M/2M/6M window changes.
  const wTarget = $derived.by(() => {
    if (!goal || wSeries.length < 2) return null;
    const lo = Math.max(wSeries[0].t, goal.t0);
    const hi = Math.min(wSeries[wSeries.length - 1].t, goal.t1);
    if (hi <= lo) return null;
    return [{ t: lo, v: goal.weightAt(lo) }, { t: hi, v: goal.weightAt(hi) }];
  });
  const fmtFull = fullDate;

  const current = $derived(roll.length ? roll[roll.length - 1].avg : (weighins.at(-1)?.weight_kg ?? null));

  // ---- Adherence --------------------------------------------------------------
  // One metric at a time rather than four series on one chart — overlaid, they're unreadable.
  const ADH = [['kcal', 'Calories'], ['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']];
  let adhMetric = $state('kcal');
  const ON_TARGET = 10;   // ±% counted as hitting it

  const adhRows = $derived(
    adherence.filter((r) => inWindow(r.date) && r[adhMetric] != null)
  );
  const adhSeries = $derived(adhRows.map((r) => ({ t: ts(r.date), v: r[adhMetric] })));
  // Flat 100% reference. A raw-value chart would need a stepped target line, since the target
  // changes at every block boundary; as a percentage the line is the same everywhere.
  const adhTarget = $derived(
    adhSeries.length >= 2
      ? [{ t: adhSeries[0].t, v: 100 }, { t: adhSeries[adhSeries.length - 1].t, v: 100 }]
      : null
  );
  const adhStats = $derived.by(() => {
    if (!adhRows.length) return null;
    const vals = adhRows.map((r) => r[adhMetric]);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const on = vals.filter((v) => Math.abs(v - 100) <= ON_TARGET).length;
    return { avg: Math.round(avg), on, days: vals.length };
  });

  // Measurements grouped by site (windowed)
  const measBySite = $derived.by(() => {
    const m = {};
    for (const r of measurements) {
      if (!inWindow(r.date)) continue;
      (m[r.site] ||= []).push({ t: ts(r.date), v: r.value_cm, date: r.date });
    }
    for (const k in m) m[k].sort((a, b) => a.t - b.t);
    return m;
  });
</script>

<Page title="Progress">
  <!-- Weight -->
  <div class="card p-4 space-y-3">
    <div class="flex items-end justify-between gap-3">
      <div>
        <div class="text-xs text-[var(--color-muted)]">Weight (7-day avg)</div>
        <div class="text-3xl font-bold text-[var(--color-text)]">{current ? current.toFixed(1) : '—'}<span class="text-base font-normal text-[var(--color-muted)]"> kg</span></div>
      </div>
      <!-- Same shape as the average beside it: the date rides in the label, the reading is the
           value. The average smooths over whatever was logged, so the date says how current it is. -->
      <div class="text-right">
        <div class="text-xs text-[var(--color-muted)]">
          Last weigh-in{last ? ` (${fmtDow(last.date)})` : ''}
        </div>
        <div class="text-3xl font-bold text-[var(--color-text)]">
          {last ? last.weight_kg.toFixed(1) : '—'}<span class="text-base font-normal text-[var(--color-muted)]"> kg</span>
        </div>
      </div>
    </div>

    {#if journey}
      <!-- The whole run at a glance, which the numbers above
           can't show. Anchored to the block's start weight. -->
      <div class="rounded-xl p-3 space-y-2" style="background:var(--color-surface-2)">
        <div class="flex items-baseline justify-between text-sm">
          <span class="text-[var(--color-text)] font-semibold">{journey.done} kg {journey.gaining ? 'gained' : 'down'}</span>
          <span class="text-[var(--color-muted)]">{journey.toGo} kg to go</span>
        </div>
        <div class="relative h-2.5 rounded-full overflow-hidden" style="background:var(--color-bg)">
          <div class="bar-fill absolute inset-y-0 left-0 rounded-full"
               style={`width:${journey.pct}%; background:var(--color-accent)`}></div>
        </div>
        <div class="flex items-baseline justify-between text-[11px] text-[var(--color-muted)]">
          <span>{journey.start} kg · {fmt(journey.startDate)}</span>
          <span class="text-[var(--color-text)] font-semibold">{journey.pct}%</span>
          <span>{journey.goal} kg</span>
        </div>
      </div>
    {/if}



    <!-- window selector -->
    <div class="grid grid-cols-5 gap-1.5">
      {#each WINDOWS as [label]}
        <button onclick={() => (win = label)}
                class="py-1.5 rounded-lg text-xs font-medium transition-colors {win === label ? 'text-[#0b0f17]' : 'text-[var(--color-muted)] bg-[var(--color-surface-2)]'}"
                style={win === label ? 'background:var(--color-accent)' : ''}>{label}</button>
      {/each}
    </div>
    <LineChart series={wSeries} dots={wDots} target={wTarget} unit=" kg" color="var(--color-accent)" height={200} />
    <div class="flex gap-4 text-xs">
      <span class="text-[var(--color-accent)]">— 7-day average</span>
      {#if wTarget}<span class="text-[var(--color-good)]">- - goal plan</span>{/if}
      <span class="text-white">• daily</span>
    </div>

    <!-- ---- Goal ---------------------------------------------------------- -->
    {#if goal && goalStatus}
      <div class="rounded-xl p-3 space-y-2.5" style="background:var(--color-surface-2)">
        <!-- Two columns: what the block asks for on the left, the one number to act on
             (the rate still needed) on the right. -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{goal.name ?? 'Goal'}</div>
            <div class="text-lg font-bold text-[var(--color-text)]">
              {goal.gw} kg <span class="font-normal text-[var(--color-muted)]">by {fmtFull(new Date(goal.t1))}</span>
            </div>
            <div class="text-sm text-[var(--color-muted)] mt-1">
              {#if goalStatus.reached}
                You're there.
              {:else}
                <!-- Says which weight the gap is measured from: the 7-day average, not the last
                     reading. Without it the figure looks wrong against the scale that morning. -->
                <span class="text-[var(--color-text)] font-semibold">{Math.abs(goalStatus.toGo)} kg</span>
                to {goal.gw < current ? 'lose' : 'gain'} vs 7-day avg
              {/if}
              {#if goalStatus.daysLeft > 0}
                · <span class="text-[var(--color-text)]">{goalStatus.daysLeft}</span> days left
              {:else}
                · <span style="color:var(--color-warn)">target date passed</span>
              {/if}
            </div>
          </div>
          <div class="shrink-0 rounded-lg px-3 py-2 text-right" style="background:var(--color-bg)">
            <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Needed</div>
            <div class="text-base font-semibold text-[var(--color-text)]">
              {goalStatus.neededPerWeek == null ? '—' : `${goalStatus.neededPerWeek > 0 ? '+' : ''}${goalStatus.neededPerWeek.toFixed(2)}`}
              <span class="text-[10px] font-normal text-[var(--color-muted)]">kg/wk</span>
            </div>
          </div>
        </div>
        <!-- The whole paragraph is conditional: there is nothing to print until the block has
             run long enough to be ahead or behind. -->
        {#if goalStatus.ahead != null}
          <p class="text-[11px] text-[var(--color-faint)]">
            You're {Math.abs(goalStatus.ahead)} kg {goalStatus.ahead >= 0 ? 'ahead of' : 'behind'} the line.
          </p>
        {/if}
      </div>
    {:else}
      <p class="text-xs text-[var(--color-faint)]">
        {#if !block.hasBlock}
          No block is running — add one in <a href="/settings" class="text-[var(--color-accent)]">Settings</a>
          to track against it.
        {:else}
          Add a goal weight in <a href="/settings" class="text-[var(--color-accent)]">Settings</a>
          to see a plan line and whether you're on track.
        {/if}
      </p>
    {/if}

  </div>

  <!-- Lift progress: the sets exactly as they were logged, one movement at a time. That is what
       progression is judged on, and what no formula can misread. -->
  <div class="card p-4 space-y-3">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-sm font-medium text-[var(--color-text)]">Lift progress</span>
      <span class="text-xs text-[var(--color-muted)]">sets as logged</span>
    </div>

    {#if liftsInWindow.length}
      <!-- Driven by the resolved lift, not the raw selection: liftKey starts null and the window
           can drop the chosen lift out of view, and a bound-but-unmatched value renders blank. -->
      <select value={lift && keyOf(lift)} onchange={(e) => (liftKey = e.currentTarget.value)}
              class="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base">
        {#each liftsInWindow as l}
          <option value={keyOf(l)}>{liftLabel(l)} · {l.sessions.length} session{l.sessions.length === 1 ? '' : 's'}</option>
        {/each}
      </select>

      {#if lift}
        {@const latest = lift.sessions[lift.sessions.length - 1]}
        <div class="flex items-baseline justify-between gap-3">
          <div class="min-w-0">
            <div class="text-lg font-bold text-[var(--color-text)]">{setLine(latest.sets)}</div>
            <div class="text-xs text-[var(--color-muted)]">
              {fmt(latest.date)} · {latest.sets.length} set{latest.sets.length === 1 ? '' : 's'} · {latest.reps} reps{latest.volume ? ` · ${latest.volume} kg lifted` : ''}
            </div>
          </div>
          {#if liftDelta}
            <div class="text-right shrink-0">
              <div class="text-sm font-semibold" style={`color:var(--color-${liftDelta.tone})`}>{liftDelta.text}</div>
              <div class="text-xs text-[var(--color-muted)]">vs {fmt(liftDelta.since)}</div>
            </div>
          {/if}
        </div>

        {#if lift.sessions.length > 1}
          <div class="space-y-1">
            {#each lift.sessions.slice(0, -1).slice(-5).reverse() as s}
              <div class="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5"
                   style="background:var(--color-surface-2)">
                <span class="text-sm text-[var(--color-text)] min-w-0">{setLine(s.sets)}</span>
                <span class="text-xs text-[var(--color-muted)] shrink-0">{fmt(s.date)}</span>
              </div>
            {/each}
          </div>
        {/if}

        <!-- The long view, kept small: over three months a list stops being glanceable and the
             line is the only thing that shows drift. -->
        {#if liftSeries.length >= 3}
          <div class="pt-1">
            <div class="text-xs text-[var(--color-muted)] mb-1">Estimated 1RM trend</div>
            <LineChart series={liftSeries} unit=" kg" color="var(--color-accent-2)" height={110} yDecimals={1} />
          </div>
        {/if}
      {/if}
    {:else}
      <p class="text-sm text-[var(--color-muted)]">Nothing logged in this window yet.</p>
    {/if}
  </div>

  <!-- Measurement charts + per-site logging -->
  <div class="card p-4 space-y-3">
    <span class="text-sm font-medium text-[var(--color-text)]">Measurements (cm)</span>
    <div class="grid grid-cols-5 gap-1.5">
      {#each WINDOWS as [label]}
        <button onclick={() => (win = label)}
                class="py-1.5 rounded-lg text-xs font-medium transition-colors {win === label ? 'text-[#0b0f17]' : 'text-[var(--color-muted)] bg-[var(--color-surface-2)]'}"
                style={win === label ? 'background:var(--color-accent)' : ''}>{label}</button>
      {/each}
    </div>
    {#each sites as s, i}
      {@const d = measBySite[s] ?? []}
      {@const delta = d.length >= 2 ? +(d[d.length - 1].v - d[0].v).toFixed(1) : null}
      <div class="rounded-lg p-2" style="background:var(--color-surface-2)">
        <div class="flex items-baseline justify-between">
          <span class="text-sm text-[var(--color-text)]">{s}</span>
          {#if d.length}
            <span class="text-sm text-[var(--color-muted)]"><span class="text-[var(--color-text)] font-semibold">{d[d.length - 1].v}</span> cm
              {#if delta != null}<span style={`color:var(--color-${delta < 0 ? 'good' : delta > 0 ? 'warn' : 'muted'})`}> ({delta > 0 ? '+' : ''}{delta})</span>{/if}
            </span>
          {:else}
            <span class="text-xs text-[var(--color-faint)]">no data yet</span>
          {/if}
        </div>
        {#if d.length >= 2}
          <LineChart series={d.map((x) => ({ t: x.t, v: x.v }))} unit=" cm" color={measColor(s)} height={100} />
        {/if}
        <!-- one input per site: no dropdown to fight with when logging a full round of measurements -->
        <form method="POST" action="?/measurement" use:enhance={after} class="flex items-center gap-2 mt-1.5">
          <input type="hidden" name="site" value={s} />
          <input name="value_cm" type="number" step="0.1" inputmode="decimal" required placeholder="cm"
                 aria-label={`${s} (cm)`}
                 class="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
          <button class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Add</button>
        </form>
      </div>
    {/each}
  </div>

  <!-- Adherence -->
  <div class="card p-4 space-y-3">
    <div class="flex items-baseline justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">Adherence</span>
      <span class="text-xs text-[var(--color-muted)]">% of that day's target</span>
    </div>

    <div class="grid grid-cols-4 gap-1.5">
      {#each ADH as [v, l]}
        <button onclick={() => (adhMetric = v)}
                class="py-1.5 rounded-lg text-xs font-medium {adhMetric === v ? 'text-[#0b0f17]' : 'text-[var(--color-muted)] bg-[var(--color-surface-2)]'}"
                style={adhMetric === v ? 'background:var(--color-accent)' : ''}>{l}</button>
      {/each}
    </div>

    {#if adhRows.length >= 2}
      <LineChart series={adhSeries} target={adhTarget} unit="%" color="var(--color-accent-2)"
                 height={180} yDecimals={0} yAnchor={100} />
      <div class="flex gap-4 text-xs">
        <span class="text-[var(--color-accent-2)]">— daily %</span>
        <span class="text-[var(--color-good)]">- - target (100%)</span>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div class="rounded-lg px-3 py-2" style="background:var(--color-surface-2)">
          <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Average</div>
          <div class="text-lg font-semibold text-[var(--color-text)]">{adhStats.avg}%</div>
        </div>
        <div class="rounded-lg px-3 py-2" style="background:var(--color-surface-2)">
          <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Within ±{ON_TARGET}%</div>
          <div class="text-lg font-semibold" style={`color:var(--color-${adhStats.on / adhStats.days >= 0.7 ? 'good' : 'text'})`}>
            {adhStats.on}<span class="text-sm font-normal text-[var(--color-muted)]">/{adhStats.days}</span>
          </div>
        </div>
        <div class="rounded-lg px-3 py-2" style="background:var(--color-surface-2)">
          <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Days logged</div>
          <div class="text-lg font-semibold text-[var(--color-text)]">{adhStats.days}</div>
        </div>
      </div>
      <p class="text-[11px] text-[var(--color-faint)]">
        Only days with food logged that your coach's numbers cover, each scored against the target in force that day.
      </p>
    {:else}
      <p class="text-sm text-[var(--color-muted)]">
        Not enough logged days in this window yet. Log food and
        the trend builds here.
      </p>
    {/if}
  </div>

  <!-- Photos -->
  <div class="card p-4 space-y-3">
    <span class="text-sm font-medium text-[var(--color-text)]">Progress photos</span>
    {#if photos.length}
      <div class="grid grid-cols-3 gap-2">
        {#each photos as p, i}
          <div class="relative">
            <!-- A button, not a bare img: the thumbnail is square-cropped, so tapping it has to
                 open the whole photo. The delete form is a SIBLING (a button can't nest in a
                 button) and sits above it, so ✕ deletes rather than opening the viewer. -->
            <button type="button" onclick={() => openPhoto(i)}
                    class="block w-full rounded-lg overflow-hidden"
                    aria-label={`View photo from ${fmt(p.date)}`}>
              <img src={`/uploads/${p.path}`} alt={`Progress photo, ${fmt(p.date)}`}
                   class="w-full aspect-square object-cover" loading="lazy" />
            </button>
            <div class="absolute bottom-1 left-1 text-[10px] px-1 rounded bg-black/60 text-white pointer-events-none">{fmt(p.date)}</div>
            <button type="button" onclick={() => (confirmPhoto = p)}
                    class="absolute top-1 right-1 z-10 w-7 h-7 rounded-full bg-black/70 text-white text-xs"
                    aria-label={`Delete photo from ${fmt(p.date)}`}>✕</button>
          </div>
        {/each}
      </div>
    {/if}
    <p class="text-xs text-[var(--color-faint)]">Thumbnails are cropped square — tap one to see the full photo.</p>

    <form method="POST" action="?/photo" enctype="multipart/form-data" use:enhance={after} class="flex flex-col sm:flex-row sm:items-center gap-2">
      <!-- no `capture` attr: it forces the camera on iOS and skips the picker entirely -->
      <input name="photo" type="file" accept="image/*" required
             class="w-full min-w-0 text-sm text-[var(--color-muted)] file:mr-2 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[var(--color-surface-2)] file:text-[var(--color-text)]" />
      <button class="w-full sm:w-auto shrink-0 px-3 py-2 rounded-lg font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Upload</button>
    </form>
  </div>
</Page>

<svelte:window onkeydown={onKey} />

{#if confirmPhoto}
  <!-- z-[60]: above the photo viewer, since the ✕ is reachable while that is open too. -->
  <div class="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
       role="dialog" aria-modal="true" aria-labelledby="del-photo-title">

    <button type="button" onclick={() => (confirmPhoto = null)} aria-label="Cancel"
            class="absolute inset-0 w-full h-full cursor-default"></button>

    <div class="relative z-10 w-full max-w-sm rounded-2xl p-4 space-y-3"
         style="background:var(--color-surface); border:1px solid var(--color-border)">
      <div id="del-photo-title" class="text-base font-semibold text-[var(--color-text)]">Delete this photo?</div>

      <!-- Show the actual photo. A confirmation that doesn't say WHICH one just trains you to
           tap through it. -->
      <div class="flex items-center gap-3">
        <img src={`/uploads/${confirmPhoto.path}`} alt=""
             class="w-20 h-20 object-cover rounded-lg shrink-0" />
        <div class="text-sm text-[var(--color-muted)]">
          Taken <span class="text-[var(--color-text)]">{fmt(confirmPhoto.date)}</span>.
          <span class="block mt-1">This removes the image file too and can't be undone.</span>
        </div>
      </div>

      <div class="flex gap-2 pt-1">
        <button type="button" onclick={() => (confirmPhoto = null)}
                class="flex-1 py-3 rounded-xl font-medium text-[var(--color-text)] bg-[var(--color-surface-2)]">Cancel</button>
        <form method="POST" action="?/delPhoto" use:enhance={afterDelete} class="flex-1">
          <input type="hidden" name="id" value={confirmPhoto.id} />
          <button class="w-full py-3 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-warn)">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}

{#if photoIndex != null && photos[photoIndex]}
  {@const p = photos[photoIndex]}
  <div class="fixed inset-0 z-50 bg-black/95 flex flex-col" role="dialog" aria-modal="true"
       aria-label={`Progress photo from ${fmt(p.date)}`}>

    <!-- Tap-anywhere-to-close is a real button covering the whole overlay, sitting BEHIND the
         content. Hanging a click handler on the wrapping div instead would work but is invisible
         to keyboard and screen-reader users. -->
    <button type="button" onclick={closePhoto} aria-label="Close photo viewer"
            class="absolute inset-0 w-full h-full cursor-default"></button>

    <div class="relative z-10 flex items-center justify-between px-4 py-3 text-white shrink-0"
         style="padding-top: calc(0.75rem + env(safe-area-inset-top))">
      <span class="text-sm font-medium">{fmt(p.date)}
        <span class="text-white/60">· {photoIndex + 1} of {photos.length}</span>
      </span>
      <button onclick={closePhoto} class="w-9 h-9 rounded-full bg-white/15 text-white text-lg leading-none" aria-label="Close">✕</button>
    </div>

    <!-- pointer-events-none on the wrapper lets a tap in the empty space beside a portrait photo
         fall through to the close button behind; the image itself takes its clicks back. -->
    <div class="relative z-10 flex-1 min-h-0 flex items-center justify-center px-2 pointer-events-none">
      <!-- object-contain, not cover: the point of opening it is to see the uncropped photo. -->
      <img src={`/uploads/${p.path}`} alt={`Progress photo, ${fmt(p.date)}`}
           class="max-w-full max-h-full object-contain rounded-lg pointer-events-auto" />
    </div>

    {#if photos.length > 1}
      <div class="relative z-10 flex items-center justify-between gap-3 px-4 py-4 shrink-0"
           style="padding-bottom: calc(1rem + env(safe-area-inset-bottom))">
        <button onclick={() => stepPhoto(-1)}
                class="flex-1 py-3 rounded-xl bg-white/15 text-white font-medium">← Newer</button>
        <button onclick={() => stepPhoto(1)}
                class="flex-1 py-3 rounded-xl bg-white/15 text-white font-medium">Older →</button>
      </div>
    {/if}
  </div>
{/if}
