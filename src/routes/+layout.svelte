<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  let { children } = $props();

  // Tell the app this page is still open (it stops itself when run from the desktop launchers and
  // every page has gone; see lib/server/lifetime.js). Harmless when not in desktop mode.
  onMount(() => {
    const ping = () => fetch('/api/alive', { cache: 'no-store' }).catch(() => {});
    ping();
    const timer = setInterval(ping, 3000);
    const bye = () => navigator.sendBeacon?.('/api/alive?bye');
    window.addEventListener('pagehide', bye);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', bye); };
  });

  // The nav bar is sticky, so anything else that wants to stick has to know how tall it is —
  // and its height moves with the phone's safe-area inset, which CSS alone can't add to a
  // `top` value here. Measured once and published as --header-h for the rest of the app
  // (the Training rest timer sticks to it).
  let headerH = $state(0);

  const tabs = [
    { href: '/',          label: 'Home',      icon: 'home' },
    { href: '/nutrition', label: 'Nutrition', icon: 'food' },
    { href: '/training',  label: 'Training',  icon: 'dumbbell' },
    { href: '/progress',  label: 'Progress',  icon: 'chart' },
    { href: '/chef',      label: 'Chef',      icon: 'chef' },
    { href: '/assistant', label: 'Assistant', icon: 'chat' }
  ];

  // The welcome screen stands alone: nothing to navigate to until the profile exists.
  const welcome = $derived($page.url.pathname.startsWith('/welcome'));

  const active = (href) =>
    href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
</script>

<div class="min-h-screen flex flex-col" style="--header-h:{headerH}px">
  <header bind:clientHeight={headerH} class="sticky top-0 z-20 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-border)]"
          style="padding-top: env(safe-area-inset-top)">
    <div class="max-w-2xl mx-auto px-4 h-13 flex items-center gap-2 py-2.5">
      <svg viewBox="0 0 512 512" class="w-7 h-7 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="hdr-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="0.55" stop-color="#f59e0b"/><stop offset="1" stop-color="#c2410c"/></linearGradient>
        <linearGradient id="hdr-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="0.5" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/></linearGradient>
        <linearGradient id="hdr-collar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#0284c7"/></linearGradient>
      </defs>
        
        <path d="M 44 284 Q 256 212 468 284" fill="none" stroke="url(#hdr-steel)" stroke-width="22" stroke-linecap="round"/>
        <rect x="224" y="237" width="5" height="22" fill="#475569" opacity="0.55"/><rect x="238" y="237" width="5" height="22" fill="#475569" opacity="0.55"/><rect x="269" y="237" width="5" height="22" fill="#475569" opacity="0.55"/><rect x="283" y="237" width="5" height="22" fill="#475569" opacity="0.55"/>
        <g transform="translate(0 4) rotate(-9 150 256)">
        <rect x="58" y="150" width="46" height="212" rx="13" fill="url(#hdr-plate)"/>
        <rect x="108" y="104" width="58" height="304" rx="15" fill="url(#hdr-plate)"/>
        <rect x="66" y="164" width="7" height="184" rx="3.5" fill="#fff7d6" opacity="0.55"/>
        <rect x="117" y="120" width="8" height="272" rx="4" fill="#fff7d6" opacity="0.55"/>
        <rect x="170" y="214" width="24" height="84" rx="7" fill="url(#hdr-collar)"/>
        </g>
        <g transform="translate(0 4) rotate(9 362 256)">
        <rect x="408" y="150" width="46" height="212" rx="13" fill="url(#hdr-plate)"/>
        <rect x="346" y="104" width="58" height="304" rx="15" fill="url(#hdr-plate)"/>
        <rect x="439" y="164" width="7" height="184" rx="3.5" fill="#fff7d6" opacity="0.55"/>
        <rect x="387" y="120" width="8" height="272" rx="4" fill="#fff7d6" opacity="0.55"/>
        <rect x="318" y="214" width="24" height="84" rx="7" fill="url(#hdr-collar)"/>
        </g>
      </svg>
      <span class="font-semibold tracking-tight text-lg text-[var(--color-text)]">MSP Tracker</span>
      
      {#if !welcome}
      <a href="/settings" class="ml-auto text-[var(--color-muted)] p-1" aria-label="Settings"
         class:text-[var(--color-accent)]={$page.url.pathname.startsWith('/settings')}>
        <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </a>
      {/if}
    </div>

    {#if !welcome}
    <nav class="max-w-2xl mx-auto grid grid-cols-6">
      {#each tabs as t}
        <a href={t.href}
           class="relative flex flex-col items-center justify-center gap-1 py-2 min-h-[52px] text-[11px] font-medium transition-colors
                  {active(t.href) ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}"
           aria-current={active(t.href) ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" class="w-[22px] h-[22px]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            {#if t.icon === 'home'}
              <path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>
            {:else if t.icon === 'food'}
              <path d="M4 3v7a3 3 0 0 0 6 0V3"/><path d="M7 3v18"/><path d="M17 3c-1.5 0-3 1.5-3 5s1.5 5 3 5"/><path d="M17 3v18"/>
            {:else if t.icon === 'dumbbell'}
              <path d="M6 7v10M4 9v6M18 7v10M20 9v6M6 12h12"/>
            {:else if t.icon === 'chart'}
              <path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>
            {:else if t.icon === 'chef'}
              <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/>
            {:else}
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            {/if}
          </svg>
          <span>{t.label}</span>
          {#if active(t.href)}
            <span class="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-[var(--color-accent)]"></span>
          {/if}
        </a>
      {/each}
    </nav>
    {/if}
  </header>

  <main class="flex-1 w-full max-w-2xl mx-auto px-4 py-5"
        style="padding-bottom: calc(2rem + env(safe-area-inset-bottom))">
    {@render children()}
  </main>
</div>
