<script>
  // Reusable interactive line chart (SVG, no deps). Change-over-time form.
  let {
    series = [],        // primary line: [{t, v}]
    dots = [],          // optional faint points: [{t, v}]
    target = null,      // optional 2-pt reference line: [{t, v}, {t, v}]
    unit = '',
    color = 'var(--color-accent)',
    height = 200,
    yDecimals = 1,
    // When set, the axis is built so this value always lands exactly on a gridline — used by the
    // adherence chart so the 100% reference line coincides with a label instead of floating
    // between two arbitrary ones.
    yAnchor = null
  } = $props();

  // "Nice numbers": steps of 1, 2, 2.5, 5 or 10 x 10^k, so labels read 80/90/100 rather than
  // whatever the data range divided by four happens to produce. With an anchor, only steps that
  // divide it are eligible.
  function niceStep(range, target, anchor) {
    if (!(range > 0)) return 1;
    const raw = range / target;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const cands = [1, 2, 2.5, 5, 10].map((m) => m * mag);
    const ok = anchor == null
      ? cands
      : cands.filter((st) => Math.abs(anchor / st - Math.round(anchor / st)) < 1e-9);
    const usable = ok.length ? ok : cands;
    return usable.reduce((best, st) => (Math.abs(st - raw) < Math.abs(best - raw) ? st : best), usable[0]);
  }

  // The SVG renders at roughly 1:1 with these user units, so font-size here is close to real
  // pixels; anything much below 12 is unreadable on a phone.
  //
  // Short charts (the per-site measurement strips) can't carry the same type or the same number
  // of gridlines — four 14px labels inside a 70px box would overlap — so both scale with height.
  const PAD_L = 46, PAD_R = 12;
  let H = $derived(height);

  // The viewBox width tracks the real container width so the chart FILLS its card. A fixed width
  // would letterbox it on a phone. Matching the two means scale is exactly 1: no distortion, and
  // font-size stays true pixels.
  let boxW = $state(0);
  const W = $derived(Math.max(280, Math.round(boxW) || 340));
  const compact = $derived(H < 140);
  const AXIS_FONT = $derived(compact ? 12 : 14);
  const PAD_T = $derived(compact ? 12 : 16);
  const PAD_B = $derived(compact ? 22 : 30);
  const TICKS = $derived(compact ? 2 : 3);   // target divisions; the nice step decides the rest
  let hoverX = $state(null);

  const geom = $derived.by(() => {
    if (series.length < 2) return null;
    const ts = series.map((p) => p.t);
    const t0 = Math.min(...ts), t1 = Math.max(...ts);
    const tspan = Math.max(1, t1 - t0);
    const allV = [...series.map((p) => p.v), ...dots.map((p) => p.v), ...(target ? target.map((p) => p.v) : [])];
    let lo = Math.min(...allV), hi = Math.max(...allV);
    if (yAnchor != null) { lo = Math.min(lo, yAnchor); hi = Math.max(hi, yAnchor); }
    // A flat series has zero range and would divide by zero; give it something to sit inside.
    if (hi - lo < 1e-9) { const b = Math.abs(hi) * 0.05 || 1; lo -= b; hi += b; }

    // Snap the axis out to whole steps rather than padding by a percentage, so every gridline is
    // a round number and the top and bottom labels aren't arbitrary.
    const step = niceStep(hi - lo, TICKS, yAnchor);
    const mn = Math.floor(lo / step) * step;
    const mx = Math.ceil(hi / step) * step;

    const x = (t) => PAD_L + ((t - t0) / tspan) * (W - PAD_L - PAD_R);
    const y = (v) => PAD_T + (1 - (v - mn) / (mx - mn)) * (H - PAD_T - PAD_B);
    // Decimals come from the step's own precision, not its magnitude. Using log10 would round a
    // 2.5 step to whole numbers and print 47.5/50/52.5 as "48 · 50 · 53" — gridlines that
    // aren't evenly spaced by their own labels.
    const dp = (String(+step.toFixed(10)).split('.')[1] || '').length;
    const ticks = [];
    for (let v = mn; v <= mx + step / 1000; v += step) {
      ticks.push({ label: (+v.toFixed(6)).toFixed(dp), y: y(v) });
    }
    const line = series.map((p) => `${x(p.t)},${y(p.v)}`).join(' ');
    const area = `${x(series[0].t)},${y(mn)} ${line} ${x(series[series.length - 1].t)},${y(mn)}`;
    const tgt = target ? target.map((p) => `${x(p.t)},${y(p.v)}`).join(' ') : null;
    const xticks = [t0, (t0 + t1) / 2, t1].map((t) => ({ t, x: x(t) }));
    return { x, y, mn, mx, ticks, line, area, tgt, xticks, dotPts: dots.map((p) => ({ cx: x(p.t), cy: y(p.v) })) };
  });

  const fmt = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const hover = $derived.by(() => {
    if (hoverX == null || !geom || series.length < 2) return null;
    let best = series[0], bd = Infinity;
    for (const p of series) { const d = Math.abs(geom.x(p.t) - hoverX); if (d < bd) { bd = d; best = p; } }
    return { p: best, cx: geom.x(best.t), cy: geom.y(best.v) };
  });

  function move(e) {
    const r = e.currentTarget.getBoundingClientRect();
    hoverX = ((e.clientX - r.left) / r.width) * W;
  }
