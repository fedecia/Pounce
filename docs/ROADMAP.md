# Pounce Product Roadmap

_Last updated: 2026-04-06_

## Product point of view

Pounce should not become "Bloomberg but smaller" or "yet another fake broker UI."

The strongest direction is a **decision-support and accountability cockpit for self-directed traders**:

- **Research** helps you understand what is happening
- **Thesis** forces you to say why you care
- **Alerts** bring setups back to your attention
- **Backtesting-for-dummies** answers "does this idea even deserve screen time?"
- **Strategy templates** reduce blank-page paralysis
- **Portfolio + journal accountability** closes the loop between idea, execution, and review
- **Funny nickname toggle** keeps the app human and memorable instead of sounding like a joyless fintech clone

If we stay disciplined, the app can feel distinct: practical, slightly irreverent, and built for people who want better habits more than more buttons.

## Product goal

Help a trader go from:

1. spotting an idea,
2. forming a thesis,
3. defining risk,
4. getting alerted when the setup matters,
5. testing whether the setup has any edge,
6. executing in paper mode,
7. reviewing whether the thesis and process were actually good.

That full loop is the product.

## Core product pillars

### 1) Research and thesis
Turn live market/news context into a simple opinionated workspace:
- what is happening
- why it matters
- what would confirm or break the idea

### 2) Alerts and re-engagement
A setup should not disappear because the user got distracted. Alerts should bring back the symbol, the thesis, and the action context.

### 3) Backtesting for normal people
Most retail users do not want a quant lab. They want: "show me whether buying this pattern / event / rule set has historically worked well enough to care."

### 4) Strategy scaffolding
Users should be able to start from a proven structure instead of inventing every field from scratch.

### 5) Accountability
The app should make it mildly uncomfortable to take impulsive trades without a plan, and easy to review mistakes later.

### 6) Personality
A tiny bit of humor is part of the brand. The product should feel sharp, useful, and self-aware — not sterile.

## Clear priorities

### Top priority
1. **Thesis-accountability loop**
2. **Alerts tied to thesis/state**
3. **Simple strategy templates**
4. **Backtesting-for-dummies MVP**

### Important, but secondary
5. Richer research synthesis
6. Portfolio review scorecards
7. Funny nickname / tone customization

### Deliberately lower priority
8. More broker-style surface polish
9. Advanced charting toys
10. Social/community features

## Non-goals

These are the things we should explicitly avoid for now:

- Building a full brokerage
- Competing with TradingView on chart power
- Building institutional-grade backtesting infrastructure
- Supporting complex options workflows before the core stock workflow feels excellent
- Adding AI-generated market hot takes just to seem smart
- Shipping push/email/SMS alert infrastructure before in-app workflow is clearly useful
- Turning the app into a noisy "news terminal" with no decision discipline

## Roadmap by phase

## Phase 1 — Near-term (next implementation cycle)
**Theme:** make the current app coherent around thesis + alerts + accountability.

### What to ship

#### 1. Thesis-first watchlist workflow
Upgrade the watchlist from a ticker list into a setup list.

Add per-symbol:
- setup status (`Watching`, `Building`, `Ready`, `Executed`, `Reviewing`)
- short thesis summary
- trigger / invalidation summary
- conviction or priority tag

Why first:
- most of the app already has the underlying journal/store concepts
- this makes the rest of the roadmap easier
- it immediately improves user behavior without needing heavy infra

#### 2. Alert cards that carry context
When an alert triggers, show more than "price crossed X."

Triggered alert should display:
- symbol
- why user cared originally
- trigger that fired
- current thesis status
- recommended next action prompt (`review`, `enter`, `skip`, `snooze`)

Why first:
- current alerts exist already
- this turns alerts from a toy into a workflow feature

#### 3. Strategy templates v1
Ship a small set of opinionated templates that prefill journal fields.

Suggested starter templates:
- breakout continuation
- pullback in uptrend
- earnings follow-through
- oversold bounce
- thesis-driven swing starter

Each template should define:
- setup description
- what confirms entry
- what invalidates it
- suggested risk framing
- expected holding period
- post-trade review questions

Why first:
- removes blank-state friction
- makes the journal useful for newer users
- creates the schema needed for backtesting later

#### 4. Portfolio and journal accountability panel
Create a review surface that answers:
- which positions have no real thesis?
- which open trades have no risk plan?
- which executed trades never got post-trade notes?
- which symbols are still marked `Ready` but never traded or dismissed?

Why first:
- this is the product's behavioral moat
- it turns portfolio + journal data into actual consequences

#### 5. Funny nickname toggle
Add a simple personality setting for labels/tone.

Examples:
- serious mode: `Watchlist`, `Alerts`, `Journal`
- funny mode: `Sus List`, `Panic Bell`, `Bagholder Diary`

