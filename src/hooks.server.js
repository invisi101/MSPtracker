import { redirect } from '@sveltejs/kit';
import { getProfile } from '$lib/server/repos/profile.js';

/**
 * Page HTML must never be served from a browser cache.
 *
 * SvelteKit sends an ETag on page responses but no Cache-Control. With no explicit freshness
 * directive, browsers fall back to *heuristic* caching — and Safari/iOS, especially for an
 * installed standalone PWA, will happily reuse a stored page without revalidating. The symptom
 * is the app showing values that were correct hours ago (e.g. a profile edit that saved fine on
 * the server but still reads the old number on screen).
 *
 * Hashed build assets are immutable and content-addressed, so they keep their own caching; this
 * only marks the dynamic page/data responses as no-store.
 */
export async function handle({ event, resolve }) {
  // First run: until the welcome screen has been completed, every page leads there. Health checks,
  // backups, uploads and build assets pass straight through.
  const path = event.url.pathname;
  const open = path.startsWith('/welcome') || path === '/health' || path.startsWith('/api/')
    || path.startsWith('/_app/') || path.startsWith('/uploads/') || /\.[a-z0-9]+$/i.test(path);
  if (!open) {
    const done = !!getProfile()?.setup_done;
    if (!done) redirect(303, '/welcome');
  } else if (path.startsWith('/welcome') && event.request.method === 'GET' && getProfile()?.setup_done) {
    redirect(303, '/');
  }

  const response = await resolve(event);

  const isPage = response.headers.get('x-sveltekit-page') === 'true';
  const isData = event.url.pathname.endsWith('__data.json'); // client-side navigation payloads
  const isAction = event.request.method !== 'GET';

  if (isPage || isData || isAction) {
    response.headers.set('cache-control', 'no-store, must-revalidate');
  }
  return response;
}
