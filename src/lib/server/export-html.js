// Human-readable export. The .db download is the real backup (restorable, exact); this is the
// one you can actually read — a single self-contained HTML file, no external assets, that opens
// in any browser and prints sensibly.
import { getDb } from './db.js';
import { listPrescriptions } from './repos/profile.js';
import { listDays, allSessions } from './repos/training.js';
import { cardioSummary } from '$lib/format.js';

// Everything below interpolates user-entered text — food names, exercise names, workout titles.
// Without escaping, a food called "Ben & Jerry's <whatever>" would corrupt the document.
const esc = (v) =>
  v == null ? '' : String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const r1 = (n) => (n == null ? '' : Math.round(n * 10) / 10);
const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const setStr = (s) => `${s.weight_kg ?? 'BW'}${s.weight_kg != null ? ' kg' : ''} × ${s.reps}`;
const entryStr = (kind, s) => (kind === 'cardio' ? cardioSummary(s) : setStr(s));

const table = (headers, rows) =>
  rows.length
    ? `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
       <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<p class="empty">Nothing recorded.</p>';

export function buildExportHtml() {
  const db = getDb();
  const plans = listPrescriptions();
  const generated = new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });

  // ---- Blocks ----
  // The record of what was actually prescribed, and when. Newest first.
  const targets = plans.length
    ? plans.map((pl) => {
        // The app derives a block's calories from its macros unless one was set explicitly.
        const kcal = pl.kcal ?? Math.round(pl.protein_g * 4 + pl.fat_g * 9 + pl.carbs_g * 4);
        return `<h3>${esc(pl.name ?? 'Block')}${pl.source ? ` <span class="note">set by ${esc(pl.source)}</span>` : ''} <span class="note">${esc(fmtDate(pl.start_date))} → ${esc(fmtDate(pl.end_date))}</span></h3>
          <div class="cards">
            <div class="stat"><span>${kcal}</span><label>kcal / day</label></div>
            <div class="stat"><span>${pl.protein_g} g</span><label>protein</label></div>
            <div class="stat"><span>${pl.fat_g} g</span><label>fat</label></div>
            <div class="stat"><span>${pl.carbs_g} g</span><label>carbs</label></div>
          </div>
          ${pl.notes ? `<p class="note">${esc(pl.notes)}</p>` : ''}`;
      }).join('')
    : '<p class="empty">No blocks recorded.</p>';

  // ---- Weight ----
  const weighins = db.prepare('SELECT date, weight_kg FROM weighins ORDER BY date DESC').all();
  const first = weighins[weighins.length - 1], last = weighins[0];
  const weightSummary = weighins.length >= 2
    ? `<div class="cards">
         <div class="stat"><span>${first.weight_kg} kg</span><label>first · ${fmtDate(first.date)}</label></div>
         <div class="stat"><span>${last.weight_kg} kg</span><label>latest · ${fmtDate(last.date)}</label></div>
         <div class="stat"><span>${r1(last.weight_kg - first.weight_kg) > 0 ? '+' : ''}${r1(last.weight_kg - first.weight_kg)} kg</span><label>change over ${weighins.length} weigh-ins</label></div>
       </div>` : '';
  const weightTable = table(['Date', 'Weight (kg)'], weighins.map((w) => [fmtDate(w.date), w.weight_kg]));

  // ---- Measurements: one column per date (newest first), one row per site ----
  const meas = db.prepare('SELECT date, site, value_cm FROM measurements ORDER BY date DESC').all();
  const sites = [...new Set(meas.map((m) => m.site))].sort();
  const measDates = [...new Set(meas.map((m) => m.date))];
  const measValue = new Map(meas.map((m) => [`${m.date}|${m.site}`, m.value_cm]));
  const measTable = table(
    ['Site', ...measDates.map(fmtDate)],
    sites.map((s) => [esc(s), ...measDates.map((d) => measValue.get(`${d}|${s}`) ?? '—')])
  );

  // ---- Programme days ----
  const workouts = listDays({ all: true }).map((w) => {
    const rows = w.exercises.map((e) => {
      const target = [e.sets ? `${e.sets} sets` : null,
                      e.rep_low && e.rep_high ? `${e.rep_low}–${e.rep_high} reps` : null,
                      e.rir ? `@${e.rir} RIR` : null].filter(Boolean).join(' · ');
      return [esc(e.name), esc(target) || '—', esc(e.rest) || '—'];
    });
    return `<h3>${esc(w.name ?? w.label)}</h3>${table(['Exercise', 'Target', 'Rest'], rows)}`;
  }).join('') || '<p class="empty">No programme days.</p>';

  // ---- Sessions ----
  const sessions = allSessions();
  const sessionHtml = sessions.length
    ? sessions.map((s) => `
        <details${sessions.indexOf(s) < 5 ? ' open' : ''}>
          <summary>
            <strong>${esc(s.day_name ?? (s.day_label ? `Workout ${s.day_label}` : 'Session'))}</strong>
            <span class="meta">${fmtDate(s.date)} · ${s.setCount} logged${s.finished_at ? ' · finished ✓' : ''}</span>
          </summary>
          ${table(['Exercise', 'Entries'], s.exercises.map((e) => [
            esc(e.name),
            e.sets.length ? esc(e.sets.map((x) => entryStr(e.kind, x)).join('   ·   ')) : '<span class="empty">not logged</span>'
          ]))}
        </details>`).join('')
    : '<p class="empty">No sessions logged.</p>';

  // ---- Food log, one collapsible block per day, newest first ----
  const days = db.prepare(`
    SELECT date, COUNT(*) items, SUM(kcal) kcal, SUM(protein) protein, SUM(fat) fat,
           SUM(carbs) carbs, SUM(fibre) fibre
    FROM food_log GROUP BY date ORDER BY date DESC`).all();
  const entries = db.prepare('SELECT * FROM food_log ORDER BY date DESC, id').all();
  const entriesByDate = new Map();
  for (const e of entries) {
    if (!entriesByDate.has(e.date)) entriesByDate.set(e.date, []);
    entriesByDate.get(e.date).push(e);
  }
  const SLOTS = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner', other: 'Other' };
  const foodHtml = days.length
    ? days.map((d, i) => `
        <details${i < 3 ? ' open' : ''}>
          <summary>
            <strong>${fmtDate(d.date)}</strong>
            <span class="meta">${Math.round(d.kcal)} kcal · ${r1(d.protein)} P / ${r1(d.carbs)} C / ${r1(d.fat)} F${d.fibre ? ` · ${r1(d.fibre)} g fibre` : ''}</span>
          </summary>
          ${table(['Meal', 'Food', 'Qty', 'kcal', 'P', 'C', 'F'],
            (entriesByDate.get(d.date) ?? []).map((e) => [
              esc(SLOTS[e.slot] ?? e.slot), esc(e.name), r1(e.qty),
              Math.round(e.kcal), r1(e.protein), r1(e.carbs), r1(e.fat)
            ]))}
        </details>`).join('')
    : '<p class="empty">No food logged.</p>';

  const photos = db.prepare('SELECT date FROM photos ORDER BY date DESC').all();
  const photoNote = photos.length
    ? `<p class="note">${photos.length} progress photo${photos.length === 1 ? '' : 's'} between ${fmtDate(photos[photos.length - 1].date)} and ${fmtDate(photos[0].date)}. Images are not embedded — they live in the .db backup's uploads folder.</p>`
    : '<p class="empty">No progress photos.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MSP Tracker export — ${esc(new Date().toLocaleDateString('en-CA'))}</title>
