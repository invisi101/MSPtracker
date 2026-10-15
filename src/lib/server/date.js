// Local date (the machine's or container's TZ) as YYYY-MM-DD — used for "today" everywhere server-side.
export const todayStr = () => new Date().toLocaleDateString('en-CA');
export const shiftDay = (isoDate, days) => {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
};
