<script lang="ts">
  import store, { addToWatchlist, clearAlertHistory, deleteAlert, removeFromWatchlist, setQuote, setSelectedSymbol, upsertAlert } from '../store'
  import { createAiClient } from '../ai'
  import { fetchQuote } from '../alpha'
  import { saveAlertExplanation } from '../store'
  import type { AlertCondition, SetupConviction, SetupPriority, SetupStatus } from '../types'

  const ai = createAiClient()

  let newTicker = ''
  let loading = false
  let alertMode: 'price' | 'percent' = 'price'
  let alertDirection: 'above' | 'below' = 'above'
  let alertValue = ''
  let alertError = ''
  let alertSuccess = ''
  let explainingEventId = ''

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const snippet = (value = '', max = 90, fallback = 'No setup context yet.') => {
    const clean = value.trim()
    if (!clean) return fallback
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
  }

  const statusTone: Record<SetupStatus, string> = {
    Watching: 'border-slate-700 bg-slate-900/80 text-slate-200',
    Building: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    Ready: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    Executed: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    Reviewing: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200'
  }

  const convictionTone: Record<SetupConviction, string> = {
    Low: 'border-slate-700 bg-slate-900/80 text-slate-300',
    Medium: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    High: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
  }

  const priorityTone: Record<SetupPriority, string> = {
    'Back burner': 'border-slate-700 bg-slate-900/80 text-slate-300',
    Standard: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
    Top: 'border-rose-500/30 bg-rose-500/10 text-rose-200'
  }

  $: selectedSymbol = $store.selectedSymbol
  $: selectedQuote = $store.quotes[selectedSymbol] || $store.prices[selectedSymbol] || 0
  $: symbolAlerts = $store.alerts[selectedSymbol] ?? []
  $: recentHistory = $store.alertHistory.slice(0, 6)
  $: selectedJournal = $store.journals[selectedSymbol]

  async function addSymbol() {
    const symbol = newTicker.toUpperCase().trim()
    if (!symbol) return
    loading = true
    try {
      const quote = await fetchQuote(symbol)
      const pct = parseFloat(quote.changePercent.replace('%', ''))
      addToWatchlist(symbol)
      setSelectedSymbol(symbol)
      setQuote(symbol, quote.price, quote.change, Number.isFinite(pct) ? pct : 0)
    } finally {
      loading = false
      newTicker = ''
    }
  }

  function describeCondition(condition: AlertCondition) {
    switch (condition) {
      case 'price-above':
        return 'Above'
      case 'price-below':
        return 'Below'
      case 'percent-up':
        return 'Up %'
      case 'percent-down':
        return 'Down %'
    }
  }

  function statusBadgeClass(status: 'active' | 'triggered') {
    return status === 'active'
      ? 'rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200'
      : 'rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200'
  }

  function submitAlert() {
    const value = Number.parseFloat(alertValue)
    const isPercent = alertMode === 'percent'
    const condition = `${isPercent ? 'percent' : 'price'}-${alertDirection}` as AlertCondition

    alertError = ''
    alertSuccess = ''

    try {
      upsertAlert(selectedSymbol, condition, value, isPercent ? selectedQuote : undefined)
      alertValue = ''
      alertSuccess = isPercent
        ? `${selectedSymbol} alert is live for ${alertDirection === 'above' ? 'a rise' : 'a drop'} of ${value.toFixed(2)}% from ${money(selectedQuote)}.`
        : `${selectedSymbol} alert is live for ${alertDirection === 'above' ? 'a move above' : 'a move below'} ${money(value)}.`
    } catch (error) {
      alertError = error instanceof Error ? error.message : 'Could not create alert'
    }
  }

  async function explainEvent(eventId: string) {
    const event = $store.alertHistory.find((item) => item.id === eventId)
    if (!event) return
    explainingEventId = eventId
    try {
      const explanation = await ai.explainAlert({
        event,
        journal: $store.journals[event.symbol] ?? {
          thesis: '',
          thesisSummary: '',
          entryRationale: '',
          triggerSummary: '',
          riskPlan: '',
          invalidationSummary: '',
          exitPlan: '',
          postTradeNotes: '',
          setupStatus: 'Watching',
          conviction: 'Medium',
          priority: 'Standard'
        }
      })
      saveAlertExplanation(event.symbol, event.id, explanation)
    } finally {
      explainingEventId = ''
    }
  }
</script>