</script>

{#if !geom}
  <div class="text-sm text-[var(--color-muted)] text-center" style={`height:${height}px;display:flex;align-items:center;justify-content:center`}>Log at least 2 entries to see the trend.</div>
{:else}
  <div bind:clientWidth={boxW} class="w-full">
  <svg viewBox={`0 0 ${W} ${H}`} class="w-full select-none" style={`height:${H}px;touch-action:pan-y`}
       onpointermove={move} onpointerdown={move} onpointerleave={() => (hoverX = null)} role="img" aria-label="trend chart">
    <defs>
      <linearGradient id="lc-fill-{color.replace(/[^a-z0-9]/gi, '')}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color={color} stop-opacity="0.30" />
        <stop offset="100%" stop-color={color} stop-opacity="0" />
      </linearGradient>
    </defs>
    {#each geom.ticks as tk}
      <line x1={PAD_L} x2={W - PAD_R} y1={tk.y} y2={tk.y} stroke="var(--color-border)" stroke-width="0.5" />
      <text x="2" y={tk.y + 5} font-size={AXIS_FONT} fill="#ffffff">{tk.label}</text>
    {/each}
    {#each geom.xticks as xt, i}
      <!-- Anchor the outer labels inward. Centred, the last date would run past the viewBox edge
           and be clipped by the SVG viewport. -->
      <text x={xt.x} y={H - 8} font-size={AXIS_FONT} fill="#ffffff"
            text-anchor={i === 0 ? 'start' : i === geom.xticks.length - 1 ? 'end' : 'middle'}>{fmt(xt.t)}</text>
    {/each}
    {#if geom.tgt}<polyline points={geom.tgt} fill="none" stroke="var(--color-good)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.75" />{/if}
    <polygon points={geom.area} fill={`url(#lc-fill-${color.replace(/[^a-z0-9]/gi, '')})`} />
    <polyline points={geom.line} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    <!-- Individual readings: pure white at full opacity. Dimmer dots are hard to pick out
         against the filled area under the trend line. -->
    {#each geom.dotPts as d}<circle cx={d.cx} cy={d.cy} r="2.1" fill="#ffffff" />{/each}
    {#if hover}
      <line x1={hover.cx} x2={hover.cx} y1={PAD_T} y2={H - PAD_B} stroke="var(--color-text)" stroke-width="0.5" opacity="0.4" />
      <circle cx={hover.cx} cy={hover.cy} r="3.5" fill={color} stroke="var(--color-bg)" stroke-width="1.5" />
      <g transform={`translate(${Math.min(Math.max(hover.cx, 62), W - 62)}, 9)`}>
        <rect x="-60" y="-2" width="120" height="21" rx="5" fill="var(--color-surface-2)" />
        <text x="0" y="13" font-size={AXIS_FONT} fill="#ffffff" text-anchor="middle">{fmt(hover.p.t)} · {hover.p.v.toFixed(yDecimals)}{unit}</text>
      </g>
    {/if}
  </svg>
  </div>
{/if}
