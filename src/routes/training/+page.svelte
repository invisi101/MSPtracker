<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { tick } from 'svelte';
  import { page } from '$app/state';
  import Page from '$lib/components/Page.svelte';
  import RestTimer from '$lib/components/RestTimer.svelte';
  import ExerciseNameHint from '$lib/components/ExerciseNameHint.svelte';
  import { makeMatcher } from '$lib/exercise-names.js';
  import { formatDuration, formatPace, cardioSummary } from '$lib/format.js';
  import { RPE_SCALE } from '$lib/rpe.js';
  import { dayMonth, dowDayMonth, clockTime } from '$lib/date-fmt.js';

  let { data } = $props();
  let workouts = $derived(data.workouts);
  let oneOffs = $derived(data.oneOffs ?? []);
  let programWeek = $derived(data.programWeek);
  let session = $derived(data.session);
  let cards = $derived(data.cards);
  let todaySessions = $derived(data.todaySessions);
  let inProgress = $derived(todaySessions.filter((s) => !s.finished_at));
  let doneToday = $derived(todaySessions.filter((s) => s.finished_at));
  let known = $derived(data.known);
  // The last day actually trained, and therefore which one comes round next. The picker lists the
  // programme in its own order, so "next" is simply the row after the last one logged, wrapping at
  // the end. Advisory only — every workout stays one tap away, in case the rotation is broken on
  // purpose.
  let lastLogged = $derived(data.lastLogged);
  let nextUpId = $derived.by(() => {
    if (!lastLogged || workouts.length < 2) return null;
    // By letter, or failing that by name: when a programme moves on to its next set of weeks, the
    // new days have new letters but the same names ("Full Body 3" then "Full Body 1").
    let i = workouts.findIndex((w) => w.label === lastLogged.day_label);
    if (i === -1) i = workouts.findIndex((w) => (w.name ?? '') === lastLogged.day_name);
    return i === -1 ? null : workouts[(i + 1) % workouts.length].id;
  });
  // name -> form video. Looked up case-insensitively so a template typed with different
  // capitalisation still links.
  let videos = $derived(data.videos);

  // ---- Form videos --------------------------------------------------------------------------
  // Every exercise with a video, searchable. Kept in a <details> so it is closed by default and
  // opens without JavaScript; the filter is the only part that needs it.
  let vidQuery = $state('');
  const withVideo = $derived(data.exercises.filter((e) => e.video_url));
  const vidGroups = $derived.by(() => {
    const q = vidQuery.trim().toLowerCase();
    const hits = q ? withVideo.filter((e) => e.name.toLowerCase().includes(q)
                                          || (e.category ?? '').toLowerCase().includes(q))
                   : withVideo;
    // Grouped by category, with the programme's own lifts first.
    const groups = new Map();
    for (const e of hits) {
      const k = e.source === 'programme' ? 'Your programme' : (e.category || 'Other');
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    }
    return [...groups];
  });
  const vidCount = $derived(vidGroups.reduce((n, [, list]) => n + list.length, 0));

  // ---- Month calendar -----------------------------------------------------------------------
  // Sessions keyed by day-of-month, so a day with two sessions lists both.
  let cal = $derived(data.calendar);
  const byDay = $derived.by(() => {
    const m = new Map();
    for (const s of cal.sessions) {
      const d = Number(s.date.slice(8, 10));
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(s);
    }
    return m;
  });
  // Leading blanks so the 1st lands under its weekday, then the days themselves.
  const cells = $derived([...Array(cal.firstDow).fill(null),
                          ...Array.from({ length: cal.daysInMonth }, (_, i) => i + 1)]);
  const todayDom = $derived(data.date.slice(0, 7) === cal.month ? Number(data.date.slice(8, 10)) : null);
  const videoFor = (name) => videos[(name ?? '').toLowerCase()] ?? null;

  let showAdd = $state(false);
  let addName = $state('');
  let addMuscle = $state('');
  const matchName = $derived(makeMatcher(known));
  let editingSet = $state(null);   // id of the entry currently open for correction

  // Pending destructive action awaiting confirmation:
  //   { action, id, title, lead, detail }
  // Both deletes here are irreversible and take logged sets with them — session_exercise rows
  // cascade to exercise_set, so dropping an exercise silently bins every set under it.
  let confirmAction = $state(null);
  const totalEntries = $derived(cards.reduce((n, c) => n + c.sets.length, 0));
  const loggedExercises = $derived(cards.filter((c) => c.sets.length).length);

  function askDeleteSession() {
    confirmAction = {
      action: '?/deleteSession',
      id: session.id,
      title: 'Delete this session?',
      lead: `${session.day_name ?? 'Session'} · ${fmtLong(session.date)}`,
      detail: totalEntries
        ? `${totalEntries} logged ${totalEntries === 1 ? 'entry' : 'entries'} across ${loggedExercises} exercise${loggedExercises === 1 ? '' : 's'} will be deleted. This can't be undone.`
        : 'Nothing has been logged in it yet.'
    };
  }
  function askRemoveExercise(c) {
    confirmAction = {
      action: '?/removeExercise',
      id: c.id,
      title: `Remove ${c.name}?`,
      lead: 'From this session only — your saved workout is unchanged.',
      detail: `Its ${c.sets.length} logged ${c.sets.length === 1 ? 'entry' : 'entries'} will be deleted too. This can't be undone.`
    };
  }
  const afterConfirm = () => async ({ update }) => {
    await update({ reset: true });
    confirmAction = null;
    await invalidateAll();
  };
  function onKey(e) {
    if (confirmAction && e.key === 'Escape') confirmAction = null;
  }

  const after = () => async ({ update }) => { await update({ reset: true }); await invalidateAll(); };
  // Logging a set must leave the screen exactly where it was. On a phone, tapping Add set closes
  // the keyboard and Safari scrolls the page as the screen resizes, pushing the current exercise
  // up and the next one into view. Note where the page was at the tap and put it back once the
  // save is in, and again after the keyboard has finished closing. Anchored on the row being typed
  // into, so it stays under the user's thumb even when the new set's chip adds a line
  // above it. Each pass shifts by whatever the row has moved, so repeating it is harmless.
  function holdPlace(el) {
    const top = el.getBoundingClientRect().top;
    const back = () => { if (el.isConnected) window.scrollBy({ top: el.getBoundingClientRect().top - top, behavior: 'instant' }); };
    return async () => { await tick(); back(); requestAnimationFrame(back); setTimeout(back, 400); };
  }
  const afterSet = ({ formElement }) => {
    const restore = holdPlace(formElement);
    return async ({ update }) => { await update({ reset: true }); await invalidateAll(); await restore(); };
  };
  // Notes save on their own when the box loses focus, without refreshing the page, so the screen
  // never moves. "Saved" shows briefly next to the box that was saved.
  let savedNote = $state(null);
  const noteSaved = (key) => () => async ({ result }) => {
    if (result.type !== 'success') return;
    savedNote = key;
    setTimeout(() => { if (savedNote === key) savedNote = null; }, 2000);
  };
  const submitOnChange = (e) => e.currentTarget.form.requestSubmit();
  const afterAdd = () => async ({ update }) => { await update({ reset: true }); showAdd = false; addName = ''; addMuscle = ''; await invalidateAll(); };
  // Close the editor only when the change actually went through, so a rejected edit keeps the
  // typed values on screen instead of silently discarding them.
  const afterEdit = ({ formElement }) => {
    // The editor closes on success, so anchor on the exercise's card, which stays.
    const restore = holdPlace(formElement.closest('.card') ?? formElement);
    return async ({ result, update }) => {
      await update({ reset: false });
      if (result.type === 'success') editingSet = null;
      await invalidateAll();
      await restore();
    };
  };

  const fmt = dayMonth;
  const fmtLong = dowDayMonth;
  const fmtTime = clockTime;
  const summary = (s) => [`${s.sets} logged`, s.exercises ? `${s.exercises} exercise${s.exercises === 1 ? '' : 's'}` : null]
    .filter(Boolean).join(' · ');
  const setStr = (s) => `${s.weight_kg ?? 'BW'}${s.weight_kg != null ? ' kg' : ''} × ${s.reps}`;
  // One entry rendered for whichever kind it is.
  const entryStr = (c, s) => (c.kind === 'cardio' ? cardioSummary(s) : setStr(s));

  // The optional template hint, rendered only from the parts that were actually filled in —
  // a workout that's just a list of names shows no hint at all rather than "null × null".
  function hint(e) {
    const bits = [];
    if (e.kind === 'cardio') {
      if (e.target_duration_min) bits.push(`${e.target_duration_min} min`);
      if (e.target_distance_km) bits.push(`${e.target_distance_km} km`);
    } else {
      if (e.target_sets && e.rep_low && e.rep_high) bits.push(`${e.target_sets} × ${e.rep_low}–${e.rep_high}`);
      else if (e.target_sets) bits.push(`${e.target_sets} sets`);
      else if (e.rep_low && e.rep_high) bits.push(`${e.rep_low}–${e.rep_high} reps`);
    }
    // RIR qualifies the target, so it sits against it — "3 × 3–5 @2–0 RIR" — not floating at
    // the end of the line after the rest time.
    if (e.rir) bits[0] = bits.length ? `${bits[0]} @${e.rir} RIR` : `@${e.rir} RIR`;
    if (e.rest) bits.push(`rest ${e.rest}`);
    // The programme's cue for this lift — "per leg", "add weight once you hit 12".
    if (e.note) bits.push(e.note);
    return bits.join(' · ');
  }
