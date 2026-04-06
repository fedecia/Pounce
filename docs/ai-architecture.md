# Pounce AI integration architecture (first pass)

_Last updated: 2026-04-06_

## Goal

Add useful AI help to Pounce without turning the app into framework soup.

The first pass should help with four concrete product jobs:

1. draft a thesis from research,
2. critique a thesis,
3. explain whether a setup is backtest-ready in plain English,
4. explain research/alert context in a way that is tied to the user's actual setup.

## Opinionated architecture

### 1. Keep AI behind a tiny typed client

Pounce now uses `src/ai.ts` as the integration boundary.

That file defines:

- typed input/output contracts for each feature,
- a tiny `AiClient` interface,
- a default `local-heuristic` provider,
- metadata wrappers so the UI can label outputs as AI-assisted.

This keeps AI product logic separate from Svelte components and makes it easy to swap in a real provider later.

### 2. Start with deterministic local generation, not network-dependent magic

For prototype value, the app should not depend on a secret key or backend just to prove the workflow.

So the current implementation uses a deterministic local provider that turns:

- research snapshot,
- journal fields,
- alert context,
- current trend/price,

into structured drafts/explanations.

This gives us:

- immediate UX validation,
- predictable tests,
- no secret leakage from the browser,
- a clean seam for a future server-side provider.

### 3. Persist outputs per symbol in app state

AI outputs are stored under `state.ai.symbols[symbol]`.

That lets multiple surfaces share the same generated artifacts:

- Research panel → research brief
- Thesis / execution panel → thesis draft + critique
- Backtest panel → plain-English summary
- Alert center → per-event explanation

### 4. Advisory, never authoritative

Every AI object carries metadata with:

- provider id,
- generated timestamp,
- advisory disclaimer.

This matters because Pounce is a decision-support product, not an auto-trading product.

## Current UI surfaces

### Research
- **AI research brief**
- bull case / bear case
- focus chips

### Thesis
- **Draft thesis from research**
- **Stress-test my thesis**
- generated draft and critique panels

### Backtest
- **Explain this setup like a backtest coach**
- plain-English readiness summary and caveats

### Alerts
- **Explain this alert**
- links the move back to the thesis and recommended next action

## Why this is the right first pass

Because it improves product usefulness now without pretending the hard infra problems are solved.

It is:

- typed,
- testable,
- cheap,
- deterministic,
- easy to replace.

## Future upgrade path

When Pounce is ready for real model calls, keep the same typed interface and swap provider implementation.

Recommended next step:

1. move model calls behind a small server endpoint,
2. keep prompt assembly server-side,
3. pass only normalized typed inputs from the client,
4. cache by `(feature, symbol, content hash)`,
5. preserve the same UI/state contracts.

That means the UI should not care whether output came from:

- local heuristic provider,
- OpenAI-compatible backend,
- Anthropic backend,
- hybrid rule+LLM service.

## Non-goals for this phase

- autonomous agents
- background multi-step workflows
- direct browser-to-LLM API calls with secrets
- giant prompt framework dependencies
- freeform AI chat pane with no product structure

That stuff can come later if it earns its keep.
