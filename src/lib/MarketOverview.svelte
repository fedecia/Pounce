<script lang="ts">
  import { onMount } from 'svelte'
  import store, { setSelectedTimeframe } from '../store'
  import { fetchChartSeries } from '../alpha'
  import type { ChartSeries, Timeframe } from '../types'

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']

  let seriesState: ChartSeries = {
    symbol: 'AAPL',
    timeframe: '1D',
    points: [0],
    volume: 0,
    source: 'fallback'
  }
  let loading = false
  let requestKey = ''
  let activeKey = ''

  async function loadSeries(symbol: string, timeframe: Timeframe) {
    const key = `${symbol}:${timeframe}`
    requestKey = key
    loading = true

    try {
      const next = await fetchChartSeries(symbol, timeframe)
      if (requestKey === key) seriesState = next
    } catch {
      // fetchChartSeries already degrades to a fallback series.
    } finally {
      if (requestKey === key) loading = false
    }
  }

  function buildPath(points: number[]) {
    if (points.length === 0) return ''
    const width = 520
    const height = 180
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = Math.max(max - min, 1)

    return points
      .map((point, index) => {
        const x = (index / Math.max(points.length - 1, 1)) * width
        const y = height - ((point - min) / range) * height
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }

  $: symbol = $store.selectedSymbol || 'AAPL'
  $: timeframe = $store.selectedTimeframe
  $: if (symbol && timeframe) {
    const nextKey = `${symbol}:${timeframe}`
    if (activeKey !== nextKey) {
      activeKey = nextKey
      loadSeries(symbol, timeframe)
    }
  }
  $: series = seriesState.symbol === symbol && seriesState.timeframe === timeframe && seriesState.points.length
    ? seriesState.points
    : [$store.prices[symbol] || $store.quotes[symbol] || 0].filter(Boolean)
  $: latest = $store.prices[symbol] || series[series.length - 1]
  $: first = series[0]
  $: high = Math.max(...series)
  $: low = Math.min(...series)
  $: volume = seriesState.symbol === symbol && seriesState.timeframe === timeframe ? seriesState.volume : 0
  $: change = latest - first
  $: changePct = first ? (change / first) * 100 : 0
  $: chartPath = buildPath(series)
  $: areaPath = chartPath ? `${chartPath} L 520 180 L 0 180 Z` : ''
  $: trendClass = change >= 0 ? 'text-emerald-400' : 'text-rose-400'
  $: rangeLabel = timeframe === '1D' ? 'Open' : timeframe === '1W' ? 'Week open' : timeframe === '1M' ? 'Month open' : timeframe === '3M' ? 'Quarter open' : 'Year open'
  $: sourceLabel = seriesState.source === 'live' ? 'quote-derived history' : 'quote-anchored fallback'

  onMount(() => {
    loadSeries(symbol, timeframe)
  })
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Market overview</p>
      <div class="mt-1 flex items-end gap-3">
        <h2 class="text-3xl font-semibold text-white">{symbol}</h2>
        <div class="pb-1 text-sm text-slate-500">{loading ? 'loading chart…' : sourceLabel}</div>
      </div>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <div class="text-4xl font-semibold text-white">{money(latest)}</div>
        <div class={`pb-1 text-sm font-medium ${trendClass}`}>
          {change >= 0 ? '+' : ''}{money(change)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div class="flex flex-wrap justify-end gap-2">
        {#each timeframes as option}
          <button
            on:click={() => setSelectedTimeframe(option)}
            class:selected={option === timeframe}
            class="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-sky-500/50 hover:text-sky-300"
          >
            {option}
          </button>
        {/each}
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div class="text-slate-500">{rangeLabel}</div>
          <div class="mt-1 font-medium text-white">{money(first)}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div class="text-slate-500">Range high</div>
          <div class="mt-1 font-medium text-white">{money(high)}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div class="text-slate-500">Range low</div>
          <div class="mt-1 font-medium text-white">{money(low)}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div class="text-slate-500">Volume</div>
          <div class="mt-1 font-medium text-white">{volume > 0 ? `${(volume / 1000000).toFixed(2)}M` : '—'}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
    <svg viewBox="0 0 520 180" class="h-52 w-full">
      <defs>
        <linearGradient id="line-gradient" x1="0" x2="1">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="#34d399" />
        </linearGradient>
        <linearGradient id="area-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(56,189,248,0.35)" />
          <stop offset="100%" stop-color="rgba(52,211,153,0.02)" />
        </linearGradient>
      </defs>
      <g>
        <line x1="0" y1="30" x2="520" y2="30" stroke="#1e293b" stroke-dasharray="6 6" />
        <line x1="0" y1="90" x2="520" y2="90" stroke="#1e293b" stroke-dasharray="6 6" />
        <line x1="0" y1="150" x2="520" y2="150" stroke="#1e293b" stroke-dasharray="6 6" />
        <path d={areaPath} fill="url(#area-gradient)" />
        <path d={chartPath} fill="none" stroke="url(#line-gradient)" stroke-width="4" stroke-linecap="round" />
      </g>
    </svg>
    <div class="mt-3 flex justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
      <span>{timeframe}</span>
      <span>{symbol} trend</span>
      <span>Latest mark</span>
    </div>
  </div>
</div>

<style>
  .selected {
    border-color: rgba(56, 189, 248, 0.45);
    color: rgb(186 230 253);
    background: rgba(15, 23, 42, 0.95);
  }
</style>
