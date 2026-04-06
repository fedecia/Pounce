<script lang="ts">
  import store from '../store'

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

  const pct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

  $: positions = Object.entries($store.portfolio)
  $: marketValue = positions.reduce((sum, [ticker, position]) => sum + position.shares * ($store.prices[ticker] || 0), 0)
  $: costBasis = positions.reduce((sum, [, position]) => sum + position.shares * position.avgPrice, 0)
  $: equity = $store.cash + marketValue
  $: dayPnL = Object.entries($store.portfolio).reduce((sum, [ticker, position]) => {
    const price = $store.prices[ticker] || 0
    const trend = $store.trend[ticker]
    const previousClose = trend ? price - trend.change : position.avgPrice
    return sum + (price - previousClose) * position.shares
  }, 0)
  $: totalPnL = marketValue - costBasis
  $: totalReturn = $store.startingCash ? ((equity - $store.startingCash) / $store.startingCash) * 100 : 0
  $: largestPosition = positions
    .map(([ticker, position]) => ({ ticker, value: position.shares * ($store.prices[ticker] || 0) }))
    .sort((a, b) => b.value - a.value)[0]
  $: cashWeight = equity > 0 ? ($store.cash / equity) * 100 : 0
  $: investedWeight = equity > 0 ? (marketValue / equity) * 100 : 0
  $: tradeCount = $store.trades.length
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-5 flex items-start justify-between gap-3">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Account center</p>
      <h2 class="mt-1 text-lg font-semibold text-white">Performance &amp; allocation</h2>
    </div>
    <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-right">
      <div class="text-xs text-slate-500">Net liquidation</div>
      <div class="text-lg font-semibold text-white">{money(equity)}</div>
    </div>
  </div>

  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Day P&amp;L</div>
      <div class:!text-emerald-400={dayPnL >= 0} class:!text-rose-400={dayPnL < 0} class="mt-2 text-xl font-semibold text-white">
        {dayPnL >= 0 ? '+' : ''}{money(dayPnL)}
      </div>
      <div class="mt-1 text-xs text-slate-500">Mark-to-market move</div>
    </div>
    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Total return</div>
      <div class:!text-emerald-400={totalReturn >= 0} class:!text-rose-400={totalReturn < 0} class="mt-2 text-xl font-semibold text-white">
        {pct(totalReturn)}
      </div>
      <div class="mt-1 text-xs text-slate-500">Since starting capital</div>
    </div>
    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Open risk</div>
      <div class="mt-2 text-xl font-semibold text-white">{positions.length}</div>
      <div class="mt-1 text-xs text-slate-500">Funded line items</div>
    </div>
    <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Trades booked</div>
      <div class="mt-2 text-xl font-semibold text-white">{tradeCount}</div>
      <div class="mt-1 text-xs text-slate-500">Recent executions stored</div>
    </div>
  </div>

  <div class="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
    <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-white">Capital mix</div>
          <div class="text-xs text-slate-500">Cash vs invested exposure</div>
        </div>
        <div class="text-right text-xs text-slate-500">
          <div>Cash {cashWeight.toFixed(1)}%</div>
          <div>Invested {investedWeight.toFixed(1)}%</div>
        </div>
      </div>
      <div class="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
        <div class="flex h-full">
          <div class="bg-sky-500" style={`width:${cashWeight}%`}></div>
          <div class="bg-emerald-400" style={`width:${investedWeight}%`}></div>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div class="text-slate-500">Cash reserve</div>
          <div class="mt-1 font-medium text-white">{money($store.cash)}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <div class="text-slate-500">Invested capital</div>
          <div class="mt-1 font-medium text-white">{money(marketValue)}</div>
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="text-sm font-medium text-white">Risk snapshot</div>
      <div class="mt-4 space-y-3 text-sm">
        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <span class="text-slate-500">Largest position</span>
          <span class="font-medium text-white">{largestPosition ? `${largestPosition.ticker} · ${money(largestPosition.value)}` : 'No exposure'}</span>
        </div>
        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <span class="text-slate-500">Cost basis</span>
          <span class="font-medium text-white">{money(costBasis)}</span>
        </div>
        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <span class="text-slate-500">Unrealized P&amp;L</span>
          <span class:!text-emerald-400={totalPnL >= 0} class:!text-rose-400={totalPnL < 0} class="font-medium text-white">{totalPnL >= 0 ? '+' : ''}{money(totalPnL)}</span>
        </div>
        <div class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <span class="text-slate-500">Selected symbol</span>
          <span class="font-medium text-white">{$store.selectedSymbol}</span>
        </div>
      </div>
    </div>
  </div>
</div>
