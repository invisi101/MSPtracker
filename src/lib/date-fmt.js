/**
 * Date formatting for the pages.
 *
 * Every date in the database is a LOCAL calendar date ('YYYY-MM-DD', written with
 * toLocaleDateString('en-CA')). `new Date('2026-08-12')` parses that as UTC midnight, which
 * renders as the previous day anywhere west of UTC — so every parse here appends 'T00:00:00' to
 * pin it to local midnight instead.
 *
 * Pages use these rather than formatting dates themselves, so they can't drift into the UTC form
 * or disagree with each other.
 */
const local = (d) => new Date(d + 'T00:00:00');

/** Epoch ms at local midnight — what the charts plot against. */
export const ts = (d) => local(d).getTime();

/** "12 Aug" */
export const dayMonth = (d) =>
  local(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** "Wed 12 Aug" */
export const dowDayMonth = (d) =>
  local(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** "12 Aug 26" */
export const dayMonthYear = (d) =>
  local(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });

/** "Wed 12 Aug 26" */
export const dowDayMonthYear = (d) =>
  local(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });

/** "12 August 2026" — takes a Date, not a string, for the plan-line endpoints. */
export const fullDate = (dateObj) =>
  dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 Aug – 15 Aug" */
export const range = (a, b) => `${dayMonth(a)} – ${dayMonth(b)}`;

/**
 * "12:53" out of a stored 'YYYY-MM-DD HH:MM:SS'.
 *
 * Sliced rather than parsed: the space form isn't reliably parsed by Date across browsers, and
 * the value is already local (finishSession writes datetime('now','localtime')).
 */
export const clockTime = (stamp) => (stamp ?? '').slice(11, 16);
