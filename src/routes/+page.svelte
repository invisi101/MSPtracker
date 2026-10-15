<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import Page from '$lib/components/Page.svelte';
  import MacroBar from '$lib/components/MacroBar.svelte';
  import CheckInCard from '$lib/components/CheckInCard.svelte';
  import { dayMonth, range } from '$lib/date-fmt.js';

  let { data } = $props();
  let targets = $derived(data.targets);
  let totals = $derived(data.totals);
  let week = $derived(data.week);
  let lastMeasured = $derived(data.lastMeasured);
  let sitesByDate = $derived(data.sitesByDate);
  let totalSites = $derived(data.totalSites);
  let weighins = $derived(data.weighins);
  let checkin = $derived(data.checkin);
  let avgWeight = $derived(data.avgWeight);
  let onBlock = $derived(data.onBlock);

  // ---- Daily weigh-in ---------------------------------------------------------
  // First thing done on opening the app, so it sits at the very top of Home.
  //
  // "Today" tracks the BROWSER clock, not the server render. As an installed PWA this page can be
  // resumed days after it was loaded, and the insert upserts on date — a stale date would
  // silently overwrite that day's entry instead of adding a new one.
  const localToday = () => new Date().toLocaleDateString('en-CA');
  let todayD = $state(data.today);
  let weighDate = $state(data.today);
  let pinned = $state(false);   // true once a date is chosen by hand, so we stop auto-rolling it

  function syncToday() {
    const d = localToday();
    if (d === todayD) return;
    todayD = d;
    if (!pinned) weighDate = d;
  }
  $effect(() => {
    syncToday();
    const on = () => syncToday();
    document.addEventListener('visibilitychange', on);
    window.addEventListener('focus', on);
    return () => {
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener('focus', on);
    };
  });

  // The weigh-in for whichever date is selected, if there is one. Drives a status line that is
  // always shown: green tick when that day is recorded, red cross when it isn't.
  const logged = $derived(weighins.find((w) => w.date === weighDate));

  const afterWeighin = () => async ({ update }) => {
    await update({ reset: true });
    await invalidateAll();
    pinned = false;
    weighDate = localToday();
  };

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const remaining = $derived(targets.targetKcal == null ? null : Math.round(targets.targetKcal - totals.kcal));
  const kcalPct = $derived(targets.targetKcal > 0 ? Math.min(100, Math.round((totals.kcal / targets.targetKcal) * 100)) : 0);

  const weight = $derived(data.latestWeight?.weight_kg ?? null);
  const goalWeight = $derived(data.profile?.goal_weight_kg ?? null);
  const toGoal = $derived(goalWeight != null && weight != null ? +(weight - goalWeight).toFixed(1) : null);

  const fmt = dayMonth;

  // ---- Saturday measurement reminder ------------------------------------------
  // Uses todayD, which tracks the browser clock and re-syncs on focus, so it appears when
  // Saturday actually arrives rather than when the page happened to be rendered.
  const isSaturday = $derived(new Date(todayD + 'T00:00:00').getDay() === 6);

  // ---- The weekly numbers -----------------------------------------------------
  // Adherence is judged differently for the two rows. Calories are a target to sit near, so
  // distance from 100% in EITHER direction is what matters. Protein is a minimum, so anything
  // at or above 100% is simply fine and only a shortfall is worth colouring.
  const kcalTone = (p) => (p == null ? 'text' : Math.abs(p - 100) <= 5 ? 'good' : 'warn');
  const protTone = (p) => (p == null ? 'text' : p >= 100 ? 'good' : 'warn');
  const fmtRange = range;

  // Third line under the date — where today sits in the block.
  const blockLine = $derived(
    week?.hasBlock ? `${week.name}, week ${week.week}, day ${week.day}` : ''
  );
</script>

