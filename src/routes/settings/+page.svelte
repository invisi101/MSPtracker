<script>
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import Page from '$lib/components/Page.svelte';
  import { dayMonthYear } from '$lib/date-fmt.js';
  import ExerciseNameHint from '$lib/components/ExerciseNameHint.svelte';
  import AiKeyNote from '$lib/components/AiKeyNote.svelte';
  import { makeMatcher } from '$lib/exercise-names.js';

  let { data, form } = $props();
  const createdName = $derived(page.url.searchParams.get('created'));
  const localToday = () => new Date().toLocaleDateString('en-CA');

  let targets = $derived(data.targets);
  let rxList = $derived(data.prescriptions);
  // The block in force today. Not simply the newest active one, which may not have started yet.
  const active = $derived(data.currentBlock ?? null);

  // ---- About you ------------------------------------------------------------------------------
  let p = $state({ ...data.profile });
  $effect(() => { p = { ...data.profile }; });
  const EDITABLE = ['name', 'about', 'goal_weight_kg'];
  const unsaved = $derived(EDITABLE.some((k) => String(p[k] ?? '') !== String(data.profile[k] ?? '')));
  const matchName = $derived(makeMatcher(data.exercises.map((e) => e.name)));

  // ---- Chef meals ------------------------------------------------------------------------------
  let meals = $state({ ...data.mealShape });
  $effect(() => { meals = { ...data.mealShape }; });
  const mealsUnsaved = $derived(meals.breakfast !== data.mealShape.breakfast || meals.meals !== data.mealShape.meals);
  // Mirrors mealSlots() in the server's chef repo, so the preview matches what Chef will build.
  function slotsFor({ breakfast, meals: n }) {
    const core = breakfast ? (n >= 3 ? ['Breakfast', 'Lunch', 'Dinner'] : ['Breakfast', 'Dinner']) : ['Lunch', 'Dinner'];
    const per = core.map(() => 0);
    for (let k = 0; k < n - core.length; k++) per[k % core.length]++;
    return core.flatMap((c, i) => [c, ...Array(per[i]).fill('Snack')]);
  }


  // ---- The coach's numbers --------------------------------------------------------------------
  const blankRx = () => ({ id: null, name: '', source: '', start_date: '', end_date: '',
                           kcal: '', protein_g: '', fat_g: '', carbs_g: '', notes: '', active: true,
                           presetId: '' });
  let rx = $state(blankRx());
  let editing = $state(false);
  function editRx(r) {
    editing = true;
    splitting = false;
    rx = { id: r.id, name: r.name ?? '', source: r.source ?? '',
           start_date: r.start_date ?? '', end_date: r.end_date ?? '',
           kcal: r.kcal ?? '', protein_g: r.protein_g ?? '', fat_g: r.fat_g ?? '',
           carbs_g: r.carbs_g ?? '', notes: r.notes ?? '', active: !!r.active, presetId: '' };
  }

  // ---- When the coach changes the numbers part-way through ------------------------------------
  // Editing a running block in place rewrites the PAST: every day is scored against whichever
  // block covers its date, so raising protein today would restate weeks already sent to the coach as
  // misses. A mid-block change therefore closes this block and opens a new one from the day the
  // new numbers start. Offered right where the mistake would be made.
  let splitting = $state(false);
  let splitFrom = $state('');
  const hasHistory = $derived(!!rx.id && !!rx.start_date && rx.start_date < localToday());
  // The name never changes. A three-month block is one block; a coach changing the macros half way
  // through does not make it Block 2.
  function startSplit() {
    splitting = true;
    splitFrom = localToday();
  }
  function stopSplit() { splitting = false; }

  const n = (v) => { const x = Number(v); return Number.isFinite(x) && v !== '' ? x : null; };
  // Calories as they'll be saved: the coach's figure, or worked out from all three macros.
  const previewKcal = $derived.by(() => {
    if (n(rx.kcal) != null) return Math.round(n(rx.kcal));
    const P = n(rx.protein_g), F = n(rx.fat_g), C = n(rx.carbs_g);
    return P != null && F != null && C != null ? Math.round(P * 4 + F * 9 + C * 4) : null;
  });

  // ---- Programmes and presets ------------------------------------------------------------------
  // Each block runs its own copy of a programme; presets sit on the shelf to start a block from.
  const programmes = $derived(data.programmes);
  // One-off workouts are presets too, but never a block's programme: kept out of the block pickers.
  const presets = $derived(programmes.filter((x) => x.kind === 'preset' && !x.one_off));
  const oneOffs = $derived(programmes.filter((x) => x.kind === 'preset' && x.one_off));
  const blockProgs = $derived(programmes.filter((x) => x.kind !== 'preset'));
  const progLabel = (x) => (x.kind === 'preset' ? x.name : x.blocks.map((b) => b.name).join(' · ') || x.name);
  const progOfBlock = (r) => blockProgs.find((x) => x.blocks.some((b) => (b.name ?? '') === (r.name ?? '')));
  function openProg(id) {
    openDay = null;
    goto(id ? `?prog=${id}` : '?', { noScroll: true, keepFocus: true, replaceState: true });
  }
  let presetForm = $state(null);         // null | 'blank' | 'copy'
  let presetName = $state('');
  let renameVal = $state('');
  let confirmDelete = $state(false);
  $effect(() => { renameVal = data.programme?.name ?? ''; confirmDelete = false; });
  const afterNewPreset = () => async ({ result, update }) => {
    await update();
    if (result.type === 'success' && result.data?.presetCreated) {
      presetForm = null; presetName = '';
      openProg(result.data.presetCreated);
    }
  };
  const afterDeletePreset = () => async ({ update }) => { await update(); openProg(null); };

  // ---- Programme -------------------------------------------------------------------------------
  let prog = $derived(data.programme);
  let openDay = $state(null);
  let df = $state({ name: '', title: '', week_from: '', week_to: '', exercises: [] });
  const blankEx = () => ({ name: '', sets: '', rep_low: '', rep_high: '', rir: '', rest: '', note: '', muscle: '' });
  function editDay(d) {
    openDay = d.id;
    df = {
      name: d.name ?? '', title: d.title ?? '',
      week_from: d.week_from ?? '', week_to: d.week_to ?? '',
      exercises: d.exercises.map((e) => ({
        name: e.name ?? '', sets: e.sets ?? '', rep_low: e.rep_low ?? '',
        rep_high: e.rep_high ?? '', rir: e.rir ?? '', rest: e.rest ?? '', note: e.note ?? '',
        // Carried through untouched so saving a day keeps hand-tuned muscle lists and slots.
        // origName lets the server tell a kept exercise from one swapped for another.
        muscles: e.muscles ?? null, slot: e.slot ?? null, origName: e.name ?? '', muscle: ''
      }))
    };
  }
  const exPayload = $derived(JSON.stringify(df.exercises));
  // The shared exercise database, so names — and therefore per-lift history — stay consistent,
  // and the body map can look muscles up by name.
  const videoByName = $derived(Object.fromEntries(
    data.exercises.filter((e) => e.video_url).map((e) => [e.name.toLowerCase(), e.video_url])
  ));
  const videoFor = (n) => videoByName[(n ?? '').trim().toLowerCase()] ?? null;
  const afterDay = () => async ({ update }) => { await update(); openDay = null; };

  const onsave = () => async ({ update }) => { await update({ reset: false }); };
  const afterRx = () => async ({ update }) => { await update(); editing = false; };

  const field = 'w-full mt-0.5 px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base';
  const label = 'text-[11px] uppercase tracking-wide text-[var(--color-muted)]';
  const fmtDate = (d) => (d ? dayMonthYear(d) : null);
