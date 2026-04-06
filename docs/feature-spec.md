# Pounce Feature Spec

_Last updated: 2026-04-06_

## 1. Product intent

Pounce is a retail-friendly trading workspace that helps a user go from _idea_ to _decision_ without pretending they are a hedge fund analyst. The product should make it easy to:

1. research a symbol,
2. turn that into a clear thesis,
3. test whether that idea would have worked before,
4. monitor the setup live,
5. act with a paper trade or real-world handoff,
6. review what happened and get better.

The product should feel powerful, but never intimidating. “Backtesting for dummies” is a feature, not an insult.

## 2. Target user

**Primary user:** self-directed retail trader / investor who has opinions, reads headlines, follows a few names, and wants more structure.

**User mindset:**
- “I think this stock works because of X.”
- “I want help pressure-testing that idea.”
- “I do not want to build a quant stack.”
- “I want a system that makes me less dumb under pressure.”

## 3. Core product loop

The app should explicitly support this loop end to end:

### 3.1 Research
User picks or adds a symbol and gets a clean research surface:
- live/fallback quote
- recent headlines
- catalyst summary
- key signals / tags
- watchlist context
- optional strategy template suggestions

### 3.2 Thesis
User converts research into a concrete trade thesis:
- why this setup exists
- what confirms it
- what breaks it
- how to size it
- what the exit logic is
- optional strategy nickname / playful label

### 3.3 Backtest
User asks: “If I had traded this idea with simple rules, what would have happened?”
- pick a strategy template or custom rules
- choose timeframe and date range
- run simple historical simulation
- get plain-English results first, detailed stats second
- compare variants without spreadsheet brain damage

### 3.4 Monitor
User watches a live setup:
- watchlist quotes
- thesis status
- alerts tied to price or percent moves
- “what changed?” explanation when setup drifts away from thesis
- countdown to next review checkpoint if relevant

### 3.5 Act
User places a paper trade or uses the app as decision support for a real trade elsewhere:
- order ticket
- linked thesis + risk plan
- pre-trade checklist
- record execution context

### 3.6 Review
User closes the loop:
- compare actual outcome vs original thesis
- classify win/loss quality
- note what was luck vs skill
- update template confidence over time
- build a repeatable playbook

## 4. Product principles

1. **Opinionated workflow beats blank canvas.** Give structure by default.
2. **Plain English first, numbers second.** Users should understand results before reading metrics.
3. **Every trade should have a reason attached.** No orphan executions.
4. **Monitoring should be thesis-aware, not just price-aware.**
5. **Humor is welcome if optional.** Any playful naming toggle should add charm, not noise.
6. **Build progressive depth.** New users can stay shallow; advanced users can go deeper.

## 5. Major feature pillars

### 5.1 Research Hub

Purpose: help the user get from ticker to informed context fast.

### MVP requirements
- Symbol search / add to watchlist
- Quote refresh with price, daily change, and simple momentum
- Headlines panel with source, timestamp, and coarse sentiment
- Catalyst summary
- “Desk view” summary paragraph
- Signal chips (earnings, policy risk, product cycle, etc.)

### V2 requirements
- Company facts card (sector, market cap, next earnings, short interest if available)
- Bull vs bear evidence buckets
- Save notable headlines into thesis notes
- “Why is this moving?” snapshot

### UX notes
- Research should never feel like a giant news dump.
- The top of the panel should answer: **What matters here right now?**

### 5.2 Thesis Builder

Purpose: force clarity before action.

### Core object: Thesis
Each thesis should have:
- symbol
- thesis title
- thesis type: momentum / swing / mean reversion / breakout / event / long-term / custom
- conviction score (lightweight, 1-5)
- setup status: Watching / Building / Ready / Executed / Reviewing / Archived
- thesis statement
- entry rationale
- invalidation / risk plan
- exit plan
- time horizon
- position sizing note
- tags
- strategy template used (optional)
- strategy nickname (optional)
- source links / saved research artifacts
- timestamps and revision history

### MVP requirements
- Expand current journal into a proper guided thesis form
- Save draft automatically per symbol
- Allow minimal mode and guided mode
- Show a thesis completeness meter
- Require at least thesis + trigger + risk plan before paper execution

### UX notes
- Default copy should be practical, not MBA theater.
- Example prompts:
  - “What has to be true for this trade to work?”
  - “What would make you admit you were wrong?”
  - “Why now, instead of later?”

### 5.3 First-pass LLM Thesis Integration

Purpose: help the user turn messy research into a usable first draft, without pretending the model is an oracle.

### User value
The LLM should accelerate drafting and challenge weak thinking, not auto-trade.

### MVP behavior
User can click:
- **Draft thesis from research**
- **Stress-test my thesis**
- **Summarize the bull/bear case**
- **Turn this into a backtestable rule set**

### Inputs to LLM
- selected symbol
- latest research snapshot
- saved headline snippets
- user-entered notes
- chosen strategy template if any
- current quote / trend context

### Outputs from LLM
Structured response with:
- thesis summary
- key catalysts
- risks / invalidation conditions
- possible entry trigger ideas
- possible exit logic
- confidence disclaimer
- optional suggested strategy nickname if playful labeling is on

