<script lang="ts">
  import { onMount } from 'svelte'
  import store, { getJournal, setSelectedTimeframe } from '../store'
  import { fetchChartSeries } from '../alpha'
  import type { ChartSeries, Timeframe } from '../types'

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']
  const CHART_WIDTH = 520
  const CHART_HEIGHT = 180
  const MIN_WINDOW_POINTS = 12

  type OverlayLevel = {
    key: string
    label: string
    value: number
    tone: 'trigger' | 'risk' | 'alert' | 'position'
  }

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
  let visibleCount = 0
  let viewportStart = 0
  let dragStartX = 0
  let dragStartViewport = 0
  let dragPointerId: number | null = null
  let hoveredIndex: number | null = null
  let chartElement: HTMLDivElement | null = null

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

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
  }

  function maxViewportStart(totalPoints: number, count: number) {
    return Math.max(totalPoints - count, 0)
  }

  function normalizeViewport(totalPoints: number) {
    const defaultVisible = Math.min(Math.max(Math.ceil(totalPoints * 0.7), MIN_WINDOW_POINTS), totalPoints)
    visibleCount = clamp(visibleCount || defaultVisible, Math.min(MIN_WINDOW_POINTS, totalPoints), totalPoints)
    viewportStart = clamp(viewportStart, 0, maxViewportStart(totalPoints, visibleCount))
    hoveredIndex = null
  }

  function resetViewport() {
    normalizeViewport(series.length)
    viewportStart = Math.max(series.length - visibleCount, 0)
  }

  function setVisibleCount(nextCount: number) {
    const totalPoints = series.length
    if (!totalPoints) return

    const clampedCount = clamp(Math.round(nextCount), Math.min(MIN_WINDOW_POINTS, totalPoints), totalPoints)
    if (clampedCount === visibleCount) return

    const hoveredOffset = hoveredLocalIndex ?? Math.floor(visibleCount / 2)
    const hoveredAbsoluteIndex = clamp(viewportStart + hoveredOffset, 0, totalPoints - 1)
    visibleCount = clampedCount
    viewportStart = clamp(hoveredAbsoluteIndex - Math.floor(visibleCount / 2), 0, maxViewportStart(totalPoints, visibleCount))
  }

  function zoomIn() {
    setVisibleCount(visibleCount * 0.8)
  }

  function zoomOut() {
    setVisibleCount(visibleCount * 1.25)
  }

  function panBy(direction: -1 | 1) {
    const step = Math.max(1, Math.round(visibleCount * 0.3))
    viewportStart = clamp(viewportStart + direction * step, 0, maxViewportStart(series.length, visibleCount))
  }

  function buildPath(points: number[]) {
    if (points.length === 0) return ''
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = Math.max(max - min, 1)

    return points
      .map((point, index) => {
        const x = (index / Math.max(points.length - 1, 1)) * CHART_WIDTH
        const y = CHART_HEIGHT - ((point - min) / range) * CHART_HEIGHT
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      })
      .join(' ')
  }

  function pointX(index: number, total: number) {
    return total <= 1 ? CHART_WIDTH : (index / (total - 1)) * CHART_WIDTH
  }

  function pointY(value: number, min: number, max: number) {
    const range = Math.max(max - min, 1)
    return CHART_HEIGHT - ((value - min) / range) * CHART_HEIGHT
  }

  function updateHover(clientX: number) {
    if (!chartElement || visibleSeries.length === 0) return
    const rect = chartElement.getBoundingClientRect()
    const relativeX = clamp(clientX - rect.left, 0, rect.width || 1)
    const progress = rect.width ? relativeX / rect.width : 0
    hoveredIndex = clamp(Math.round(progress * Math.max(visibleSeries.length - 1, 0)), 0, visibleSeries.length - 1)
  }

  function startDrag(event: PointerEvent) {
    if (visibleSeries.length <= 1) return
    dragPointerId = event.pointerId
    dragStartX = event.clientX
    dragStartViewport = viewportStart
    chartElement?.setPointerCapture(event.pointerId)
    updateHover(event.clientX)
  }

  function onPointerMove(event: PointerEvent) {
    updateHover(event.clientX)
    if (dragPointerId !== event.pointerId || !chartElement) return

    const rect = chartElement.getBoundingClientRect()
    const pixelsPerPoint = rect.width / Math.max(visibleSeries.length - 1, 1)
    if (!pixelsPerPoint) return

    const pointShift = Math.round((dragStartX - event.clientX) / pixelsPerPoint)
    viewportStart = clamp(dragStartViewport + pointShift, 0, maxViewportStart(series.length, visibleCount))
  }

  function endDrag(event?: PointerEvent) {
    if (event && dragPointerId === event.pointerId) {
      chartElement?.releasePointerCapture(event.pointerId)
    }
    dragPointerId = null
  }

  function handleWheel(event: WheelEvent) {
    if (!series.length) return
    event.preventDefault()
    if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
      event.deltaY > 0 ? zoomOut() : zoomIn()
      return
    }

    const delta = event.deltaX > 0 ? 1 : -1
    panBy(delta as -1 | 1)
  }

  function timeframeHint(timeframe: Timeframe) {
    switch (timeframe) {
      case '1D':
        return 'Focus on intraday structure.'
      case '1W':
        return 'Good for seeing follow-through versus noise.'
      case '1M':
        return 'Useful for swing structure and pullbacks.'
      case '3M':
        return 'Helps spot regime shifts, not just one move.'
      case '1Y':
        return 'Best for broad context and trend character.'
    }
  }

  function snippet(value: string, fallback: string, length = 84) {
    const clean = value.trim()
    if (!clean) return fallback
    return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean
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
  $: normalizeViewport(series.length)
  $: visibleSeries = series.slice(viewportStart, viewportStart + visibleCount)
  $: latest = $store.prices[symbol] || series[series.length - 1]
  $: first = series[0]
  $: high = Math.max(...series)
  $: low = Math.min(...series)
  $: visibleHigh = Math.max(...visibleSeries)
  $: visibleLow = Math.min(...visibleSeries)
  $: volume = seriesState.symbol === symbol && seriesState.timeframe === timeframe ? seriesState.volume : 0
  $: change = latest - first
  $: changePct = first ? (change / first) * 100 : 0
  $: visibleStartValue = visibleSeries[0] ?? first
  $: visibleEndValue = visibleSeries[visibleSeries.length - 1] ?? latest
  $: visibleChange = visibleEndValue - visibleStartValue
  $: visibleChangePct = visibleStartValue ? (visibleChange / visibleStartValue) * 100 : 0
  $: chartPath = buildPath(visibleSeries)
  $: areaPath = chartPath ? `${chartPath} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z` : ''
  $: trendClass = change >= 0 ? 'text-emerald-400' : 'text-rose-400'
  $: rangeLabel = timeframe === '1D' ? 'Open' : timeframe === '1W' ? 'Week open' : timeframe === '1M' ? 'Month open' : timeframe === '3M' ? 'Quarter open' : 'Year open'
  $: sourceLabel = seriesState.source === 'live' ? 'quote-derived history' : 'quote-anchored fallback'
  $: journal = getJournal(symbol, $store.journals)
  $: activeAlerts = ($store.alerts[symbol] ?? []).filter((alert) => alert.status === 'active').slice(0, 2)
  $: symbolTrades = $store.trades.filter((trade) => trade.ticker === symbol).slice(0, 3).reverse()
  $: zoomed = visibleCount < series.length
  $: hoveredLocalIndex = hoveredIndex == null ? visibleSeries.length - 1 : hoveredIndex
  $: hoveredAbsoluteIndex = clamp(viewportStart + hoveredLocalIndex, 0, Math.max(series.length - 1, 0))
  $: hoveredValue = visibleSeries[hoveredLocalIndex] ?? latest
  $: hoveredX = pointX(hoveredLocalIndex, Math.max(visibleSeries.length, 1))
  $: hoveredY = pointY(hoveredValue, visibleLow, visibleHigh)
  $: hoveredLabel = hoveredLocalIndex === visibleSeries.length - 1 ? 'Latest mark' : `Point ${hoveredAbsoluteIndex + 1}`
  $: overlayLevels = [
    journal.triggerSummary.trim() || journal.entryRationale.trim()
      ? { key: 'trigger', label: `Trigger · ${snippet(journal.triggerSummary || journal.entryRationale, 'Trigger')}`, value: visibleEndValue, tone: 'trigger' as const }
      : null,
    journal.invalidationSummary.trim() || journal.riskPlan.trim()
      ? { key: 'risk', label: `Risk · ${snippet(journal.invalidationSummary || journal.riskPlan, 'Risk')}`, value: visibleLow + (visibleHigh - visibleLow) * 0.18, tone: 'risk' as const }
      : null,
    activeAlerts[0]
      ? { key: activeAlerts[0].id, label: `Alert · ${activeAlerts[0].condition.startsWith('price') ? money(activeAlerts[0].target) : `${activeAlerts[0].target.toFixed(2)}%`}`, value: activeAlerts[0].condition.startsWith('price') ? activeAlerts[0].target : visibleEndValue, tone: 'alert' as const }
      : null,
    $store.portfolio[symbol]?.shares
      ? { key: 'position', label: `Avg cost · ${money($store.portfolio[symbol].avgPrice)}`, value: $store.portfolio[symbol].avgPrice, tone: 'position' as const }
      : null
  ].filter((level): level is OverlayLevel => Boolean(level && Number.isFinite(level.value) && level.value >= visibleLow && level.value <= visibleHigh))
  $: tradeMarkers = symbolTrades.map((trade, index) => ({
    id: trade.id,
    label: `${trade.side} ${trade.qty} @ ${money(trade.price)}`,
    side: trade.side,
    x: pointX(symbolTrades.length === 1 ? visibleSeries.length - 1 : Math.round((visibleSeries.length - 1) * (0.2 + (index / Math.max(symbolTrades.length - 1, 1)) * 0.6)), Math.max(visibleSeries.length, 1)),
    y: pointY(Math.min(Math.max(trade.price, visibleLow), visibleHigh), visibleLow, visibleHigh)
  }))
  $: viewportLabel = zoomed
    ? `Showing ${visibleCount} of ${series.length} points · drag to pan · wheel or buttons to zoom`
    : `Showing full ${timeframe} range · use wheel or buttons to inspect detail`
  $: zoomPercent = series.length ? Math.round((visibleCount / series.length) * 100) : 100
  $: thesisOverlay = {
    thesis: snippet(journal.thesisSummary || journal.thesis, 'No thesis line logged yet.'),
    trigger: snippet(journal.triggerSummary || journal.entryRationale, 'No trigger line logged yet.'),
    risk: snippet(journal.invalidationSummary || journal.riskPlan, 'No invalidation line logged yet.')
  }

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
      <div class="flex flex-wrap justify-end gap-2" data-testid="chart-controls">
        <button type="button" class="chart-control" on:click={() => panBy(-1)} aria-label="Pan chart left">← Pan</button>
        <button type="button" class="chart-control" on:click={zoomIn} aria-label="Zoom in chart">+ Zoom</button>
        <button type="button" class="chart-control" on:click={zoomOut} aria-label="Zoom out chart">− Zoom</button>
        <button type="button" class="chart-control" on:click={resetViewport} aria-label="Reset chart view">Reset</button>
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

  <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
    <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]" data-testid="market-decision-canvas">
        <div class="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
          <div class="text-[11px] uppercase tracking-[0.16em] text-cyan-300">Decision canvas overlay</div>
          <div class="mt-2">The chart carries the setup instead of making you mentally stitch together price, thesis, alert levels, and recent execution.</div>
        </div>
        <div class="grid gap-2 text-xs text-slate-300">
          <div class="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"><span class="text-slate-500">Thesis:</span> {thesisOverlay.thesis}</div>
          <div class="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"><span class="text-slate-500">Trigger:</span> {thesisOverlay.trigger}</div>
          <div class="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"><span class="text-slate-500">Risk:</span> {thesisOverlay.risk}</div>
        </div>
      </div>

      <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div data-testid="chart-viewport-label">{viewportLabel}</div>
        <div class="rounded-full border border-slate-700 px-3 py-1 text-slate-300">Zoom {zoomPercent}%</div>
      </div>
      <div
        bind:this={chartElement}
        class="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4"
        data-testid="interactive-chart"
        on:wheel={handleWheel}
        on:pointerdown={startDrag}
        on:pointermove={onPointerMove}
        on:pointerup={endDrag}
        on:pointerleave={() => {
          hoveredIndex = null
          endDrag()
        }}
      >
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} class="h-52 w-full select-none" data-testid="market-overview-chart">
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
            <line x1="0" y1="30" x2={CHART_WIDTH} y2="30" stroke="#1e293b" stroke-dasharray="6 6" />
            <line x1="0" y1="90" x2={CHART_WIDTH} y2="90" stroke="#1e293b" stroke-dasharray="6 6" />
            <line x1="0" y1="150" x2={CHART_WIDTH} y2="150" stroke="#1e293b" stroke-dasharray="6 6" />
            <path d={areaPath} fill="url(#area-gradient)" />
            {#each overlayLevels as level, index}
              {@const y = pointY(level.value, visibleLow, visibleHigh)}
              <line x1="0" y1={y} x2={CHART_WIDTH} y2={y} class={`overlay-line ${level.tone}`} />
              <rect x="312" y={Math.max(4, y - 12 - index * 2)} width="200" height="20" rx="10" class={`overlay-pill ${level.tone}`} />
              <text x="322" y={Math.max(18, y + 2 - index * 2)} class="overlay-text">{level.label}</text>
            {/each}
            <path d={chartPath} fill="none" stroke="url(#line-gradient)" stroke-width="4" stroke-linecap="round" />
            {#each tradeMarkers as marker}
              <line x1={marker.x} y1={CHART_HEIGHT} x2={marker.x} y2={marker.y} class={`trade-stem ${marker.side === 'BUY' ? 'buy' : 'sell'}`} />
              <circle cx={marker.x} cy={marker.y} r="5" class={`trade-dot ${marker.side === 'BUY' ? 'buy' : 'sell'}`} />
            {/each}
            {#if visibleSeries.length > 1}
              <line x1={hoveredX} y1="0" x2={hoveredX} y2={CHART_HEIGHT} stroke="rgba(148,163,184,0.45)" stroke-dasharray="4 4" />
            {/if}
            <circle cx={hoveredX} cy={hoveredY} r="5.5" fill="#0f172a" stroke="#7dd3fc" stroke-width="2.5" />
          </g>
        </svg>
        <div class="mt-3 flex justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>{zoomed ? 'Windowed view' : timeframe}</span>
          <span>{symbol} decision canvas</span>
          <span>{hoveredLabel}</span>
        </div>
      </div>
    </div>

    <div class="grid gap-3 text-sm">
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4" data-testid="chart-readout-card">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Viewport readout</div>
        <div class="mt-2 flex items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold text-white">{money(hoveredValue)}</div>
            <div class="mt-1 text-xs text-slate-500">{hoveredLabel}</div>
          </div>
          <div class={`text-right text-sm font-medium ${visibleChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid="chart-window-change">
            {visibleChange >= 0 ? '+' : ''}{money(visibleChange)}
            <div class="text-xs opacity-80">{visibleChangePct >= 0 ? '+' : ''}{visibleChangePct.toFixed(2)}%</div>
          </div>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div class="text-slate-500">Visible high</div>
            <div class="mt-1 font-medium text-white">{money(visibleHigh)}</div>
          </div>
          <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div class="text-slate-500">Visible low</div>
            <div class="mt-1 font-medium text-white">{money(visibleLow)}</div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4" data-testid="chart-overlay-legend">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Overlay legend</div>
        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          <span class="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">Trigger context</span>
          <span class="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-200">Invalidation watch</span>
          <span class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">Alert rail</span>
          <span class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">Avg cost</span>
        </div>
        <div class="mt-3 text-xs text-slate-400">Trade stems mark the most recent buys and sells for this symbol so execution sits on the same canvas as the setup.</div>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">How to use it</div>
        <div class="mt-2 space-y-2 text-slate-300">
          <div>• Drag the chart to pan through the current timeframe.</div>
          <div>• Use the wheel or zoom buttons to compress or expand the visible window.</div>
          <div>• Hover anywhere to inspect the local mark instead of only the last price.</div>
          <div>• Use the overlay lines as a planning layer, not decoration.</div>
        </div>
        <div class="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
          {timeframeHint(timeframe)}
        </div>
        <div class="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-3 text-xs text-slate-300">
          <div class="text-slate-500">Recent markers</div>
          {#if tradeMarkers.length}
            <ul class="mt-2 space-y-1">
              {#each tradeMarkers as marker}
                <li>{marker.label}</li>
              {/each}
            </ul>
          {:else}
            <div class="mt-2 text-slate-500">No trades logged yet for this symbol.</div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .selected {
    border-color: rgba(56, 189, 248, 0.45);
    color: rgb(186 230 253);
    background: rgba(15, 23, 42, 0.95);
  }

  .chart-control {
    border-radius: 9999px;
    border: 1px solid rgb(51 65 85 / 0.9);
    background: rgb(2 6 23 / 0.8);
    padding: 0.45rem 0.85rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: rgb(203 213 225 / 0.9);
    transition: 160ms ease;
  }

  .chart-control:hover {
    border-color: rgba(56, 189, 248, 0.45);
    color: white;
  }

  .overlay-line {
    stroke-width: 2;
    stroke-dasharray: 8 6;
    opacity: 0.9;
  }

  .overlay-line.trigger { stroke: #22d3ee; }
  .overlay-line.risk { stroke: #fb7185; }
  .overlay-line.alert { stroke: #f59e0b; }
  .overlay-line.position { stroke: #34d399; }

  .overlay-pill {
    stroke-width: 1;
  }

  .overlay-pill.trigger { fill: rgba(34, 211, 238, 0.16); stroke: rgba(34, 211, 238, 0.5); }
  .overlay-pill.risk { fill: rgba(251, 113, 133, 0.16); stroke: rgba(251, 113, 133, 0.5); }
  .overlay-pill.alert { fill: rgba(245, 158, 11, 0.16); stroke: rgba(245, 158, 11, 0.5); }
  .overlay-pill.position { fill: rgba(52, 211, 153, 0.16); stroke: rgba(52, 211, 153, 0.5); }

  .overlay-text {
    fill: #e2e8f0;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .trade-stem {
    stroke-width: 2;
    stroke-dasharray: 4 4;
    opacity: 0.75;
  }

  .trade-stem.buy { stroke: #34d399; }
  .trade-stem.sell { stroke: #fb7185; }
  .trade-dot.buy { fill: #34d399; }
  .trade-dot.sell { fill: #fb7185; }
</style>
