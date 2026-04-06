<script lang="ts">
  import store, { getJournal } from '../store'

  const snippet = (value: string, length = 96) => {
    const clean = value.trim()
    if (!clean) return '—'
    return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean
  }

  $: symbol = $store.selectedSymbol
  $: journal = getJournal(symbol, $store.journals)
  $: hasContent = [journal.thesis, journal.entryRationale, journal.riskPlan, journal.exitPlan, journal.postTradeNotes]
    .some((field) => field.trim().length > 0)
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-4 flex items-center justify-between gap-3">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Journal</p>
      <h2 class="mt-1 text-lg font-semibold text-white">Trade thesis snapshot</h2>
    </div>
    <span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">{symbol} · {journal.setupStatus}</span>
  </div>

  {#if !hasContent}
    <div class="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-500">
      Add a thesis, trigger, and risk plan in the ticket before you trade. That context will follow the execution.
    </div>
  {:else}
    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Thesis</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.thesis, 180)}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Entry rationale</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.entryRationale, 180)}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Risk plan</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.riskPlan, 180)}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Exit / review</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.postTradeNotes || journal.exitPlan, 180)}</div>
      </div>
    </div>
  {/if}
</div>