Why now:
- cheap to build
- helps brand identity
- should stay purely cosmetic so it does not distract from core workflow

### Near-term success metrics
- more symbols with thesis content saved
- more alerts created per thesis-driven symbol
- fewer trades missing risk plan / post-trade notes
- users revisit triggered alerts instead of ignoring them

### Near-term exit criteria
Move to the next phase only when the app reliably supports:
- setup creation
- thesis logging
- alerting with context
- execution with journal carryover
- post-trade review prompts

## Phase 2 — Medium-term
**Theme:** help users decide whether a setup deserves trust.

### What to ship

#### 1. Backtesting-for-dummies MVP
This should be intentionally narrow and easy.

Users should be able to answer simple questions like:
- "If I buy breakouts after strong earnings gaps, what usually happens over 5 / 10 / 20 days?"
- "How often does this setup work?"
- "What is the typical drawdown before it works?"

Design principles:
- use plain language, not quant jargon
- offer guided inputs instead of open-ended formula builders
- show win rate, median return, drawdown, sample size, regime caveats
- always include "this sample is weak" warnings when appropriate

Important opinion:
- do **not** build a generic strategy scripting engine first
- start with parameterized presets and a few editable filters

#### 2. Template → backtest bridge
Each strategy template should optionally expose a "test this setup" action.

Example:
- template = `pullback in uptrend`
- test = pullbacks of X% above Y-day moving average with recovery confirmation

This keeps backtesting grounded in the user's actual workflow.

#### 3. Research synthesis upgrade
Improve research from "headline context" to "decision-support summary."

Add:
- bull case / bear case split
- what would change the thesis
- upcoming catalyst checklist
- thesis freshness / staleness indicator

Important opinion:
- avoid long AI essays
- prefer concise, structured summaries that map to a trade plan

#### 4. Review scorecards
Per trade and per week, show:
- plan quality
- execution discipline
- rule adherence
- outcome vs process
- repeated mistakes

This matters more than adding more data panels.

### Medium-term success metrics
- users run backtests before creating or executing setups
- strategy templates become reused patterns, not one-off notes
- review completion rate increases
- more trades are graded on process, not just P&L

## Phase 3 — Later
**Theme:** compounding workflow intelligence without bloating the app.

### What to ship

#### 1. Strategy library
A durable personal library of saved templates, favorite setups, and playbooks.

#### 2. Thesis timeline / version history
Track how a thesis changed over time:
- initial idea
- revised trigger
- invalidation moved
- exit review
- lesson learned

#### 3. Smarter accountability nudges
Examples:
- "You keep buying before your own confirmation signal."
- "Your best-reviewed trades come from one template."
- "You ignore triggered alerts on low-conviction names."

These should be grounded in actual behavior, not generic AI coaching.

#### 4. More robust alert delivery
Only after in-app workflow is proven:
- browser notifications
- optional push/Telegram/email delivery
- alert batching and digest modes

#### 5. Expanded asset / strategy coverage
Only after equities workflow is solid:
- ETFs
- options playbooks
- macro/event baskets

## Recommended next implementation order

This is the order I would actually build it in:

1. **Thesis metadata in watchlist rows**  
   Add setup status, thesis snippet, and trigger/invalidation summary to the current watchlist and store.

2. **Alert context upgrade**  
   Make alert history and triggered alerts carry thesis + recommended next action.

3. **Journal accountability panel**  
   Add a dashboard for missing thesis/risk/review fields and stale setups.

4. **Strategy templates v1**  
   Prefill journal content and status transitions from a small curated template set.

5. **Funny nickname toggle**  
   Cosmetic brand layer once the information architecture is stable.

6. **Backtesting-for-dummies MVP**  
   Narrow, guided, preset-driven testing tied to templates.

7. **Research synthesis upgrade**  
   Improve summaries once the user has a stronger action loop to plug them into.

Why this order:
- it compounds on existing code instead of restarting the product
- it improves behavior before adding complexity
- it creates the data structure needed for meaningful backtesting and review

## What the current codebase already suggests

Based on the current app surface, Pounce already has the beginnings of the right product:
- live research panel
- watchlist + alert model
- portfolio state
- trade journal primitives
- setup lifecycle language (`Watching`, `Building`, `Ready`, `Executed`, `Reviewing`)

That means the right move is **not** a broad redesign.

The right move is to tighten the app around one opinionated promise:

> Every trade should start with a thesis, be monitored with context, and end with a review.

Backtesting and templates should reinforce that promise, not distract from it.

## Product guardrails

Use these as recurring filters when deciding what to build:

- Does this help the user make or review a decision?
- Does this reduce impulsive trading?
- Does this turn raw market info into action context?
- Does this create reusable structure for future templates/backtests?
- Is this feature genuinely useful, or just cosmetically "finance-y"?

If a feature fails those tests, it probably belongs later or not at all.
