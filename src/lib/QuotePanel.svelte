<script lang="ts">
  import { fetchQuote } from '../alpha'
  import { createAiClient, getSymbolAiState } from '../ai'
  import { fetchResearchSnapshot } from '../research'
  import store, { buy, getJournal, saveThesisCritique, saveThesisDraft, sell, setOrderTicket, setQuote, setSelectedSymbol, updateTradeJournal } from '../store'
  import type { OrderType, SetupConviction, SetupPriority, SetupStatus, TradeJournal } from '../types'

  export let mode: 'thesis' | 'act' = 'act'

  const presets = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META']
  const orderTypes: OrderType[] = ['Market', 'Limit', 'Stop']
  const setupStatuses: SetupStatus[] = ['Watching', 'Building', 'Ready', 'Executed', 'Reviewing']
  const convictionOptions: SetupConviction[] = ['Low', 'Medium', 'High']
  const priorityOptions: SetupPriority[] = ['Back burner', 'Standard', 'Top']
  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  const ai = createAiClient()

  let ticker = 'AAPL'
  let fetching = false
  let error = ''
  let success = ''
  let qty = 10
  let limitPrice = 0
  let stopPrice = 0
  let selectedTif: 'Day' | 'GTC' = 'Day'
  let selectedOrderType: OrderType = 'Market'
  let aiWorking: '' | 'draft' | 'critique' = ''
  let thesis = ''
  let thesisSummary = ''
  let entryRationale = ''
  let triggerSummary = ''
  let riskPlan = ''
  let invalidationSummary = ''
  let exitPlan = ''
  let postTradeNotes = ''
  let setupStatus: SetupStatus = 'Watching'
  let conviction: SetupConviction = 'Medium'
  let priority: SetupPriority = 'Standard'
  let lastJournalSymbol = ''

  $: if ($store.selectedSymbol && $store.selectedSymbol !== ticker.toUpperCase().trim()) {
    ticker = $store.selectedSymbol
  }
  $: symbol = ticker.toUpperCase().trim()
  $: quote = $store.quotes[symbol]
  $: trend = $store.trend[symbol]
  $: position = $store.portfolio[symbol]
  $: selectedOrderType = $store.orderTicket.type
  $: selectedTif = $store.orderTicket.tif
  $: limitPrice = quote && !limitPrice ? quote : limitPrice
  $: stopPrice = quote && !stopPrice ? Number((quote * 0.98).toFixed(2)) : stopPrice
  $: effectivePrice = selectedOrderType === 'Limit' ? limitPrice : selectedOrderType === 'Stop' ? stopPrice : quote || 0
  $: sanitizedQty = Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0
  $: orderValue = effectivePrice ? effectivePrice * sanitizedQty : 0
  $: maxBuyShares = effectivePrice > 0 ? Math.floor($store.cash / effectivePrice) : 0
  $: projectedBuyingPower = effectivePrice ? Math.max(0, $store.cash - orderValue) : $store.cash
  $: projectedPositionShares = (position?.shares || 0) + sanitizedQty
  $: buyDisabledReason = !symbol
    ? 'Enter a ticker symbol.'
    : !effectivePrice
      ? 'Fetch a quote or enter a trigger price to enable the order.'
      : sanitizedQty <= 0
        ? 'Share quantity must be at least 1.'
        : orderValue > $store.cash
          ? `Order exceeds buying power by ${money(orderValue - $store.cash)}.`
          : ''
  $: trendBadgeClass = trend
    ? trend.change >= 0
      ? 'rounded-xl bg-emerald-500/10 px-3 py-2 text-right text-sm text-emerald-300'
      : 'rounded-xl bg-rose-500/10 px-3 py-2 text-right text-sm text-rose-300'
    : 'rounded-xl bg-slate-900 px-3 py-2 text-right text-sm text-slate-300'
  $: canSell = !!quote && !!position && position.shares >= sanitizedQty && sanitizedQty > 0
  $: estimatedFees = orderValue * 0.0008
  $: orderSummary = selectedOrderType === 'Market'
    ? 'Executes immediately at the current mark.'
    : selectedOrderType === 'Limit'
      ? 'Only fills at your limit or better in this paper simulation.'
      : 'Triggers once price trades through the stop level.'
  $: projectedSellPositionShares = Math.max(0, (position?.shares || 0) - sanitizedQty)
  $: projectedSellBuyingPower = effectivePrice ? $store.cash + orderValue : $store.cash
  $: sellDisabledReason = !position
    ? 'No position to sell yet.'
    : !effectivePrice
      ? 'Fetch a quote or enter a trigger price to enable the order.'
      : sanitizedQty <= 0
        ? 'Share quantity must be at least 1.'
        : position.shares < sanitizedQty
          ? `Only ${position.shares} shares available to sell.`
          : ''
  $: journalHint = thesis.trim() || thesisSummary.trim()
    ? 'Setup context will be attached to the next execution.'
    : 'Add a thesis and trigger so the watchlist becomes a real setup queue.'
  $: aiState = getSymbolAiState(symbol, $store.ai)
  $: void [
    projectedBuyingPower,
    projectedPositionShares,
    buyDisabledReason,
    projectedSellPositionShares,
    projectedSellBuyingPower,
    sellDisabledReason
  ]

  $: if (symbol && symbol !== lastJournalSymbol) {
    const journal = getJournal(symbol, $store.journals)
    thesis = journal.thesis
    thesisSummary = journal.thesisSummary
    entryRationale = journal.entryRationale
    triggerSummary = journal.triggerSummary
    riskPlan = journal.riskPlan
    invalidationSummary = journal.invalidationSummary
    exitPlan = journal.exitPlan
    postTradeNotes = journal.postTradeNotes
    setupStatus = journal.setupStatus
    conviction = journal.conviction
    priority = journal.priority
    lastJournalSymbol = symbol
  }

  function currentJournal(): Partial<TradeJournal> {
    return {
      thesis,
      thesisSummary,
      setupStatus,
      entryRationale,
      triggerSummary,
      riskPlan,
      invalidationSummary,
      exitPlan,
      postTradeNotes,
      conviction,
      priority
    }
  }

  function saveJournal() {
    if (!symbol) return
    updateTradeJournal(symbol, currentJournal())
  }

  async function draftThesisFromResearch() {
    if (!symbol) return
    aiWorking = 'draft'
    try {
      const research = await fetchResearchSnapshot(symbol)
      const draft = await ai.draftThesis({
        symbol,
        journal: getJournal(symbol, $store.journals),
        research,
        price: quote,
        trendPct: trend?.pct
      })
      saveThesisDraft(symbol, draft)
      thesisSummary = draft.thesisSummary
      thesis = draft.thesis
      triggerSummary = draft.triggerSummary
      entryRationale = draft.entryRationale
      invalidationSummary = draft.invalidationSummary
      riskPlan = draft.riskPlan
      exitPlan = draft.exitPlan
      success = `Drafted an AI-assisted thesis for ${symbol}. Review it before saving or trading.`
      error = ''
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not draft thesis'
    } finally {
      aiWorking = ''
    }
  }

  async function critiqueCurrentThesis() {
    if (!symbol) return
    aiWorking = 'critique'
    try {
      const research = await fetchResearchSnapshot(symbol)
      const critique = await ai.critiqueThesis({
        symbol,
        journal: getJournal(symbol, { ...$store.journals, [symbol]: { ...getJournal(symbol, $store.journals), ...currentJournal() } }),
        research
      })
      saveThesisCritique(symbol, critique)
      success = `Critiqued the current ${symbol} thesis. Use the gaps list as a cleanup pass, not gospel.`
      error = ''
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not critique thesis'
    } finally {
      aiWorking = ''
    }
  }

  async function getPrice() {
    if (!symbol) {
      error = 'Enter a ticker symbol'
      return
    }

    setSelectedSymbol(symbol)
    fetching = true
    error = ''
    success = ''
    try {
      const q = await fetchQuote(symbol)
      const pct = typeof q.changePercent === 'string'
        ? parseFloat(q.changePercent.replace('%', ''))
        : Number(q.changePercent)
      setQuote(symbol, q.price, q.change, Number.isFinite(pct) ? pct : 0)
      limitPrice = q.price
      stopPrice = Number((q.price * 0.98).toFixed(2))
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      fetching = false
    }
  }

  function syncTicket(type = selectedOrderType, tif = selectedTif) {
    setOrderTicket(type, tif)
  }

  function executionPrice() {
    if (!quote && selectedOrderType === 'Market') throw new Error('Get price first')
    const price = selectedOrderType === 'Limit' ? limitPrice : selectedOrderType === 'Stop' ? stopPrice : quote || 0
    if (!price || price <= 0) throw new Error('Enter a valid trigger price')
    return price
  }

  function onBuy() {
    try {
      syncTicket()
      saveJournal()
      const price = executionPrice()
      buy(symbol, price, sanitizedQty, currentJournal())
      error = ''
      success = `Bought ${sanitizedQty} ${sanitizedQty === 1 ? 'share' : 'shares'} of ${symbol} at ${money(price)}.`
    } catch (e) {
      success = ''
      error = e instanceof Error ? e.message : 'Purchase failed'
    }
  }

  function onSell() {
    try {
      syncTicket()
      saveJournal()
      const price = executionPrice()
      sell(symbol, price, sanitizedQty, currentJournal())
      error = ''
      success = `Sold ${sanitizedQty} ${sanitizedQty === 1 ? 'share' : 'shares'} of ${symbol} at ${money(price)}.`
    } catch (e) {
      success = ''
      error = e instanceof Error ? e.message : 'Sale failed'
    }
  }

  function useMaxBuyShares() {
    if (maxBuyShares > 0) qty = maxBuyShares
  }
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-5 flex items-start justify-between gap-4">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Quote workstation</p>
      <h2 class="mt-1 text-lg font-semibold text-white">{mode === 'thesis' ? 'Build the setup' : 'Research &amp; execute'}</h2>
    </div>
    <button on:click={getPrice} disabled={fetching} class="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60">
      {fetching ? 'Fetching…' : 'Refresh quote'}
    </button>
  </div>

  <label for="ticker-input" class="block text-sm font-medium text-slate-300">Ticker</label>
  <div class="mt-2 flex gap-2">
    <input id="ticker-input" bind:value={ticker} maxlength="8" class="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg uppercase tracking-wide text-white outline-none transition focus:border-sky-500" placeholder="AAPL" />
    <button on:click={getPrice} disabled={fetching} class="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50">
      Get price
    </button>
  </div>

  <div class="mt-3 flex flex-wrap gap-2">
    {#each presets as preset}
      <button on:click={() => { ticker = preset; getPrice() }} class="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-sky-500/50 hover:text-sky-300">
        {preset}
      </button>
    {/each}
  </div>

  {#if error}
    <div class="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
      {success}
    </div>
  {/if}

  <div class="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <div class="text-sm text-slate-400">{symbol || '—'}</div>
        <div class="mt-2 text-3xl font-semibold text-white">{quote ? money(quote) : '—'}</div>
      </div>
      {#if trend}
        <div class={trendBadgeClass}>
          <div>{trend.change >= 0 ? '▲' : '▼'} {Math.abs(trend.change).toFixed(2)}</div>
          <div class="text-xs opacity-80">{trend.pct.toFixed(2)}%</div>
        </div>
      {/if}
    </div>

    <div class="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div class="text-slate-500">Position</div>
        <div class="mt-1 font-medium text-white">{position ? `${position.shares} sh` : 'Flat'}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div class="text-slate-500">Avg cost</div>
        <div class="mt-1 font-medium text-white">{position ? money(position.avgPrice) : '—'}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div class="text-slate-500">Buying power</div>
        <div class="mt-1 font-medium text-white">{money($store.cash)}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div class="text-slate-500">Ticket type</div>
        <div class="mt-1 font-medium text-white">{selectedOrderType} · {selectedTif}</div>
      </div>
    </div>
  </div>

  <div class="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <p class="text-sm font-medium text-white">{mode === 'thesis' ? 'Setup builder + ticket' : 'Trade ticket'}</p>
        <p class="text-xs text-slate-500">{mode === 'thesis' ? 'Use the setup worksheet first; the order controls are still visible here because this prototype has not fully split thesis from execution yet.' : 'Configure the order style, notional, trigger levels, and journal context before placing a paper trade.'}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-slate-500">Estimated notional</p>
        <p class="text-lg font-semibold text-white">{effectivePrice ? money(orderValue) : '—'}</p>
      </div>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label class="block">
        <span class="mb-2 block text-sm text-slate-400">Order type</span>
        <select bind:value={selectedOrderType} on:change={() => syncTicket(selectedOrderType, selectedTif)} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
          {#each orderTypes as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-slate-400">Time in force</span>
        <select bind:value={selectedTif} on:change={() => syncTicket(selectedOrderType, selectedTif)} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
          <option value="Day">Day</option>
          <option value="GTC">GTC</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-slate-400">Shares</span>
        <div class="space-y-2">
          <input type="number" bind:value={qty} min="1" step="1" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" />
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span>Max affordable: {maxBuyShares} shares</span>
            <button type="button" on:click={useMaxBuyShares} disabled={maxBuyShares === 0} class="rounded-full border border-slate-700 px-2.5 py-1 font-medium text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50">
              Use max
            </button>
          </div>
        </div>
      </label>
      {#if selectedOrderType === 'Limit'}
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Limit price</span>
          <input type="number" bind:value={limitPrice} min="0.01" step="0.01" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" />
        </label>
      {:else if selectedOrderType === 'Stop'}
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Stop price</span>
          <input type="number" bind:value={stopPrice} min="0.01" step="0.01" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" />
        </label>
      {:else}
        <div class="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
          <div class="text-sm text-slate-400">Execution price</div>
          <div class="mt-2 text-lg font-semibold text-white">{quote ? money(quote) : 'Awaiting quote'}</div>
        </div>
      {/if}
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-3">
      <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm">
        <div class="text-slate-500">Execution basis</div>
        <div class="mt-1 font-medium text-white">{effectivePrice ? money(effectivePrice) : '—'}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm">
        <div class="text-slate-500">Est. fees</div>
        <div class="mt-1 font-medium text-white">{effectivePrice ? money(estimatedFees) : '—'}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm">
        <div class="text-slate-500">Ticket note</div>
        <div class="mt-1 text-white">{orderSummary}</div>
      </div>
    </div>

    <div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-white">Setup worksheet</div>
          <div class="text-xs text-slate-500">Define the setup once so watchlist, alerts, trades, and later reviews all share the same context.</div>
        </div>
        <div class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {setupStatus}
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Setup status</span>
          <select bind:value={setupStatus} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
            {#each setupStatuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Conviction</span>
          <select bind:value={conviction} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
            {#each convictionOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Priority</span>
          <select bind:value={priority} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
            {#each priorityOptions as option}
              <option value={option}>{option}</option>
            {/each}
          </select>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Thesis snippet</span>
          <input bind:value={thesisSummary} maxlength="120" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="One-line version of the setup" />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-2 block text-sm text-slate-400">Core thesis</span>
          <textarea bind:value={thesis} rows="3" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="What do you think the market is mispricing here?"></textarea>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Trigger summary</span>
          <input bind:value={triggerSummary} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="What confirms entry?" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Invalidation summary</span>
          <input bind:value={invalidationSummary} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="What breaks the idea?" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Entry rationale</span>
          <input bind:value={entryRationale} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="Breakout, pullback, catalyst, valuation, etc." />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Risk plan</span>
          <input bind:value={riskPlan} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="Sizing, stop discipline, or conditions to step aside" />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Exit plan</span>
          <input bind:value={exitPlan} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="Targets, trim zones, catalyst window" />
        </label>
        <label class="block md:col-span-2">
          <span class="mb-2 block text-sm text-slate-400">Post-trade / review notes</span>
          <textarea bind:value={postTradeNotes} rows="2" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="What changed? What did you miss? What would you repeat?"></textarea>
        </label>
      </div>

      <div class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm">
        <div>
          <div class="font-medium text-white">Journal status</div>
          <div class="text-slate-500">{journalHint}</div>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" on:click={draftThesisFromResearch} class="rounded-xl border border-violet-500/30 px-4 py-2 text-sm text-violet-200 transition hover:border-violet-400/60 hover:text-white" disabled={aiWorking !== ''}>
            {aiWorking === 'draft' ? 'Drafting…' : 'Draft thesis from research'}
          </button>
          <button type="button" on:click={critiqueCurrentThesis} class="rounded-xl border border-amber-500/30 px-4 py-2 text-sm text-amber-200 transition hover:border-amber-400/60 hover:text-white" disabled={aiWorking !== ''}>
            {aiWorking === 'critique' ? 'Critiquing…' : 'Stress-test my thesis'}
          </button>
          <button type="button" on:click={saveJournal} class="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-500/50 hover:text-white">
            Save setup
          </button>
        </div>
      </div>

      {#if aiState.thesisDraft}
        <div class="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4" data-testid="thesis-ai-draft">
          <div class="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-violet-200">
            <span>AI-assisted draft</span>
            <span class="rounded-full border border-violet-500/30 px-2 py-0.5 text-[10px] normal-case text-violet-100">{aiState.thesisDraft.meta.provider}</span>
          </div>
          <div class="mt-2 text-sm text-slate-200">{aiState.thesisDraft.confidenceNote}</div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Draft summary</div>
              <div class="mt-2">{aiState.thesisDraft.thesisSummary}</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Trigger idea</div>
              <div class="mt-2">{aiState.thesisDraft.triggerSummary}</div>
            </div>
          </div>
        </div>
      {/if}

      {#if aiState.thesisCritique}
        <div class="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4" data-testid="thesis-ai-critique">
          <div class="text-xs uppercase tracking-[0.16em] text-amber-200">AI thesis critique</div>
          <div class="mt-2 text-sm leading-6 text-slate-200">{aiState.thesisCritique.verdict}</div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div class="text-xs uppercase tracking-[0.16em] text-emerald-300">Strengths</div>
              <ul class="mt-2 space-y-1">
                {#each aiState.thesisCritique.strengths as item}
                  <li>• {item}</li>
                {/each}
              </ul>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div class="text-xs uppercase tracking-[0.16em] text-rose-300">Gaps</div>
              <ul class="mt-2 space-y-1">
                {#each aiState.thesisCritique.gaps as item}
                  <li>• {item}</li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-white">Trade preview</div>
          <div class="text-xs text-slate-500">Sanity-check buying power and resulting position before you submit.</div>
        </div>
        <div class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {sanitizedQty} {sanitizedQty === 1 ? 'share' : 'shares'}
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm">
          <div class="text-slate-500">Order value</div>
          <div class="mt-1 font-medium text-white">{effectivePrice ? money(orderValue) : '—'}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm">
          <div class="text-slate-500">Buying power after buy</div>
          <div class="mt-1 font-medium text-white">{effectivePrice ? money(projectedBuyingPower) : '—'}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm">
          <div class="text-slate-500">Position after buy</div>
          <div class="mt-1 font-medium text-white">{effectivePrice ? `${projectedPositionShares} sh` : '—'}</div>
        </div>
        <div class="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm">
          <div class="text-slate-500">Buying power after sell</div>
          <div class="mt-1 font-medium text-white">{effectivePrice ? money(projectedSellBuyingPower) : '—'}</div>
          <div class="mt-1 text-xs text-slate-500">Position after sell: {effectivePrice ? `${projectedSellPositionShares} sh` : '—'}</div>
        </div>
      </div>

      {#if buyDisabledReason}
        <div class="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Buy check: {buyDisabledReason}
        </div>
      {/if}

      {#if sellDisabledReason}
        <div class="mt-3 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
          Sell check: {sellDisabledReason}
        </div>
      {/if}
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <button on:click={onBuy} disabled={!!buyDisabledReason} class="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
        Buy shares
      </button>
      <button on:click={onSell} disabled={!canSell} class="rounded-xl bg-rose-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50">
        Sell shares
      </button>
    </div>
  </div>
</div>
