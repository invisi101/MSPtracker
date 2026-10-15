<script>
  import { enhance } from '$app/forms';
  import Page from '$lib/components/Page.svelte';
  import ExerciseNameHint from '$lib/components/ExerciseNameHint.svelte';
  import { makeMatcher } from '$lib/exercise-names.js';

  let { data, form } = $props();

  const matchName = $derived(makeMatcher(data.names));
  const blankLift = () => ({ name: '', muscle: '', sets: '3', rep_low: '8', rep_high: '12', rir: '2', rest: '' });
  const blankDay = (i) => ({ name: '', exercises: [blankLift()], key: Math.random() + i });

  let name = $state('');
  let days = $state([blankDay(0)]);
  let useNow = $state(!!data.block && !data.block.hasWorkouts);
  let busy = $state(false);

  const nameTaken = $derived(data.presetNames.some((n) => n.toLowerCase() === name.trim().toLowerCase()));
  const liftCount = $derived(days.reduce((s, d) => s + d.exercises.filter((e) => e.name.trim()).length, 0));
  // A lift the app doesn't know needs its main muscle answered before saving.
  const unanswered = $derived(days.some((d) => d.exercises.some((e) => {
    const k = matchName(e.name).kind; return (k === 'new' || k === 'suggest') && !e.muscle;
  })));
  const ready = $derived(name.trim() && !nameTaken && liftCount > 0 && !unanswered);
  const payload = $derived(JSON.stringify({ name, days, useNow }));

  const field = 'w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base';
  const small = 'w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base text-center';
  const label = 'block text-sm font-medium text-[var(--color-muted)]';
</script>

<svelte:head><title>Build a workout · MSP Tracker</title></svelte:head>

<Page title="Build a workout" subtitle="Name it, add your training days, then the lifts for each day">
  <form method="POST" class="space-y-4"
        use:enhance={() => { busy = true; return async ({ update }) => { await update({ reset: false }); busy = false; }; }}>
    <input type="hidden" name="workout" value={payload} />

    <div class="card p-4 space-y-2">
      <label class={label}>Workout name
        <input class={field} bind:value={name} placeholder="e.g. My 3-day split" />
      </label>
      {#if nameTaken}<p class="text-sm" style="color:var(--color-warn)">You already have a workout called that.</p>{/if}
    </div>

    {#each days as d, di (d.key)}
      <div class="card p-4 space-y-3">
        <div class="flex items-end gap-2">
          <label class="{label} flex-1">Day {di + 1}
            <input class={field} bind:value={d.name} placeholder={`e.g. Upper, Legs, Day ${di + 1}`} />
          </label>
          {#if days.length > 1}
            <button type="button" onclick={() => (days = days.filter((_, j) => j !== di))}
                    class="px-3 py-2 rounded-lg text-sm text-[var(--color-text)] bg-[var(--color-surface-2)]">Remove day</button>
          {/if}
        </div>

        {#each d.exercises as ex, i}
          <div class="rounded-xl p-3 space-y-2" style="background:var(--color-surface-2)">
            <div class="flex items-center gap-2">
              <input bind:value={ex.name} list="build-exercises" placeholder="Exercise, e.g. BB Back Squat"
                     class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
              <button type="button" aria-label="Remove exercise" class="px-2 text-lg text-[var(--color-text)]"
                      onclick={() => (d.exercises = d.exercises.filter((_, j) => j !== i))}>✕</button>
            </div>
            <ExerciseNameHint match={matchName} value={ex.name} onpick={(n) => (ex.name = n)} bind:muscle={ex.muscle} />
            <div class="grid grid-cols-5 gap-1.5">
              <label class="text-sm text-[var(--color-muted)] text-center">Sets<input class={small} inputmode="numeric" bind:value={ex.sets} /></label>
              <label class="text-sm text-[var(--color-muted)] text-center">Reps from<input class={small} inputmode="numeric" bind:value={ex.rep_low} /></label>
              <label class="text-sm text-[var(--color-muted)] text-center">to<input class={small} inputmode="numeric" bind:value={ex.rep_high} /></label>
              <label class="text-sm text-[var(--color-muted)] text-center">RIR<input class={small} bind:value={ex.rir} /></label>
              <label class="text-sm text-[var(--color-muted)] text-center">Rest<input class={small} bind:value={ex.rest} placeholder="2 min" /></label>
            </div>
          </div>
        {/each}

        <button type="button" onclick={() => (d.exercises = [...d.exercises, blankLift()])}
                class="w-full py-2 rounded-lg text-sm font-semibold text-[var(--color-accent-2)] bg-[var(--color-surface-2)]">+ Add exercise</button>
      </div>
    {/each}

    <button type="button" onclick={() => (days = [...days, blankDay(days.length)])}
            class="w-full py-2.5 rounded-xl text-base font-semibold text-[var(--color-text)] border border-[var(--color-border)]">+ Add a day</button>

    <div class="card p-4 space-y-2">
      <p class="text-sm text-[var(--color-muted)]">
        RIR is reps in reserve: how many more you could have done at the end of a set. Leave Rest blank if you don't time it.
      </p>
      {#if data.block}
        <label class="flex items-start gap-2.5 text-base text-[var(--color-text)]">
          <input type="checkbox" bind:checked={useNow} class="w-5 h-5 mt-0.5" />
          <span>Use it for {data.block.name} from today</span>
        </label>
        {#if useNow && data.block.hasWorkouts}
          <p class="text-sm" style="color:var(--color-warn)">This replaces the workouts {data.block.name} is running now. Sessions you've already logged are kept.</p>
        {:else if !useNow}
          <p class="text-sm text-[var(--color-muted)]">It's saved with your other workouts. Pick it when you start a block.</p>
        {/if}
      {:else}
        <p class="text-sm text-[var(--color-muted)]">It's saved with your other workouts. Pick it when you start a block.</p>
      {/if}
    </div>

    {#if form?.error}<p class="text-sm" style="color:var(--color-warn)">{form.error}</p>{/if}
    <button disabled={!ready || busy} class="w-full py-3 rounded-xl font-semibold text-[#0b0f17] text-base disabled:opacity-50"
            style="background:var(--color-accent)">{busy ? 'Saving…' : 'Save workout'}</button>
    {#if !ready && !busy}
      <p class="text-sm text-center text-[var(--color-muted)]">{!name.trim() ? 'Give it a name to save it.' : nameTaken ? 'Pick a different name.' : unanswered ? 'Choose what each new exercise mainly works, or pick a suggested name.' : 'Add at least one exercise.'}</p>
    {/if}
  </form>

  <datalist id="build-exercises">{#each data.names as n}<option value={n}></option>{/each}</datalist>
</Page>
