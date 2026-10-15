import { allSessions, loggedExerciseNames, exerciseHistory } from '$lib/server/repos/training.js';

export function load({ url }) {
  const view = url.searchParams.get('view') || 'sessions';
  const ex = url.searchParams.get('ex') || '';
  // The programme day, so a lift trained on two days keeps two separate histories. Absent means
  // "every day", which is what links without it (e.g. from the sessions view) want.
  const day = url.searchParams.get('day') || '';
  return {
    view,
    ex,
    day,
    sessions: allSessions(),
    exercises: loggedExerciseNames(),
    exerciseSessions: ex ? exerciseHistory(ex, day || null) : []
  };
}
