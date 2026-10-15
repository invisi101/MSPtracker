<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import Page from '$lib/components/Page.svelte';
  import MacroBar from '$lib/components/MacroBar.svelte';
  import { dowDayMonth } from '$lib/date-fmt.js';

  let { data, form } = $props();
  let date = $derived(data.date);
  let customFoods = $derived(data.customFoods);
  let targets = $derived(data.targets);
  let totals = $derived(data.totals);
  let grouped = $derived(data.grouped);
  let slots = $derived(data.slots);

  let q = $state('');
  let results = $state([]);
  let selected = $state(null);
  let qty = $state(100);
  let slot = $state('lunch');
  let showManual = $state(false);
  let showMyFoods = $state(false);
  // One form serves both "new" and "editing an existing meal"; fields are bound to state
  // so they can be prefilled — never reset by the browser behind our back.
  let editId = $state(null);
  let mf = $state({ name: '', basis: '100g', unit_label: '', protein: '', fat: '', carbs: '' });
  const blankMeal = () => ({ name: '', basis: '100g', unit_label: '', protein: '', fat: '', carbs: '' });
  // Calories are never typed in — they come from the macros (Atwater 4/9/4), same as the server
  // works them out on save, so the two can't drift apart.
  const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
  const mfKcal = $derived(Math.round(num(mf.protein) * 4 + num(mf.fat) * 9 + num(mf.carbs) * 4));
  function editFood(f) {
    editId = f.id;
    mf = {
      name: f.name, basis: f.basis, unit_label: f.unit_label ?? '',
      protein: f.protein, fat: f.fat, carbs: f.carbs
    };
  }
  function cancelEdit() { editId = null; mf = blankMeal(); }

  // Manual / off-plan: kcal stays yours to type (a label often disagrees with the arithmetic),
  // but the sum of the macros is shown so it never has to be worked out by hand.
  let mn = $state({ name: '', kcal: '', protein: '', fat: '', carbs: '' });
  const mnKcal = $derived(Math.round(num(mn.protein) * 4 + num(mn.fat) * 9 + num(mn.carbs) * 4));

  // Editing an already-logged entry, inline. Macros are yours to change; kcal recalcs
  // itself (Atwater 4/9/4) — same maths the server uses on save, so they can't drift.
  let editEntryId = $state(null);
  let ef = $state({ name: '', qty: '', kcal: '', protein: '', fat: '', carbs: '' });
  // The entry being edited, so the form knows whether it can be re-scaled by amount.
  let editing = $state(null);
  const unitOf = (e) => (e?.basis === 'unit' ? (e.unit_label || 'unit').replace(/^1 /, '') : e?.basis === 'ml' ? 'ml' : 'g');
  // Preview by scaling the entry itself: macros are linear in amount, so old x (new/old) is exact.
  const efScaled = $derived.by(() => {
    if (!editing?.food_id || !editing.qty) return null;
    const k = num(ef.qty) / editing.qty;
    if (!(k > 0)) return null;
    const r = (v) => Math.round(v * k * 10) / 10;
    return { kcal: Math.round(editing.kcal * k), protein: r(editing.protein), fat: r(editing.fat), carbs: r(editing.carbs) };
  });
  const efKcal = $derived(Math.round(num(ef.protein) * 4 + num(ef.fat) * 9 + num(ef.carbs) * 4));
  function editEntry(e) {
    editEntryId = e.id;
    editing = e;
    ef = { name: e.name, qty: e.qty, kcal: Math.round(e.kcal), protein: e.protein, fat: e.fat, carbs: e.carbs };
  }
  function cancelEntry() { editEntryId = null; editing = null; }

  const slotLabels = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner', other: 'Other' };
  // toISOString() is UTC; `date` is a local calendar date. East of UTC (UTC+9, say) they disagree from midnight
  // until 09:00 — exactly when breakfast gets logged — so the day you were looking at would stop
  // being labelled 'Today'.
  const isToday = $derived(date === new Date().toLocaleDateString('en-CA'));

  let timer;
  function onInput() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!q.trim()) { results = []; return; }
      const res = await fetch(`/api/foods?q=${encodeURIComponent(q)}`);
      results = await res.json();
    }, 180);
  }
  function pick(f) { selected = f; qty = f.basis === 'unit' ? 1 : 100; results = []; q = ''; }

  const preview = $derived.by(() => {
    if (!selected) return null;
    const factor = selected.basis === 'unit' ? qty : qty / 100;
    return {
      kcal: Math.round(selected.kcal * factor),
      p: +(selected.protein * factor).toFixed(1),
      f: +(selected.fat * factor).toFixed(1),
      c: +(selected.carbs * factor).toFixed(1)
    };
  });

  const afterSubmit = () => async ({ update }) => { await update({ reset: true }); selected = null; showManual = false; await invalidateAll(); };
  // Fields are bound to state, so they're cleared here rather than by a DOM reset — and only
  // when the log actually went in, so a rejected entry never has to be retyped.
  const afterManual = () => async ({ result, update }) => {
    await update({ reset: false });
    if (result.type === 'success') { mn = { name: '', kcal: '', protein: '', fat: '', carbs: '' }; showManual = false; }
    await invalidateAll();
  };
  const afterEdit = () => async ({ result, update }) => {
    await update({ reset: false });
    if (result.type === 'success') editEntryId = null;
    await invalidateAll();
  };
  // Keeps the My meals panel open so several can be entered in a row. Fields are cleared
  // from state (not a DOM reset) only when the save actually succeeded.
  const afterSaveFood = () => async ({ result, update }) => {
    await update({ reset: false });
    if (result.type === 'success') cancelEdit();
    await invalidateAll();
  };
  const per = (f) => (f.basis === 'unit' ? f.unit_label || '1 portion' : f.basis === 'ml' ? '100 ml' : '100 g');

  function shiftDate(days) {
    const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + days);
    location.href = `/nutrition?date=${d.toLocaleDateString('en-CA')}`;
  }
  // ---- The app's read on the day ---------------------------------------------------------------
  // A plain-English line on where the day stands against the coach's numbers. Only the targets the
  // coach actually set are mentioned; with no targets for the day it just says so.
  const left = $derived({
    kcal: targets.targetKcal == null ? null : Math.round(targets.targetKcal - totals.kcal),
    protein: targets.proteinG == null ? null : Math.round(targets.proteinG - totals.protein)
  });
  const coachLine = $derived.by(() => {
    if (left.kcal == null) return { tone: 'muted', text: "No targets for this day. Add your coach's numbers in Settings and the day gets scored against them." };
    const P = left.protein;
    if (totals.kcal === 0) return { tone: 'muted', text: `Nothing logged yet — ${targets.targetKcal} kcal to go${P != null ? `, with ${targets.proteinG} g of protein to hit` : ''}.` };
    if (P != null && P > 25 && left.kcal < 400) {
      return { tone: 'warn', text: `${P} g of protein still to find, with only ${left.kcal} kcal left. Go lean — chicken, white fish, egg whites, a shake.` };
    }
    if (left.kcal < -100) return { tone: 'warn', text: `${Math.abs(left.kcal)} kcal over. Not a disaster — pull it back tomorrow rather than skipping meals.` };
    if (P != null && P <= 0 && left.kcal >= 0) return { tone: 'good', text: `Protein's in. ${left.kcal} kcal spare.` };
    if (left.kcal <= 150 && (P == null || P <= 10)) return { tone: 'good', text: 'Landed it. Close enough on everything that matters.' };
    return { tone: 'muted', text: `${left.kcal} kcal${P != null ? ` and ${Math.max(0, P)} g of protein` : ''} to go.` };
  });

  const fmtDate = dowDayMonth;
