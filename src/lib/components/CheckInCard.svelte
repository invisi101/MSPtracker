<script>
  import { range, dayMonth } from '$lib/date-fmt.js';

  // The tracking spreadsheet's user-filled rows for one Sunday–Saturday week, in sheet order,
  // ready to copy.
  // The measurement prompt lives inside this rather than beside it, because measurements are one
  // of the rows being reported, not a separate errand.
  //
  // `today` is passed in rather than read from the clock so the preview route can render a
  // Saturday on any day of the week.
  let { checkin, today, sitesByDate = {}, totalSites = 0, lastMeasured = null } = $props();

  const daysSinceMeasured = $derived(
    lastMeasured
      ? Math.round((new Date(today + 'T00:00:00') - new Date(lastMeasured + 'T00:00:00')) / 86400000)
      : null
  );
  // A PARTIAL round doesn't count. The reminder clears only once every site has a value today,
  // so stopping half way through leaves the prompt up rather than silently marking the week done.
  const sitesToday = $derived(sitesByDate[today] ?? 0);
  const allMeasured = $derived(totalSites > 0 && sitesToday >= totalSites);
  const staleTape = $derived(checkin.measDate != null && checkin.measDate !== today);

  // ---- Copying into the spreadsheet -----------------------------------------------------------
  // One value per line, in the sheet's row order, so a single paste fills the column. A missing
  // value is a BLANK line, not a dash or a zero — the row still has to line up, and a dash would
  // land in the cell as text.
  let copied = $state(false);
  let timer;
  async function copyColumn() {
    const text = checkin.tracker.map((r) => (r.value == null ? '' : r.value)).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      clearTimeout(timer);
      timer = setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }
</script>

<details class="card border" style="border-color:var(--color-accent)" open>
  <summary class="p-4 flex items-center gap-2 cursor-pointer list-none">
    <span class="arrow text-[var(--color-accent)] text-xs">▶</span>
    <span class="text-sm font-semibold text-[var(--color-accent)]">
      Saturday check-in · {range(checkin.start, checkin.end)}
    </span>
  </summary>

  <div class="px-4 pb-4 space-y-3">
    <!-- The tracker's own row order and wording, so it reads the same as the sheet it is going
         into. Selecting the value column by hand works; the button is the one-tap version. -->
    <div class="rounded-lg overflow-hidden" style="background:var(--color-bg)">
      <table class="w-full text-sm">
        <tbody>
          {#each checkin.tracker as row}
            <tr class="border-b border-[var(--color-border)] last:border-0">
              <th scope="row" class="text-left font-medium text-[var(--color-muted)] px-3 py-1.5 whitespace-nowrap">
                {row.label}
                {#if row.label === 'Weight' && checkin.weighDays < 7}
                  <span class="font-normal text-[var(--color-faint)] text-xs"> · {checkin.weighDays}/7 weighed</span>
                {/if}
              </th>
              <td class="text-right font-semibold text-[var(--color-text)] px-3 py-1.5 tabular-nums">
                {row.value ?? '—'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <button type="button" onclick={copyColumn}
            class="w-full py-2.5 rounded-lg text-sm font-semibold"
            style={copied ? 'background:var(--color-good);color:#0b0f17' : 'background:var(--color-surface-2);color:var(--color-accent)'}>
      {copied ? '✓ Copied — paste into the sheet' : 'Copy the numbers'}
    </button>

    <!-- The other half of the check-in: the training sheet wants each workout as one
         "120*10, 9, 8" cell per exercise, which is nothing like how the app shows a session. -->
    <a href={`/checkin-training?date=${checkin.end}`}
       class="block text-center py-2 rounded-lg text-sm font-medium text-[var(--color-accent)] bg-[var(--color-surface-2)]">
      Workouts for the Training Tracker →
    </a>

    <div class="grid grid-cols-2 gap-2 text-center">
      {#each [
        ['Avg kcal', checkin.avgKcal, '', checkin.kcalAdherence == null ? '—' : checkin.kcalAdherence + '%'],
        ['Avg protein', checkin.avgProtein, 'g', checkin.proteinAdherence == null ? '—' : checkin.proteinAdherence + '%']
      ] as [label, value, unit, sub]}
        <div class="rounded-lg px-2 py-2" style="background:var(--color-bg)">
          <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{label}</div>
          <div class="text-base font-semibold text-[var(--color-text)]">
            {value ?? '—'}<span class="text-[10px] font-normal text-[var(--color-muted)]">{unit ? ' ' + unit : ''}</span>
          </div>
          <div class="text-[10px] text-[var(--color-muted)]">{sub}</div>
        </div>
      {/each}
    </div>

    {#if !checkin.complete}
      <div class="text-xs" style="color:var(--color-warn)">
        {7 - checkin.daysLogged} of 7 days not logged yet — send this to your coach once today's food is in.
      </div>
    {/if}

    {#if staleTape}
      <div class="text-xs text-[var(--color-muted)]">
        Tape figures are from {dayMonth(checkin.measDate)} — this week's round isn't in yet.
      </div>
    {/if}

    {#if allMeasured}
      <div class="text-sm font-medium" style="color:var(--color-good)">
        ✓ All {totalSites} measurements taken today
      </div>
    {:else}
      <a href="/progress" class="flex items-center gap-2 text-sm">
        <span class="text-lg leading-none">📏</span>
        <span class="text-[var(--color-accent)]">
          {#if sitesToday > 0}
            {sitesToday} of {totalSites} measurements done — finish on Progress →
          {:else if daysSinceMeasured == null}
            Take your measurements on Progress →
          {:else}
            Take your measurements — last done {daysSinceMeasured} days ago →
          {/if}
        </span>
      </a>
    {/if}
  </div>
</details>

<style>
  /* Safari still shows the default triangle without this. */
  summary::-webkit-details-marker { display: none; }
  .arrow { transition: transform .15s ease; display: inline-block; }
  details[open] .arrow { transform: rotate(90deg); }
</style>
