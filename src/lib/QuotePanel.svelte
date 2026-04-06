<script lang="ts">
  import { fetchQuote } from '../alpha'
  import store, { buy, getJournal, sell, setOrderTicket, setQuote, setSelectedSymbol, updateTradeJournal } from '../store'
  import type { OrderType, SetupStatus, TradeJournal } from '../types'

  const presets = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META']
  const orderTypes: OrderType[] = ['Market', 'Limit', 'Stop']
  const setupStatuses: SetupStatus[] = ['Watching', 'Building', 'Ready', 'Executed', 'Reviewing']
  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  let ticker = 'AAPL'
  let fetching = false
  let error = ''
  let success = ''
  let qty = 10
  let limitPrice = 0
  let stopPrice = 0
  let selectedTif: 'Day' | 'GTC' = 'Day'
  let selectedOrderType: OrderType = 'Market'
  let thesis = ''
  let entryRationale = ''
  let riskPlan = ''
  let exitPlan = ''
  let postTradeNotes = ''
  let setupStatus: SetupStatus = 'Watching'
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
  $: journalHint = thesis.trim()
    ? 'Thesis will be attached to the next execution.'
    : 'Add a thesis so your trade history captures why the position existed.'
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
    entryRationale = journal.entryRationale
    riskPlan = journal.riskPlan
    exitPlan = journal.exitPlan
    postTradeNotes = journal.postTradeNotes
    setupStatus = journal.setupStatus
    lastJournalSymbol = symbol
  }

  function currentJournal(): Partial<TradeJournal> {
    return {
      thesis,
      setupStatus,
      entryRationale,
      riskPlan,
      exitPlan,
      postTradeNotes
    }
  }

  function saveJournal() {
    if (!symbol) return
    updateTradeJournal(symbol, currentJournal())
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
      <h2 class="mt-1 text-lg font-semibold text-white">Research &amp; execute</h2>
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
        <p class="text-sm font-medium text-white">Trade ticket</p>
        <p class="text-xs text-slate-500">Configure the order style, notional, trigger levels, and journal context before placing a paper trade.</p>
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
          <div class="text-sm font-medium text-white">Trade thesis</div>
          <div class="text-xs text-slate-500">Write down why the setup exists before the simulated money moves.</div>
        </div>
        <div class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {setupStatus}
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <label class="block md:col-span-2">
          <span class="mb-2 block text-sm text-slate-400">Core thesis</span>
          <textarea bind:value={thesis} rows="3" class="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="What do you think the market is mispricing here?"></textarea>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Setup status</span>
          <select bind:value={setupStatus} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500">
            {#each setupStatuses as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Entry rationale</span>
          <input bind:value={entryRationale} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="Breakout, pullback, catalyst, valuation, etc." />
        </label>
        <label class="block">
          <span class="mb-2 block text-sm text-slate-400">Risk plan</span>
          <input bind:value={riskPlan} class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-sky-500" placeholder="Invalidation, sizing, or stop discipline" />
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
        <button type="button" on:click={saveJournal} class="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-500/50 hover:text-white">
          Save thesis
        </button>
      </div>
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
