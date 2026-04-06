<script lang="ts">
  import { onMount } from 'svelte'
  import QuotePanel from './lib/QuotePanel.svelte'
  import Portfolio from './lib/Portfolio.svelte'
  import ActivityFeed from './lib/ActivityFeed.svelte'
  import MarketOverview from './lib/MarketOverview.svelte'
  import WatchlistPanel from './lib/WatchlistPanel.svelte'
  import AccountPanel from './lib/AccountPanel.svelte'
  import AccountabilityPanel from './lib/AccountabilityPanel.svelte'
  import ResearchPanel from './lib/ResearchPanel.svelte'
  import BacktestPanel from './lib/BacktestPanel.svelte'
  import TradeJournalPanel from './lib/TradeJournalPanel.svelte'
  import { fetchQuote } from './alpha'
  import store, { getJournal, resetStore, setQuote } from './store'

  const STORAGE_KEY = 'pounce-active-stage'

  const workflowSteps = [
    { id: 'research', label: 'Research', description: 'What matters now' },
    { id: 'thesis', label: 'Thesis', description: 'Why this trade exists' },
    { id: 'backtest', label: 'Backtest', description: 'Would this have worked?' },
    { id: 'monitor', label: 'Monitor', description: 'What needs attention' },
    { id: 'act', label: 'Act', description: 'Place the trade' },
    { id: 'review', label: 'Review', description: 'Learn from the outcome' }
  ] as const

  type WorkflowStage = (typeof workflowSteps)[number]['id']

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

  let activeStage: WorkflowStage = 'research'

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

  function selectStage(stage: WorkflowStage) {
    activeStage = stage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, stage)
    }
  }

  function restoreStage() {
    if (typeof localStorage === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY) as WorkflowStage | null
    if (stored && workflowSteps.some((step) => step.id === stored)) {
      activeStage = stored
    }
  }

  function stageButtonClass(stage: WorkflowStage) {
    return activeStage === stage
      ? 'border-sky-400/60 bg-sky-500/15 text-white shadow-lg shadow-sky-900/20'
      : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white'
  }

  onMount(() => {
    restoreStage()
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
  $: selectedJournal = getJournal($store.selectedSymbol, $store.journals)
  $: thesisReady = Boolean(selectedJournal.thesisSummary.trim() || selectedJournal.thesis.trim())
  $: triggerReady = Boolean(selectedJournal.triggerSummary.trim() || selectedJournal.entryRationale.trim())
  $: riskReady = Boolean(selectedJournal.riskPlan.trim() || selectedJournal.invalidationSummary.trim())
  $: thesisScore = [thesisReady, triggerReady, riskReady].filter(Boolean).length
  $: activeAlertCount = ($store.alerts[$store.selectedSymbol] ?? []).filter((alert) => alert.status === 'active').length
  $: triggeredAlertCount = ($store.alerts[$store.selectedSymbol] ?? []).filter((alert) => alert.status === 'triggered').length
  $: hasPosition = Boolean($store.portfolio[$store.selectedSymbol]?.shares)
  $: reviewCount = $store.trades.filter((trade) => trade.journal?.setupStatus === 'Reviewing').length
  $: stageMetrics = {
    research: `${activeQuotes}/${watchlistBreadth} quoted`,
    thesis: `${thesisScore}/3 setup blocks`,
    backtest: thesisScore >= 2 ? 'Ready for a coach pass' : 'Needs more structure',
    monitor: `${activeAlertCount} active · ${triggeredAlertCount} triggered`,
    act: hasPosition ? 'Position live' : 'Flat',
    review: `${reviewCount} review${reviewCount === 1 ? '' : 's'} due`
  }
  $: nextAction = !thesisReady
    ? 'Write the thesis before you trust the ticket.'
    : !triggerReady
      ? 'Define the trigger so this becomes a real setup.'
      : !riskReady
        ? 'Add invalidation or risk guardrails before acting.'
        : activeStage === 'act'
          ? 'Execution is unlocked — keep size honest.'
          : 'The setup is structured enough to move forward.'
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
            A workflow-driven trading workspace: keep the watchlist on the rail, work one stage at a time in the main canvas, and stop treating the product like one endless dashboard.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Selected symbol: <span class="font-semibold text-white">{$store.selectedSymbol}</span>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Timeframe: <span class="font-semibold text-white">{$store.selectedTimeframe}</span>
          </div>
          <div class="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            Active stage: <span class="font-semibold text-white">{workflowSteps.find((step) => step.id === activeStage)?.label}</span>
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

      <nav aria-label="Workflow stages" class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow-2xl shadow-black/20 backdrop-blur">
        <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Workspace navigation</div>
            <div class="mt-1 text-sm text-slate-300">Work one stage at a time while the left rail keeps symbol context pinned.</div>
          </div>
          <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">
            Next action: <span class="font-semibold text-white">{nextAction}</span>
          </div>
        </div>

        <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          {#each workflowSteps as step, index}
            <button
              type="button"
              on:click={() => selectStage(step.id)}
              class={`rounded-2xl border px-4 py-3 text-left transition ${stageButtonClass(step.id)}`}
              aria-pressed={activeStage === step.id}
              data-testid={`stage-tab-${step.id}`}
            >
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                {#if activeStage === step.id}
                  <span class="rounded-full border border-sky-400/40 bg-sky-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-sky-200">Live</span>
                {/if}
              </div>
              <div class="mt-2 text-sm font-semibold">{step.label}</div>
              <div class="mt-1 text-xs text-slate-400">{step.description}</div>
              <div class="mt-3 text-xs text-slate-500">{stageMetrics[step.id]}</div>
            </button>
          {/each}
        </div>
      </nav>
    </div>
  </section>

  <section class="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 xl:grid-cols-[320px_minmax(0,1fr)]">
    <aside class="space-y-6 xl:sticky xl:top-6 xl:self-start">
      <div class="rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1">
        <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
          <div class="text-xs uppercase tracking-[0.2em] text-emerald-300">Context rail</div>
          <h2 class="mt-1 text-lg font-semibold text-white">Universe + setup state</h2>
          <p class="mt-1 text-sm text-slate-400">Keep the symbol queue visible while the main canvas swaps by workflow stage.</p>
          <div class="mt-4 grid gap-3 text-sm text-slate-300">
            <div class="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Focus symbol</div>
              <div class="mt-1 font-semibold text-white">{$store.selectedSymbol}</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
              <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Setup completeness</div>
              <div class="mt-1 font-semibold text-white">{thesisScore}/3 blocks written</div>
              <div class="mt-1 text-xs text-slate-500">Thesis, trigger, risk</div>
            </div>
          </div>
        </div>
        <WatchlistPanel />
      </div>
    </aside>

    <div>
      {#if activeStage === 'research'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-research">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-sky-300">Research</div>
            <h2 class="mt-1 text-lg font-semibold text-white">What matters now</h2>
            <p class="mt-1 text-sm text-slate-400">Pair price context with live-ish research before you decide there’s a real setup here.</p>
          </div>
          <MarketOverview />
          <ResearchPanel />
        </section>
      {:else if activeStage === 'thesis'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-thesis">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-violet-300">Thesis</div>
            <h2 class="mt-1 text-lg font-semibold text-white">Why this trade exists</h2>
            <p class="mt-1 text-sm text-slate-400">Capture the idea, trigger, and risk plan before the ticket starts whispering bad ideas.</p>
          </div>
          <TradeJournalPanel />
          <QuotePanel mode="thesis" />
        </section>
      {:else if activeStage === 'backtest'}
        <section class="rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-backtest">
          <BacktestPanel />
        </section>
      {:else if activeStage === 'monitor'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-monitor">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-emerald-300">Monitor</div>
            <h2 class="mt-1 text-lg font-semibold text-white">What needs attention</h2>
            <p class="mt-1 text-sm text-slate-400">Use account and accountability context to decide whether the setup is healthy, stale, or needs cleanup.</p>
          </div>
          <AccountPanel />
          <AccountabilityPanel />
        </section>
      {:else if activeStage === 'act'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-act">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-rose-300">Act</div>
            <h2 class="mt-1 text-lg font-semibold text-white">Place the trade</h2>
            <p class="mt-1 text-sm text-slate-400">Execution belongs downstream of context, with the setup already defined and the watchlist still in reach.</p>
          </div>
          <QuotePanel mode="act" />
        </section>
      {:else if activeStage === 'review'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-review">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-cyan-300">Review</div>
            <h2 class="mt-1 text-lg font-semibold text-white">Learn from the outcome</h2>
            <p class="mt-1 text-sm text-slate-400">Tie open positions and execution history back to the original idea so the loop actually closes.</p>
            <div class="mt-3 text-sm font-medium text-slate-200">Portfolio + journal review</div>
          </div>
          <div class="grid gap-6 2xl:grid-cols-[1fr_1fr]">
            <Portfolio />
            <ActivityFeed />
          </div>
        </section>
      {/if}
    </div>
  </section>
</main>
