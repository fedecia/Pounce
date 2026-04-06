<script lang="ts">
  import store, { getJournal } from '../store'

  const snippet = (value: string, length = 96, fallback = '—') => {
    const clean = value.trim()
    if (!clean) return fallback
    return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean
  }

  $: symbol = $store.selectedSymbol
  $: journal = getJournal(symbol, $store.journals)
  $: hasContent = [
    journal.thesis,
    journal.thesisSummary,
    journal.entryRationale,
    journal.triggerSummary,
    journal.riskPlan,
    journal.invalidationSummary,
    journal.exitPlan,
    journal.postTradeNotes
  ].some((field) => field.trim().length > 0)
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-4 flex items-center justify-between gap-3">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Journal</p>
      <h2 class="mt-1 text-lg font-semibold text-white">Setup snapshot</h2>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2 text-xs">
      <span class="rounded-full border border-slate-700 px-3 py-1 text-slate-400">{symbol} · {journal.setupStatus}</span>
      <span class="rounded-full border border-slate-700 px-3 py-1 text-sky-300">{journal.conviction} conviction</span>
      <span class="rounded-full border border-slate-700 px-3 py-1 text-violet-300">{journal.priority}</span>
    </div>
  </div>

  {#if !hasContent}
    <div class="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-500">
      Add a thesis, trigger, invalidation, and risk plan in the worksheet before you trade. That context will follow the setup.
    </div>
  {:else}
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Thesis snippet</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.thesisSummary, 140, 'No one-line thesis saved.')}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:col-span-2 xl:col-span-2">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Core thesis</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.thesis, 260, 'No detailed thesis saved.')}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Trigger</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.triggerSummary || journal.entryRationale, 180, 'No trigger captured yet.')}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Invalidation</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.invalidationSummary || journal.riskPlan, 180, 'No invalidation captured yet.')}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Risk &amp; exit</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(`${journal.riskPlan}${journal.riskPlan && journal.exitPlan ? ' · ' : ''}${journal.exitPlan}`, 180, 'No risk or exit plan saved.')}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:col-span-2 xl:col-span-3">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Review notes</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.postTradeNotes, 260, 'No review notes yet.')}</div>
      </div>
    </div>
  {/if}
</div>
