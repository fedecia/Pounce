import type { AlertEvent, SetupStatus, TradeJournal } from './types'
import type { AppState } from './store'
import type { ResearchSnapshot } from './research'

export type AiFeature = 'research-brief' | 'thesis-draft' | 'thesis-critique' | 'backtest-summary' | 'alert-explanation'
export type AiProviderId = 'local-heuristic'

export interface AiCitation {
  label: string
  detail: string
}

export interface AiMeta {
  feature: AiFeature
  provider: AiProviderId
  generatedAt: string
  advisory: string
}

export interface ResearchBrief {
  summary: string
  bullCase: string
  bearCase: string
  focus: string[]
  citations: AiCitation[]
}

export interface ThesisDraft {
  headline: string
  thesisSummary: string
  thesis: string
  triggerSummary: string
  entryRationale: string
  invalidationSummary: string
  riskPlan: string
  exitPlan: string
  confidenceNote: string
  citations: AiCitation[]
}

export interface ThesisCritique {
  verdict: string
  strengths: string[]
  gaps: string[]
  suggestedEdits: string[]
  confidenceNote: string
}

export interface BacktestSummary {
  headline: string
  summary: string
  bullets: string[]
  caveats: string[]
}

export interface AlertExplanation {
  headline: string
  explanation: string
  whatChanged: string
  recommendedAction: string
}

export interface SymbolAiState {
  researchBrief?: ResearchBrief & { meta: AiMeta }
  thesisDraft?: ThesisDraft & { meta: AiMeta }
  thesisCritique?: ThesisCritique & { meta: AiMeta }
  backtestSummary?: BacktestSummary & { meta: AiMeta }
  alertExplanations?: Record<string, AlertExplanation & { meta: AiMeta }>
}

export interface AiState {
  symbols: Record<string, SymbolAiState>
}

export interface ThesisDraftInput {
  symbol: string
  journal: TradeJournal
  research: ResearchSnapshot
  price?: number
  trendPct?: number
}

export interface ThesisCritiqueInput {
  symbol: string
  journal: TradeJournal
  research: ResearchSnapshot
}

export interface BacktestSummaryInput {
  symbol: string
  journal: TradeJournal
  status: SetupStatus
  trendPct?: number
  activeAlerts: number
  triggeredAlerts: number
}

export interface AlertExplanationInput {
  event: AlertEvent
  journal: TradeJournal
}

export interface ResearchBriefInput {
  symbol: string
  research: ResearchSnapshot
  trendPct?: number
}

export interface AiClient {
  provider: AiProviderId
  draftThesis(input: ThesisDraftInput): Promise<ThesisDraft>
  critiqueThesis(input: ThesisCritiqueInput): Promise<ThesisCritique>
  summarizeBacktest(input: BacktestSummaryInput): Promise<BacktestSummary>
  explainAlert(input: AlertExplanationInput): Promise<AlertExplanation>
  explainResearch(input: ResearchBriefInput): Promise<ResearchBrief>
}

function now() {
  return new Date().toISOString()
}

function clean(value?: string) {
  return value?.trim() ?? ''
}

function cite(label: string, detail: string): AiCitation {
  return { label, detail }
}

function first(items: string[], fallback: string) {
  return items.find((item) => item.trim().length > 0) ?? fallback
}

function joinFocus(headlines: ResearchSnapshot['headlines']) {
  return headlines.slice(0, 2).map((item) => item.title)
}

class LocalHeuristicAiClient implements AiClient {
  provider: AiProviderId = 'local-heuristic'

  async explainResearch(input: ResearchBriefInput): Promise<ResearchBrief> {
    const trend = typeof input.trendPct === 'number' ? `${input.trendPct >= 0 ? '+' : ''}${input.trendPct.toFixed(2)}% today` : 'trend still loading'
    const headlineTitles = joinFocus(input.research.headlines)

    return {
      summary: `${input.symbol} looks like a ${input.research.headlines[0]?.sentiment?.toLowerCase() ?? 'mixed'} headline setup right now: ${input.research.catalyst}`,
      bullCase: first([
        input.research.thesis,
        headlineTitles[0] ? `Bull case leans on ${headlineTitles[0]}.` : ''
      ], 'Bull case is not obvious yet; wait for cleaner evidence.'),
      bearCase: input.research.headlines.some((item) => item.sentiment === 'Cautious')
        ? `Bear case is real too: at least one current headline is explicitly cautious, so this can still be narrative-driven rather than durable.`
        : `Bear case is mostly about false-positive momentum and a setup that still depends on execution follow-through.`,
      focus: [
        `Tape check: ${trend}`,
        ...input.research.signals.slice(0, 3)
      ],
      citations: [
        cite('Catalyst', input.research.catalyst),
        ...headlineTitles.map((title, index) => cite(`Headline ${index + 1}`, title))
      ]
    }
  }

