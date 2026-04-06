<script lang="ts">
  import { onMount } from 'svelte'
  import store from '../store'
  import { createAiClient, getSymbolAiState } from '../ai'
  import { saveResearchBrief } from '../store'
  import { fetchResearchSnapshot, type ResearchHeadline, type ResearchSnapshot } from '../research'

  const ai = createAiClient()

  const fallback: ResearchSnapshot = {
    catalyst: 'Loading live company context…',
    thesis: 'Pulling recent headlines and company metadata for a less fake research view.',
    headlines: [],
    signals: ['Fetching context'],
    sourceLabel: 'Loading'
  }

  const sentimentClass = (sentiment: ResearchHeadline['sentiment']) =>
    sentiment === 'Bullish'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      : sentiment === 'Cautious'
        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
        : 'bg-slate-800 text-slate-300 border-slate-700'

  function formatTimestamp(value?: string) {
    if (!value) return 'Fresh pull'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Fresh pull'
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  let research: ResearchSnapshot = fallback
  let loading = false
  let aiLoading = false
  let lastLoadedSymbol = ''

  async function loadResearch(symbol: string) {
    const normalized = symbol.toUpperCase().trim()
    if (!normalized || loading || normalized === lastLoadedSymbol) return

    loading = true
    try {
      research = await fetchResearchSnapshot(normalized)
      const brief = await ai.explainResearch({ symbol: normalized, research, trendPct: $store.trend[normalized]?.pct })
      saveResearchBrief(normalized, brief)
      lastLoadedSymbol = normalized
    } catch {
      research = fallback
      lastLoadedSymbol = normalized
    } finally {
      loading = false
    }
  }

  async function refreshAiBrief() {
    aiLoading = true
    try {
      const brief = await ai.explainResearch({ symbol, research, trendPct: trend?.pct })
      saveResearchBrief(symbol, brief)
    } finally {
      aiLoading = false
    }
  }

  onMount(() => {
    loadResearch($store.selectedSymbol || 'AAPL')
  })

  $: symbol = $store.selectedSymbol || 'AAPL'
  $: trend = $store.trend[symbol]
  $: price = $store.prices[symbol] || $store.quotes[symbol] || 0
  $: aiState = getSymbolAiState(symbol, $store.ai)
  $: momentum = trend ? `${trend.pct >= 0 ? '+' : ''}${trend.pct.toFixed(2)}% today` : 'Awaiting quote refresh'
  $: if (symbol && symbol !== lastLoadedSymbol) {
    loadResearch(symbol)
  }
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="mb-5 flex items-start justify-between gap-3">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Research hub</p>
      <h2 class="mt-1 text-lg font-semibold text-white">News &amp; analyst context</h2>
    </div>
    <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-right">
      <div class="text-xs text-slate-500">Focus</div>
      <div class="text-sm font-semibold text-white">{symbol}</div>
      <div class="text-xs text-slate-500">{price ? `$${price.toFixed(2)}` : 'No live quote'} · {momentum}</div>
    </div>
  </div>

  <div class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
    <div class="space-y-4">
      <div class="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4" data-testid="research-ai-brief">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <div class="text-xs uppercase tracking-[0.16em] text-sky-300">AI research brief</div>
            <div class="mt-1 text-sm text-slate-400">Compress the moving pieces before you start writing a thesis.</div>
          </div>
          <button on:click={refreshAiBrief} class="rounded-xl border border-sky-500/30 bg-slate-950/70 px-3 py-2 text-xs text-sky-200 transition hover:border-sky-400/60 hover:text-white" disabled={aiLoading}>
            {aiLoading ? 'Refreshing…' : 'Refresh brief'}
          </button>
        </div>

        {#if aiState.researchBrief}
          <div class="text-sm leading-6 text-slate-200">{aiState.researchBrief.summary}</div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div class="text-xs uppercase tracking-[0.16em] text-emerald-300">Bull case</div>
              <div class="mt-2">{aiState.researchBrief.bullCase}</div>
            </div>
            <div class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
              <div class="text-xs uppercase tracking-[0.16em] text-rose-300">Bear case</div>
              <div class="mt-2">{aiState.researchBrief.bearCase}</div>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each aiState.researchBrief.focus as focus}
              <span class="rounded-full border border-sky-500/20 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-sky-100">{focus}</span>
            {/each}
          </div>
          <div class="mt-3 text-xs text-slate-500">{aiState.researchBrief.meta.advisory}</div>
        {:else}
          <div class="text-sm text-slate-400">AI brief not generated yet.</div>
        {/if}
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Primary catalyst</div>
        <div class="mt-2 text-sm leading-6 text-slate-300">{research.catalyst}</div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Desk view</div>
        <div class="mt-2 text-sm leading-6 text-slate-300">{research.thesis}</div>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div class="text-xs uppercase tracking-[0.16em] text-slate-500">Signals to track</div>
          <div class="text-[11px] text-slate-500">{research.sourceLabel}</div>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each research.signals as signal}
            <span class="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300">{signal}</span>
          {/each}
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-medium text-white">Latest headlines</div>
          <div class="mt-1 text-[11px] text-slate-500">Updated {formatTimestamp(research.updatedAt)}</div>
        </div>
        <div class="text-xs text-slate-500">{loading ? 'Refreshing…' : 'Live web pull'}</div>
      </div>
      <div class="space-y-3">
        {#if research.headlines.length === 0}
          <div class="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
            No live headlines came back for this symbol, so the panel is using a conservative fallback.
          </div>
        {:else}
          {#each research.headlines as item}
            <a
              class="block rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700 hover:bg-slate-900"
              href={item.link || '#'}
              target="_blank"
              rel="noreferrer"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-medium leading-6 text-white">{item.title}</div>
                  <div class="mt-2 text-xs text-slate-500">{item.source} · {item.tag}{item.publishedAt ? ` · ${formatTimestamp(item.publishedAt)}` : ''}</div>
                </div>
                <span class={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sentimentClass(item.sentiment)}`}>
                  {item.sentiment}
                </span>
              </div>
            </a>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
