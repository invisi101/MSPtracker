<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import Page from '$lib/components/Page.svelte';

  let { data, form } = $props();
  let messages = $derived(data.messages);
  let configured = $derived(data.configured);
  let day = $derived(data.day);

  let plan = $state(null);
  $effect(() => { if (form?.plan) plan = form.plan; });

  let fill = $state(null);
  $effect(() => { if (form?.fill) fill = form.fill; });

  let building = $state(false);
  let filling = $state(false);
  let sending = $state(false);

  const afterPlan = () => { building = true; return async ({ update }) => { await update({ reset: false }); building = false; }; };
  const afterFill = () => { filling = true; return async ({ update }) => { await update({ reset: false }); filling = false; }; };
  const afterReload = () => async ({ update }) => { await update({ reset: false }); await invalidateAll(); };
  const afterChat = () => { sending = true; return async ({ update }) => { await update({ reset: true }); await invalidateAll(); sending = false; }; };

  // Remaining vs target, shown as "left" or (when negative) "over".
  const remRows = [['kcal', 'kcal'], ['protein', 'P'], ['carbs', 'C'], ['fat', 'F']];

  const mains = $derived(plan ? plan.meals.filter((m) => m.recipe) : []);
  const extras = $derived(plan ? plan.meals.filter((m) => m.filler) : []);
  const mainIds = $derived(mains.map((m) => m.recipe.id));
  const deltaColor = (v, tol) => (v == null ? 'var(--color-muted)' : Math.abs(v) <= tol ? 'var(--color-good)' : 'var(--color-warn)');
  const sign = (v) => (v == null ? '' : v > 0 ? `+${v}` : `${v}`);
  const portionText = (p) => ({ 0.5: '½ serving', 0.75: '¾ serving', 1.25: '1¼ servings', 1.5: '1½ servings' })[p] ?? `${p}× serving`;
  const shapeText = $derived(`${data.shape.meals} meals${data.shape.breakfast ? ' including breakfast' : ', no breakfast'}`);
</script>

