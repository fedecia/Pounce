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
  const TONE_STORAGE_KEY = 'pounce-desk-tone'

  const workflowSteps = [
    { id: 'research', label: 'Research', nickname: 'Scout', description: 'What matters now' },
    { id: 'thesis', label: 'Thesis', nickname: 'Call the shot', description: 'Why this trade exists' },
    { id: 'backtest', label: 'Backtest', nickname: 'Coach pass', description: 'Would this have worked?' },
    { id: 'monitor', label: 'Monitor', nickname: 'Keep watch', description: 'What needs attention' },
    { id: 'act', label: 'Act', nickname: 'Take the swing', description: 'Place the trade' },
    { id: 'review', label: 'Review', nickname: 'Close the loop', description: 'Learn from the outcome' }
  ] as const

  type WorkflowStage = (typeof workflowSteps)[number]['id']

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

  let activeStage: WorkflowStage = 'research'
  let deskTone: 'classic' | 'playful' = 'classic'

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

  function restoreTone() {
    if (typeof localStorage === 'undefined') return
    const stored = localStorage.getItem(TONE_STORAGE_KEY)
    if (stored === 'classic' || stored === 'playful') {
      deskTone = stored
    }
  }

  function setDeskTone(tone: 'classic' | 'playful') {
    deskTone = tone
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TONE_STORAGE_KEY, tone)
    }
  }

  function stageButtonClass(stage: WorkflowStage) {
    return activeStage === stage
      ? 'border-sky-400/60 bg-sky-500/15 text-white shadow-lg shadow-sky-900/20'
      : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-white'
  }

  onMount(() => {
    restoreStage()
    restoreTone()
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
    ? 'Write down the idea before you trust the trade ticket.'
    : !triggerReady
      ? 'Spell out the trigger so this becomes a real setup.'
      : !riskReady
        ? 'Add your line in the sand and risk plan before acting.'
        : activeStage === 'act'
          ? 'You can trade now — keep the size honest.'
          : 'The setup has enough structure to keep moving.'
  $: thesisMomentumLabel = thesisScore === 3 ? 'Shareable' : thesisScore === 2 ? 'Almost there' : thesisScore === 1 ? 'Early draft' : 'Unformed'
  $: thesisMomentumTone = thesisScore === 3
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : thesisScore === 2
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
      : 'border-slate-700 bg-slate-950/70 text-slate-300'
  $: deskRead = !thesisReady
    ? 'Not a setup yet'
    : thesisScore === 3
      ? 'Clean setup'
      : thesisScore === 2
        ? 'Promising but incomplete'
        : 'Idea with gaps'
  $: deskColor = thesisScore === 3 ? 'text-emerald-300' : thesisScore === 2 ? 'text-amber-300' : 'text-slate-300'
  $: deskHook = !thesisReady ? 'No sharp one-liner yet.' : selectedJournal.thesisSummary.trim() || selectedJournal.thesis.trim().slice(0, 120)
  $: setupStory = thesisScore === 3
    ? `${$store.selectedSymbol} has a defined thesis, trigger, and risk plan — this is ready for scrutiny, not vibes.`
    : thesisScore === 2
      ? `${$store.selectedSymbol} has a real idea forming, but one missing block still makes this hard to trust or share.`
      : thesisScore === 1
        ? `${$store.selectedSymbol} has a spark of an idea, but it still reads like a note to self.`
        : `${$store.selectedSymbol} is still just a ticker on the rail until the setup gets written down.`
</script>

<main class="min-h-screen bg-[#07111f] text-slate-100">
  <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_25%),linear-gradient(to_bottom,_#020617,_#07111f_35%,_#020617)]"></div>

  <section class="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium tracking-[0.18em] text-emerald-300">
            POUNCE TRADING WORKSPACE
          </div>
          <h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Pounce</h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            A stage-by-stage trading workspace that keeps your watchlist in view, puts one decision in front of you at a time, and makes the whole flow feel less like one giant dashboard.
          </p>
          <div class="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-1 text-sm" data-testid="desk-tone-toggle">
            <span class="px-2 text-xs uppercase tracking-[0.16em] text-slate-500">Desk tone</span>
            <button type="button" on:click={() => setDeskTone('classic')} class={`rounded-xl px-3 py-2 transition ${deskTone === 'classic' ? 'bg-slate-200 text-slate-950' : 'text-slate-300 hover:text-white'}`}>Classic</button>
            <button type="button" on:click={() => setDeskTone('playful')} class={`rounded-xl px-3 py-2 transition ${deskTone === 'playful' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'}`}>Playful</button>
          </div>
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
            {#if deskTone === 'playful'}
              <span class="text-slate-500"> · {workflowSteps.find((step) => step.id === activeStage)?.nickname}</span>
            {/if}
          </div>
          <button on:click={resetStore} class="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-rose-500/50 hover:text-white">
            Reset paper portfolio
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

      <div class="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]" data-testid="pounce-story-strip">
        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl shadow-black/20 backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Pounce readout</div>
              <div class={`mt-2 text-2xl font-semibold ${deskColor}`}>{deskRead}</div>
              <div class="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{setupStory}</div>
            </div>
            <div class={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.16em] ${thesisMomentumTone}`}>
              {thesisMomentumLabel}
            </div>
          </div>
          <div class="mt-4 grid gap-3 md:grid-cols-3">
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div class="text-[11px] uppercase tracking-[0.16em] text-slate-500">Hook</div>
              <div class="mt-2 text-sm leading-6 text-white">{deskHook}</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div class="text-[11px] uppercase tracking-[0.16em] text-slate-500">Why it travels</div>
              <div class="mt-2 text-sm leading-6 text-slate-300">A setup people can scan fast: thesis, trigger, risk, and current stage without digging through the whole app.</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div class="text-[11px] uppercase tracking-[0.16em] text-slate-500">Current friction</div>
              <div class="mt-2 text-sm leading-6 text-slate-300">{nextAction}</div>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl shadow-black/20 backdrop-blur" data-testid="share-card-mini">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="text-xs uppercase tracking-[0.2em] text-cyan-300">Share-card concept</div>
              <div class="mt-1 text-lg font-semibold text-white">If you screenshotted this, it would make sense</div>
            </div>
            <div class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{$store.selectedSymbol}</div>
          </div>
          <div class="mt-4 rounded-2xl border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(14,116,144,0.28),rgba(15,23,42,0.92))] p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Pounce setup</div>
                <div class="mt-1 text-xl font-semibold text-white">{$store.selectedSymbol} · {deskRead}</div>
              </div>
              <div class={`rounded-full border px-3 py-1 text-xs ${thesisMomentumTone}`}>{thesisScore}/3 locked</div>
            </div>
            <div class="mt-4 text-sm leading-6 text-slate-100">{deskHook}</div>
            <div class="mt-4 grid gap-2 text-xs text-slate-200 sm:grid-cols-2">
              <div class="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2">Stage · {workflowSteps.find((step) => step.id === activeStage)?.label}</div>
              <div class="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2">Trigger · {triggerReady ? 'Logged' : 'Missing'}</div>
              <div class="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2">Risk · {riskReady ? 'Logged' : 'Missing'}</div>
              <div class="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2">Position · {hasPosition ? 'Live' : 'Flat'}</div>
            </div>
          </div>
          <div class="mt-3 text-xs leading-5 text-slate-500">First pass only: a credible, screenshot-friendly summary layer built from actual state instead of hype words.</div>
        </div>
      </div>

      <nav aria-label="Workflow stages" class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow-2xl shadow-black/20 backdrop-blur">
        <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="text-xs uppercase tracking-[0.2em] text-slate-500">Workspace navigation</div>
            <div class="mt-1 text-sm text-slate-300">Move one step at a time while the left rail keeps the symbol context handy.</div>
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
              {#if deskTone === 'playful'}
                <div class="mt-1 text-[11px] uppercase tracking-[0.16em] text-sky-200/90">{step.nickname}</div>
              {/if}
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
          <h2 class="mt-1 text-lg font-semibold text-white">Watchlist + setup status</h2>
          <p class="mt-1 text-sm text-slate-400">Keep the symbol queue visible while the main canvas changes with each stage.</p>
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
            <p class="mt-1 text-sm text-slate-400">Pair price context with fresh research before you decide whether there’s actually a trade here.</p>
          </div>
          <MarketOverview />
          <ResearchPanel />
        </section>
      {:else if activeStage === 'thesis'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-thesis">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-violet-300">Thesis</div>
            <h2 class="mt-1 text-lg font-semibold text-white">Why this trade exists</h2>
            <p class="mt-1 text-sm text-slate-400">Capture the idea, trigger, and risk plan before the ticket starts tempting you into a rushed trade.</p>
          </div>
          <TradeJournalPanel tone={deskTone} />
          <QuotePanel mode="thesis" tone={deskTone} />
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
            <p class="mt-1 text-sm text-slate-400">Use account and accountability context to see what is healthy, what is stale, and what needs cleanup.</p>
          </div>
          <AccountPanel />
          <AccountabilityPanel />
        </section>
      {:else if activeStage === 'act'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-act">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-rose-300">Act</div>
            <h2 class="mt-1 text-lg font-semibold text-white">Place the trade</h2>
            <p class="mt-1 text-sm text-slate-400">Execution comes after the setup work, with the context defined and the watchlist still close by.</p>
          </div>
          <QuotePanel mode="act" tone={deskTone} />
        </section>
      {:else if activeStage === 'review'}
        <section class="space-y-6 rounded-[28px] border border-slate-900/60 bg-slate-950/20 p-1" data-testid="stage-panel-review">
          <div class="rounded-2xl border border-slate-800/80 bg-slate-950/60 px-5 py-4">
            <div class="text-xs uppercase tracking-[0.2em] text-cyan-300">Review</div>
            <h2 class="mt-1 text-lg font-semibold text-white">Learn from the outcome</h2>
            <p class="mt-1 text-sm text-slate-400">Tie open positions and execution history back to the original idea so the learning loop actually closes.</p>
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
