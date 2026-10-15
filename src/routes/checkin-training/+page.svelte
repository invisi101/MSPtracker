<script>
  import Page from '$lib/components/Page.svelte';
  import { range, dowDayMonth } from '$lib/date-fmt.js';

  let { data } = $props();

  // One button per workout, like the measurement card: one cell per line, so a single paste into
  // the day's top cell fills the column. An exercise with no sets is an EMPTY line, not a dash —
  // the rows below still have to land on the right sheet rows.
  let copiedId = $state(null);
  let timer;
  async function copyDay(s) {
    const text = s.exercises.map((e) => e.cell).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      copiedId = s.id;
      clearTimeout(timer);
      timer = setTimeout(() => (copiedId = null), 2000);
    } catch {
      copiedId = null;
    }
  }
</script>

<Page title="Training for the tracker" subtitle={range(data.week.start, data.week.end)}>
  {#if data.week.sessions.length === 0}
    <div class="card p-4 text-sm text-[var(--color-muted)]">No workouts logged this week.</div>
  {/if}

  {#each data.week.sessions as s (s.id)}
    <div class="card p-4 space-y-3">
      <div class="flex items-baseline justify-between">
        <div class="text-sm font-semibold text-[var(--color-accent)]">{s.dayName}</div>
        <div class="text-xs text-[var(--color-muted)]">{dowDayMonth(s.date)}</div>
      </div>

      <div class="rounded-lg overflow-hidden" style="background:var(--color-bg)">
        {#each s.exercises as ex (ex.id)}
          <div class="flex items-baseline justify-between gap-3 px-3 py-2 border-b border-[var(--color-border)] last:border-0">
            <span class="text-sm whitespace-nowrap {ex.cell ? 'text-[var(--color-muted)]' : 'text-[var(--color-faint)]'}">{ex.name}</span>
            {#if ex.cell}
              <span class="text-sm font-semibold tabular-nums text-[var(--color-text)]">{ex.cell}</span>
            {:else}
              <span class="text-xs text-[var(--color-faint)]">no sets</span>
            {/if}
          </div>
        {/each}
      </div>

      {#if s.extras.length}
        <!-- Logged but not on the programme day, so it has no row on the sheet — shown, but kept
             out of the copied column so the paste can't slip a row. -->
        <div class="text-xs text-[var(--color-muted)]">
          Not on the sheet — mention in the email instead:
          {#each s.extras as ex (ex.id)}
            <div class="flex items-baseline justify-between gap-3 px-3 py-1">
              <span class="whitespace-nowrap">{ex.name}</span>
              <span class="font-semibold tabular-nums text-[var(--color-text)]">{ex.cell}</span>
            </div>
          {/each}
        </div>
      {/if}

      <button type="button" onclick={() => copyDay(s)}
              class="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={copiedId === s.id ? 'background:var(--color-good);color:#0b0f17' : 'background:var(--color-surface-2);color:var(--color-accent)'}>
        {copiedId === s.id ? '✓ Copied — paste into the sheet' : `Copy ${s.dayName}`}
      </button>
    </div>
  {/each}

  <div class="flex items-center justify-between text-sm">
    <a href={`/checkin-training?date=${data.prevWeek}`} class="py-2 text-[var(--color-accent)]">← week of {dowDayMonth(data.prevWeek)}</a>
    <a href={`/checkin-training?date=${data.nextWeek}`} class="py-2 text-[var(--color-accent)]">week of {dowDayMonth(data.nextWeek)} →</a>
  </div>
</Page>
