import { alive } from '$lib/server/lifetime.js';

export function GET() { alive(false); return new Response(null, { status: 204 }); }
export function POST({ url }) { alive(url.searchParams.has('bye')); return new Response(null, { status: 204 }); }
