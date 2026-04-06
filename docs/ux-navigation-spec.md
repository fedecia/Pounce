# Pounce UX / Navigation Spec

_Last updated: 2026-04-06_

## TL;DR

Pounce should evolve from a single long trading dashboard into a **workflow-driven workspace** organized around:

**Research → Thesis → Backtest → Monitor → Act → Review**

The current app already contains most of the raw ingredients, but they are stacked as one dense page. The right next move is **not** a full redesign. It is to add clearer navigation, sharper section ownership, and progressive disclosure so the product feels like one coherent decision loop instead of a finance-themed component pile.

---

## 1. What exists today

Current surface, in order:

1. hero + top metrics
2. watchlist + alerts rail
3. market overview
4. account panel
5. quote workstation
6. research hub
7. trade journal snapshot
8. portfolio
9. activity feed

### What is already working

- There is already a strong single-symbol focus via `selectedSymbol`.
- Watchlist, alerts, journal, portfolio, and executions all share state.
- The journal model already hints at a thesis lifecycle (`Watching`, `Building`, `Ready`, `Executed`, `Reviewing`).
- Alerts already carry thesis-aware context in history.
- The app already feels like a cockpit, which is good for power users.

### Current UX problems

1. **The page is organized by components, not by user intent.**
   - Example: research and execution are visually adjacent, but thesis/review are separated lower on the page.

2. **The main workflow is implicit, not explicit.**
   - A new user can’t immediately tell: “What do I do first?”

3. **Everything feels equally important.**
   - Research, monitoring, execution, and review compete for attention at once.

4. **Backtest has no place in the information architecture yet.**
   - It exists in product direction, but not in navigation structure.

5. **Account-wide metrics are overexposed relative to workflow state.**
   - Useful, but they dominate early attention more than thesis progress does.

---

## 2. Product IA recommendation

The core IA should follow the user's decision loop, not a broker’s layout.

## Primary navigation model

### Level 1: Workflow nav
Use six persistent steps as the top-level product map:

1. **Research**
2. **Thesis**
3. **Backtest**
4. **Monitor**
5. **Act**
6. **Review**

These should be visible on desktop at all times near the top of the workspace and remain lightweight on mobile as scrollable pills or tabs.

### Level 2: Context rail
The left rail should remain symbol-centric and stateful:

- watchlist
- setup status
- priority / conviction
- alerts summary
- stale / review-needed badges

Think of the left rail as **“what universe am I working from?”**

### Level 3: Main canvas
The center/right canvas should show the current workflow stage for the selected symbol.

Think of the main canvas as **“what am I doing with this symbol right now?”**

---

## 3. Recommended page structure

## Near-term structure (still single-page, but coherent)

Keep the app one-page for now, but group it into obvious workflow sections:

### A. Global header
- product title
- selected symbol
- timeframe
- reset
- workflow progress nav

### B. Left rail: Monitor / context
Keep persistent:
- watchlist
- alert center
- market pulse / quick notes

Reason: this is ambient context and should stay available while the user moves through the loop.

### C. Main canvas sections

#### 1. Research
Current components:
- MarketOverview
- ResearchPanel

Purpose:
- what is happening now?
- why is this symbol interesting?

#### 2. Thesis
Current components:
- QuotePanel journal fields
- TradeJournalPanel snapshot

Purpose:
- what is my idea?
- what confirms it?
- what breaks it?

Recommendation:
- the thesis editor should become its own distinct surface, not just part of the order ticket.

#### 3. Backtest
Current state:
- missing as a UI section

Recommendation:
- add a reserved placeholder section now
- later this becomes a full backtest builder + results view

Purpose:
- should this setup earn trust?

#### 4. Monitor
Current components:
- watchlist state
- alerts
- account/portfolio overview

Purpose:
- what needs attention right now?

Recommendation:
- the account panel should be secondary to setup health and alert context

#### 5. Act
Current components:
- QuotePanel order controls

Purpose:
- execute with thesis and risk context in view

Recommendation:
- execution should explicitly show linked thesis completeness and pre-trade checks

#### 6. Review
Current components:
- ActivityFeed
- Portfolio
- post-trade notes in journal

Purpose:
- did the plan work?
- was the process good?

Recommendation:
- separate “open positions” from “closed-trade review” more clearly over time

---

## 4. Recommended evolution path

## Phase 1 — Now: make the workflow legible

### Goal
Clarify the current long page without breaking velocity.