</script>

<Page title="Training"
      subtitle={session ? `${session.day_name ?? 'Session'} · ${fmtLong(session.date)}` : 'Pick a workout to start logging'}>

  {#if !session}
    <!-- ---------- Session picker ---------- -->
    {#if programWeek}
      <p class="text-sm text-[var(--color-muted)] -mt-1">
        Week <span class="text-[var(--color-text)] font-medium">{programWeek.week}</span> of {programWeek.length}
        {#if programWeek.blockWeek !== programWeek.week}· week {programWeek.blockWeek} of the block, second time through{/if}
      </p>
    {/if}
    {#if lastLogged}
      <p class="text-sm text-[var(--color-muted)] -mt-1">
        Last trained: <span class="text-[var(--color-text)] font-medium">{lastLogged.day_name}</span>
        · {fmtLong(lastLogged.date)}
      </p>
    {/if}

    {#if page.url.searchParams.get('built')}
      <div class="card p-3 text-sm" style="color:var(--color-good)">
        ✓ Saved “{page.url.searchParams.get('built')}”.{page.url.searchParams.get('inuse') ? ' Its days are below, ready to log.' : ' Pick it when you start a block.'}
      </div>
    {/if}
    <a href="/training/build" class="card p-4 flex items-center gap-3 no-underline">
      <span class="text-2xl leading-none text-[var(--color-accent)]">＋</span>
      <span class="flex-1">
        <span class="block text-base font-semibold text-[var(--color-text)]">Build a workout</span>
        <span class="block text-sm text-[var(--color-muted)]">Your own days and lifts, saved alongside the presets</span>
      </span>
      <span class="text-[var(--color-accent)] text-lg">→</span>
    </a>

    {#if inProgress.length}
      <div class="card p-4 border" style="border-color:var(--color-accent)">
        <span class="text-sm font-medium text-[var(--color-accent)]">In progress today</span>
        <div class="divide-y divide-[var(--color-border)] mt-1">
          {#each inProgress as s}
            <a href={`/training?session=${s.id}`} class="py-2 flex items-center justify-between gap-2 text-sm">
              <span class="text-[var(--color-text)]">{s.day_name ?? 'Session'}</span>
              <span class="text-[var(--color-muted)] text-right">{summary(s)} · continue →</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}

    {#if doneToday.length}
      <div class="card p-4">
        <span class="text-sm font-medium text-[var(--color-good)]">Done today ✓</span>
        <div class="divide-y divide-[var(--color-border)] mt-1">
          {#each doneToday as s}
            <a href={`/training?session=${s.id}`} class="py-2 flex items-center justify-between gap-2 text-sm">
              <span class="text-[var(--color-text)]">{s.day_name ?? 'Session'}</span>
              <span class="text-[var(--color-muted)] text-right">
                {summary(s)}
                <span class="text-[var(--color-faint)]">· finished {fmtTime(s.finished_at)}</span>
              </span>
            </a>
          {/each}
        </div>
      </div>
    {/if}

    {#if !workouts.length}
      <div class="card p-4">
        <div class="text-sm font-medium text-[var(--color-text)]">No workouts yet</div>
        <p class="text-sm text-[var(--color-muted)] mt-1">
          <a href="/training/build" class="text-[var(--color-accent)]">Build a workout</a>, or pick a
          preset in <a href="/settings#programmes" class="text-[var(--color-accent)]">Settings</a>.
          It'll show up here ready to log.
        </p>
      </div>
    {:else}
      <div class="card p-4 space-y-3">
        <span class="text-sm font-medium text-[var(--color-text)]">Start a session</span>
        <div class="grid gap-2">
          {#each workouts as w}
            <form method="POST" action="?/start" use:enhance={after}>
              <input type="hidden" name="workoutId" value={w.id} />
              <button class="w-full text-left px-3 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <div class="font-semibold text-[var(--color-text)] flex items-center gap-2">
                  <span>{(w.name ?? w.label)}</span>
                  {#if w.id === nextUpId}
                    <span class="text-xs font-medium text-[var(--color-accent)]">next up</span>
                  {/if}
                </div>
                <div class="text-xs text-[var(--color-muted)] mt-0.5">
                  {#if w.exercises.length}{w.exercises.map((e) => e.name).join(' · ')}
                  {:else}<span class="text-[var(--color-faint)]">no exercises yet</span>{/if}
                </div>
              </button>
            </form>
          {/each}
          <form method="POST" action="?/start" use:enhance={after}>
            <button class="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-muted)] border border-dashed border-[var(--color-border)]">
              + Blank session
            </button>
          </form>
        </div>
      </div>
    {/if}

    {#if oneOffs.length}
      <!-- One-off workouts: for a week you can only get in once or twice. Logged like any session,
           counted in the week, but outside the block's rotation — "next up" doesn't move. -->
      <div class="card p-4 space-y-3">
        <div>
          <span class="text-sm font-medium text-[var(--color-text)]">One-off workouts</span>
          <p class="text-xs text-[var(--color-muted)] mt-0.5">
            For a short week. Doesn't change your block or what's next up.
          </p>
        </div>
        <div class="grid gap-2">
          {#each oneOffs as w}
            <form method="POST" action="?/start" use:enhance={after}>
              <input type="hidden" name="workoutId" value={w.id} />
              <button class="w-full text-left px-3 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
                <div class="font-semibold text-[var(--color-text)]">{w.program_name}</div>
                <div class="text-xs text-[var(--color-muted)] mt-0.5">{w.exercises.map((e) => e.name).join(' · ')}</div>
              </button>
            </form>
          {/each}
        </div>
      </div>
    {/if}

  {:else}
    <!-- ---------- Active session ---------- -->
    <div class="flex items-center justify-between -mt-1">
      <a href="/training" class="text-xs font-semibold text-[var(--color-accent)]">← Choose a workout</a>
      <a href="/training/history" class="text-xs text-[var(--color-accent)]">Full history →</a>
    </div>

    <RestTimer />

    {#if session.finished_at}
      <div class="card p-3 border" style="border-color:var(--color-good)">
        <div class="text-sm font-semibold text-[var(--color-good)]">✓ Finished {fmtTime(session.finished_at)}</div>
        <p class="text-xs text-[var(--color-muted)] mt-0.5">
          Nothing is locked — log another set and this goes back to in progress.
        </p>
      </div>
    {/if}

    {#each cards as c, i (c.id)}
      <div class="card p-4 space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
              <span class="min-w-0">{c.name}</span>
              {#if videoFor(c.name)}
                <!-- The form video. stopPropagation isn't needed (this isn't nested in a
                     button) but rel=noopener is, since it opens a third-party tab. -->
                <a href={videoFor(c.name)} target="_blank" rel="noopener noreferrer"
                   class="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md"
                   style="background:var(--color-surface-2)"
                   aria-label={`Watch the form video for ${c.name}`} title="Form video">
                  <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="var(--color-accent)" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </a>
              {/if}
            </div>
            {#if hint(c)}<div class="text-xs text-[var(--color-muted)]">{hint(c)}</div>{/if}
          </div>
          <!-- Reordering here changes TODAY only; the saved workout is untouched. -->
          <div class="flex items-center gap-1 shrink-0">
            <form method="POST" action="?/move" use:enhance={after}>
              <input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" />
              <button class="w-7 h-7 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-muted)] disabled:opacity-30"
                      disabled={i === 0} aria-label="Move up">↑</button>
            </form>
            <form method="POST" action="?/move" use:enhance={after}>
              <input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" />
              <button class="w-7 h-7 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-muted)] disabled:opacity-30"
                      disabled={i === cards.length - 1} aria-label="Move down">↓</button>
            </form>
            <!-- Nothing logged yet? Removing it loses nothing, so don't nag. Once sets exist the
                 cascade would bin them, so ask first. -->
            {#if c.sets.length}
              <button type="button" onclick={() => askRemoveExercise(c)}
                      class="w-7 h-7 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-faint)]"
                      aria-label={`Remove ${c.name} from this session`}>✕</button>
            {:else}
              <form method="POST" action="?/removeExercise" use:enhance={after}>
                <input type="hidden" name="id" value={c.id} />
                <button class="w-7 h-7 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-faint)]"
                        aria-label={`Remove ${c.name} from this session`}>✕</button>
              </form>
            {/if}
          </div>
        </div>

        <!-- The ongoing log: what this lift did last time on THIS day, and its best ever on this
             day. A lift trained on two days at two rep ranges gets two independent records; the
             day is named only on those, so the common case stays uncluttered. -->
        <div class="text-xs rounded-lg px-2.5 py-1.5 space-y-0.5" style="background:var(--color-surface-2)">
          {#if c.split && session?.day_name}
            <div class="text-[var(--color-faint)]">On {session.day_name} only</div>
          {/if}
          {#if c.last}
            <div class="text-[var(--color-muted)]">
              <span class="text-[var(--color-text)]">Last {fmt(c.last.date)}:</span>
              {c.last.sets.map((s) => entryStr(c, s)).join('  ·  ')}
            </div>
          {:else}
            <div class="text-[var(--color-faint)]">
              First time logging this{c.kind === 'cardio' ? '' : ' lift'}{c.split && session?.day_name ? ` on ${session.day_name}` : ''}.
            </div>
          {/if}
          {#if c.kind === 'cardio'}
            <!-- "Heaviest" means nothing here, so the bests worth chasing are furthest and fastest. -->
            {#if c.best?.furthest?.distance_km != null}
              <div class="text-[var(--color-muted)]">
                <span class="text-[var(--color-text)]">Furthest:</span> {c.best.furthest.distance_km} km
                <span class="text-[var(--color-faint)]">({fmt(c.best.furthest.date)})</span>
              </div>
            {/if}
            {#if c.best?.fastest}
              <div class="text-[var(--color-muted)]">
                <span class="text-[var(--color-text)]">Best pace:</span>
                {formatPace(c.best.fastest.duration_sec, c.best.fastest.distance_km)}
                <span class="text-[var(--color-faint)]">({fmt(c.best.fastest.date)})</span>
              </div>
            {/if}
          {:else if c.best?.weight_kg != null}
            <div class="text-[var(--color-muted)]">
              <span class="text-[var(--color-text)]">Best:</span> {c.best.weight_kg} kg × {c.best.reps}
              <span class="text-[var(--color-faint)]">({fmt(c.best.date)})</span>
            </div>
          {/if}
          <!-- Carry the day through, so the history opens on the same day's record the card above
               is quoting rather than the two days merged. -->
          <a href={`/training/history?view=exercise&ex=${encodeURIComponent(c.name)}${c.split && session?.day_name ? `&day=${encodeURIComponent(session.day_name)}` : ''}`}
             class="inline-block text-[var(--color-accent)]">Progress for this lift →</a>
          <!-- The user's note for next time on this lift. Carried from last time on this day; edit or
               clear it and the change carries forward instead. -->
          <form method="POST" action="?/liftNote" use:enhance={noteSaved(`l${c.id}`)} class="pt-1.5">
            <input type="hidden" name="id" value={c.id} />
            <div class="flex items-baseline justify-between">
              <span class="text-[var(--color-muted)]">Note for next {session?.day_name ?? 'time'}</span>
              {#if savedNote === `l${c.id}`}<span class="text-[var(--color-good)]">Saved ✓</span>{/if}
            </div>
            <textarea name="note" rows="2" value={c.log_note ?? ''} onchange={submitOnChange}
                      class="w-full mt-1 px-2 py-1.5 rounded-lg text-base text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none resize-none"
                      style="background:var(--color-bg); border-left:3px solid {c.log_note ? 'var(--color-accent)' : 'transparent'}"></textarea>
          </form>
        </div>

        {#if c.sets.length}
          <!-- Tapping an entry opens it for correction rather than deleting it outright: a wrong
               weight is far more common than a set that never happened, and delete-then-retype
               would move the set to the end of the list. Delete lives inside the editor. -->
          <div class="flex flex-wrap gap-1.5">
            {#each c.sets as s (s.id)}
              <button onclick={() => (editingSet = editingSet === s.id ? null : s.id)}
                      class="text-xs px-2 py-1 rounded-lg {editingSet === s.id ? 'text-[#0b0f17]' : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'}"
                      style={editingSet === s.id ? 'background:var(--color-accent)' : ''}
                      title="tap to edit">{entryStr(c, s)}</button>
            {/each}
          </div>

          {#each c.sets.filter((s) => s.id === editingSet) as s (s.id)}
            <div class="rounded-xl p-2.5 space-y-2" style="background:var(--color-surface-2)">
              <div class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                Editing {c.kind === 'cardio' ? 'entry' : 'set'} {s.set_no}
              </div>
              <form method="POST" action="?/editSet" use:enhance={afterEdit} class="space-y-2">
                <input type="hidden" name="id" value={s.id} />
                {#if c.kind === 'cardio'}
                  <div class="flex items-end gap-2">
                    <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">time
                      <input name="duration" inputmode="numeric" value={formatDuration(s.duration_sec) ?? ''}
                             class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
                    </label>
                    <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">km
                      <input name="distance" type="number" step="0.01" min="0" inputmode="decimal" value={s.distance_km ?? ''}
                             class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
                    </label>
                  </div>
                  <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wide">effort (RPE)
                    <select name="rpe" class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base">
                      <option value="" selected={s.rpe == null}>—</option>
                      {#each RPE_SCALE as r}<option value={r.value} selected={s.rpe === r.value}>{r.value} · {r.label}</option>{/each}
                    </select>
                  </label>
                {:else}
                  <div class="flex items-end gap-2">
                    <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">kg
                      <input name="weight" type="number" step="any" min="0" inputmode="decimal" value={s.weight_kg ?? ''}
                             class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
                    </label>
                    <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">reps
                      <input name="reps" type="number" min="1" inputmode="numeric" required value={s.reps ?? ''}
                             class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] outline-none text-base" />
                    </label>
                  </div>
                {/if}
                <div class="flex gap-2">
                  <button type="button" onclick={() => (editingSet = null)}
                          class="flex-1 py-2 rounded-lg text-sm font-medium text-[var(--color-muted)] bg-[var(--color-bg)]">Cancel</button>
                  <button class="flex-1 py-2 rounded-lg text-sm font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Save</button>
                </div>
              </form>
              <form method="POST" action="?/deleteSet" use:enhance={afterEdit}>
                <input type="hidden" name="id" value={s.id} />
                <button class="w-full py-2 rounded-lg text-xs font-medium text-[var(--color-faint)] bg-[var(--color-bg)]">Delete this {c.kind === 'cardio' ? 'entry' : 'set'}</button>
              </form>
            </div>
          {/each}
        {/if}

        {#if c.kind === 'cardio'}
          <!-- Two rows rather than one: four controls squeezed onto a phone line makes each of
               them too small to hit or read. -->
          <form method="POST" action="?/addSet" use:enhance={afterSet} class="space-y-2">
            <input type="hidden" name="sessionExerciseId" value={c.id} />
            <div class="flex items-end gap-2">
              <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">time
                <input name="duration" inputmode="numeric"
                       placeholder={c.target_duration_min ? `${c.target_duration_min} or 32:30` : 'mins or 32:30'}
                       class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none text-base" />
              </label>
              <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">km
                <input name="distance" type="number" step="0.01" min="0" inputmode="decimal"
                       placeholder={c.target_distance_km ? String(c.target_distance_km) : '—'}
                       class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none text-base" />
              </label>
            </div>
            <div class="flex items-end gap-2">
              <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">effort (RPE)
                <select name="rpe"
                        class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base">
                  <option value="">—</option>
                  {#each RPE_SCALE as r}<option value={r.value}>{r.value} · {r.label}</option>{/each}
                </select>
              </label>
              <button class="px-4 py-2 rounded-lg font-semibold text-[#0b0f17] shrink-0" style="background:var(--color-accent)">
                Add entry
              </button>
            </div>
          </form>
        {:else}
          <form method="POST" action="?/addSet" use:enhance={afterSet} class="flex items-end gap-2">
            <input type="hidden" name="sessionExerciseId" value={c.id} />
            <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">kg
              <input name="weight" type="number" step="any" min="0" inputmode="decimal"
                     placeholder={c.last?.sets?.[0]?.weight_kg != null ? String(c.last.sets[0].weight_kg) : '—'}
                     class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
            </label>
            <label class="flex-1 text-[10px] text-[var(--color-muted)] uppercase tracking-wide">reps
              <input name="reps" type="number" min="1" inputmode="numeric" required
                     placeholder={c.rep_low && c.rep_high ? `${c.rep_low}–${c.rep_high}` : '—'}
                     class="w-full mt-0.5 px-2 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] outline-none text-base" />
            </label>
            <button class="px-4 py-2 rounded-lg font-semibold text-[#0b0f17] shrink-0" style="background:var(--color-accent)">
              Add set
            </button>
          </form>
        {/if}
      </div>
    {/each}

    <!-- Add a lift that isn't in the template (the rack was taken, you fancied a finisher…) -->
    {#if showAdd}
      <form method="POST" action="?/addExercise" use:enhance={afterAdd} class="card p-4 space-y-2.5">
        <input type="hidden" name="sessionId" value={session.id} />
        <label class="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">Exercise
          <input name="name" list="known-exercises" required placeholder="e.g. BB Row" bind:value={addName}
                 class="w-full mt-0.5 px-3 py-2.5 rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none text-base" />
        </label>
        <ExerciseNameHint match={matchName} value={addName} onpick={(n) => (addName = n)} bind:muscle={addMuscle} />
        <input type="hidden" name="muscle" value={addMuscle} />
        <datalist id="known-exercises">{#each known as n}<option value={n}></option>{/each}</datalist>
        <div class="flex gap-2">
          <button type="button" onclick={() => (showAdd = false)}
                  class="flex-1 py-2.5 rounded-xl text-sm font-medium text-[var(--color-muted)] bg-[var(--color-surface-2)]">Cancel</button>
          <button class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#0b0f17]" style="background:var(--color-accent)">Add to session</button>
        </div>
      </form>
    {:else}
      <button onclick={() => (showAdd = true)}
              class="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-muted)] border border-dashed border-[var(--color-border)]">
        + Add an exercise to this session
      </button>
    {/if}

    <!-- A note on the whole session, carried to the next time this day comes round. -->
    <form method="POST" action="?/sessionNote" use:enhance={noteSaved('session')} class="card p-4 space-y-2">
      <input type="hidden" name="id" value={session.id} />
      <div class="flex items-baseline justify-between">
        <span class="text-sm font-medium text-[var(--color-text)]">Session notes</span>
        {#if savedNote === 'session'}<span class="text-xs text-[var(--color-good)]">Saved ✓</span>{:else}<span class="text-xs text-[var(--color-muted)]">shows next {session.day_name ?? 'time'}</span>{/if}
      </div>
      <textarea name="note" rows="5" value={session.notes ?? ''} onchange={submitOnChange}
                class="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none text-base"></textarea>
    </form>

    {#if !session.finished_at}
      <form method="POST" action="?/finish" use:enhance={after} class="pt-1">
        <input type="hidden" name="id" value={session.id} />
        <button class="w-full py-3 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-good)">
          Finish session
        </button>
      </form>
      <p class="text-xs text-center text-[var(--color-faint)] -mt-1">
        Every set is already saved — this just marks the session done.
      </p>
    {/if}

    <div class="pt-1">
      <button type="button" onclick={askDeleteSession}
              class="w-full py-2 rounded-xl text-xs font-medium text-[var(--color-faint)] bg-[var(--color-surface-2)]">
        Delete this session
      </button>
    </div>
  {/if}

  <!-- Form videos. <details> so it is genuinely closed by default and toggles with no JS. -->
  <details class="card overflow-hidden group">
    <summary class="flex items-center gap-2.5 p-3 cursor-pointer list-none select-none">
      <span class="w-8 h-8 shrink-0 rounded-lg inline-flex items-center justify-center"
            style="background:var(--color-surface-2)">
        <svg viewBox="0 0 24 24" class="w-4 h-4" fill="var(--color-accent)" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold text-[var(--color-text)]">Form videos</span>
        <span class="block text-xs text-[var(--color-muted)]">{withVideo.length} exercises</span>
      </span>
      <svg viewBox="0 0 24 24" class="w-5 h-5 shrink-0 transition-transform group-open:rotate-180"
           fill="none" stroke="var(--color-muted)" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </summary>

    <div class="px-3 pb-3 space-y-2">
      <input bind:value={vidQuery} type="search" placeholder="Search — squat, chest, curl…"
             class="w-full px-3 py-2 rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text)] placeholder:text-[var(--color-faint)] outline-none text-base" />

      <!-- Capped and scrollable: the full list would otherwise bury everything below it. -->
      <div class="max-h-80 overflow-y-auto -mx-1 px-1 space-y-3">
        {#each vidGroups as [group, list]}
          <div>
            <div class="sticky top-0 py-1 text-[10px] uppercase tracking-wide text-[var(--color-muted)]"
                 style="background:var(--color-surface)">{group} · {list.length}</div>
            <div class="divide-y divide-[var(--color-border)]">
              {#each list as e}
                <a href={e.video_url} target="_blank" rel="noopener noreferrer"
                   class="flex items-center gap-2 py-2 text-sm">
                  <span class="min-w-0 flex-1 truncate text-[var(--color-text)]">{e.name}</span>
                  <span class="shrink-0 w-6 h-6 rounded-md inline-flex items-center justify-center"
                        style="background:var(--color-surface-2)">
                    <svg viewBox="0 0 24 24" class="w-3 h-3" fill="var(--color-accent)" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                  </span>
                </a>
              {/each}
            </div>
          </div>
        {:else}
          <p class="text-sm text-[var(--color-muted)] py-2">Nothing matches “{vidQuery}”.</p>
        {/each}
      </div>

      {#if vidQuery}<div class="text-xs text-[var(--color-faint)]">{vidCount} of {withVideo.length}</div>{/if}
    </div>
  </details>

  <!-- Month at a glance, reaching back as far as you page. Hidden mid-session, so logging stays
       the only thing on screen. -->
  {#if !session}
  <div class="card p-3 space-y-2">
    <div class="flex items-center justify-between gap-2">
      <a href={`/training?month=${cal.prev}`} data-sveltekit-noscroll aria-label="Previous month"
         class="px-2.5 py-1.5 rounded-lg text-[var(--color-text)] bg-[var(--color-surface-2)]">←</a>
      <div class="text-sm font-semibold text-[var(--color-text)]">{cal.label}</div>
      <a href={`/training?month=${cal.next}`} data-sveltekit-noscroll aria-label="Next month"
         class="px-2.5 py-1.5 rounded-lg text-[var(--color-text)] bg-[var(--color-surface-2)]">→</a>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
      {#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as d}<div>{d}</div>{/each}
    </div>

    <div class="grid grid-cols-7 gap-1">
      {#each cells as day}
        {#if day == null}
          <div></div>
        {:else}
          <div class="min-h-[46px] rounded-lg p-1 {day === todayDom ? 'ring-1' : ''}"
               style={`background:var(--color-bg); ${day === todayDom ? '--tw-ring-color:var(--color-accent)' : ''}`}>
            <div class="text-[10px] {day === todayDom ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-faint)]'}">{day}</div>
            {#each byDay.get(day) ?? [] as s}
              <a href={`/training/history#session-${s.id}`}
                 class="block text-[10px] leading-tight font-medium truncate text-[var(--color-accent)]"
                 title={s.day_name ?? 'Session'}>{s.day_name ?? 'Session'}</a>
            {/each}
          </div>
        {/if}
      {/each}
    </div>

    <a href="/training/history" class="block text-right text-xs text-[var(--color-accent)]">Full history →</a>
  </div>
  {/if}
</Page>

<svelte:window onkeydown={onKey} />

{#if confirmAction}
  <div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
       role="dialog" aria-modal="true" aria-labelledby="confirm-title">

    <!-- Real button, not a click handler on a div, so tap-outside-to-cancel is reachable by
         keyboard and announced to screen readers. -->
    <button type="button" onclick={() => (confirmAction = null)} aria-label="Cancel"
            class="absolute inset-0 w-full h-full cursor-default"></button>

    <div class="relative z-10 w-full max-w-sm rounded-2xl p-4 space-y-3"
         style="background:var(--color-surface); border:1px solid var(--color-border)">
      <div id="confirm-title" class="text-base font-semibold text-[var(--color-text)]">{confirmAction.title}</div>
      <p class="text-sm text-[var(--color-text)]">{confirmAction.lead}</p>
      <p class="text-sm text-[var(--color-muted)]">{confirmAction.detail}</p>

      <div class="flex gap-2 pt-1">
        <button type="button" onclick={() => (confirmAction = null)}
                class="flex-1 py-3 rounded-xl font-medium text-[var(--color-text)] bg-[var(--color-surface-2)]">Cancel</button>
        <form method="POST" action={confirmAction.action} use:enhance={afterConfirm} class="flex-1">
          <input type="hidden" name="id" value={confirmAction.id} />
          <button class="w-full py-3 rounded-xl font-semibold text-[#0b0f17]" style="background:var(--color-warn)">Delete</button>
        </form>
      </div>
    </div>
  </div>
{/if}