</script>

<Page title="Settings">

  <!-- ---- Today's targets: the coach's numbers in force today, or none ----------------------- -->
  <div class="card p-4 relative overflow-hidden">
    <div class="absolute inset-x-0 top-0 h-1" style="background:linear-gradient(90deg, var(--color-accent), transparent)"></div>
    <div class="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Today's targets</div>
    {#if targets.has}
      <div class="text-4xl font-bold text-[var(--color-text)] leading-tight">
        {targets.targetKcal ?? '—'}<span class="text-lg font-normal text-[var(--color-muted)]"> kcal</span>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-2">
        {#each [['Protein', targets.proteinG, 'protein'], ['Carbs', targets.carbsG, 'carb'], ['Fat', targets.fatG, 'fat']] as [name, val, tone]}
          <div class="rounded-xl px-3 py-2" style="background:var(--color-bg)">
            <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{name}</div>
            <div class="text-xl font-bold" style={`color:var(--color-${tone})`}>{val ?? '—'}{#if val != null}<span class="text-xs font-normal text-[var(--color-muted)]"> g</span>{/if}</div>
          </div>
        {/each}
      </div>
      <p class="mt-3 text-sm text-[var(--color-muted)]">
        From {targets.prescription?.name ?? 'your block'}{targets.prescription?.source ? `, set by ${targets.prescription.source}` : ''}.
      </p>
    {:else}
      <p class="mt-1 text-base text-[var(--color-text)]">None yet.</p>
      <p class="text-sm text-[var(--color-muted)] mt-0.5">Add a block with the calories and macros your coach gave you, and the dates they run for.</p>
    {/if}
  </div>

  <!-- ---- Blocks: the coach's numbers, by date ------------------------------------------------- -->
  <div class="card p-4 space-y-3">
    <div class="flex items-center justify-between gap-2">
      <div>
        <div class="text-sm font-semibold text-[var(--color-text)]">Blocks</div>
        <p class="text-sm text-[var(--color-muted)] mt-0.5">
          Each block is a date range with your coach's daily numbers and the workouts it runs.
        </p>
      </div>
      {#if !editing}
        <a href="/settings/new-block" class="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold text-[#0b0f17]"
           style="background:var(--color-accent)">+ New block</a>
      {/if}
    </div>

    {#if editing}
      <form method="POST" action={splitting ? '?/splitPrescription' : '?/savePrescription'}
            use:enhance={afterRx} class="space-y-3">
        {#if rx.id}<input type="hidden" name="id" value={rx.id} />{/if}

        <!-- Only for a block that already has days behind it. A block starting today or later has
             no history to protect, so correcting it in place is simply right. -->
        {#if hasHistory}
          <div class="grid grid-cols-2 gap-1 p-1 rounded-xl" style="background:var(--color-bg)">
            <button type="button" onclick={stopSplit}
                    class="py-2 rounded-lg text-sm {splitting ? 'text-[var(--color-text)]' : 'font-semibold text-[#0b0f17]'}"
                    style={splitting ? '' : 'background:var(--color-accent)'}>Fix a mistake</button>
            <button type="button" onclick={startSplit}
                    class="py-2 rounded-lg text-sm {splitting ? 'font-semibold text-[#0b0f17]' : 'text-[var(--color-text)]'}"
                    style={splitting ? 'background:var(--color-accent)' : ''}>New numbers</button>
          </div>
          <p class="text-xs text-[var(--color-muted)]">
            {#if splitting}
              Still {rx.name || 'the same block'}, still running to {fmtDate(rx.end_date) ?? 'its end'} —
              the numbers below take over from the date you pick, and everything logged before it
              keeps the targets it was scored against. Week numbers carry on unbroken.
            {:else}
              Changing the figures here restates <strong>every day since
              {fmtDate(rx.start_date)}</strong> against the new ones. Right for a typo, wrong for a
              change from your coach.
            {/if}
          </p>
        {/if}

        <div class="grid grid-cols-2 gap-3">
          <label class={label}>Name
            <input class={field} name="name" bind:value={rx.name} placeholder="Block 1"
                   disabled={splitting} />
          </label>
          <label class={label}>Set by<input class={field} name="source" bind:value={rx.source} placeholder="e.g. your coach's name" /></label>
          {#if splitting}
            <label class={label}>New numbers start
              <input class={field} name="from" type="date" bind:value={splitFrom} />
            </label>
            <label class={label}>Until<input class={field} type="date" value={rx.end_date} disabled /></label>
          {:else}
            <label class={label}>From<input class={field} name="start_date" type="date" bind:value={rx.start_date} /></label>
            <label class={label}>Until<input class={field} name="end_date" type="date" bind:value={rx.end_date} /></label>
          {/if}
        </div>

        <div class="grid grid-cols-4 gap-2">
          {#each [['protein_g', 'Protein'], ['carbs_g', 'Carbs'], ['fat_g', 'Fat'], ['kcal', 'kcal']] as [k, l]}
            <label class={label}>{l}
              <input class={field} name={k} type="number" step="0.1" min="0" inputmode="decimal"
                     bind:value={rx[k]} placeholder={k === 'kcal' ? 'auto' : 'not set'} />
            </label>
          {/each}
        </div>
        <p class="text-[11px] text-[var(--color-faint)]">
          Leave out any macro your coach didn't set. Leave kcal on “auto” to work it out from all three macros.
        </p>

        <label class={label}>Coach's notes
          <textarea class={field} name="notes" rows="2" bind:value={rx.notes}></textarea>
        </label>

        {#if !splitting}
          <label class={label}>Programme
            <select class={field} name="presetId" bind:value={rx.presetId}>
              <option value="">{rx.id ? 'Keep the programme it has' : 'Carry on with the current programme'}</option>
              {#each presets as pr}<option value={String(pr.id)}>{rx.id ? 'Switch to' : 'Use'}: {pr.name}</option>{/each}
            </select>
          </label>
          {#if rx.id && rx.presetId}
            <p class="text-xs text-[var(--color-muted)]">
              The block gets a fresh copy of the preset, and any changes you made to its programme are
              replaced. Workouts already logged are not affected.
            </p>
          {/if}

          <label class="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" name="active" bind:checked={rx.active} class="w-4 h-4" />
            Use these targets now
          </label>
        {/if}

        <div class="text-sm text-[var(--color-muted)]">Calories: <span class="text-[var(--color-text)] font-semibold">{previewKcal ?? 'enter kcal or all three macros'}</span></div>

        {#if form?.rxError}<p class="text-xs" style="color:var(--color-warn)">{form.rxError}</p>{/if}

        <div class="flex gap-2">
          <button type="button" onclick={() => (editing = false)}
                  class="flex-1 py-2.5 rounded-xl font-medium text-[var(--color-text)] bg-[var(--color-surface-2)]">Cancel</button>
          <button class="flex-1 py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent)">
            {splitting ? 'Start the new numbers' : 'Save'}
          </button>
        </div>
      </form>
    {:else if !rxList.length}
      <p class="text-sm text-[var(--color-muted)]">No blocks yet.</p>
    {:else}
      <div class="space-y-2">
        {#each rxList as r}
          <div class="rounded-xl p-3" style={`background:var(--color-bg); ${r.active ? 'box-shadow:inset 0 0 0 1px var(--color-accent)' : ''}`}>
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-[var(--color-text)] truncate">
                  {r.name || 'Prescription'}
                  {#if r.active}<span class="ml-1 text-[10px] font-bold" style="color:var(--color-accent)">ACTIVE</span>{/if}
                </div>
                <div class="text-xs text-[var(--color-muted)]">
                  {[r.source, fmtDate(r.start_date) && `${fmtDate(r.start_date)} – ${fmtDate(r.end_date) ?? 'open'}`]
                    .filter(Boolean).join(' · ') || 'no dates'}
                </div>
                <div class="text-xs text-[var(--color-text)] mt-1">
                  {[r.kcal && `${r.kcal} kcal`, r.protein_g && `${r.protein_g}P`,
                    r.fat_g && `${r.fat_g}F`, r.carbs_g && `${r.carbs_g}C`].filter(Boolean).join(' · ')}
                </div>
                {#if progOfBlock(r)}
                  <div class="text-xs text-[var(--color-muted)] mt-1">
                    Programme: <span class="text-[var(--color-text)]">{progOfBlock(r).days} days</span>{#if progOfBlock(r).from_preset}, from preset {progOfBlock(r).from_preset}{/if}
                  </div>
                {/if}
                {#if r.notes}<div class="text-xs text-[var(--color-muted)] mt-1 italic">{r.notes}</div>{/if}
              </div>
              <div class="shrink-0 flex flex-col gap-1">
                <button onclick={() => editRx(r)} class="text-xs px-2 py-1 rounded-lg text-[var(--color-accent-2)] bg-[var(--color-surface-2)]">Edit</button>
                <form method="POST" action="?/togglePrescription" use:enhance={onsave}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={r.active ? '0' : '1'} />
                  <button class="w-full text-xs px-2 py-1 rounded-lg text-[var(--color-muted)] bg-[var(--color-surface-2)]">
                    {r.active ? 'Turn off' : 'Use'}
                  </button>
                </form>
                <form method="POST" action="?/deletePrescription" use:enhance={onsave}>
                  <input type="hidden" name="id" value={r.id} />
                  <button class="w-full text-xs px-2 py-1 rounded-lg text-[var(--color-faint)] bg-[var(--color-surface-2)]">Delete</button>
                </form>
              </div>
            </div>
          </div>
        {/each}
      </div>

    {/if}
    {#if createdName}<p class="text-sm" style="color:var(--color-good)">✓ {createdName} created.</p>{/if}
  </div>

  <!-- ---- The programme ------------------------------------------------------------------------ -->
  <div id="programmes" class="card p-4 space-y-3">
    {#if active && !active.program_id}
      <!-- The running block was created with "create my own later". This is later. -->
      <div class="rounded-xl p-3 space-y-3" style="background:var(--color-bg); box-shadow:inset 0 0 0 2px var(--color-accent)">
        <div>
          <div class="text-base font-semibold text-[var(--color-text)]">{active.name ?? 'Your block'} has no workouts yet</div>
          <p class="text-sm text-[var(--color-muted)] mt-0.5">Enter the workouts your coach gave you{presets.length ? ', or use one you saved before' : ''}.</p>
        </div>
        <a href="/training/build" class="block w-full py-2.5 rounded-xl font-semibold text-center text-[#0b0f17]" style="background:var(--color-accent)">Build a workout</a>
        {#if presets.length}
          <form method="POST" action="?/startBlockProgramme" class="space-y-2">
            <input type="hidden" name="rxId" value={active.id} />
            <select class={field} name="presetId">
              {#each presets as x}<option value={String(x.id)}>{x.name}</option>{/each}
            </select>
            <button class="w-full py-2.5 rounded-xl font-semibold text-[var(--color-text)] border border-[var(--color-border)]">Use this saved workout</button>
          </form>
        {/if}
        {#if form?.progError}<p class="text-sm" style="color:var(--color-warn)">{form.progError}</p>{/if}
      </div>
    {/if}
    <div class="flex items-center justify-between gap-2">
      <div>
        <div class="text-sm font-semibold text-[var(--color-text)]">Programmes</div>
        <p class="text-xs text-[var(--color-muted)] mt-0.5">
          Each block runs its own copy. Presets are kept here to start a new block from.
        </p>
      </div>
      {#if prog}
      <form method="POST" action="?/addDay" use:enhance={onsave}>
        <input type="hidden" name="name" value="New day" />
        <input type="hidden" name="programId" value={prog?.id ?? ''} />
        <button class="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold text-[#0b0f17]"
                style="background:var(--color-accent-2)">+ Day</button>
      </form>
      {/if}
    </div>

    <label class="{label} block">Showing
      <select class={field} value={prog ? String(prog.id) : ''} onchange={(e) => openProg(e.currentTarget.value)}>
        <optgroup label="Blocks">
          {#each blockProgs as x}
            <option value={String(x.id)}>{progLabel(x)}{x.current ? ' — in use now' : ''}</option>
          {/each}
        </optgroup>
        {#if presets.length}
          <optgroup label="Presets">
            {#each presets as x}<option value={String(x.id)}>Preset: {x.name}</option>{/each}
          </optgroup>
        {/if}
        {#if oneOffs.length}
          <optgroup label="One-off workouts">
            {#each oneOffs as x}<option value={String(x.id)}>One-off: {x.name}</option>{/each}
          </optgroup>
        {/if}
      </select>
    </label>

    {#if prog?.kind === 'preset'}
      <!-- A preset's own controls. Nothing trains from it directly, so editing it is always safe. -->
      <div class="rounded-xl p-3 space-y-2" style="background:var(--color-bg)">
        <p class="text-xs text-[var(--color-muted)]">
          {#if programmes.find((x) => x.id === prog.id)?.one_off}
            A one-off workout. Start it from the Training page any day; it never changes your block
            or what's next up.
          {:else}
            A preset. Pick it when you create a block and the block gets its own copy — changing this
            afterwards doesn't touch blocks already started from it.
          {/if}
        </p>
        <form method="POST" action="?/renamePreset" use:enhance={onsave} class="flex gap-2 items-end">
          <input type="hidden" name="id" value={prog.id} />
          <label class="{label} flex-1">Name<input class={field} name="name" bind:value={renameVal} /></label>
          <button class="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold text-[#0b0f17]"
                  style="background:var(--color-accent)" disabled={renameVal.trim() === prog.name}>Rename</button>
        </form>
        {#if confirmDelete}
          <form method="POST" action="?/deletePreset" use:enhance={afterDeletePreset} class="flex gap-2">
            <input type="hidden" name="id" value={prog.id} />
            <button type="button" onclick={() => (confirmDelete = false)}
                    class="flex-1 py-2 rounded-lg text-sm text-[var(--color-text)] bg-[var(--color-surface-2)]">Keep it</button>
            <button class="flex-1 py-2 rounded-lg text-sm font-semibold text-[#0b0f17]" style="background:var(--color-warn)">
              Delete {prog.name}
            </button>
          </form>
        {:else}
          <button onclick={() => (confirmDelete = true)}
                  class="w-full py-2 rounded-lg text-sm text-[var(--color-muted)] bg-[var(--color-surface-2)]">Delete preset</button>
        {/if}
      </div>
    {:else if prog}
      {@const meta = programmes.find((x) => x.id === prog.id)}
      {#if meta && !meta.current}
        {@const own = rxList.filter((r) => r.program_id === prog.id)}
        {@const ended = own.length > 0 && own.every((r) => r.end_date && r.end_date < localToday())}
        <p class="text-xs text-[var(--color-muted)]">
          {ended ? `${meta.blocks[0]?.name ?? 'Its block'} has finished; this programme is kept with it.`
                 : `Training switches to this one when ${meta.blocks[0]?.name ?? 'its block'} starts.`}
        </p>
      {/if}
    {/if}

    <!-- New preset: blank, or a copy of whatever is showing. -->
    {#if presetForm}
      <form method="POST" action="?/newPreset" use:enhance={afterNewPreset} class="rounded-xl p-3 space-y-2" style="background:var(--color-bg)">
        {#if presetForm === 'copy' && prog}<input type="hidden" name="fromId" value={prog.id} />{/if}
        <label class={label}>{presetForm === 'copy' ? `New preset, copied from ${progLabel(programmes.find((x) => x.id === prog?.id) ?? { kind: 'preset', name: prog?.name ?? '' })}` : 'New empty preset'}
          <input class={field} name="name" bind:value={presetName} placeholder="Upper / Lower 4-day" />
        </label>
        {#if form?.presetError}<p class="text-xs" style="color:var(--color-warn)">{form.presetError}</p>{/if}
        <div class="flex gap-2">
          <button type="button" onclick={() => (presetForm = null)}
                  class="flex-1 py-2 rounded-lg text-sm text-[var(--color-text)] bg-[var(--color-surface-2)]">Cancel</button>
          <button class="flex-1 py-2 rounded-lg text-sm font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Create preset</button>
        </div>
      </form>
    {:else}
      <div class="grid grid-cols-2 gap-2">
        <button onclick={() => (presetForm = 'blank')}
                class="py-2 rounded-lg text-sm text-[var(--color-accent-2)] bg-[var(--color-surface-2)]">+ New preset</button>
        <button onclick={() => (presetForm = 'copy')} disabled={!prog}
                class="py-2 rounded-lg text-sm text-[var(--color-accent-2)] bg-[var(--color-surface-2)]">Copy as preset</button>
      </div>
    {/if}
    {#if form?.presetError && !presetForm}<p class="text-xs" style="color:var(--color-warn)">{form.presetError}</p>{/if}

    {#if !prog}
      <p class="text-sm text-[var(--color-muted)]">No active programme.</p>
    {:else}
      <div class="space-y-2">
        {#each prog.days as d}
          {#if openDay === d.id}
            <form method="POST" action="?/saveDay" use:enhance={afterDay}
                  class="rounded-xl p-3 space-y-2.5" style="background:var(--color-bg)">
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="exercises" value={exPayload} />
              <div class="grid grid-cols-2 gap-2">
                <label class={label}>Name<input class={field} name="name" bind:value={df.name} placeholder="Push Day" /></label>
                <label class={label}>Description<input class={field} name="title" bind:value={df.title} placeholder="Squat · Press · Pull" /></label>
                <label class={label}>From week<input class={field} name="week_from" type="number" min="1" inputmode="numeric" bind:value={df.week_from} placeholder="every week" /></label>
                <label class={label}>To week<input class={field} name="week_to" type="number" min="1" inputmode="numeric" bind:value={df.week_to} placeholder="—" /></label>
              </div>
              <p class="text-[11px] text-[var(--color-faint)]">
                Weeks are for programmes whose workouts change part-way. Counted from the block's
                start; Training only offers the days for the current week. Leave blank for every week.
              </p>

              {#each df.exercises as ex, i}
                <div class="rounded-lg p-2 space-y-2" style="background:var(--color-surface-2)">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-[var(--color-faint)] w-4">{i + 1}</span>
                    <input bind:value={ex.name} placeholder="Exercise" list="exercise-list"
                           class="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
                    {#if videoFor(ex.name)}
                      <a href={videoFor(ex.name)} target="_blank" rel="noopener noreferrer"
                         class="shrink-0 w-6 h-6 rounded-md inline-flex items-center justify-center"
                         style="background:var(--color-bg)" aria-label={`Form video for ${ex.name}`}>
                        <svg viewBox="0 0 24 24" class="w-3 h-3" fill="var(--color-accent)"><path d="M8 5v14l11-7z"/></svg>
                      </a>
                    {/if}
                    <button type="button" onclick={() => (df.exercises = df.exercises.filter((_, j) => j !== i))}
                            class="text-[var(--color-faint)] px-2" aria-label="Remove">✕</button>
                  </div>
                  <div class="pl-6"><ExerciseNameHint match={matchName} value={ex.name} onpick={(n) => (ex.name = n)} bind:muscle={ex.muscle} /></div>
                  <div class="grid grid-cols-5 gap-1.5 pl-6">
                    {#each [['sets', 'Sets'], ['rep_low', 'From'], ['rep_high', 'To'], ['rir', 'RIR'], ['rest', 'Rest']] as [k, l]}
                      <label class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{l}
                        <input bind:value={ex[k]} placeholder="—"
                               class="w-full mt-0.5 px-1.5 py-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base text-center" />
                      </label>
                    {/each}
                  </div>
                  <input bind:value={ex.note} placeholder="Note — e.g. per leg"
                         class="ml-6 w-[calc(100%-1.5rem)] px-2 py-1.5 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
                </div>
              {/each}

              <button type="button" onclick={() => (df.exercises = [...df.exercises, blankEx()])}
                      class="w-full py-2 rounded-lg text-sm text-[var(--color-accent-2)] bg-[var(--color-surface-2)]">+ Exercise</button>

              {#if form?.dayError}<p class="text-xs" style="color:var(--color-warn)">{form.dayError}</p>{/if}
              <div class="flex gap-2">
                <button type="button" onclick={() => (openDay = null)}
                        class="flex-1 py-2 rounded-xl text-sm font-medium text-[var(--color-text)] bg-[var(--color-surface-2)]">Cancel</button>
                <button class="flex-1 py-2 rounded-xl text-sm font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Save day</button>
              </div>
            </form>
          {:else}
            <div class="rounded-xl p-3 flex items-start justify-between gap-2" style="background:var(--color-bg)">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-[var(--color-text)] truncate">
                  {d.name || `Workout ${d.label}`}
                  <span class="text-[10px] font-normal text-[var(--color-faint)]">{d.label}</span>
                  {#if d.week_from || d.week_to}
                    <span class="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style="background:var(--color-surface-2); color:var(--color-accent-2)">
                      weeks {d.week_from ?? 1}–{d.week_to ?? '…'}
                    </span>
                  {/if}
                </div>
                {#if d.title}<div class="text-xs text-[var(--color-muted)] truncate">{d.title}</div>{/if}
                <div class="text-xs text-[var(--color-muted)] mt-1">
                  {d.exercises.length} exercise{d.exercises.length === 1 ? '' : 's'}
                  {#if d.exercises.length}· {d.exercises.map((e) => e.name).join(' · ')}{/if}
                </div>
              </div>
              <div class="shrink-0 flex flex-col gap-1">
                <button onclick={() => editDay(d)} class="text-xs px-2 py-1 rounded-lg text-[var(--color-accent-2)] bg-[var(--color-surface-2)]">Edit</button>
                <form method="POST" action="?/deleteDay" use:enhance={onsave}>
                  <input type="hidden" name="id" value={d.id} />
                  <button class="w-full text-xs px-2 py-1 rounded-lg text-[var(--color-faint)] bg-[var(--color-surface-2)]">Delete</button>
                </form>
              </div>
            </div>
          {/if}
        {/each}
      </div>
      <p class="text-[11px] text-[var(--color-faint)]">
        The letter is the key your logged sets are filed under — renaming a day never touches its history.
      </p>
      <datalist id="exercise-list">
        {#each data.exercises as e}<option value={e.name}>{e.category}</option>{/each}
      </datalist>
    {/if}
  </div>

  <!-- ---- About you ---------------------------------------------------------------------------- -->
  <form method="POST" action="?/save" use:enhance={onsave} class="card p-4 space-y-3">
    <div class="text-sm font-semibold text-[var(--color-text)]">About you</div>
    <div class="grid grid-cols-2 gap-3">
      <label class={label}>Name<input class={field} name="name" bind:value={p.name} placeholder="—" /></label>
      <label class={label}>Goal weight (kg)
        <input class={field} name="goal_weight_kg" type="number" step="0.1" inputmode="decimal"
               bind:value={p.goal_weight_kg} placeholder="—" />
      </label>
    </div>
    <p class="text-sm text-[var(--color-muted)]">
      The goal weight is only a marker: the line on the Progress chart and the “to goal” figure on Home.
      Your weight itself comes from your weigh-ins on Home.
    </p>
    <label class={label}>About you, for the assistant and chef
      <textarea class={field} name="about" rows="4" bind:value={p.about}
                placeholder="Where you live and shop, foods you like or avoid, when you eat and train, the equipment you have."></textarea>
    </label>
    {#if unsaved}
      <p class="text-sm font-semibold" style="color:var(--color-warn)">You've changed something here — press Save to keep it.</p>
    {/if}
    {#if form?.saved}<p class="text-sm" style="color:var(--color-good)">✓ Saved.</p>{/if}
    <button class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent-2)">Save</button>
  </form>

  <!-- ================= The Anthropic API key ================= -->
  <div id="ai" class="card p-4 space-y-3">
    <div>
      <div class="text-sm font-semibold text-[var(--color-text)]">AI features</div>
      <p class="text-sm mt-0.5 {data.apiKey.set ? '' : 'text-[var(--color-muted)]'}" style={data.apiKey.set ? 'color:var(--color-good)' : ''}>
        {#if data.apiKey.source === 'app'}✓ Using your API key, ending …{data.apiKey.last4}.
        {:else if data.apiKey.source === 'environment'}✓ Using the API key from the app's settings file, ending …{data.apiKey.last4}.
        {:else}No API key yet, so the AI assistant, chef and food estimates are off.{/if}
      </p>
    </div>
    <form method="POST" action="?/saveKey" use:enhance={() => async ({ update }) => { await update({ reset: true }); }} class="space-y-2">
      <label class={label}>{data.apiKey.set ? 'Replace the key' : 'Anthropic API key'}
        <input class={field} name="api_key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" required />
      </label>
      <p class="text-sm text-[var(--color-muted)]">Get one at console.anthropic.com, under API keys. It's stored only on this computer, and it's checked with Anthropic when you save it.</p>
      {#if form?.keyError}<p class="text-sm" style="color:var(--color-warn)">{form.keyError}</p>{/if}
      {#if form?.keySaved}<p class="text-sm" style="color:{form.keyNote ? 'var(--color-warn)' : 'var(--color-good)'}">{form.keyNote ?? '✓ Key checked and saved.'}</p>{/if}
      <button class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent-2)">Check and save key</button>
    </form>
    {#if data.apiKey.source === 'app'}
      <form method="POST" action="?/removeKey" use:enhance>
        <button class="w-full py-2 rounded-xl text-sm font-semibold text-[var(--color-text)] border border-[var(--color-border)]">Remove the key</button>
      </form>
    {/if}
    {#if form?.keyRemoved}<p class="text-sm text-[var(--color-muted)]">Key removed.</p>{/if}
    <AiKeyNote />
  </div>

  <!-- ================= Chef: the shape of the day ================= -->
  <form id="chef" method="POST" action="?/saveMeals" use:enhance={() => async ({ update }) => { await update({ reset: false }); }}
        class="card p-4 space-y-3">
    <div>
      <div class="text-sm font-semibold text-[var(--color-text)]">Chef: your meals</div>
      <p class="text-sm text-[var(--color-muted)] mt-0.5">How the Chef's day plans are laid out. Meals past lunch and dinner are snacks.</p>
    </div>
    <div>
      <div class={label}>Breakfast</div>
      <div class="grid grid-cols-2 gap-2 mt-1">
        {#each [[true, 'I eat breakfast'], [false, 'I skip breakfast']] as [v, l]}
          <button type="button" onclick={() => (meals.breakfast = v)}
                  class="py-2 rounded-lg text-sm {meals.breakfast === v ? 'font-semibold text-[#0b0f17]' : 'text-[var(--color-text)]'}"
                  style={meals.breakfast === v ? 'background:var(--color-accent)' : 'background:var(--color-surface-2)'}>{l}</button>
        {/each}
      </div>
    </div>
    <div>
      <div class={label}>Meals a day</div>
      <div class="grid grid-cols-5 gap-2 mt-1">
        {#each Array.from({ length: data.mealsRange[1] - data.mealsRange[0] + 1 }, (_, i) => data.mealsRange[0] + i) as n}
          <button type="button" onclick={() => (meals.meals = n)}
                  class="py-2 rounded-lg text-sm {meals.meals === n ? 'font-semibold text-[#0b0f17]' : 'text-[var(--color-text)]'}"
                  style={meals.meals === n ? 'background:var(--color-accent)' : 'background:var(--color-surface-2)'}>{n}</button>
        {/each}
      </div>
    </div>
    <p class="text-sm text-[var(--color-muted)]">A day looks like: <span class="text-[var(--color-text)]">{slotsFor(meals).join(' · ')}</span></p>
    <input type="hidden" name="breakfast" value={meals.breakfast ? '1' : '0'} />
    <input type="hidden" name="meals" value={meals.meals} />
    {#if mealsUnsaved}<p class="text-sm font-semibold" style="color:var(--color-warn)">Not saved yet.</p>{/if}
    <button class="w-full py-2.5 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-accent-2)">Save meals</button>
  </form>

  <!-- ================= Backup ================= -->
  <div class="card p-4 space-y-3">
    <div>
      <div class="text-sm font-medium text-[var(--color-text)] mb-1">Backup &amp; export</div>
      <p class="text-xs text-[var(--color-muted)]">
        The <span class="text-[var(--color-text)]">database</span> is the real backup — exact and restorable, but it needs
        SQLite software to open. The <span class="text-[var(--color-text)]">readable export</span> is a single HTML file
        you can open in any browser or print.
      </p>
    </div>
    <div class="grid gap-2">
      <a href="/api/backup" download
         class="block text-center px-3 py-2.5 rounded-lg text-sm font-semibold text-[#0b0f17]" style="background:var(--color-good)">
        Download database (.db)
      </a>
      <a href="/api/export" download
         class="block text-center px-3 py-2.5 rounded-lg text-sm font-semibold text-[#0b0f17]" style="background:var(--color-accent)">
        Download readable export (.html)
      </a>
      <a href="/api/export?view" target="_blank" rel="noopener"
         class="block text-center px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-accent)] bg-[var(--color-surface-2)]">
        View it in the browser →
      </a>
    </div>
  </div>
</Page>
