import { buildExportHtml } from '$lib/server/export-html.js';

export function GET({ url }) {
  const html = buildExportHtml();
  const stamp = new Date().toLocaleDateString('en-CA');
  // ?view opens it in the browser instead of downloading — handy for a quick look.
  const inline = url.searchParams.has('view');
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="msp-tracker-export-${stamp}.html"`
    }
  });
}
