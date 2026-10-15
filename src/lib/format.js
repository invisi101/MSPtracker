// Duration/pace helpers shared by the server (parsing form input) and the pages (rendering).

/**
 * Parse a typed duration into seconds. Accepts what someone would actually type at the gym:
 *   "32"        -> 32 min          (bare number = minutes, decimals allowed: "32.5")
 *   "32:30"     -> 32 min 30 s
 *   "1:05:12"   -> 1 h 5 min 12 s  (hiking, long rides)
 * Returns null for anything empty or unparseable — callers treat that as "not recorded".
 */
export function parseDuration(input) {
  const s = (input ?? '').toString().trim();
  if (!s) return null;
  if (s.includes(':')) {
    const parts = s.split(':').map((p) => p.trim());
    if (parts.length > 3 || parts.some((p) => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null;
    const nums = parts.map(Number);
    // Right-aligned: [ss] / [mm,ss] / [hh,mm,ss]
    const [h, m, sec] = nums.length === 3 ? nums : nums.length === 2 ? [0, ...nums] : [0, 0, nums[0]];
    const total = h * 3600 + m * 60 + sec;
    return Number.isFinite(total) && total > 0 ? Math.round(total) : null;
  }
  const mins = Number(s);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  return Math.round(mins * 60);
}

/** Seconds -> "32:30", or "1:05:12" once it passes an hour. */
export function formatDuration(sec) {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return null;
  const s = Math.round(sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/** Seconds per km, or null when either side is missing. Lower is faster. */
export function paceSecPerKm(sec, km) {
  if (!sec || !km || km <= 0) return null;
  return sec / km;
}

/** "5:14 /km" */
export function formatPace(sec, km) {
  const p = paceSecPerKm(sec, km);
  return p == null ? null : `${formatDuration(p)} /km`;
}

/** One-line summary of a logged cardio entry, skipping whatever wasn't recorded. */
export function cardioSummary(entry) {
  const bits = [];
  const t = formatDuration(entry.duration_sec);
  if (t) bits.push(t);
  if (entry.distance_km) bits.push(`${entry.distance_km} km`);
  const p = formatPace(entry.duration_sec, entry.distance_km);
  if (p) bits.push(p);
  if (entry.rpe != null) bits.push(`RPE ${entry.rpe}`);
  // An entry with nothing recorded at all would render as an empty chip you couldn't tap to
  // remove, so give it something visible.
  return bits.length ? bits.join(' · ') : 'logged';
}
