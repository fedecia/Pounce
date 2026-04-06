export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: string
  source?: 'live' | 'fallback'
  asOf?: string
}

export interface ChartSeries {
  symbol: string
  timeframe: Timeframe
  points: number[]
  volume: number
  source: 'live' | 'fallback'
  asOf?: string
}

export interface Position {
  shares: number
  avgPrice: number
}

export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'Market' | 'Limit' | 'Stop'
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'
export type AlertCondition = 'price-above' | 'price-below' | 'percent-up' | 'percent-down'
export type AlertStatus = 'active' | 'triggered'
export type SetupStatus = 'Watching' | 'Building' | 'Ready' | 'Executed' | 'Reviewing'
export type AlertNextAction = 'review' | 'enter' | 'skip' | 'snooze'
export type AlertWorkflowState = 'pending' | 'reviewed' | 'skipped' | 'snoozed'
export type SetupConviction = 'Low' | 'Medium' | 'High'
export type SetupPriority = 'Back burner' | 'Standard' | 'Top'
export type StrategyTemplateId =
  | 'breakout-continuation'
  | 'pullback-uptrend'
  | 'earnings-follow-through'
  | 'oversold-bounce'
  | 'thesis-driven-swing'

export interface StrategyTemplate {
  id: StrategyTemplateId
  name: string
  summary: string
  setupStatus: SetupStatus
  holdingPeriod: string
  thesis: string
  entryRationale: string
  riskPlan: string
  exitPlan: string
  postTradePrompt: string
  reviewQuestions: string[]
}

export interface TradeJournal {
  thesis: string
  thesisSummary: string
  entryRationale: string
  triggerSummary: string
  riskPlan: string
  invalidationSummary: string
  exitPlan: string
  postTradeNotes: string
  setupStatus: SetupStatus
  conviction: SetupConviction
  priority: SetupPriority
  strategyTemplateId?: StrategyTemplateId
  strategyTemplateName?: string
}

export interface Trade {
  id: string
  side: OrderSide
  ticker: string
  qty: number
  price: number
  value: number
  timestamp: string
  orderType: OrderType
  journal?: TradeJournal
}

export interface WatchlistAlert {
  id: string
  symbol: string
  condition: AlertCondition
  target: number
  baselinePrice?: number
  status: AlertStatus
  createdAt: string
  updatedAt: string
  triggeredAt?: string
  lastPrice?: number
}

export interface AlertEvent {
  id: string
  alertId: string
  symbol: string
  condition: AlertCondition
  target: number
  baselinePrice?: number
  price: number
  timestamp: string
  message: string
  whyItMatters: string
  thesisStatus: SetupStatus
  triggerSummary: string
  setupSummary: string
  nextAction: AlertNextAction
  workflowState: AlertWorkflowState
  snoozedUntil?: string
}

export type Portfolio = Record<string, Position>
