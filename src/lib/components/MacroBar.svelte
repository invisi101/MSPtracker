<script>
  let { label, have = 0, target = 0, color = 'var(--color-accent)' } = $props();
  const pct = $derived(target > 0 ? Math.min(100, Math.round((have / target) * 100)) : 0);
</script>

<div>
  <div class="flex items-baseline justify-between text-sm">
    <span class="font-medium text-[var(--color-text)]">{label}</span>
    <span class="text-[var(--color-muted)]">
      <span class="text-[var(--color-text)] font-semibold">{Math.round(have)}</span>{#if target != null} / {Math.round(target)}{/if} g
    </span>
  </div>
  <div class="mt-1 h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
    <div class="h-full rounded-full transition-all" style="width:{pct}%; background:{color}"></div>
  </div>
</div>
