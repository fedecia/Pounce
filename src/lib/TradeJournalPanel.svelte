<script lang="ts">
  import store, { getJournal } from '../store'

  export let tone: 'classic' | 'playful' = 'classic'

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
  $: thesisLine = snippet(journal.thesisSummary || journal.thesis, 140, 'Write a one-line thesis people can repeat back.')
  $: triggerLine = snippet(journal.triggerSummary || journal.entryRationale, 120, 'Missing trigger — not shareable yet.')
  $: riskLine = snippet(journal.invalidationSummary || journal.riskPlan, 120, 'Missing risk line — still vibes.')
  $: shareTone = journal.setupStatus === 'Ready' || (journal.thesisSummary.trim() && (journal.triggerSummary.trim() || journal.entryRationale.trim()) && (journal.riskPlan.trim() || journal.invalidationSummary.trim()))
    ? 'border-emerald-500/20 bg-emerald-500/5'
    : 'border-slate-800 bg-slate-950/70'
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-4 flex items-center justify-between gap-3">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Journal</p>
      <h2 class="mt-1 text-lg font-semibold text-white">Setup at a glance</h2>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2 text-xs">
      {#if journal.strategyTemplateName}
        <span class="rounded-full border border-slate-700 px-3 py-1 text-amber-300">
          Strategy: {journal.strategyTemplateName}{#if tone === 'playful' && journal.strategyTemplateId} · {journal.strategyTemplateName === 'Breakout continuation' ? 'Door kicker' : journal.strategyTemplateName === 'Pullback in uptrend' ? 'Second-chance lift' : journal.strategyTemplateName === 'Earnings follow-through' ? 'Afterglow' : journal.strategyTemplateName === 'Oversold bounce' ? 'Dead-cat with rules' : 'Slow burn'}{/if}
        </span>
      {/if}
      <span class="rounded-full border border-slate-700 px-3 py-1 text-slate-400">{symbol} · {journal.setupStatus}</span>
      <span class="rounded-full border border-slate-700 px-3 py-1 text-sky-300">{journal.conviction} conviction</span>
      <span class="rounded-full border border-slate-700 px-3 py-1 text-violet-300">{journal.priority}</span>
    </div>
  </div>

  {#if !hasContent}
    <div class="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-500">
      Add the thesis, trigger, invalidation, and risk plan before you trade. That context will follow the setup everywhere else.
    </div>
  {:else}
    <div class={`mb-4 rounded-2xl border p-4 shadow-2xl shadow-black/10 ${shareTone}`} data-testid="setup-share-card">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div class="text-xs uppercase tracking-[0.16em] text-cyan-300">Shareable setup snapshot</div>
          <h3 class="mt-1 text-lg font-semibold text-white">Readable in one glance, grounded in the actual setup</h3>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-400">This is the kind of compact summary a trader could screenshot, paste into chat, or revisit later without losing the plot.</p>
        </div>
        <div class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{symbol} · {journal.setupStatus}</div>
      </div>

      <div class="mt-4 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.55),rgba(15,23,42,0.95))] p-4">
        <div class="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Pounce thesis card</div>
        <div class="mt-2 text-xl font-semibold text-white">{thesisLine}</div>
        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <div class="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <div class="text-[11px] uppercase tracking-[0.16em] text-slate-400">Trigger</div>
            <div class="mt-2 text-sm leading-6 text-slate-100">{triggerLine}</div>
          </div>
          <div class="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <div class="text-[11px] uppercase tracking-[0.16em] text-slate-400">Risk</div>
            <div class="mt-2 text-sm leading-6 text-slate-100">{riskLine}</div>
          </div>
          <div class="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <div class="text-[11px] uppercase tracking-[0.16em] text-slate-400">Tone check</div>
            <div class="mt-2 text-sm leading-6 text-slate-100">{journal.conviction} conviction · {journal.priority} priority</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">One-line thesis</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{snippet(journal.thesisSummary, 140, 'No one-line thesis saved.')}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:col-span-2 xl:col-span-2">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Full thesis</div>
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