  async draftThesis(input: ThesisDraftInput): Promise<ThesisDraft> {
    const sentiment = input.research.headlines[0]?.sentiment ?? 'Balanced'
    const stance = sentiment === 'Bullish' ? 'constructive' : sentiment === 'Cautious' ? 'defensive' : 'balanced'
    const priceContext = typeof input.price === 'number' && input.price > 0 ? `${input.symbol} is trading near $${input.price.toFixed(2)}` : `${input.symbol} price context is still loading`
    const trendContext = typeof input.trendPct === 'number' ? `with ${input.trendPct >= 0 ? 'positive' : 'negative'} daily trend of ${input.trendPct.toFixed(2)}%` : 'with incomplete short-term trend context'
    const topHeadline = input.research.headlines[0]?.title ?? `${input.symbol} has a mixed headline tape right now`
    const bullSignal = input.research.signals[0] ?? 'headline sensitivity'
    const riskSignal = input.research.signals[1] ?? 'macro/liquidity watch'

    return {
      headline: `${input.symbol} AI-assisted draft`,
      thesisSummary: `${input.symbol} is a ${stance} setup if current headline momentum can turn into cleaner follow-through rather than a one-day narrative pop.`,
      thesis: `${priceContext} ${trendContext}. The working idea is that the market may still be repricing ${input.symbol} around ${topHeadline.toLowerCase()}. That makes this a trade about confirmation, not blind belief: if buyers keep defending the move and the broader tape stops fighting the name, the setup can graduate from watchlist curiosity into an actual trade.` ,
      triggerSummary: clean(input.journal.triggerSummary) || `Only enter if ${input.symbol} confirms the move with follow-through instead of immediately giving back the headline reaction.`,
      entryRationale: clean(input.journal.entryRationale) || `Entry makes sense when ${bullSignal.toLowerCase()} is still helping the tape and the move is being accepted instead of faded.`,
      invalidationSummary: clean(input.journal.invalidationSummary) || `Invalid if the move stalls quickly, the catalyst loses credibility, or price action starts behaving like a failed momentum chase.`,
      riskPlan: clean(input.journal.riskPlan) || `Keep size modest until the setup proves itself. If the confirmation fails, step aside quickly instead of negotiating with the tape.`,
      exitPlan: clean(input.journal.exitPlan) || `Scale out into strength and reevaluate if the trade becomes purely narrative-driven without fresh evidence.`,
      confidenceNote: `AI-assisted draft only. Useful for speed, not authority. Confirm the catalyst, trigger, and risk plan yourself before trading — especially with ${riskSignal.toLowerCase()} in play.`,
      citations: [
        cite('Catalyst', input.research.catalyst),
        cite('Desk view', input.research.thesis),
        ...input.research.headlines.slice(0, 2).map((item, index) => cite(`Headline ${index + 1}`, item.title))
      ]
    }
  }

  async critiqueThesis(input: ThesisCritiqueInput): Promise<ThesisCritique> {
    const journal = input.journal
    const strengths: string[] = []
    const gaps: string[] = []
    const suggestedEdits: string[] = []

    if (clean(journal.thesisSummary)) strengths.push('You already have a one-line framing for the setup.')
    else gaps.push('No one-line thesis summary yet, so the setup still feels mushy.')

    if (clean(journal.triggerSummary) || clean(journal.entryRationale)) strengths.push('There is at least some definition of what would get you in.')
    else gaps.push('Trigger logic is missing — right now this is still a vibe, not a trade plan.')

    if (clean(journal.invalidationSummary) || clean(journal.riskPlan)) strengths.push('You have some idea of what would make the trade wrong.')
    else gaps.push('Invalidation and risk are too thin. That is how “watching” turns into coping.')

    if (!clean(journal.exitPlan)) gaps.push('Exit logic is missing, so there is no plan for harvesting gains or cutting drift.')

    if (input.research.headlines.some((item) => item.sentiment === 'Cautious')) {
      suggestedEdits.push('Explicitly mention the bearish headline thread so the thesis does not read like it ignored current risks.')
    }

    if (!clean(journal.thesis)) {
      suggestedEdits.push('Write the core thesis in one paragraph: what is mispriced, why now, and what would prove you wrong.')
    }
    if (!clean(journal.triggerSummary)) {
      suggestedEdits.push('Turn the trigger into an observable event, not a feeling — e.g. reclaim, hold, breakout, or failed flush.')
    }
    if (!clean(journal.riskPlan)) {
      suggestedEdits.push('Add position sizing or stop discipline so risk is defined before execution.')
    }

    const verdict = gaps.length === 0
      ? `This is tradeable as a first-pass plan: the thesis has enough shape to monitor or paper trade.`
      : gaps.length <= 2
        ? `Decent draft, but still soft around the edges. Tighten the weak spots before you trust it.`
        : `Not ready yet. The idea may be interesting, but the current write-up is too incomplete to deserve execution.`

    return {
      verdict,
      strengths: strengths.length ? strengths : ['The setup has at least been captured instead of living only in your head.'],
      gaps,
      suggestedEdits: suggestedEdits.length ? suggestedEdits : ['Shorten the thesis until it reads like a plan, not a memo.'],
      confidenceNote: 'AI critique is advisory. Keep the parts that sharpen your thinking; ignore the rest.'
    }
  }

