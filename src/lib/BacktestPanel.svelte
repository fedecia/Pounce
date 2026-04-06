<script lang="ts">
  import { createAiClient, buildBacktestSummaryInput, getSymbolAiState } from '../ai'
  import store, { saveBacktestSummary } from '../store'

  const ai = createAiClient()
  let loading = false

  $: symbol = $store.selectedSymbol
  $: state = getSymbolAiState(symbol, $store.ai)
  $: summary = state.backtestSummary

  async function generateSummary() {
    loading = true
    try {
      const result = await ai.summarizeBacktest(buildBacktestSummaryInput($store, symbol))
      saveBacktestSummary(symbol, result)
    } finally {
      loading = false
    }
  }
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <div class="text-xs uppercase tracking-[0.2em] text-amber-300">Backtest</div>
      <h2 class="mt-1 text-lg font-semibold text-white">Would this have worked?</h2>
      <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        First pass: generate a plain-English read on whether this setup is defined enough to deserve a real backtest run.
      </p>
    </div>
    <button on:click={generateSummary} class="rounded-xl bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-400" disabled={loading}>
      {loading ? 'Explaining…' : 'Explain this setup like a backtest coach'}
    </button>
  </div>

  {#if summary}
    <div class="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]" data-testid="backtest-ai-summary">
      <div class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div class="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-amber-200">
          <span>AI-assisted summary</span>
          <span class="rounded-full border border-amber-500/30 px-2 py-0.5 text-[10px] normal-case text-amber-100">{summary.meta.provider}</span>
        </div>
        <div class="mt-2 text-lg font-semibold text-white">{summary.headline}</div>
        <div class="mt-2 text-sm leading-6 text-slate-200">{summary.summary}</div>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Caveats</div>
        <ul class="mt-3 space-y-2 text-sm text-slate-300">
          {#each summary.caveats as caveat}
            <li>• {caveat}</li>
          {/each}
        </ul>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 xl:col-span-2">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">What this says in practice</div>
        <div class="mt-3 grid gap-2 md:grid-cols-3">
          {#each summary.bullets as bullet}
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-200">{bullet}</div>
          {/each}
        </div>
        <div class="mt-3 text-xs text-slate-500">{summary.meta.advisory}</div>
      </div>
    </div>
  {:else}
    <div class="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-400">
      No summary yet. Generate one after you outline the thesis, trigger, and risk plan so the app can tell you whether the idea is even backtest-ready.
    </div>
  {/if}
</div>