</script>

<Page title="Nutrition">
  <!-- date nav -->
  <div class="flex items-center justify-between -mt-2">
    <button onclick={() => shiftDate(-1)} class="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)]">‹</button>
    <div class="text-sm font-medium text-[var(--color-text)]">{isToday ? 'Today' : fmtDate(date)}</div>
    <button onclick={() => shiftDate(1)} class="px-3 py-1.5 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)]">›</button>
  </div>

  <!-- summary -->
  <div class="card p-4 space-y-3">
    <div class="flex items-baseline justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">Calories
        {#if data.blockName}<span class="font-normal text-[var(--color-faint)]">· {data.blockName}</span>{/if}
      </span>
      <span class="text-sm text-[var(--color-muted)]"><span class="text-[var(--color-text)] font-semibold">{Math.round(totals.kcal)}</span>{targets.targetKcal != null ? ` / ${targets.targetKcal}` : ''} kcal</span>
    </div>
    {#if targets.targetKcal != null}
      <div class="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
        <div class="h-full rounded-full transition-all"
             style="width:{Math.min(100, Math.round(totals.kcal / targets.targetKcal * 100))}%; background:var(--color-accent)"></div>
      </div>
    {/if}
    <div class="text-sm rounded-lg px-3 py-2 -mt-0.5"
         style={`background:var(--color-bg); color:var(--color-${coachLine.tone === 'muted' ? 'muted' : coachLine.tone})`}>
      {coachLine.text}
    </div>
    <MacroBar label="Protein" have={totals.protein} target={targets.proteinG} color="var(--color-protein)" />
    <MacroBar label="Carbs"   have={totals.carbs}   target={targets.carbsG}   color="var(--color-carb)" />
    <MacroBar label="Fat"     have={totals.fat}     target={targets.fatG}     color="var(--color-fat)" />
  </div>

  <!-- add food -->
  <div class="card p-4 space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">Add food</span>
      <button onclick={() => (showManual = !showManual)} class="text-xs text-[var(--color-accent)]">{showManual ? 'Search instead' : 'Manual / off-plan'}</button>
    </div>

    {#if !showManual}
      {#if !selected}
        <input bind:value={q} oninput={onInput} placeholder="Search rice, chicken, サラダチキン…"
               class="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none border border-transparent focus:border-[var(--color-accent)]" />
        {#if results.length}
          <div class="divide-y divide-[var(--color-border)] max-h-64 overflow-y-auto rounded-lg">
            {#each results as f}
              <button onclick={() => pick(f)} class="w-full text-left py-2.5 px-1 flex items-center justify-between">
                <span class="text-[var(--color-text)]">{f.name}{#if f.name_ja}<span class="text-[var(--color-faint)] text-xs ml-1">{f.name_ja}</span>{/if}</span>
                <span class="text-xs text-[var(--color-muted)]">{f.kcal} kcal<span class="text-[var(--color-faint)]">/{f.basis === 'unit' ? f.unit_label?.replace(/^1 /, '') || 'unit' : f.basis === 'ml' ? '100ml' : '100g'}</span></span>
              </button>
            {/each}
          </div>
        {/if}
      {:else}
        <form method="POST" action="?/log" use:enhance={afterSubmit} class="space-y-3">
          <input type="hidden" name="foodId" value={selected.id} />
          <input type="hidden" name="date" value={date} />
          <div class="flex items-center justify-between">
            <span class="font-medium text-[var(--color-text)]">{selected.name}</span>
            <button type="button" onclick={() => (selected = null)} class="text-xs text-[var(--color-muted)]">✕</button>
          </div>
          <div class="flex items-center gap-2">
            <input name="qty" type="number" bind:value={qty} min="0" step={selected.basis === 'unit' ? '0.5' : '1'}
                   class="w-24 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none" />
            <span class="text-sm text-[var(--color-muted)]">{selected.basis === 'unit' ? `× ${selected.unit_label || 'unit'}` : selected.basis === 'ml' ? 'ml' : 'grams'}</span>
          </div>
          <select name="slot" bind:value={slot} class="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none">
            {#each slots as s}<option value={s}>{slotLabels[s]}</option>{/each}
          </select>
          {#if preview}
            <div class="text-sm text-[var(--color-muted)]">
              = <span class="text-[var(--color-text)] font-semibold">{preview.kcal} kcal</span> · {preview.p}P / {preview.c}C / {preview.f}F
            </div>
          {/if}
          <button class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Add to {slotLabels[slot]}</button>
        </form>
      {/if}
    {:else}
      <form method="POST" action="?/manual" use:enhance={afterManual} class="space-y-2.5">
        <input type="hidden" name="date" value={date} />
        <input name="name" bind:value={mn.name} placeholder="e.g. Pint of Guinness" required
               class="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none" />
        <div class="grid grid-cols-4 gap-2">
          {#each [['kcal','kcal'],['protein','P'],['carbs','C'],['fat','F']] as [n,l]}
            <label class="text-xs text-[var(--color-muted)]">{l}
              <input name={n} bind:value={mn[n]} type="number" min="0" step="0.1" inputmode="decimal" required={n === 'kcal'}
                     class="w-full mt-1 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
            </label>
          {/each}
        </div>
        <!-- Tap to drop the macro maths into the kcal box; typing over it afterwards still wins. -->
        <div class="flex items-baseline justify-between text-sm">
          <span class="text-[var(--color-muted)]">From macros</span>
          <button type="button" onclick={() => (mn.kcal = mnKcal)} disabled={!mnKcal}
                  class="font-semibold {mnKcal ? 'text-[var(--color-accent)]' : 'text-[var(--color-faint)]'}">
            {mnKcal} kcal{#if mnKcal && Number(mn.kcal) !== mnKcal}<span class="text-xs font-normal"> · use</span>{/if}
          </button>
        </div>
        <select name="slot" bind:value={slot} class="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none">
          {#each slots as s}<option value={s}>{slotLabels[s]}</option>{/each}
        </select>
        <button class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Log it</button>
      </form>
    {/if}
  </div>

  <!-- My meals: reusable foods the user defines -->
  <div class="card p-4 space-y-3">
    <button onclick={() => (showMyFoods = !showMyFoods)} class="w-full flex items-center justify-between">
      <span class="text-sm font-medium text-[var(--color-text)]">My meals
        {#if customFoods.length}<span class="text-[var(--color-faint)] font-normal">· {customFoods.length}</span>{/if}
      </span>
      <span class="text-xs text-[var(--color-accent)]">{showMyFoods ? 'Close' : 'Add / edit'}</span>
    </button>

    {#if showMyFoods}
      {#if customFoods.length}
        <div class="divide-y divide-[var(--color-border)]">
          {#each customFoods as f}
            <div class="py-2 flex items-center justify-between gap-2 {editId === f.id ? 'opacity-50' : ''}">
              <button onclick={() => editFood(f)} class="min-w-0 flex-1 text-left">
                <div class="text-[var(--color-text)] truncate">{f.name}</div>
                <div class="text-xs text-[var(--color-muted)]">
                  {f.kcal} kcal · {f.protein}P / {f.carbs}C / {f.fat}F
                  <span class="text-[var(--color-faint)]">per {per(f)}</span>
                </div>
              </button>
              <button onclick={() => editFood(f)} class="text-xs text-[var(--color-accent)] px-2 py-1">Edit</button>
              <form method="POST" action="?/delFood" use:enhance={afterSaveFood}>
                <input type="hidden" name="id" value={f.id} />
                <button class="text-[var(--color-faint)] px-2 py-1" aria-label={`Delete ${f.name}`}>✕</button>
              </form>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-xs text-[var(--color-muted)]">Nothing yet. Add a meal here and it becomes searchable in Add food.</p>
      {/if}

      <form method="POST" action="?/saveFood" use:enhance={afterSaveFood} class="space-y-2.5 pt-1">
        {#if editId}
          <input type="hidden" name="id" value={editId} />
          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-muted)]">Editing <span class="text-[var(--color-text)]">{mf.name}</span></span>
            <button type="button" onclick={cancelEdit} class="text-[var(--color-accent)]">Cancel</button>
          </div>
        {/if}
        <input name="name" bind:value={mf.name} placeholder="e.g. Sunday chili" required
               class="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none" />

        <!-- plain buttons + hidden field: a <select> here would reset itself after every save -->
        <input type="hidden" name="basis" value={mf.basis} />
        <div class="grid grid-cols-3 gap-2">
          {#each [['100g', 'Per 100 g'], ['ml', 'Per 100 ml'], ['unit', 'Per portion']] as [v, l]}
            <button type="button" onclick={() => (mf.basis = v)}
                    class="py-2 rounded-lg text-xs font-medium {mf.basis === v ? 'text-[#0b0f17]' : 'text-[var(--color-muted)] bg-[var(--color-surface-2)]'}"
                    style={mf.basis === v ? 'background:var(--color-accent)' : ''}>{l}</button>
          {/each}
        </div>
        {#if mf.basis === 'unit'}
          <input name="unit_label" bind:value={mf.unit_label} placeholder="Portion name — e.g. 1 bowl (~300 g)"
                 class="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none" />
        {/if}

        <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
          Macros per {mf.basis === 'unit' ? 'portion' : mf.basis === 'ml' ? '100 ml' : '100 g'}
        </div>
        <div class="grid grid-cols-3 gap-2">
          {#each [['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']] as [n, l]}
            <label class="text-xs text-[var(--color-muted)]">{l} (g)
              <input name={n} bind:value={mf[n]} type="number" min="0" step="0.1" inputmode="decimal"
                     class="w-full mt-1 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
            </label>
          {/each}
        </div>
        <div class="flex items-baseline justify-between text-sm">
          <span class="text-[var(--color-muted)]">Calories</span>
          <span class="text-[var(--color-text)] font-semibold">{mfKcal} kcal
            <span class="text-xs font-normal text-[var(--color-faint)]">calculated</span>
          </span>
        </div>

        {#if form?.formError}
          <p class="text-xs" style="color:var(--color-warn)">{form.formError}</p>
        {:else if form?.saved}
          <p class="text-xs" style="color:var(--color-good)">Saved “{form.saved}” — search for it in Add food.</p>
        {:else if form?.updated}
          <p class="text-xs" style="color:var(--color-good)">Updated “{form.updated}”. Meals already logged keep their old numbers.</p>
        {/if}
        <button class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent)">
          {editId ? 'Save changes' : 'Save meal'}
        </button>
      </form>
    {/if}
  </div>

  <!-- entries by slot -->
  {#each slots as s}
    {#if grouped[s].length}
      <div class="card p-4">
        <div class="text-sm font-medium text-[var(--color-text)] mb-2">{slotLabels[s]}</div>
        <div class="divide-y divide-[var(--color-border)]">
          {#each grouped[s] as e}
            {#if editEntryId === e.id}
              <form method="POST" action="?/editLog" use:enhance={afterEdit} class="py-2 space-y-2.5">
                <input type="hidden" name="id" value={e.id} />
                {#if e.food_id}
                  <!-- From the food database: change the amount and everything re-scales from
                       that food, the same way it was logged. -->
                  <div class="text-sm text-[var(--color-text)]">{e.name}</div>
                  <label class="block text-xs text-[var(--color-muted)]">Amount ({unitOf(e)})
                    <input name="qty" bind:value={ef.qty} type="number" min="0" step="any" inputmode="decimal" required
                           class="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
                  </label>
                  <div class="flex items-baseline justify-between text-sm">
                    <span class="text-[var(--color-muted)]">Works out at</span>
                    <span class="text-[var(--color-text)] font-semibold">
                      {efScaled ? `${efScaled.kcal} kcal · ${efScaled.protein}P / ${efScaled.carbs}C / ${efScaled.fat}F` : '—'}
                    </span>
                  </div>
                {:else}
                  <!-- Typed in by hand, so there is nothing to scale from: edit the numbers. -->
                  <input name="name" bind:value={ef.name} required
                         class="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none" />
                  <div class="grid grid-cols-3 gap-2">
                    {#each [['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat']] as [n, l]}
                      <label class="text-xs text-[var(--color-muted)]">{l} (g)
                        <input name={n} bind:value={ef[n]} type="number" min="0" step="0.1" inputmode="decimal"
                               class="w-full mt-1 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
                      </label>
                    {/each}
                  </div>
                  <label class="block text-xs text-[var(--color-muted)]">Calories
                    <input name="kcal" bind:value={ef.kcal} type="number" min="0" step="1" inputmode="decimal"
                           placeholder={String(efKcal)}
                           class="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
                  </label>
                  <div class="text-xs text-[var(--color-faint)]">Leave blank to use {efKcal} kcal from the macros.</div>
                {/if}
                <div class="flex gap-2">
                  <button type="button" onclick={cancelEntry} class="flex-1 py-2 rounded-xl text-sm font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)]">Cancel</button>
                  <button class="flex-1 py-2 rounded-xl text-sm font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Save</button>
                </div>
              </form>
            {:else}
              <div class="py-2 flex items-center justify-between gap-2">
                <button onclick={() => editEntry(e)} class="min-w-0 flex-1 text-left">
                  <div class="text-[var(--color-text)] truncate">{e.name}
                    <span class="text-xs text-[var(--color-faint)]">{e.qty}</span>
                  </div>
                  <div class="text-xs text-[var(--color-muted)]">{Math.round(e.kcal)} kcal · {e.protein}P / {e.carbs}C / {e.fat}F</div>
                </button>
                <button onclick={() => editEntry(e)} class="text-xs text-[var(--color-accent)] px-2 py-1">Edit</button>
                <form method="POST" action="?/delete" use:enhance={afterSubmit}>
                  <input type="hidden" name="id" value={e.id} />
                  <button class="text-[var(--color-faint)] px-2 py-1" aria-label="Delete">✕</button>
                </form>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</Page>