### Guardrails
- Must label outputs as AI-assisted draft
- Must never imply guaranteed returns
- Must cite source snippets when available
- Must encourage user confirmation before saving/executing
- Must not silently overwrite user-written thesis

### Nice-to-have follow-ups
- “Make this more concise”
- “Make this less hype-y”
- “Argue the opposite side”
- “Convert this into checklist form”

### 5.4 Backtesting for Dummies

Purpose: give non-quants a dead-simple way to test an idea.

This should be one of the signature features.

### Product promise
“Tell us the rule in plain English, and we’ll show you what would have happened.”

### MVP scope
Support simple simulations using:
- one symbol at a time
- daily bars first
- strategy template or form-driven custom rules
- fixed position sizing (% of account or fixed dollars)
- simple fees/slippage assumptions
- start/end date
- benchmark comparison vs buy-and-hold

### Supported rule blocks in MVP
- entry trigger
  - buy when price breaks above prior N-day high
  - buy after N down days
  - buy when price is above moving average
  - buy after earnings gap over X%
- exit trigger
  - stop loss %
  - take profit %
  - trailing stop %
  - sell after N days
  - sell when price closes below moving average
- risk / sizing
  - fixed dollars
  - fixed shares
  - % of portfolio
  - max concurrent positions = 1 for MVP

### Output hierarchy
#### First screen: plain English summary
- “This strategy would have traded 14 times.”
- “It beat buy-and-hold, but only because of two big winners.”
- “It spent most of its time in cash.”
- “Drawdowns were ugly.”

#### Second screen: key metrics
- total return
- win rate
- average win / loss
- max drawdown
- profit factor
- exposure
- number of trades
- benchmark return

#### Third screen: detail views
- equity curve
- trade list
- best/worst trades
- periods where strategy underperformed

### UX requirements
- Use presets and sliders over code
- Every metric needs a tooltip in normal human language
- Allow “Explain these results” AI button
- Allow compare mode: Template A vs Template B

### Explicit non-goals for MVP
- intraday backtesting
- portfolio-level optimization
- custom scripting language
- hyperparameter rabbit holes

### 5.5 Strategy Templates

Purpose: reduce blank-page paralysis and create repeatable workflows.

### MVP templates
1. **Breakout Goblin** (funny name example)
   - buy on breakout above recent range
   - stop below breakout level
   - ride trend until weakness
2. **Dip Enjoyer**
   - buy controlled weakness in strong names
   - exit on bounce or failed support
3. **Trend Friend**
   - only participate when trend is already established
4. **Earnings Chaos Lite**
   - trade post-earnings continuation with stricter risk
5. **Boring Compounding Adult**
   - slower, longer-horizon accumulation plan
6. **Custom**
   - user edits the rules directly

### Each template should include
- one-line concept
- when to use it
- when not to use it
- default entry/exit rules
- default risk model
- expected trade frequency
- typical holding period
- example thesis language
- example backtest setup

### Template system requirements
- user can start from template
- template pre-fills thesis builder and backtest inputs
- user can save a modified template as “my version” later
- review data should eventually show which templates fit the user best

### 5.6 Monitor & Alert Center

Purpose: keep setups alive after initial research.

### MVP requirements
- watchlist with live-ish quote refresh
- price and percent alerts
- alert history
- setup status badge per symbol
- thesis snapshot for selected symbol

### Next requirements
- thesis-based monitor cards:
  - entry not triggered yet
  - invalidation near
  - target almost reached
  - thesis stale due to time elapsed
- review reminders:
  - “You said you’d review this after earnings.”
  - “This thesis is 14 days old and still in Building.”
- event reminders:
  - earnings date
  - macro event if mapped to thesis

### UX notes
Monitoring should feel like:
- “What needs attention?”
- not “Here are 900 blinking numbers.”

### 5.7 Act / Execution Workspace

Purpose: turn conviction into a documented action.

### MVP requirements
- paper trading order ticket
- order types: market / limit / stop
- time in force
- projected order value and buying power impact
- attach thesis snapshot automatically to executions
- block execution when essential thesis fields are empty

### Future requirements
- pre-trade checklist confirmation
- partial take-profit support
- bracket order simulation
- broker handoff / export instead of direct brokerage integration first

### UX notes
When user clicks buy/sell, the app should reinforce:
- what is the thesis?
- what is the risk?
- what changed since the idea was created?

### 5.8 Review & Learning Loop

Purpose: help the user improve instead of just collecting trades.

### MVP requirements
- trade history with attached thesis snapshot
- post-trade review form
- classify outcome:
  - good trade / bad trade
  - good outcome / bad outcome
- compare plan vs actual
- capture lessons learned

### V2 requirements
- pattern detection across reviews
- template leaderboard by performance and consistency
- “You keep cutting winners too early” style insights
- AI-generated review summary

### Review rubric
Each closed trade review should answer:
- Was the original thesis valid?
- Did the trigger occur as planned?
- Did the user follow sizing rules?
- Was the exit disciplined?
- What would I repeat?
- What should never happen again?