<div class="space-y-6">
  <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Watchlist</p>
        <h2 class="mt-1 text-lg font-semibold text-white">Watchlist</h2>
      </div>
      <span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{$store.watchlist.length} symbols</span>
    </div>

    <div class="mb-4 flex gap-2">
      <input bind:value={newTicker} maxlength="8" placeholder="Add a symbol" class="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500" />
      <button on:click={addSymbol} disabled={loading} class="rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-50">
        Add
      </button>
    </div>

    <div class="space-y-3">
      {#each $store.watchlist as symbol}
        {@const price = $store.prices[symbol] || $store.quotes[symbol] || 0}
        {@const trend = $store.trend[symbol]}
        {@const alerts = $store.alerts[symbol] ?? []}
        {@const activeCount = alerts.filter((alert) => alert.status === 'active').length}
        {@const triggeredCount = alerts.filter((alert) => alert.status === 'triggered').length}
        {@const journal = $store.journals[symbol]}
        <div class:selected={$store.selectedSymbol === symbol} class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 transition hover:border-sky-500/40 hover:bg-slate-950">
          <div class="flex items-start justify-between gap-2">
            <button on:click={() => setSelectedSymbol(symbol)} class="flex flex-1 gap-3 text-left">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="font-medium text-white">{symbol}</div>
                  <span class={`rounded-full border px-2.5 py-1 text-[11px] ${statusTone[journal?.setupStatus ?? 'Watching']}`}>{journal?.setupStatus ?? 'Watching'}</span>
                  <span class={`rounded-full border px-2.5 py-1 text-[11px] ${convictionTone[journal?.conviction ?? 'Medium']}`}>{journal?.conviction ?? 'Medium'} conv.</span>
                  <span class={`rounded-full border px-2.5 py-1 text-[11px] ${priorityTone[journal?.priority ?? 'Standard']}`}>{journal?.priority ?? 'Standard'}</span>
                </div>
                <div class="mt-2 text-sm leading-5 text-slate-200">{snippet(journal?.thesisSummary || journal?.thesis, 88)}</div>
                <div class="mt-2 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                  <div class="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                    <span class="text-slate-500">Trigger:</span> {snippet(journal?.triggerSummary || journal?.entryRationale, 56, 'Still defining the trigger.')}
                  </div>
                  <div class="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                    <span class="text-slate-500">Invalidation:</span> {snippet(journal?.invalidationSummary || journal?.riskPlan, 56, 'No invalidation written yet.')}
                  </div>
                </div>
              </div>
              <div class="pr-1 text-right">
                <div class="font-medium text-white">{price ? money(price) : '—'}</div>
                <div class:text-emerald-400={trend && trend.change >= 0} class:text-rose-400={trend && trend.change < 0} class="text-xs">
                  {trend ? `${trend.pct >= 0 ? '+' : ''}${trend.pct.toFixed(2)}%` : 'Quote coming in'}
                </div>
              </div>
            </button>
            <button on:click={() => removeFromWatchlist(symbol)} class="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-rose-500/50 hover:text-rose-300">×</button>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            {#if activeCount}
              <span class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">{activeCount} active alert{activeCount === 1 ? '' : 's'}</span>
            {/if}
            {#if triggeredCount}
              <span class="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">{triggeredCount} triggered</span>
            {/if}
            {#if !activeCount && !triggeredCount}
              <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-400">No alerts set</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Alert center</p>
        <h2 class="mt-1 text-lg font-semibold text-white">{selectedSymbol} alerts</h2>
        <p class="mt-1 text-sm text-slate-400">Set alerts around the setup, not just the price. The context stays visible while the mark updates.</p>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-right text-xs text-slate-400">
        <div>Current mark</div>
        <div class="mt-1 text-sm font-medium text-white">{selectedQuote ? money(selectedQuote) : 'Quote coming in'}</div>
      </div>
    </div>

    {#if selectedJournal}
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
          <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Current setup</div>
          <div class="mt-2 text-white">{snippet(selectedJournal.thesisSummary || selectedJournal.thesis, 110)}</div>
          <div class="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span class={`rounded-full border px-2.5 py-1 ${statusTone[selectedJournal.setupStatus]}`}>{selectedJournal.setupStatus}</span>
            <span class={`rounded-full border px-2.5 py-1 ${convictionTone[selectedJournal.conviction]}`}>{selectedJournal.conviction} conviction</span>
            <span class={`rounded-full border px-2.5 py-1 ${priorityTone[selectedJournal.priority]}`}>{selectedJournal.priority}</span>
          </div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <div><span class="text-slate-500">Trigger:</span> {snippet(selectedJournal.triggerSummary || selectedJournal.entryRationale, 88, 'Still defining the trigger.')}</div>
          <div class="mt-2"><span class="text-slate-500">Invalidation:</span> {snippet(selectedJournal.invalidationSummary || selectedJournal.riskPlan, 88, 'No invalidation written yet.')}</div>
        </div>
      </div>
    {/if}

    <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <label class="block">
            <span class="mb-2 block text-sm text-slate-400">Alert type</span>
        <select bind:value={alertMode} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
          <option value="price">Price level</option>
          <option value="percent">Percent move</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-slate-400">Direction</span>
        <select bind:value={alertDirection} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
          <option value="above">{alertMode === 'price' ? 'Above' : 'Up'}</option>
          <option value="below">{alertMode === 'price' ? 'Below' : 'Down'}</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-slate-400">{alertMode === 'price' ? 'Target price' : 'Percent move'}</span>
        <input bind:value={alertValue} type="number" min="0.01" step="0.01" placeholder={alertMode === 'price' ? '200.00' : '5.00'} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" />
      </label>
      <div class="flex items-end">
        <button on:click={submitAlert} class="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-500">Arm alert</button>
      </div>
    </div>

    <div class="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-400">
      {#if alertMode === 'percent'}
        Percent alerts anchor to the current mark when you set them: <span class="font-medium text-white">{selectedQuote ? money(selectedQuote) : 'fetch a quote first'}</span>.
      {:else}
        Price alerts fire the first time the refreshed mark crosses your level.
      {/if}
    </div>

    {#if alertError}
      <div class="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{alertError}</div>
    {/if}
    {#if alertSuccess}
      <div class="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{alertSuccess}</div>
    {/if}

    <div class="mt-5 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-white">Active + triggered alerts for {selectedSymbol}</h3>
        <span class="text-xs text-slate-500">{symbolAlerts.length} total</span>
      </div>
      {#if symbolAlerts.length}
        {#each symbolAlerts as alert}
          <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium text-white">{describeCondition(alert.condition)}</span>
                  <span class={statusBadgeClass(alert.status)}>{alert.status}</span>
                </div>
                <div class="mt-2 text-slate-300">
                  {#if alert.condition.startsWith('price')}
                    Target {money(alert.target)}
                  {:else}
                    {alert.target.toFixed(2)}% from {alert.baselinePrice ? money(alert.baselinePrice) : '—'}
                  {/if}
                </div>
                <div class="mt-2 text-xs text-slate-400">
                  <span class="text-slate-500">Setup:</span> {snippet(selectedJournal?.thesisSummary || selectedJournal?.thesis, 84, 'No thesis linked yet.')}
                </div>
                <div class="mt-1 text-xs text-slate-500">
                  Armed {new Date(alert.createdAt).toLocaleString()} · Last mark {alert.lastPrice ? money(alert.lastPrice) : '—'}
                  {#if alert.triggeredAt}
                    · Triggered {new Date(alert.triggeredAt).toLocaleString()}
                  {/if}
                </div>
              </div>
              <button on:click={() => deleteAlert(selectedSymbol, alert.id)} class="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-rose-500/50 hover:text-rose-300">Remove</button>
            </div>
          </div>
        {/each}
      {:else}
        <div class="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
          No alerts yet. Set one for {selectedSymbol} and let quote refreshes do the watching.
        </div>
      {/if}
    </div>

    <div class="mt-5 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-white">Recently triggered</h3>
        <button on:click={clearAlertHistory} disabled={!$store.alertHistory.length} class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50">Clear</button>
      </div>
      {#if recentHistory.length}
        {#each recentHistory as event}
          {@const alertExplanation = $store.ai.symbols[event.symbol]?.alertExplanations?.[event.id]}
          <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <div class="font-medium text-white">{event.message}</div>
            <div class="mt-1 text-xs text-slate-400">{snippet($store.journals[event.symbol]?.thesisSummary || $store.journals[event.symbol]?.thesis, 86, 'No thesis linked yet.')}</div>
            <div class="mt-1 text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</div>
            <div class="mt-3 flex items-center justify-between gap-3">
              <button on:click={() => explainEvent(event.id)} class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-sky-500/50 hover:text-white" disabled={explainingEventId === event.id}>
                {explainingEventId === event.id ? 'Explaining…' : 'Explain what changed'}
              </button>
            </div>
            {#if alertExplanation}
              <div class="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3" data-testid="alert-ai-explanation">
                <div class="text-xs uppercase tracking-[0.16em] text-cyan-200">AI alert explanation</div>
                <div class="mt-2 text-sm text-slate-200">{alertExplanation.explanation}</div>
                <div class="mt-2 text-sm text-slate-300"><span class="text-slate-500">What changed:</span> {alertExplanation.whatChanged}</div>
                <div class="mt-2 text-sm text-slate-300"><span class="text-slate-500">Recommended action:</span> {alertExplanation.recommendedAction}</div>
              </div>
            {/if}
          </div>
        {/each}
      {:else}
        <div class="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-5 text-sm text-slate-400">
          Nothing has triggered yet.
        </div>
      {/if}
    </div>
  </div>

  <div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Market pulse</p>
    <h2 class="mt-1 text-lg font-semibold text-white">Quick notes</h2>
    <div class="mt-4 space-y-3 text-sm text-slate-400">
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
        In this simulated tape, tech is still leading and momentum names are showing the strongest relative trend.
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
        Alerts ride on top of quote refreshes, so a quick watchlist scan can actually surface setups.
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
        Watchlist rows carry the thesis, trigger, invalidation, and priority — the useful stuff, not just the ticker.
      </div>
    </div>
  </div>
</div>

<style>
  .selected {
    border-color: rgba(56, 189, 248, 0.45);
    background: rgba(15, 23, 42, 0.95);
  }
</style>