<style>
  /* Follows the reader's light/dark preference, and prints on white either way. */
  :root {
    --bg:#ffffff; --fg:#14181f; --muted:#4b5563; --line:#d6dbe3;
    --surface:#f5f7fa; --accent:#0b62c4; --good:#0a7d4f;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg:#0b0f17; --fg:#f3f6fb; --muted:#cbd5e1; --line:#263145;
      --surface:#141b28; --accent:#93c5fd; --good:#34d399;
    }
  }
  * { box-sizing:border-box; }
  body {
    margin:0; padding:2rem 1.25rem 4rem; background:var(--bg); color:var(--fg);
    font:16px/1.6 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans JP', sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  main { max-width:60rem; margin:0 auto; }
  h1 { font-size:1.9rem; margin:0 0 .25rem; letter-spacing:-.01em; }
  h2 { font-size:1.3rem; margin:2.5rem 0 .75rem; padding-bottom:.35rem; border-bottom:2px solid var(--line); }
  h3 { font-size:1.05rem; margin:1.5rem 0 .5rem; }
  a { color:var(--accent); }
  .sub { color:var(--muted); margin:0 0 .5rem; }
  .note { color:var(--muted); font-size:.9rem; }
  .empty { color:var(--muted); font-style:italic; }
  .cards { display:flex; flex-wrap:wrap; gap:.75rem; margin:1rem 0; }
  .stat {
    background:var(--surface); border:1px solid var(--line); border-radius:.6rem;
    padding:.6rem .9rem; min-width:8rem;
  }
  .stat span { display:block; font-size:1.35rem; font-weight:700; }
  .stat label { display:block; color:var(--muted); font-size:.8rem; }
  /* Wide tables scroll inside their own box rather than pushing the page sideways. */
  .scroll { overflow-x:auto; }
  table { border-collapse:collapse; width:100%; margin:.5rem 0 1rem; font-size:.95rem; }
  th, td { text-align:left; padding:.4rem .6rem; border-bottom:1px solid var(--line); vertical-align:top; }
  th { background:var(--surface); font-weight:600; white-space:nowrap; }
  tbody tr:nth-child(even) td { background:color-mix(in srgb, var(--surface) 55%, transparent); }
  details { border:1px solid var(--line); border-radius:.6rem; margin:.5rem 0; padding:.4rem .8rem; background:var(--surface); }
  details > summary { cursor:pointer; padding:.35rem 0; font-size:1rem; }
  details .meta { color:var(--muted); font-size:.88rem; margin-left:.5rem; }
  details table { background:var(--bg); }
  /* Measurements read down the side, dates across the top. */
  .meas th { white-space:nowrap; }
  .meas td:first-child { font-weight:600; white-space:nowrap; }
  @media print {
    :root { --bg:#fff; --fg:#000; --muted:#444; --line:#bbb; --surface:#f2f2f2; }
    body { padding:0; font-size:11pt; }
    details { break-inside:avoid; }
    details:not([open]) > *:not(summary) { display:revert; }
    details > summary { list-style:none; }
  }
</style>
</head>
<body>
<main>
  <h1>MSP Tracker — full export</h1>
  <p class="sub">Generated ${esc(generated)}</p>
  <p class="note">A readable snapshot of everything in the app. For restoring, use the <strong>.db backup</strong> — that one is the exact database; this file is for reading.</p>

  <h2>Blocks</h2>
  ${targets}

  <h2>Weight</h2>
  ${weightSummary}
  <div class="scroll">${weightTable}</div>

  <h2>Measurements (cm)</h2>
  <div class="scroll meas">${measTable}</div>

  <h2>Programme days</h2>
  ${workouts}

  <h2>Training sessions <span class="note">(${sessions.length})</span></h2>
  ${sessionHtml}

  <h2>Food log <span class="note">(${days.length} days)</span></h2>
  ${foodHtml}

  <h2>Progress photos</h2>
  ${photoNote}
</main>
</body>
</html>`;
}
