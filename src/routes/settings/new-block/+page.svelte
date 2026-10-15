<script>
  import { enhance } from '$app/forms';
  import Page from '$lib/components/Page.svelte';
  import { dayMonthYear } from '$lib/date-fmt.js';

  let { data, form } = $props();

  const field = 'w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base';
  const label = 'block text-sm font-medium text-[var(--color-muted)]';
  const fmt = (d) => (d ? dayMonthYear(d) : '');

  // ---- Dates --------------------------------------------------------------------------------------
  // Length is held in days and kept in step three ways: type weeks and the end date follows; move
  // the start and the end moves with it; pick an end date and the weeks follow.
  const DAY = 86400000;
  const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / DAY);
  const shift = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
  let name = $state(data.defaults.name);
  let startDate = $state(data.defaults.startDate);
  let endDate = $state(data.defaults.endDate);
  let lengthDays = $state(daysBetween(data.defaults.startDate, data.defaults.endDate));
  let weeksText = $state(String(+(lengthDays / 7).toFixed(1)));
  const weeks = $derived(+(lengthDays / 7).toFixed(1));
  function onStart(v) { startDate = v; if (v) endDate = shift(v, lengthDays); }
  function onEnd(v) { endDate = v; if (v && startDate) { lengthDays = daysBetween(startDate, v); weeksText = String(+(lengthDays / 7).toFixed(1)); } }
  function onWeeks(v) {
    weeksText = v;
    const w = +v;
    if (Number.isFinite(w) && w > 0 && startDate) { lengthDays = Math.round(w * 7); endDate = shift(startDate, lengthDays); }
  }
  // Blocks these dates run into. One that started earlier can be ended the day before; one that
  // starts on or after the new start date can't, and the dates have to change.
  let shorten = $state(true);
  const clashes = $derived(data.blocks.filter((b) =>
    (!b.start_date || b.start_date <= endDate) && (!b.end_date || b.end_date >= startDate)));
  const endable = $derived(clashes.length === 1 && clashes[0].start_date && clashes[0].start_date < startDate ? clashes[0] : null);
  const dateError = $derived(
    !startDate || !endDate ? 'Pick a start and an end date.'
    : endDate < startDate ? 'The end date is before the start date.'
    : clashes.length && !endable ? `These dates overlap ${clashes.map((c) => `"${c.name}"`).join(' and ')}, which can't be ended before ${fmt(startDate)}. Move the start date.`
    : endable && !shorten ? `These dates overlap "${endable.name}". Tick the box to end it the day before, or change the dates.`
    : null);

  // ---- The coach's numbers ------------------------------------------------------------------------
  let coach = $state({ source: '', kcal: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' });
  const n = (v) => (String(v ?? '').trim() === '' ? null : Number(v));
  const fromMacros = $derived.by(() => {
    const P = n(coach.protein_g), C = n(coach.carbs_g), F = n(coach.fat_g);
    return P != null && C != null && F != null ? Math.round(P * 4 + C * 4 + F * 9) : null;
  });
  const numbersError = $derived(n(coach.kcal) == null && fromMacros == null
    ? 'Enter the calories, or all three macros so the calories can be worked out.' : null);

  // ---- Workouts -----------------------------------------------------------------------------------
  // '' = carry on with what's running now (or none yet); a preset id = a copy of that saved workout.
  let presetId = $state('');
  let openPreview = $state(null);

  let busy = $state(false);
  const ready = $derived(!(dateError && !(endable && shorten)) && !numbersError);
  const payload = $derived(JSON.stringify({
    name, startDate, endDate, shortenBlockId: endable && shorten ? endable.id : null,
    ...coach, presetId: presetId || null
  }));
</script>

<svelte:head><title>New block · MSP Tracker</title></svelte:head>

<Page title="New block" subtitle="The dates and daily numbers your coach gave you, and the workouts to run">
  <form method="POST" class="space-y-4"
        use:enhance={() => { busy = true; return async ({ update }) => { await update({ reset: false }); busy = false; }; }}>
    <input type="hidden" name="payload" value={payload} />

    <div class="card p-4 space-y-3">
      <div class="text-sm font-semibold text-[var(--color-text)]">Dates</div>
      <label class={label}>Name<input class={field} bind:value={name} /></label>
      <label class={label}>Starts<input class={field} type="date" value={startDate} oninput={(e) => onStart(e.currentTarget.value)} /></label>
      <div class="grid grid-cols-[1fr_2fr] gap-3">
        <label class={label}>Weeks<input class={field} type="number" min="1" step="1" inputmode="numeric" value={weeksText} oninput={(e) => onWeeks(e.currentTarget.value)} /></label>
        <label class={label}>Ends<input class={field} type="date" value={endDate} oninput={(e) => onEnd(e.currentTarget.value)} /></label>
      </div>
      {#if !dateError || endable}
        <p class="text-sm text-[var(--color-muted)]">{weeks} weeks · {fmt(startDate)} to {fmt(endDate)}</p>
      {/if}
      {#if endable}
        <div class="rounded-xl p-3 space-y-2" style="background:var(--color-bg)">
          <p class="text-sm text-[var(--color-text)]">
            These dates overlap <strong>{endable.name}</strong> ({fmt(endable.start_date)} – {fmt(endable.end_date)}).
          </p>
          <label class="flex items-start gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" bind:checked={shorten} class="w-4 h-4 mt-0.5" />
            <span>End {endable.name} on <strong>{fmt(shift(startDate, -1))}</strong>, the day before. Its days keep their targets; only its end date changes.</span>
          </label>
        </div>
      {/if}
      {#if dateError && !(endable && shorten)}<p class="text-sm" style="color:var(--color-warn)">{dateError}</p>{/if}
    </div>

    <div class="card p-4 space-y-3">
      <div class="text-sm font-semibold text-[var(--color-text)]">Your coach's daily numbers</div>
      <label class={label}>Set by<input class={field} bind:value={coach.source} placeholder="e.g. your coach's name" /></label>
      <div class="grid grid-cols-2 gap-3">
        <label class={label}>Calories (kcal)<input class={field} inputmode="numeric" bind:value={coach.kcal} placeholder={fromMacros ? `${fromMacros} from the macros` : ''} /></label>
        <label class={label}>Protein (g)<input class={field} inputmode="numeric" bind:value={coach.protein_g} /></label>
        <label class={label}>Carbs (g)<input class={field} inputmode="numeric" bind:value={coach.carbs_g} /></label>
        <label class={label}>Fat (g)<input class={field} inputmode="numeric" bind:value={coach.fat_g} /></label>
      </div>
      <p class="text-sm text-[var(--color-muted)]">
        Enter what your coach gave you. Leave out any they didn't set. If you give all three macros and no
        calories, the calories are worked out from them.
      </p>
      {#if numbersError && (coach.kcal || coach.protein_g || coach.carbs_g || coach.fat_g)}<p class="text-sm" style="color:var(--color-warn)">{numbersError}</p>{/if}
      <label class={label}>Coach's notes<textarea class={field} rows="3" bind:value={coach.notes} placeholder="Anything else they said: steps, cardio, check-in days…"></textarea></label>
    </div>

    <div class="card p-4 space-y-2">
      <div class="text-sm font-semibold text-[var(--color-text)]">Workouts</div>
      <p class="text-sm text-[var(--color-muted)]">Editing this block's workouts later won't change the saved workout, so it stays as it is for your next block.</p>
      {#each [{ id: '', name: data.current ? `Carry on with ${data.current.name}` : 'Add them later in Settings', days: null }, ...data.presets] as p}
        <div class="rounded-xl p-3" style={`background:var(--color-bg); ${presetId === String(p.id) ? 'box-shadow:inset 0 0 0 2px var(--color-accent)' : ''}`}>
          <label class="flex items-center gap-2 text-base text-[var(--color-text)]">
            <input type="radio" name="preset" value={String(p.id)} bind:group={presetId} class="w-4 h-4" />
            <span class="font-semibold">{p.name}</span>
            {#if p.days}<span class="text-sm text-[var(--color-muted)]">· {p.days.length} days</span>{/if}
          </label>
          {#if p.days}
            <button type="button" class="text-sm mt-1" style="color:#93c5fd"
                    onclick={() => (openPreview = openPreview === p.id ? null : p.id)}>
              {openPreview === p.id ? 'Hide workouts' : 'Show workouts'}
            </button>
            {#if openPreview === p.id}
              <div class="mt-2 space-y-1.5">
                {#each p.days as d}
                  <div class="text-sm">
                    <span class="text-[var(--color-text)] font-medium">{d.name}</span>
                    <div class="text-[var(--color-muted)]">{d.exercises.join(' · ')}</div>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      {/each}
      <p class="text-sm text-[var(--color-muted)]">To enter your coach's workouts, use <a href="/training/build" style="color:#93c5fd">Build a workout</a> on the Training page.</p>
    </div>

    {#if form?.error}<p class="text-sm" style="color:var(--color-warn)">{form.error}</p>{/if}
    <button disabled={!ready || busy} class="w-full py-3 rounded-xl font-semibold text-[#0b0f17] text-base disabled:opacity-50"
            style="background:var(--color-accent)">{busy ? 'Saving…' : 'Create block'}</button>
  </form>
</Page>
