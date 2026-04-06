<script lang="ts">
  import { onMount } from 'svelte'
  import QuotePanel from './lib/QuotePanel.svelte'
  import Portfolio from './lib/Portfolio.svelte'
  import ActivityFeed from './lib/ActivityFeed.svelte'
  import MarketOverview from './lib/MarketOverview.svelte'
  import WatchlistPanel from './lib/WatchlistPanel.svelte'
  import AccountPanel from './lib/AccountPanel.svelte'
  import ResearchPanel from './lib/ResearchPanel.svelte'
  import TradeJournalPanel from './lib/TradeJournalPanel.svelte'
  import { fetchQuote } from './alpha'
  import store, { resetStore, setQuote } from './store'

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

  async function refreshWatchlistQuotes(symbols: string[]) {
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await fetchQuote(symbol)
          const pct = parseFloat(String(quote.changePercent).replace('%', ''))
          setQuote(symbol, quote.price, quote.change, Number.isFinite(pct) ? pct : 0)
        } catch {
          // fetchQuote already falls back internally; this is just a last-resort guard.
        }
      })
    )
  }

  onMount(() => {
    refreshWatchlistQuotes($store.watchlist)
  })

  $: positions = Object.entries($store.portfolio)
  $: marketValue = positions.reduce((sum, [ticker, position]) => sum + position.shares * ($store.prices[ticker] || 0), 0)
  $: equity = $store.cash + marketValue
  $: totalPnL = equity - $store.startingCash
  $: exposure = equity > 0 ? (marketValue / equity) * 100 : 0
  $: activeQuotes = Object.keys($store.quotes).length
  $: watchlistBreadth = $store.watchlist.length
  $: winColor = totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
</script>

<main class="min-h-screen bg-[#07111f] text-slate-100">
  <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_25%),linear-gradient(to_bottom,_#020617,_#07111f_35%,_#020617)]"></div>

  <section class="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-300">
            POUNCE DECISION COCKPIT
          </div>
          <h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Pounce</h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            A broker-style trading workspace inspired by modern retail and institutional dashboards — multi-horizon charts, account intelligence, a research surface, order entry, holdings, execution history, and now a lightweight thesis journal in one place.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Selected symbol: <span class="font-semibold text-white">{$store.selectedSymbol}</span>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Timeframe: <span class="font-semibold text-white">{$store.selectedTimeframe}</span>
          </div>
          <button on:click={resetStore} class="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-rose-500/50 hover:text-white">
            Reset portfolio
          </button>
        </div>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Cash</div>
          <div class="mt-2 text-2xl font-semibold text-white">{money($store.cash)}</div>
          <div class="mt-1 text-xs text-slate-500">Available to deploy</div>
        </div>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Market value</div>
          <div class="mt-2 text-2xl font-semibold text-white">{money(marketValue)}</div>
          <div class="mt-1 text-xs text-slate-500">Current holdings mark</div>
        </div>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Equity</div>
          <div class="mt-2 text-2xl font-semibold text-white">{money(equity)}</div>
          <div class="mt-1 text-xs text-slate-500">Cash + holdings</div>
        </div>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Total P&amp;L</div>
          <div class={`mt-2 text-2xl font-semibold ${winColor}`}>
            {totalPnL >= 0 ? '+' : ''}{money(totalPnL)}
          </div>
          <div class="mt-1 text-xs text-slate-500">Versus starting capital</div>
        </div>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Coverage</div>
          <div class="mt-2 text-2xl font-semibold text-white">{activeQuotes}</div>
          <div class="mt-1 text-xs text-slate-500">Symbols with live quote state</div>
        </div>
        <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Exposure</div>
          <div class="mt-2 text-2xl font-semibold text-white">{exposure.toFixed(1)}%</div>
          <div class="mt-1 text-xs text-slate-500">Across {watchlistBreadth} watchlist names</div>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-950">
            <div class="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" style={`width:${Math.min(exposure, 100)}%`}></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 xl:grid-cols-[320px_minmax(0,1fr)]">
    <WatchlistPanel />

    <div class="space-y-6">
      <MarketOverview />
      <AccountPanel />
      <div class="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
        <QuotePanel />
        <ResearchPanel />
      </div>
      <TradeJournalPanel />
      <div class="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <Portfolio />
        <ActivityFeed />
      </div>
    </div>
  </section>
</main>
