// The week's workouts in the training spreadsheet's own cell format, ready to copy row by row.
// Linked from the Saturday check-in card; ?date= shows any week, for the earlier half of a
// fortnightly check-in or a look back.
import { todayStr, shiftDay } from '$lib/server/date.js';
import { trainingWeek } from '$lib/server/repos/checkin.js';

export function load({ url }) {
  const asked = url.searchParams.get('date') ?? '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : todayStr();
  const week = trainingWeek(date);
  return { week, prevWeek: shiftDay(week.start, -7), nextWeek: shiftDay(week.start, 7) };
}