<Page title="Today" subtitle={today} meta={blockLine}>
  <!-- Saturday is check-in day: the tracker's user-filled rows, in order, ready to copy.
       The measurement prompt lives inside this rather than beside it, because measurements are
       one of the rows being reported, not a separate errand. -->
  {#if isSaturday && data.coachBlock}
    <CheckInCard {checkin} today={todayD} {sitesByDate} {totalSites} {lastMeasured} />
  {:else if isSaturday}
    <!-- No coach's tracker to fill in, but the weekly tape round still matters: it's the best
         read on progress while losing fat. -->
    {@const done = sitesByDate[todayD] ?? 0}
    {@const ago = lastMeasured ? Math.round((new Date(todayD + 'T00:00:00') - new Date(lastMeasured + 'T00:00:00')) / 86400000) : null}
    {#if totalSites > 0 && done >= totalSites}
      <div class="card p-4 text-sm font-medium" style="color:var(--color-good)">✓ All {totalSites} measurements taken today</div>
    {:else}
      <a href="/progress" class="card p-4 flex items-center gap-2 text-sm">
        <span class="text-lg leading-none">📏</span>
        <span class="text-[var(--color-accent)]">
          {#if done > 0}Saturday: {done} of {totalSites} measurements done — finish on Progress →
          {:else if ago == null}Saturday: take your measurements on Progress →
          {:else}Saturday: take your measurements — last done {ago} days ago →{/if}
        </span>
      </a>
    {/if}
  {/if}

  <!-- Weigh-in first: it's the first thing done each morning. -->
  <div class="card p-4 space-y-2">
    <form method="POST" action="?/weighin" use:enhance={afterWeighin} class="flex items-end gap-2">
      <label class="flex-1 text-sm font-medium text-[var(--color-text)]">Weight (kg)
        <input name="weight_kg" type="number" step="0.1" inputmode="decimal" required
               class="w-full mt-0.5 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
      </label>
      <label class="text-sm font-medium text-[var(--color-text)]">Date
        <input name="date" type="date" bind:value={weighDate} onchange={() => (pinned = true)}
               class="mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
      </label>
      <button class="px-3 py-2 rounded-lg font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Log</button>
    </form>
    <!-- Always visible, so a glance answers "have I weighed in today?" without hunting. -->
    {#if logged}
      <div class="text-sm font-medium" style="color:var(--color-good)">
        ✓ {fmt(logged.date)} · {logged.weight_kg} kg logged
      </div>
    {:else}
      <div class="text-sm font-medium" style="color:var(--color-warn)">
        ✗ {fmt(weighDate)} · not logged yet
      </div>
    {/if}
  </div>

  {#if !onBlock}
    <a href="/settings/new-block" class="card p-4 block" style="box-shadow:inset 0 0 0 2px var(--color-accent-2)">
      <div class="text-base font-semibold text-[var(--color-text)]">No targets for today</div>
      <p class="text-sm text-[var(--color-muted)] mt-1">
        Add the calories and macros your coach gave you, with the dates they run for, and everything you
        log gets scored against them. <span style="color:#93c5fd">Add your coach's numbers →</span>
      </p>
    </a>
  {/if}

  <!-- Calories -->
  <div class="card p-4">
    <div class="flex items-baseline justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">Calories
        {#if onBlock}<span class="font-normal text-[var(--color-faint)]">· {targets.prescription?.name ?? 'Block'}</span>{/if}
      </span>
      <a href="/nutrition" class="text-xs text-[var(--color-accent)]">Log food →</a>
    </div>
    <div class="mt-1 flex items-baseline gap-2">
      <span class="text-4xl font-bold text-[var(--color-text)]">{Math.round(totals.kcal)}</span>
      <span class="text-lg text-[var(--color-muted)]">{targets.targetKcal != null ? `/ ${targets.targetKcal} kcal` : 'kcal eaten'}</span>
    </div>
    {#if targets.targetKcal != null}
      <div class="mt-3 h-2.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
        <div class="h-full rounded-full transition-all" style="width:{kcalPct}%; background:var(--color-accent)"></div>
      </div>
      <div class="mt-1.5 text-sm text-[var(--color-muted)]">
        <span class="font-semibold" style={`color:var(--color-${remaining < 0 ? 'warn' : 'text'})`}>{Math.abs(remaining)}</span>
        kcal {remaining < 0 ? 'over' : 'remaining'}
      </div>
    {/if}
  </div>

  <!-- Macros -->
  <div class="card p-4 space-y-3">
    <MacroBar label="Protein" have={totals.protein} target={targets.proteinG} color="var(--color-protein)" />
    <MacroBar label="Carbs"   have={totals.carbs}   target={targets.carbsG}   color="var(--color-carb)" />
    <MacroBar label="Fat"     have={totals.fat}     target={targets.fatG}     color="var(--color-fat)" />
  </div>

  <!-- The weekly numbers. Sunday-to-Saturday to match the tracker, not a trailing 7 days. -->
  <div class="card p-4">
    <div class="flex items-baseline justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">This week's average</span>
      <span class="text-xs text-[var(--color-muted)]">{fmtRange(checkin.start, checkin.end)}</span>
    </div>
    <div class="mt-2 grid grid-cols-2 gap-3">
      <div>
        <div class="text-2xl font-bold text-[var(--color-text)]">
          {checkin.avgKcal ?? '—'}<span class="text-sm font-normal text-[var(--color-muted)]"> kcal</span>
        </div>
        <div class="text-xs mt-0.5" style={`color:var(--color-${kcalTone(checkin.kcalAdherence)})`}>
          {checkin.targetKcal == null ? 'no target' : checkin.kcalAdherence == null ? 'nothing logged yet' : `${checkin.kcalAdherence}% of ${checkin.targetKcal}`}
        </div>
      </div>
      <div>
        <div class="text-2xl font-bold text-[var(--color-text)]">
          {checkin.avgProtein ?? '—'}<span class="text-sm font-normal text-[var(--color-muted)]"> g protein</span>
        </div>
        <div class="text-xs mt-0.5" style={`color:var(--color-${protTone(checkin.proteinAdherence)})`}>
          {checkin.proteinMin == null ? 'no target' : checkin.proteinAdherence == null ? 'nothing logged yet' : `${checkin.proteinAdherence}% of ${checkin.proteinMin} g minimum`}
        </div>
      </div>
    </div>
    <!-- Averaged over days with food logged, so an unlogged day is visible rather than silently
         averaged in as zero. -->
    <div class="mt-2 text-xs text-[var(--color-muted)]">
      averaged over {checkin.daysLogged} day{checkin.daysLogged === 1 ? '' : 's'} logged
      {#if checkin.daysMissing > 0}<span style="color:var(--color-warn)"> · {checkin.daysMissing} not logged</span>{/if}
    </div>
  </div>

  <!-- Weight -->
  <div class="grid grid-cols-2 gap-3">
    <!-- Mirrors the Progress page's lead number. The trend is what the plan is judged on, so it
         gets the large type; the raw latest reading stays underneath rather than disappearing. -->
    <div class="card p-4">
      <span class="text-sm font-medium text-[var(--color-text)]">Weight (7-day avg)</span>
      <div class="mt-1 text-2xl font-bold text-[var(--color-text)]">
        {avgWeight ?? '—'}<span class="text-base font-normal text-[var(--color-muted)]"> kg</span>
      </div>
      <div class="text-xs text-[var(--color-muted)] mt-0.5">
        {data.latestWeight ? `latest ${weight} kg · ${fmt(data.latestWeight.date)}` : 'no weigh-ins yet'}
      </div>
    </div>
    <div class="card p-4">
      <span class="text-sm font-medium text-[var(--color-text)]">To goal</span>
      <div class="mt-1 text-2xl font-bold text-[var(--color-text)]">
        {toGoal == null ? '—' : `${toGoal > 0 ? '' : '+'}${Math.abs(toGoal)}`}<span class="text-base font-normal text-[var(--color-muted)]"> kg</span>
      </div>
      <div class="text-xs text-[var(--color-muted)] mt-0.5">
        {goalWeight != null ? `goal ${goalWeight} kg` : 'set a goal in Settings'}
      </div>
    </div>
  </div>

  <!-- This week, Sunday to Saturday — the same week the Saturday check-in uses, not a trailing 7
       days. Counts stop at today, so the rest of the week isn't reported as already missed. -->
  <div class="card p-4">
    <span class="text-sm font-medium text-[var(--color-text)]">
      {week.hasBlock ? `${week.name}, Week ${week.week}` : 'This week'}
    </span>
    <div class="mt-1 text-sm text-[var(--color-muted)]">
      <span class="text-[var(--color-text)] font-semibold">{week.weighDays}/7</span> weigh-ins ·
      <span class="text-[var(--color-text)] font-semibold">{week.nutritionDays}/7</span> nutrition logs ·
      <span class="text-[var(--color-text)] font-semibold">{week.sessions}/{week.sessionTarget}</span> workouts
    </div>
  </div>


</Page>