### Ship now
- workflow nav pills at the top
- section anchors for Research / Thesis / Backtest / Monitor / Act / Review
- consistent section labeling
- add a visible reserved Backtest section so the IA has a home for it

### Why
This gives the product a recognizable mental model before adding more features.

---

## Phase 2 — Next: split thesis from execution

### Goal
Stop making the thesis feel like a sidecar to the order ticket.

### Structural change
Turn the current quote workstation into two coordinated surfaces:

- **Thesis Builder**
  - thesis statement
  - trigger
  - invalidation
  - exit
  - conviction
  - template
- **Execution Ticket**
  - order controls
  - buying power
  - sizing
  - projected impact

### Why
Right now, users can interpret Pounce as “trade ticket first, reasoning second.” That is backward for the product vision.

---

## Phase 3 — Add dedicated stage views

Once backtest and richer review exist, move from a pure long page to a hybrid model:

### Recommended desktop pattern
- persistent left rail for symbol universe
- top workflow nav
- main content swaps by stage
- optional right-side drawer for quick order ticket / quick notes

### Suggested routes later
- `/research`
- `/thesis`
- `/backtest`
- `/monitor`
- `/act`
- `/review`

These can still preserve the selected symbol in shared state.

### Why
As backtest and review grow, a single stacked page will become noisy and hard to scan.

---

## 5. Component mapping from current app to future IA

| Future stage | Current component(s) | Keep / change |
| --- | --- | --- |
| Research | `MarketOverview`, `ResearchPanel` | Keep, pair more tightly |
| Thesis | journal fields in `QuotePanel`, `TradeJournalPanel` | Promote into dedicated builder |
| Backtest | none yet | Add placeholder now, full module next |
| Monitor | `WatchlistPanel`, alert history, parts of `AccountPanel` | Keep, focus more on setup health |
| Act | order controls in `QuotePanel` | Keep, but separate from thesis editing |
| Review | `Portfolio`, `ActivityFeed`, post-trade notes | Keep, later split open vs closed review |

---

## 6. Concrete navigation recommendations

## Desktop

### Top nav
Use compact workflow pills:
- Research
- Thesis
- Backtest
- Monitor
- Act
- Review

Each pill should:
- jump to section now
- later switch stage view
- show optional status badge later (`2 alerts`, `1 review due`, `thesis incomplete`)

### Left rail
Keep sticky if possible. It should answer:
- what symbol am I on?
- what symbols need attention?
- what alerts fired?

### Main canvas order
Recommended order:
1. Research
2. Thesis
3. Backtest
4. Monitor
5. Act
6. Review

This should become the default story of the page.

## Mobile

Do not keep the current density.

Recommended:
- horizontal workflow tabs
- watchlist collapses into drawer/accordion
- order ticket and review stack below thesis instead of side-by-side grids

---

## 7. Content hierarchy recommendations

## What should become more prominent
- thesis status
- trigger / invalidation summary
- review-needed state
- setup freshness / staleness
- next best action

## What should become less prominent
- generic broker-style performance tiles at the top
- decorative market pulse text
- equal visual emphasis on every panel

Opinionated take: the app should feel less like “fake brokerage dashboard” and more like “decision discipline system.”

---

## 8. Suggested UI copy / labels

Use labels that map to user intent:

- **Research** — What matters now
- **Thesis** — Why this trade exists
- **Backtest** — Would this have worked
- **Monitor** — What needs attention
- **Act** — Place the trade
- **Review** — Learn from the outcome

These labels are clearer than panel-centric labels alone.

---

## 9. Immediate implementation priorities

If doing only a few changes next, do them in this order:

1. **Add workflow nav + anchors**
2. **Create dedicated Backtest placeholder section**
3. **Split thesis editing UI from execution controls inside `QuotePanel`**
4. **Surface thesis completeness / next action near the top**
5. **Demote account summary below workflow-specific context**

---

## 10. Success criteria

This IA work is successful when:

- a new user can tell what the product wants them to do in under 10 seconds
- backtest has an obvious future home
- the app feels organized around decisions, not widgets
- execution feels downstream of thesis, not the default starting point
- review feels like part of the loop, not an afterthought

---

## 11. Shipped first-pass change in this cycle

This spec is paired with a small UI change:

- added a top workflow navigation row
- mapped existing content into workflow sections
- added a visible Backtest placeholder section

That keeps the current prototype intact, but gives the app a clearer information architecture immediately.
