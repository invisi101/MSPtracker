<script>
  import { enhance } from '$app/forms';
  import Page from '$lib/components/Page.svelte';
  import AiKeyNote from '$lib/components/AiKeyNote.svelte';

  let { form } = $props();

  const field = 'w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base';
  const label = 'block text-sm font-medium text-[var(--color-muted)]';

  const v = $derived(form?.values ?? {});
  const err = $derived(form?.errors ?? {});
  let busy = $state(false);
</script>

<svelte:head><title>Welcome · MSP Tracker</title></svelte:head>

{#if form?.done}
  <Page title="You're set up" subtitle="Next: the numbers and workouts your coach gave you">
    {#if form.keyNote}
      <p class="card p-3 text-sm" style="color:var(--color-warn)">{form.keyNote}</p>
    {:else if form.keySaved}
      <p class="card p-3 text-sm" style="color:var(--color-good)">✓ API key checked and saved. The AI assistant, chef and food estimates are ready.</p>
    {:else}
      <p class="card p-3 text-sm text-[var(--color-muted)]">No API key yet, so the AI assistant, chef and food estimates are off. Everything else works. Add a key any time in Settings.</p>
    {/if}
    <a href="/settings/new-block" class="card p-4 block no-underline space-y-1">
      <div class="text-base font-semibold text-[var(--color-text)]">Add your coach's numbers →</div>
      <p class="text-sm text-[var(--color-muted)]">
        The calories and macros your coach set, and the dates they run for. Everything you log is
        scored against them.
      </p>
    </a>
    <a href="/training/build" class="card p-4 block no-underline space-y-1">
      <div class="text-base font-semibold text-[var(--color-text)]">Enter your coach's workouts →</div>
      <p class="text-sm text-[var(--color-muted)]">Your training days and the lifts for each, ready to log.</p>
    </a>
    <a href="/" class="block text-center text-sm py-2" style="color:#93c5fd">Do this later and go to Home</a>
  </Page>
{:else}
  <Page title="Welcome" subtitle="A tracker for the programme and numbers your coach gives you">
    <form method="POST" class="space-y-4"
          use:enhance={() => { busy = true; return async ({ update }) => { await update({ reset: false }); busy = false; }; }}>

      <div class="card p-4 space-y-3">
        <label class={label}>Your first name <span class="text-[var(--color-faint)]">· optional</span>
          <input class={field} name="name" value={v.name ?? ''} autocomplete="given-name" placeholder="What the assistant and chef call you" />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class={label}>Weight today (kg)
            <input class={field} name="weight_kg" inputmode="decimal" value={v.weight_kg ?? ''} />
            {#if err.weight_kg}<span class="block text-sm mt-1" style="color:var(--color-warn)">{err.weight_kg}</span>{/if}
          </label>
          <label class={label}>Goal weight (kg) <span class="text-[var(--color-faint)]">· optional</span>
            <input class={field} name="goal_weight_kg" inputmode="decimal" value={v.goal_weight_kg ?? ''} />
            {#if err.goal_weight_kg}<span class="block text-sm mt-1" style="color:var(--color-warn)">{err.goal_weight_kg}</span>{/if}
          </label>
        </div>
        <p class="text-sm text-[var(--color-muted)]">The goal weight is only a marker on your charts.</p>
      </div>

      <div class="card p-4 space-y-2">
        <label class={label}>Anything the assistant and chef should know? <span class="text-[var(--color-faint)]">· optional</span>
          <textarea class={field} name="about" rows="4"
                    placeholder="Where you live and shop, foods you like or avoid, when you eat and train, the equipment you have.">{v.about ?? ''}</textarea>
        </label>
        <p class="text-sm text-[var(--color-muted)]">They read this before every answer. You can change it later in Settings.</p>
      </div>

      <div class="card p-4 space-y-3">
        <label class={label}>Anthropic API key <span class="text-[var(--color-faint)]">· optional</span>
          <input class={field} name="api_key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" />
          {#if err.api_key}<span class="block text-sm mt-1" style="color:var(--color-warn)">{err.api_key}</span>{/if}
        </label>
        <p class="text-sm text-[var(--color-muted)]">
          This powers the AI features. Get one at console.anthropic.com, under API keys. It's stored
          only on this computer, and Anthropic bills you directly for what you use.
        </p>
        <AiKeyNote />
      </div>

      <button class="w-full py-3 rounded-xl font-semibold text-[#0b0f17] text-base disabled:opacity-60"
              style="background:var(--color-accent)" disabled={busy}>
        {busy ? 'Saving…' : 'Save and continue'}
      </button>
    </form>
  </Page>
{/if}
