<script lang="ts">
  import store from '../store'
  import { getAccountabilitySummary, type AccountabilityBucket } from './accountability'

  const groups = [
    {
      key: 'openWithoutThesis',
      label: 'Open positions missing a thesis',
      empty: 'Every open position has a reason attached.'
    },
    {
      key: 'openWithoutRisk',
      label: 'Open positions missing a risk plan',
      empty: 'Every open risk has at least a basic invalidation plan.'
    },
    {
      key: 'reviewMissingNotes',
      label: 'Closed trades still waiting on review',
      empty: 'Closed trades already have review notes logged.'
    },
    {
      key: 'staleReady',
      label: 'Ready setups that went stale',
      empty: 'No old ready setups are sitting around collecting dust.'
    }
  ] as const

  const snippet = (value = '', max = 90) => {
    const clean = value.trim()
    if (!clean) return ''
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
  }

  const priorityClass = (priority: AccountabilityBucket['priority']) =>
    priority === 'high'
      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'

  $: summary = getAccountabilitySummary($store)
</script>

<div class="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 backdrop-blur">
  <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Accountability</p>
      <h2 class="mt-1 text-lg font-semibold text-white">What needs attention</h2>
      <p class="mt-1 max-w-2xl text-sm text-slate-400">This is the anti-random-clicking view: unfinished setups, missing risk plans, stale ready ideas, and trades that never got reviewed.</p>
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm">
        <div class="text-slate-500">Issues</div>
        <div class="mt-1 text-2xl font-semibold text-white">{summary.totalIssues}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm">
        <div class="text-slate-500">Symbols at risk</div>
        <div class="mt-1 text-2xl font-semibold text-white">{summary.symbolsNeedingAttention}</div>
      </div>
      <div class="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm">
        <div class="text-slate-500">Workflow health</div>
        <div class="mt-1 text-2xl font-semibold text-white">{summary.completionRate.toFixed(0)}%</div>
      </div>
    </div>
  </div>

  <div class="mt-5 grid gap-4 xl:grid-cols-2">
    {#each groups as group}
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-medium text-white">{group.label}</h3>
          <span class="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">{summary[group.key].length}</span>
        </div>

        {#if summary[group.key].length === 0}
          <div class="mt-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/60 px-4 py-5 text-sm text-slate-500">
            {group.empty}
          </div>
        {:else}
          <div class="mt-4 space-y-3">
            {#each summary[group.key] as item}
              <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="font-medium text-white">{item.symbol}</div>
                  <span class="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-sky-300">{item.setupStatus}</span>
                  <span class={`rounded-full border px-2.5 py-1 text-[11px] ${priorityClass(item.priority)}`}>{item.priority} priority</span>
                </div>
                {#if item.thesis}
                  <div class="mt-2 text-xs text-slate-500">{snippet(item.thesis)}</div>
                {/if}
                <div class="mt-2 leading-6 text-slate-300">{item.detail}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
