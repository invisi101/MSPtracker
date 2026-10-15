<script>
  // Shown under any box where a lift's name is typed. Says what will be saved, so a variant
  // spelling never silently starts a second, empty history for a lift the user already does.
  //   match  — a matcher from makeMatcher(names)
  //   value  — what's typed
  //   onpick — called with a standard name when the user takes a suggestion
  //   muscle — bindable: what a NEW exercise mainly works. Asked, never guessed from the name.
  import { MUSCLE_CHOICES } from '$lib/muscle-choices.js';
  let { match, value, onpick, muscle = $bindable() } = $props();

  const m = $derived(match(value));
</script>

{#if m.kind === 'alias'}
  <p class="text-sm mt-1" style="color:#93c5fd">
    Saved as <strong>{m.name}</strong>, the standard name, so its history joins up.
  </p>
{:else if m.kind === 'suggest'}
  <div class="mt-1.5 space-y-1.5">
    <p class="text-sm text-[var(--color-text)]">Did you mean</p>
    <div class="flex flex-wrap gap-1.5">
      {#each m.options as o}
        <button type="button" onclick={() => onpick(o)}
                class="px-2.5 py-1.5 rounded-lg text-sm font-semibold text-[#0b0f17]"
                style="background:var(--color-accent-2)">{o}</button>
      {/each}
    </div>
    <p class="text-sm text-[var(--color-muted)]">Or leave it as typed to add “{value.trim()}” as a new exercise.</p>

  <label class="block text-sm text-[var(--color-text)] mt-1.5">If you keep your own name: what does it mainly work?
    <select bind:value={muscle} required
            class="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base">
      <option value="" disabled>Choose the main muscle</option>
      {#each MUSCLE_CHOICES as [v, l]}<option value={v}>{l}</option>{/each}
    </select>
  </label>
  </div>
{:else if m.kind === 'new'}
  <p class="text-sm mt-1 text-[var(--color-muted)]">
    New exercise. It'll be added to your list. There's no form video for it.
  </p>
  <label class="block text-sm text-[var(--color-text)] mt-1.5">What does it mainly work?
    <select bind:value={muscle} required
            class="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base">
      <option value="" disabled>Choose the main muscle</option>
      {#each MUSCLE_CHOICES as [v, l]}<option value={v}>{l}</option>{/each}
    </select>
  </label>
{/if}