  async summarizeBacktest(input: BacktestSummaryInput): Promise<BacktestSummary> {
    const disciplineScore = [input.journal.thesis, input.journal.triggerSummary || input.journal.entryRationale, input.journal.riskPlan, input.journal.exitPlan]
      .filter((item) => clean(item)).length
    const readiness = input.status === 'Ready' || input.status === 'Executed'
    const trendClause = typeof input.trendPct === 'number'
      ? input.trendPct >= 0
        ? 'Recent trend is helping the story.'
        : 'Recent trend is fighting the story.'
      : 'Recent trend data is incomplete.'

    return {
      headline: readiness ? 'This idea is structured enough to backtest next.' : 'This setup needs cleaner rules before a backtest means much.',
      summary: disciplineScore >= 3
        ? `In plain English: the idea has enough rule-like pieces to simulate. ${trendClause} The useful next step is translating your trigger, stop logic, and holding idea into a small preset-driven test — not a giant quant detour.`
        : `In plain English: a backtest would mostly measure vagueness right now. Tighten the entry, invalidation, and exit rules first so the result tells you something real instead of flattering a loose thesis.`,
      bullets: [
        `${disciplineScore >= 3 ? 'Has' : 'Missing'} enough structure for a first-pass rule set`,
        `${input.activeAlerts} active alert${input.activeAlerts === 1 ? '' : 's'} and ${input.triggeredAlerts} triggered event${input.triggeredAlerts === 1 ? '' : 's'} give you monitoring context`,
        `Current status: ${input.status}`
      ],
      caveats: [
        'This is a planning summary, not a historical simulation result.',
        'Backtest quality will depend on turning your thesis into explicit, daily-bar-friendly rules.',
        'One-symbol tests can still lie when the whole edge came from one regime.'
      ]
    }
  }

  async explainAlert(input: AlertExplanationInput): Promise<AlertExplanation> {
    const journal = input.journal
    const setup = clean(journal.thesisSummary) || clean(journal.thesis) || 'No thesis was attached yet.'
    const recommendedAction = input.event.nextAction === 'enter'
      ? 'Re-open the thesis and verify the trigger actually matches your plan before entering.'
      : input.event.nextAction === 'review'
        ? 'Review the setup against the original thesis before changing anything.'
        : input.event.nextAction === 'snooze'
          ? 'If the move is noise, snooze it and set the next review checkpoint deliberately.'
          : 'Skip unless fresh evidence improves the setup.'

    return {
      headline: `${input.event.symbol} alert explained`,
      explanation: `${input.event.message}. This matters because the setup was logged as ${input.event.thesisStatus.toLowerCase()} and the current thesis says: ${setup}`,
      whatChanged: clean(journal.triggerSummary)
        ? `The thing to compare now is whether price action actually matched your trigger: ${journal.triggerSummary}`
        : 'Price moved, but your actual trigger is still vague. Tighten that before treating alerts like signals.',
      recommendedAction
    }
  }
}

export function createAiClient(): AiClient {
  return new LocalHeuristicAiClient()
}

export function withAiMeta<T>(feature: AiFeature, provider: AiProviderId, payload: T): T & { meta: AiMeta } {
  return {
    ...payload,
    meta: {
      feature,
      provider,
      generatedAt: now(),
      advisory: 'AI-assisted output. Verify before acting.'
    }
  }
}

export function emptyAiState(): AiState {
  return { symbols: {} }
}

export function getSymbolAiState(symbol: string, ai?: AiState): SymbolAiState {
  const normalized = symbol.toUpperCase().trim()
  return ai?.symbols?.[normalized] ?? {}
}

export function buildBacktestSummaryInput(state: AppState, symbol: string): BacktestSummaryInput {
  const normalized = symbol.toUpperCase().trim()
  const journal = state.journals[normalized] ?? {
    thesis: '',
    thesisSummary: '',
    entryRationale: '',
    triggerSummary: '',
    riskPlan: '',
    invalidationSummary: '',
    exitPlan: '',
    postTradeNotes: '',
    setupStatus: 'Watching',
    conviction: 'Medium',
    priority: 'Standard'
  }
  const alerts = state.alerts[normalized] ?? []
  const activeAlerts = alerts.filter((alert) => alert.status === 'active').length
  const triggeredAlerts = alerts.filter((alert) => alert.status === 'triggered').length

  return {
    symbol: normalized,
    journal,
    status: journal.setupStatus,
    trendPct: state.trend[normalized]?.pct,
    activeAlerts,
    triggeredAlerts
  }
}
