# AI architecture decision: do not adopt LangChain yet

_Last updated: 2026-04-06_

## Recommendation

**Do not make LangChain a core dependency for Pounce right now.**

For the product Pounce is actually building, the better default is:

- **direct model-provider SDK calls** for generation,
- a small **internal AI service layer** with typed inputs/outputs,
- explicit prompt templates per workflow,
- caching + async job handling where latency matters,
- optional schema validation for structured responses.

Revisit LangChain only if Pounce later ships **real tool orchestration** or **multi-step agent workflows** that are painful to maintain in plain application code.

## Why this fits Pounce's roadmap

The roadmap and feature spec point to a very specific set of AI features:

1. **Thesis drafting from research**
2. **Critique / stress-test of an existing thesis**
3. **Bull vs bear / catalyst summaries**
4. **Backtest result explanations in plain English**
5. **Maybe later:** turning thesis/template data into a backtest rule draft
6. **Much later, maybe:** tool orchestration across research, backtest, alerts, and review

Those first five are mostly **single-request structured generation tasks**, not long chains of reasoning with many external tools.

That matters because LangChain is most useful when you actually need framework help for:

- tool calling across multiple systems,
- retrieval pipelines,
- graph/stateful agent workflows,
- memory abstractions,
- evaluation/tracing around many LLM steps.

Pounce's current needs are much simpler:

- take known product data,
- send it to a model with good instructions,
- get back structured draft text,
- show it clearly as **advisory**,
- never let it silently mutate the user's trading intent.

That is better handled with a small app-owned layer than a general orchestration framework.

## Product reasons to avoid LangChain for now

### 1. The core problem is trust and UX, not chain complexity

Pounce's AI has to feel like:

- a drafting assistant,
- a critique partner,
- an explainer,
- never a fake trading oracle.

The hard part is product behavior:

- clear disclaimers,
- preserving user authorship,
- citing source snippets when available,
- keeping outputs concise,
- tying every suggestion back to thesis / risk / review workflows.

LangChain does not solve those product decisions. It mostly adds abstraction around calling models.

### 2. Pounce should prefer deterministic, inspectable flows

For thesis drafting and backtest explanations, the app should be able to say exactly:

- what inputs were sent,
- which prompt version was used,
- which source snippets were included,
- what structured fields came back,
- whether the user accepted or edited the draft.

A thin internal service makes that easier to reason about and debug.

### 3. Over-abstraction is expensive this early

Pounce is still defining:

- the thesis object,
- template system,
- backtest schema,
- review artifacts,
- the exact UI contract for AI outputs.

Introducing LangChain now risks building around framework abstractions before the product contracts are stable.

That usually creates extra migration work later, not less.

### 4. Latency/cost control matters more than framework flexibility

The feature spec already calls out LLM cost + latency. For Pounce's first AI features, the wins are likely to come from:

- caching per symbol/research snapshot,
- batching context sensibly,
- async job states in UI,
- limiting output length,
- using cheaper models for summarization and better models only where critique quality matters.

None of that requires LangChain.

## Technical recommendation

Build a simple app-owned AI module instead.

## Suggested architecture

### 1. One internal AI boundary

Create a small service layer, e.g. `src/lib/ai/` or backend equivalent, with explicit functions such as:

- `draftThesis(input)`
- `critiqueThesis(input)`
- `summarizeBullBear(input)`
- `explainBacktestResults(input)`
- `suggestBacktestRules(input)`

Each function should:

- accept a typed request object,
- assemble prompt + context intentionally,
- request a structured model response,
- validate output shape,
- return both user-facing content and metadata.

### 2. Typed schemas over free-form blobs

For example, `draftThesis` should return fields like:

- `summary`
- `catalysts[]`
- `entryIdeas[]`
- `invalidationIdeas[]`
- `exitIdeas[]`
- `disclaimer`
- `sourceAttributions[]`

That matches the feature spec better than raw markdown dumps.

### 3. Store prompt/version metadata

Persist enough metadata to debug and improve quality:

- model name
- prompt version
- research snapshot id/hash
- template id
- latency
- token/cost estimate if available
- accepted / edited / dismissed outcome

This is more useful to Pounce than adopting a framework first.

### 4. Keep generation mostly single-step

For now, prefer one deliberate model call per user action.

Examples:

- **Draft thesis from research** → one structured call
- **Stress-test my thesis** → one structured call
- **Explain this backtest** → one structured call against already-computed metrics/trades

That keeps behavior predictable and easier to evaluate.

## When LangChain would start making sense

LangChain becomes more reasonable if Pounce later ships something like:

### A. Real tool orchestration

Example workflow:

1. inspect thesis
2. fetch missing research context
3. query catalyst calendar
4. request backtest variant
5. compare results
6. generate next-action recommendation

If that becomes a true multi-tool graph with retries, branching, and stateful execution, framework support may help.

### B. Multi-source retrieval

If Pounce builds a durable knowledge layer over:

- saved theses,
- review history,
- strategy templates,
- past backtest runs,
- clipped research artifacts,

then a retrieval framework may become useful. Even then, plain embeddings + app code may still be enough at first.

### C. Formal tracing/evals at scale

If the team starts running many prompt variants, offline evals, and agent traces, a framework or observability stack could be justified.

## Decision rule for later

Reconsider LangChain only when **at least two** of these become true:

- AI workflows need more than one model/tool step per user action
- prompt orchestration logic is duplicated across features
- retrieval over saved Pounce artifacts becomes a core feature
- debugging/evaluation of multi-step runs becomes a bottleneck

Until then, keep the stack simpler.

## What to use instead right now

Practical stack recommendation:

- model provider SDK directly
- JSON/schema-constrained outputs where supported
- lightweight validation layer
- app-level logging/tracing
- app-owned prompt files/templates
- caching keyed to symbol + research snapshot + thesis revision

If a helper library is desired, prefer **small focused utilities** over a heavy orchestration dependency.

## Pounce-specific implementation priorities

In order:

1. **Ship thesis drafting and critique as tightly scoped structured actions**
2. **Ship backtest explanation on top of deterministic backtest outputs**
3. **Instrument acceptance/edit rates to learn what users actually value**
4. **Only then consider richer orchestration**

This matches the product roadmap better than introducing an agent framework early.

## Bottom line

Pounce should treat AI as a **support layer inside a thesis-driven workflow**, not as the product's operating system.

So the answer is:

- **No LangChain by default now**
- **Yes to a small typed AI service owned by the app**
- **Revisit later only if Pounce graduates into true multi-step tool orchestration**