## 6. Funny strategy nickname toggle

This is a small feature, but it should be memorable.

### Purpose
Inject personality without sabotaging serious workflows.

### Behavior
Global setting:
- **Strategy naming: Standard / Playful**

### Modes
- **Off:** show normal names only
- **Subtle:** show normal name with nickname secondary label
  - Example: “Breakout Strategy · Breakout Goblin”
- **Full goblin mode:** nickname becomes primary display label in templates and thesis cards

### LLM interaction
If toggle is not Off, the LLM may propose nickname suggestions when drafting a thesis or template.

### Guardrails
- nickname should never replace actual rule definition
- nickname should never appear in places where clarity matters more than personality (exports, audit logs, compliance-style views)

## 7. Key UX flows

### 7.1 New idea flow
1. User lands on dashboard
2. Adds/selects symbol
3. Reviews quote + headlines + catalyst summary
4. Clicks **Draft thesis** or starts manually
5. Chooses template or “start from scratch”
6. Saves thesis draft
7. Clicks **Backtest this idea**
8. Reviews summary + tweaks inputs
9. Arms alerts or creates paper trade

### Success condition
User gets from curiosity to a documented, testable setup in under 5 minutes.

### 7.2 Backtest-from-thesis flow
1. User opens a saved thesis
2. Clicks **Turn thesis into backtest**
3. App maps thesis + template into default rules
4. User adjusts date range, sizing, and exits
5. Runs backtest
6. App summarizes whether the idea has historically behaved well
7. User saves the result back to the thesis

### Success condition
The user does not need to understand quant jargon to run the test.

### 7.3 Monitor-to-action flow
1. User gets alert or sees symbol in watchlist
2. Opens thesis snapshot
3. Sees setup status + what changed
4. Confirms trigger is live
5. Opens order ticket
6. Reviews linked risk plan
7. Executes paper trade

### Success condition
The app reduces impulsive clicking and makes the user re-anchor on their plan.

### 7.4 Review flow
1. User closes trade or marks it complete
2. App prompts review while context is fresh
3. User compares original plan vs actual behavior
4. User logs lesson
5. App updates strategy/template history

### Success condition
Review feels lightweight enough that users actually do it.

## 8. Data model additions

These should be added or planned beyond the current lightweight store.

### Thesis
- id
- symbol
- title
- templateId?
- nickname?
- nicknameModeAtSave?
- status
- conviction
- thesisText
- entryCriteria
- invalidationCriteria
- exitCriteria
- sizingPlan
- timeHorizon
- notes
- researchSnapshotRef?
- llmDraftMetadata?
- createdAt
- updatedAt
- archivedAt?

### BacktestRun
- id
- thesisId?
- templateId?
- symbol
- timeframe
- dateRange
- rules
- assumptions
- summary
- metrics
- tradeSamples
- benchmark
- createdAt

### StrategyTemplate
- id
- name
- nickname?
- description
- category
- defaultRules
- defaultPrompts
- riskProfile
- enabled

### Review
- id
- tradeId
- thesisId?
- outcomeQuality
- processQuality
- lesson
- repeatFlag
- avoidFlag
- createdAt

## 9. Suggested release slices

### Phase 1: tighten current app into a thesis-first workspace
- research panel improvements
- structured thesis builder
- strategy template selector
- nickname toggle
- execution requires minimum thesis completeness
- better review form

### Phase 2: launch backtesting for dummies
- historical data plumbing
- simple strategy engine
- plain-English result summaries
- compare two strategy runs
- AI explanation of results

### Phase 3: smarter monitoring + learning
- thesis-aware monitoring
- reminders tied to thesis state
- pattern detection from reviews
- template confidence / fit scoring

## 10. MVP acceptance criteria

The MVP is good enough when a user can:
- add a symbol,
- understand the current setup,
- create a thesis with guidance,
- optionally get an AI-generated first draft,
- apply a strategy template,
- run a simple backtest without writing code,
- arm alerts,
- place a paper trade with the thesis attached,
- review the trade afterward.

## 11. Open questions / caveats

1. **Historical data source:** backtesting quality depends heavily on reliable price history.
2. **LLM cost + latency:** thesis drafting and result explanation should be async and cached where sensible.
3. **Trust boundary:** AI suggestions must remain clearly advisory.
4. **Scope discipline:** the product gets worse if MVP turns into a mini-Terminal.
5. **Persistence model:** current local state is fine for prototype mode, but multi-device sync will eventually require a backend.

## 12. Immediate implementation guidance

If building from the current codebase, the next concrete product steps should be:
1. promote the existing journal into a real thesis object + editor
2. add strategy template definitions and template-prefill behavior
3. add user setting for nickname toggle
4. create a dedicated thesis action bar: draft, stress-test, convert to backtest
5. define a minimal backtest schema and static/mocked result UI before wiring full historical engine
6. extend review flow so closed trades produce actual learning artifacts, not just notes

That gives the app a clearer identity: not just a paper trading dashboard, but a thesis-driven trading coach with enough structure to make users more disciplined without making them feel dumb.