<Page title="Chef" subtitle="On-demand meal plans that hit your macros">
  {#if !day.has}
    <div class="card p-4 text-sm text-[var(--color-text)]" style="box-shadow:inset 0 0 0 2px var(--color-accent-2)">
      Meal plans and suggestions are built to land on your coach's numbers.
      <a href="/settings/new-block" style="color:#93c5fd">Add your coach's numbers</a> to use them. Asking the chef works either way.
    </div>
  {/if}
  <!-- Section 1: Today's plan -->
  <div class="card p-4 space-y-3">
    <div class="text-sm font-medium text-[var(--color-text)]">Give me a meal plan for today</div>
    <div class="grid grid-cols-2 gap-2">
      <form method="POST" action="?/plan" use:enhance={afterPlan}>
        <input type="hidden" name="tier" value="simple" />
        <input type="hidden" name="avoidIds" value={JSON.stringify(mainIds)} />
        <button disabled={building} class="w-full py-2.5 rounded-xl font-semibold text-[var(--color-text)] border border-[var(--color-border)]">
          {building ? '…' : '🍚 Simple'}
        </button>
      </form>
      <form method="POST" action="?/plan" use:enhance={afterPlan}>
        <input type="hidden" name="tier" value="fancy" />
        <input type="hidden" name="avoidIds" value={JSON.stringify(mainIds)} />
        <button disabled={building} class="w-full py-2.5 rounded-xl font-semibold text-[var(--color-text)] border border-[var(--color-border)]">
          {building ? '…' : '🍽 Fancy'}
        </button>
      </form>
    </div>
    <p class="text-xs text-[var(--color-muted)]">{shapeText}, plus up to 2 protein shakes, fruit &amp; yoghurt — built to land on your daily targets. Tap again for a new one. <a href="/settings#chef" class="text-[var(--color-accent)]">Change meals</a></p>

    {#if plan}
      <!-- macro summary vs target -->
      <div class="rounded-lg p-3" style="background:var(--color-surface-2)">
        <div class="grid grid-cols-4 gap-2 text-center">
          {#each [['kcal','kcal',60],['protein_g','P',10],['carbs_g','C',25],['fat_g','F',12]] as [k,lbl,tol]}
            <div>
              <div class="text-base font-bold text-[var(--color-text)]">{plan.total[k]}<span class="text-[10px] font-normal text-[var(--color-muted)]"> {lbl}</span></div>
              <div class="text-[10px] text-[var(--color-faint)]">/ {plan.target[k] ?? 'not set'}</div>
              <div class="text-[10px]" style="color:{deltaColor(plan.delta[k], tol)}">{sign(plan.delta[k])}</div>
            </div>
          {/each}
        </div>
      </div>

      <!-- meals -->
      {#each mains as m (m.recipe.id + m.slot)}
        <div class="rounded-lg p-3 border border-[var(--color-border)]">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-[10px] uppercase tracking-wide text-[var(--color-accent)]">{m.slot}</div>
              <div class="font-semibold text-[var(--color-text)]">{m.recipe.name}</div>
            </div>
            <div class="text-right text-xs text-[var(--color-muted)] shrink-0">
              {m.recipe.kcal} kcal<br>{m.recipe.protein_g}P · {m.recipe.carbs_g}C · {m.recipe.fat_g}F
            </div>
          </div>
          <div class="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-faint)]">
            <span class="px-1.5 py-0.5 rounded-full {m.recipe.tier === 'simple' ? 'text-[var(--color-good)]' : 'text-[var(--color-warn)]'}" style="background:var(--color-bg)">{m.recipe.tier}</span>
            {#if m.portion && m.portion !== 1}<span class="text-[var(--color-accent)]">{portionText(m.portion)} — scale the ingredients</span>{/if}
            {#if m.recipe.prep_min}<span>⏱ {m.recipe.prep_min} min</span>{/if}
            {#if m.recipe.estimated}<span>≈ est</span>{/if}
          </div>
          <details class="mt-2">
            <summary class="text-xs text-[var(--color-accent)] cursor-pointer">recipe</summary>
            <div class="mt-1.5 text-xs text-[var(--color-muted)] space-y-1.5">
              <div><span class="font-medium text-[var(--color-text)]">Ingredients:</span> {m.recipe.ingredients.join(' · ')}</div>
              <ol class="list-decimal ml-4 space-y-0.5">
                {#each m.recipe.method as step}<li>{step}</li>{/each}
              </ol>
              {#if m.recipe.japan_note}<div class="text-[var(--color-faint)]">🇯🇵 {m.recipe.japan_note}</div>{/if}
            </div>
          </details>
        </div>
      {/each}

      {#if extras.length}
        <div class="rounded-lg p-3" style="background:var(--color-surface-2)">
          <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)] mb-1">On the side</div>
          {#each extras as m}
            <div class="flex justify-between text-sm text-[var(--color-text)] py-0.5">
              <span>＋ {m.filler.name}{#if m.filler.detail}<span class="text-[var(--color-faint)] text-xs"> · {m.filler.detail}</span>{/if}</span>
              <span class="text-xs text-[var(--color-muted)] shrink-0">{m.filler.kcal} kcal · {m.filler.protein_g}P</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- actions -->
      <div class="grid grid-cols-2 gap-2">
        <form method="POST" action="?/plan" use:enhance={afterPlan}>
          <input type="hidden" name="tier" value={plan.tier} />
          <input type="hidden" name="avoidIds" value={JSON.stringify(mainIds)} />
          <button class="w-full py-2 rounded-lg text-sm font-semibold text-[var(--color-text)] border border-[var(--color-border)]">🔄 New plan</button>
        </form>
        <form method="POST" action="?/plan" use:enhance={afterPlan}>
          <input type="hidden" name="tier" value={plan.tier} />
          <input type="hidden" name="keepDinnerId" value={plan.dinnerId} />
          <input type="hidden" name="avoidIds" value={JSON.stringify(mains.filter((m) => m.recipe.id !== plan.dinnerId).map((m) => m.recipe.id))} />
          <button class="w-full py-2 rounded-lg text-sm font-semibold text-[var(--color-text)] border border-[var(--color-border)]">Keep dinner ↻</button>
        </form>
      </div>
      <form method="POST" action="?/logDay" use:enhance={afterReload}>
        <input type="hidden" name="plan" value={JSON.stringify(plan)} />
        <button class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-good)">Log this day →</button>
      </form>
      {#if form?.logged}<p class="text-xs text-[var(--color-good)]">✓ Logged {form.count} items to today's diary.</p>{/if}
    {/if}
  </div>

  <!-- Section 2: Fill the rest of today, from what's already logged -->
  <div class="card p-4 space-y-3">
    <div>
      <div class="text-sm font-medium text-[var(--color-text)]">Fill the rest of my day</div>
      <p class="text-xs text-[var(--color-muted)]">Reads what you've logged today and suggests options to land on your targets.</p>
    </div>

    {#if day.has}
    <div class="text-xs text-[var(--color-muted)]">Eaten <span class="text-[var(--color-text)] font-semibold">{day.eaten.kcal}</span> / {day.target.kcal ?? '—'} kcal</div>

    <!-- remaining vs target -->
    <div class="rounded-lg p-3" style="background:var(--color-surface-2)">
      <div class="grid grid-cols-4 gap-2 text-center">
        {#each remRows as [k, lbl]}
          {@const v = day.remaining[k]}
          <div>
            <div class="text-base font-bold" style="color:{v != null && v < 0 ? 'var(--color-warn)' : 'var(--color-text)'}">
              {v == null ? '—' : v < 0 ? -v : v}<span class="text-[10px] font-normal text-[var(--color-muted)]"> {lbl}</span>
            </div>
            <div class="text-[10px] text-[var(--color-faint)]">{v == null ? 'not set' : v < 0 ? 'over' : 'left'}</div>
          </div>
        {/each}
      </div>
    </div>

    {#if day.remaining.fat != null && day.remaining.fat < 0}
      <p class="text-xs" style="color:var(--color-warn)">You're {-day.remaining.fat} g over your fat target — options will lean on protein &amp; low-fat carbs and keep added fat down.</p>
    {/if}
    {/if}

    {#if configured}
      <form method="POST" action="?/fillDay" use:enhance={afterFill}>
        <button disabled={filling} class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent)">
          {filling ? 'Thinking…' : '🍽 Suggest what to eat'}
        </button>
      </form>
    {:else}
      <p class="text-sm text-[var(--color-warn)]">AI suggestions need an Anthropic API key. <a href="/settings#ai" style="color:#93c5fd">Add one in Settings</a>. The macro maths above still works.</p>
    {/if}

    {#if form?.error && !form?.fill}<p class="text-xs" style="color:var(--color-warn)">{form.error}</p>{/if}
    {#if fill}
      <div class="rounded-lg p-3 text-sm whitespace-pre-wrap text-[var(--color-text)]" style="background:var(--color-surface-2)">{fill}</div>
    {/if}
  </div>

  <!-- Section 3: Ask the chef -->
  <div class="card p-4 space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">Ask the chef</span>
      {#if messages.length}
        <form method="POST" action="?/clearChat" use:enhance={afterReload}><button class="text-xs text-[var(--color-faint)]">clear</button></form>
      {/if}
    </div>
    {#if !configured}
      <p class="text-sm text-[var(--color-warn)]">The AI chef needs an Anthropic API key. <a href="/settings#ai" style="color:#93c5fd">Add one in Settings</a>. The meal planner above still works.</p>
    {/if}
    <div class="space-y-2 max-h-[50vh] overflow-y-auto">
      {#if !messages.length}
        <p class="text-sm text-[var(--color-muted)]">Ask "how do I make this?", a swap, or "what can I do with chicken and rice?" — quick, macro-aware answers.</p>
      {/if}
      {#each messages as m}
        <div class="flex {m.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap {m.role === 'user' ? 'text-[#0b0f17]' : 'text-[var(--color-text)]'}"
               style={m.role === 'user' ? 'background:var(--color-accent)' : 'background:var(--color-surface-2)'}>{m.content}</div>
        </div>
      {/each}
      {#if sending}<div class="text-xs text-[var(--color-faint)]">chef is thinking…</div>{/if}
    </div>
    <form method="POST" action="?/chat" use:enhance={afterChat} class="flex gap-2">
      <input name="message" placeholder="Ask the chef…" autocomplete="off"
             class="flex-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none" />
      <button disabled={sending} class="px-3 py-2 rounded-lg font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Send</button>
    </form>
  </div>
</Page>
