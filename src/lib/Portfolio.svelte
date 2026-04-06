<script lang="ts">
  import store, { getJournal } from '../store'

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const snippet = (value = '', max = 88, fallback = 'No thesis logged yet.') => {
    const clean = value.trim()
    if (!clean) return fallback
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
  }

  $: positions = Object.entries($store.portfolio)
  $: enriched = positions
    .map(([ticker, position]) => {
      const price = $store.prices[ticker] || 0
      const value = position.shares * price
      const gain = (price - position.avgPrice) * position.shares
      const gainPct = position.avgPrice ? ((price - position.avgPrice) / position.avgPrice) * 100 : 0
      const journal = getJournal(ticker, $store.journals)
      return { ticker, ...position, price, value, gain, gainPct, journal }
    })
    .sort((a, b) => b.value - a.value)

  $: total = enriched.reduce((sum, position) => sum + position.value, 0)
  $: pl = enriched.reduce((sum, position) => sum + position.gain, 0)
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-4 flex items-center justify-between gap-3">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Portfolio</p>
      <h2 class="mt-1 text-lg font-semibold text-white">Open positions</h2>
    </div>
    <div class="text-right">
      <div class="text-xs text-slate-500">Total market value</div>
      <div class="text-lg font-semibold text-white">{money(total)}</div>
      <div class:text-emerald-400={pl >= 0} class:text-rose-400={pl < 0} class="text-sm font-medium">
        {pl >= 0 ? '+' : ''}{money(pl)}
      </div>
    </div>
  </div>

  {#if enriched.length === 0}
    <div class="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-500">
      No positions yet. Pull a quote and place a paper trade when you're ready to start the book.
    </div>
  {:else}
    <div class="space-y-3">
      {#each enriched as position}
        <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="text-lg font-semibold text-white">{position.ticker}</div>
                <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs text-sky-300">{position.journal.setupStatus}</span>
                <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs text-emerald-300">{position.journal.conviction}</span>
                <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs text-violet-300">{position.journal.priority}</span>
              </div>
              <div class="mt-1 text-sm text-slate-500">{position.shares} shares · avg {money(position.avgPrice)}</div>
              <div class="mt-2 max-w-xl text-sm leading-6 text-slate-300">{snippet(position.journal.thesisSummary || position.journal.thesis)}</div>
              <div class="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                <div class="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <span class="text-slate-500">Trigger:</span> {snippet(position.journal.triggerSummary || position.journal.entryRationale, 60, 'No trigger saved yet.')}
                </div>
                <div class="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                  <span class="text-slate-500">Invalidation:</span> {snippet(position.journal.invalidationSummary || position.journal.riskPlan, 60, 'No invalidation saved yet.')}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-white">{money(position.value)}</div>
              <div class:text-emerald-400={position.gain >= 0} class:text-rose-400={position.gain < 0} class="text-sm font-medium">
                {position.gain >= 0 ? '+' : ''}{money(position.gain)}
                <span class="text-xs opacity-80">({position.gainPct >= 0 ? '+' : ''}{position.gainPct.toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div class="text-slate-500">Last price</div>
              <div class="mt-1 font-medium text-white">{money(position.price)}</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div class="text-slate-500">Exposure</div>
              <div class="mt-1 font-medium text-white">{total > 0 ? ((position.value / total) * 100).toFixed(1) : '0.0'}%</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div class="text-slate-500">Cost basis</div>
              <div class="mt-1 font-medium text-white">{money(position.avgPrice * position.shares)}</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
              <div class="text-slate-500">Unrealized</div>
              <div class:!text-emerald-400={position.gain >= 0} class:!text-rose-400={position.gain < 0} class="mt-1 font-medium text-white">
                {position.gain >= 0 ? '+' : ''}{money(position.gain)}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
