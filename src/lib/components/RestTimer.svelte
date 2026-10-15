<script>
  /*
   * Rest timer for the session view. Sticks below the nav bar so it stays in sight while you
   * scroll down the exercise list — the whole point is being able to log a set, keep reading,
   * and still see the clock.
   *
   * Counts down from a DEADLINE, not by subtracting a second per tick. Phones throttle or stop
   * timers on a backgrounded tab and a locked screen, which is exactly what happens when the
   * phone goes in a pocket between sets — a decrementing counter comes back minutes slow, while
   * a deadline is still right the moment the screen wakes.
   */
  let endsAt = $state(0);          // epoch ms; 0 when idle
  let now = $state(Date.now());
  let preset = $state(0);          // seconds, so the running preset can be highlighted

  const PRESETS = [60, 120, 180];
  const left = $derived(endsAt ? Math.max(0, Math.round((endsAt - now) / 1000)) : 0);
  const running = $derived(endsAt > 0);
  const mmss = $derived(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);

  function start(s) {
    preset = s;
    endsAt = Date.now() + s * 1000;
    now = Date.now();
  }
  function stop() { endsAt = 0; preset = 0; }

  // One interval for as long as something is running. Ticking four times a second keeps the
  // display honest without waiting a full second to catch up after the screen wakes.
  $effect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      now = Date.now();
      if (now >= endsAt) {
        stop();
        if (navigator.vibrate) navigator.vibrate(300);
      }
    }, 250);
    return () => clearInterval(iv);
  });
</script>

<div class="sticky z-10 card p-3 flex items-center gap-2" style="top:var(--header-h, 0px)">
  <span class="text-base font-semibold tabular-nums w-14
               {running ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}">
    {running ? mmss : 'Rest'}
  </span>
  <div class="flex gap-1.5 flex-1">
    {#each PRESETS as s}
      <button onclick={() => start(s)}
              class="flex-1 py-1.5 rounded-lg text-sm border
                     {running && preset === s
                       ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-surface-2)]'
                       : 'border-transparent bg-[var(--color-surface-2)] text-[var(--color-text)]'}">
        {s / 60} min
      </button>
    {/each}
    {#if running}
      <button onclick={stop} class="px-3 py-1.5 rounded-lg text-sm text-[#0b0f17]"
              style="background:var(--color-accent)">Stop</button>
    {/if}
  </div>
</div>
