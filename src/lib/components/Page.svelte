<script>
  let { title, subtitle = '', meta = '', children } = $props();
</script>

<div class="space-y-4">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">{title}</h1>
    {#if subtitle}<p class="text-sm text-[var(--color-muted)] mt-0.5">{subtitle}</p>{/if}
    {#if meta}<p class="text-sm font-medium text-[var(--color-accent)] mt-0.5">{meta}</p>{/if}
  </div>
  {@render children?.()}
</div>
