<script lang="ts">
  import store from '../store'
  import type { OrderSide, TradeJournal } from '../types'

  const fmtMoney = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const fmtTime = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value))

  const badgeClass = (side: OrderSide) =>
    side === 'BUY'
      ? 'rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300'
      : 'rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300'

  const snippet = (value = '', max = 120) => {
    const clean = value.trim()
    if (!clean) return ''
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
  }

  const journalItems = (journal?: TradeJournal) => {
    if (!journal) return []
    return [
      journal.thesisSummary || journal.thesis ? { label: 'Setup', value: snippet(journal.thesisSummary || journal.thesis) } : null,
      journal.triggerSummary || journal.entryRationale ? { label: 'Trigger', value: snippet(journal.triggerSummary || journal.entryRationale, 90) } : null,
      journal.invalidationSummary || journal.riskPlan ? { label: 'Invalidation', value: snippet(journal.invalidationSummary || journal.riskPlan, 90) } : null,
      journal.postTradeNotes ? { label: 'Review', value: snippet(journal.postTradeNotes, 90) } : null
    ].filter(Boolean) as Array<{ label: string; value: string }>
  }
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-4 flex items-center justify-between">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Activity</p>
      <h2 class="text-lg font-semibold text-white">Recent activity</h2>
    </div>
    <span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
      {$store.trades.length} recorded
    </span>
  </div>

  {#if $store.trades.length === 0}
    <div class="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-500">
      No trades yet. Pull a quote, write the setup, and place your first paper trade when you're ready.
    </div>
  {:else}
    <div class="space-y-3">
      {#each $store.trades as trade}
        <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class={badgeClass(trade.side)}>
                {trade.side}
              </span>
              <div>
                <div class="font-medium text-white">{trade.ticker} · {trade.qty} shares</div>
                <div class="text-xs text-slate-500">{fmtTime(trade.timestamp)} · {fmtMoney(trade.price)} / share</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium text-white">{fmtMoney(trade.value)}</div>
              <div class="text-xs text-slate-500">trade value</div>
            </div>
          </div>

          {#if trade.journal}
            <div class="mt-3 grid gap-2 md:grid-cols-2">
              {#each journalItems(trade.journal) as item}
                <div class="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs">
                  <div class="uppercase tracking-[0.14em] text-slate-500">{item.label}</div>
                  <div class="mt-1 leading-5 text-slate-200">{item.value}</div>
                </div>
              {/each}
            </div>
          {/if}

          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-slate-300">{trade.orderType}</span>
            {#if trade.journal}
              <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-sky-300">{trade.journal.setupStatus}</span>
              <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-emerald-300">{trade.journal.conviction}</span>
              <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-violet-300">{trade.journal.priority}</span>
            {/if}
            <span class="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-slate-400">Saved locally</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
