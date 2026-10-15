<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import Page from '$lib/components/Page.svelte';

  let { data, form } = $props();
  let messages = $derived(data.messages);
  let configured = $derived(data.configured);

  let sending = $state(false);
  let estimating = $state(false);
  const afterChat = () => { sending = true; return async ({ update }) => { await update({ reset: true }); await invalidateAll(); sending = false; }; };
  const afterReload = () => async ({ update }) => { await update({ reset: true }); await invalidateAll(); };
  const afterEstimate = () => { estimating = true; return async ({ update }) => { await update({ reset: false }); estimating = false; }; };

  const slots = ['breakfast', 'lunch', 'snack', 'dinner', 'other'];
  const estimate = $derived(form?.estimate);
  // The estimate comes back for one portion; the amount box rescales it before logging.
  let amt = $state(1);
  $effect(() => { if (estimate) amt = estimate.amount; });
  const factor = $derived(estimate && estimate.amount ? (Number(amt) || 0) / estimate.amount : 1);
  const sc = $derived(estimate ? {
    kcal: Math.round(estimate.kcal * factor),
    protein: +(estimate.protein * factor).toFixed(1),
    fat: +(estimate.fat * factor).toFixed(1),
    carbs: +(estimate.carbs * factor).toFixed(1)
  } : null);
</script>

<Page title="Assistant" subtitle="Ask questions about your plan, or estimate a food you can't find">
  {#if !configured}
    <p class="card p-3 text-sm text-[var(--color-warn)]">The assistant and food estimates need an Anthropic API key. <a href="/settings#ai" style="color:#93c5fd">Add one in Settings</a>.</p>
  {/if}

  <!-- AI food estimate -->
  <div class="card p-4 space-y-3">
    <div class="text-sm font-medium text-[var(--color-text)]">Estimate a food / drink</div>
    <form method="POST" action="?/estimate" use:enhance={afterEstimate} class="flex gap-2">
      <input name="description" placeholder="e.g. 300g steak, coca cola 330ml, or just 'banana'"
             class="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none" />
      <button disabled={estimating} class="px-3 py-2 rounded-lg font-semibold text-[#0b0f17]" style="background:var(--color-accent)">{estimating ? '…' : 'Estimate'}</button>
    </form>
    {#if estimate}
      <div class="rounded-lg p-3 space-y-2" style="background:var(--color-surface-2)">
        <div class="flex items-center justify-between gap-2">
          <div class="text-[var(--color-text)] font-medium">{estimate.name}</div>
          <div class="flex items-center gap-1.5 shrink-0">
            <input type="number" bind:value={amt} min="0" step="any" inputmode="decimal"
                   class="w-16 px-2 py-1 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-sm text-right" />
            <span class="text-sm text-[var(--color-muted)]">{estimate.unit}</span>
          </div>
        </div>
        <div class="text-sm text-[var(--color-text)]"><span class="font-semibold">{sc.kcal}</span> kcal · {sc.protein}P / {sc.carbs}C / {sc.fat}F</div>
        <form method="POST" action="?/logEstimate" use:enhance={afterReload} class="flex gap-2">
          <input type="hidden" name="name" value={`${estimate.name} (${amt} ${estimate.unit})`} />
          <input type="hidden" name="kcal" value={sc.kcal} />
          <input type="hidden" name="protein" value={sc.protein} />
          <input type="hidden" name="fat" value={sc.fat} />
          <input type="hidden" name="carbs" value={sc.carbs} />
          <select name="slot" class="flex-1 px-2 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-sm">
            {#each slots as s}<option value={s}>{s}</option>{/each}
          </select>
          <button class="px-3 py-2 rounded-lg text-sm font-semibold text-[#0b0f17]" style="background:var(--color-good)">Log it</button>
        </form>
      </div>
    {/if}
    {#if form?.logged}<p class="text-xs text-[var(--color-good)]">✓ Logged to today.</p>{/if}
  </div>

  <!-- Chat -->
  <div class="card p-4 space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">Ask the assistant</span>
      {#if messages.length}
        <form method="POST" action="?/clearChat" use:enhance={afterReload}><button class="text-xs text-[var(--color-faint)]">clear</button></form>
      {/if}
    </div>

    <div class="space-y-2 max-h-[50vh] overflow-y-auto">
      {#if !messages.length}
        <p class="text-sm text-[var(--color-muted)]">Ask about your plan, a food swap, technique, or how to read your progress. It helps you follow your coach's plan and won't change it.</p>
      {/if}
      {#each messages as m}
        <div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap {m.role === 'user' ? 'text-[#0b0f17]' : 'text-[var(--color-text)]'}"
               style={m.role === 'user' ? 'background:var(--color-accent)' : 'background:var(--color-surface-2)'}>{m.content}</div>
        </div>
      {/each}
      {#if sending}<div class="text-xs text-[var(--color-faint)]">thinking…</div>{/if}
    </div>
    <form method="POST" action="?/chat" use:enhance={afterChat} class="flex gap-2">
      <input name="message" placeholder="Ask anything…" autocomplete="off"
             class="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none" />
      <button disabled={sending} class="px-3 py-2 rounded-lg font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Send</button>
    </form>
  </div>
</Page>
