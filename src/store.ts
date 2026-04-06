import { writable } from 'svelte/store'
import type {
  AlertCondition,
  AlertEvent,
  OrderType,
  Portfolio,
  SetupStatus,
  Timeframe,
  Trade,
  TradeJournal,
  WatchlistAlert
} from './types'

type Trend = Record<string, { change: number; pct: number }>
type Journals = Record<string, TradeJournal>

type AppState = {
  cash: number
  startingCash: number
  portfolio: Portfolio
  prices: Record<string, number>
  quotes: Record<string, number>
  trend: Trend
  trades: Trade[]
  watchlist: string[]
  alerts: Record<string, WatchlistAlert[]>
  alertHistory: AlertEvent[]
  journals: Journals
  selectedSymbol: string
  selectedTimeframe: Timeframe
  orderTicket: {
    type: OrderType
    tif: 'Day' | 'GTC'
  }
}

const STORAGE_KEY = 'monopolystreet-state'
const MAX_TRADES = 25
const MAX_ALERT_HISTORY = 20
const DEFAULT_SETUP_STATUS: SetupStatus = 'Watching'

const initialState: AppState = {
  cash: 10000,
  startingCash: 10000,
  portfolio: {},
  prices: {},
  quotes: {},
  trend: {},
  trades: [],
  watchlist: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA'],
  alerts: {},
  alertHistory: [],
  journals: {},
  selectedSymbol: 'AAPL',
  selectedTimeframe: '1D',
  orderTicket: {
    type: 'Market',
    tif: 'Day'
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function emptyJournal(setupStatus: SetupStatus = DEFAULT_SETUP_STATUS): TradeJournal {
  return {
    thesis: '',
    entryRationale: '',
    riskPlan: '',
    exitPlan: '',
    postTradeNotes: '',
    setupStatus
  }
}

function normalizeJournal(value?: Partial<TradeJournal> | null, fallbackStatus: SetupStatus = DEFAULT_SETUP_STATUS): TradeJournal {
  return {
    ...emptyJournal(fallbackStatus),
    ...(value ?? {}),
    setupStatus: value?.setupStatus ?? fallbackStatus
  }
}

function hasJournalContent(journal: TradeJournal) {
  return [journal.thesis, journal.entryRationale, journal.riskPlan, journal.exitPlan, journal.postTradeNotes]
    .some((field) => field.trim().length > 0)
}

function loadState(): AppState {
  if (typeof localStorage === 'undefined') return clone(initialState)
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(initialState)
    const parsed = JSON.parse(raw)

    const journals = Object.fromEntries(
      Object.entries(parsed.journals ?? {}).map(([ticker, journal]) => [ticker, normalizeJournal(journal as Partial<TradeJournal>)])
    )

    const trades = Array.isArray(parsed.trades)
      ? parsed.trades.map((trade: Trade) => ({
          ...trade,
          journal: trade.journal ? normalizeJournal(trade.journal, trade.journal.setupStatus ?? 'Executed') : undefined
        }))
      : []

    return { ...clone(initialState), ...parsed, journals, trades }
  } catch {
    return clone(initialState)
  }
}

const store = writable<AppState>(loadState())

if (typeof localStorage !== 'undefined') {
  store.subscribe((value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  })
}

function makeTrade(
  side: 'BUY' | 'SELL',
  ticker: string,
  qty: number,
  price: number,
  orderType: OrderType,
  journal?: TradeJournal
): Trade {
  return {
    id: `${side}-${ticker}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    side,
    ticker,
    qty,
    price,
    value: qty * price,
    timestamp: new Date().toISOString(),
    orderType,
    journal
  }
}

function makeAlertId(symbol: string) {
  return `alert-${symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function describeAlert(condition: AlertCondition, target: number, baselinePrice?: number) {
  switch (condition) {
    case 'price-above':
      return `traded above $${target.toFixed(2)}`
    case 'price-below':
      return `traded below $${target.toFixed(2)}`
    case 'percent-up':
      return `rose ${target.toFixed(2)}% from ${baselinePrice ? `$${baselinePrice.toFixed(2)}` : 'its baseline'}`
    case 'percent-down':
      return `fell ${target.toFixed(2)}% from ${baselinePrice ? `$${baselinePrice.toFixed(2)}` : 'its baseline'}`
  }
}

function isTriggered(alert: WatchlistAlert, price: number) {
  switch (alert.condition) {
    case 'price-above':
      return price >= alert.target
    case 'price-below':
      return price <= alert.target
    case 'percent-up':
      return !!alert.baselinePrice && alert.baselinePrice > 0 && (((price - alert.baselinePrice) / alert.baselinePrice) * 100) >= alert.target
    case 'percent-down':
      return !!alert.baselinePrice && alert.baselinePrice > 0 && (((alert.baselinePrice - price) / alert.baselinePrice) * 100) >= alert.target
  }
}

function evaluateAlerts(state: AppState, symbol: string, price: number) {
  const alerts = state.alerts[symbol] ?? []
  if (!alerts.length) return { alertsBySymbol: state.alerts, history: state.alertHistory }

  const timestamp = new Date().toISOString()
  const newEvents: AlertEvent[] = []
  const updatedAlerts: WatchlistAlert[] = alerts.map((alert) => {
    if (alert.status === 'triggered') {
      return { ...alert, lastPrice: price, updatedAt: timestamp }
    }

    if (!isTriggered(alert, price)) {
      return { ...alert, lastPrice: price, updatedAt: timestamp }
    }

    newEvents.push({
      id: `event-${alert.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      alertId: alert.id,
      symbol,
      condition: alert.condition,
      target: alert.target,
      baselinePrice: alert.baselinePrice,
      price,
      timestamp,
      message: `${symbol} ${describeAlert(alert.condition, alert.target, alert.baselinePrice)} at $${price.toFixed(2)}`
    })

    return {
      ...alert,
      status: 'triggered',
      triggeredAt: timestamp,
      updatedAt: timestamp,
      lastPrice: price
    }
  })

  return {
    alertsBySymbol: { ...state.alerts, [symbol]: updatedAlerts },
    history: [...newEvents, ...state.alertHistory].slice(0, MAX_ALERT_HISTORY)
  }
}

export function resetStore() {
  store.set(clone(initialState))
}

export function getJournal(symbol: string, journals: Journals = {}) {
  const ticker = symbol.toUpperCase().trim()
  if (!ticker) return emptyJournal()
  return normalizeJournal(journals[ticker])
}

export function updateTradeJournal(ticker: string, updates: Partial<TradeJournal>) {
  const symbol = ticker.toUpperCase().trim()
  if (!symbol) return

  store.update((state) => ({
    ...state,
    journals: {
      ...state.journals,
      [symbol]: normalizeJournal({ ...getJournal(symbol, state.journals), ...updates }, updates.setupStatus ?? state.journals[symbol]?.setupStatus ?? DEFAULT_SETUP_STATUS)
    }
  }))
}

export function setSelectedSymbol(ticker: string) {
  const symbol = ticker.toUpperCase().trim()
  if (!symbol) return
  store.update((state) => ({ ...state, selectedSymbol: symbol }))
}

export function setSelectedTimeframe(timeframe: Timeframe) {
  store.update((state) => ({ ...state, selectedTimeframe: timeframe }))
}

export function setOrderTicket(type: OrderType, tif: 'Day' | 'GTC') {
  store.update((state) => ({
    ...state,
    orderTicket: { type, tif }
  }))
}

export function addToWatchlist(ticker: string) {
  const symbol = ticker.toUpperCase().trim()
  if (!symbol) return
  store.update((state) => ({
    ...state,
    selectedSymbol: symbol,
    journals: state.journals[symbol] ? state.journals : { ...state.journals, [symbol]: emptyJournal() },
    watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol]
  }))
}

export function removeFromWatchlist(ticker: string) {
  const symbol = ticker.toUpperCase().trim()
  store.update((state) => {
    const watchlist = state.watchlist.filter((item) => item !== symbol)
    return {
      ...state,
      watchlist,
      selectedSymbol: state.selectedSymbol === symbol ? (watchlist[0] || 'AAPL') : state.selectedSymbol
    }
  })
}

export function upsertAlert(ticker: string, condition: AlertCondition, target: number, baselinePrice?: number) {
  const symbol = ticker.toUpperCase().trim()
  if (!symbol) throw new Error('Ticker is required')
  if (!Number.isFinite(target) || target <= 0) throw new Error('Alert target must be greater than 0')
  if ((condition === 'percent-up' || condition === 'percent-down') && (!baselinePrice || baselinePrice <= 0)) {
    throw new Error('Fetch a live quote before creating a percent alert')
  }

  const now = new Date().toISOString()
  const alert: WatchlistAlert = {
    id: makeAlertId(symbol),
    symbol,
    condition,
    target: Number(target.toFixed(2)),
    baselinePrice: baselinePrice ? Number(baselinePrice.toFixed(2)) : undefined,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastPrice: baselinePrice ? Number(baselinePrice.toFixed(2)) : undefined
  }

  store.update((state) => ({
    ...state,
    selectedSymbol: symbol,
    watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol],
    alerts: {
      ...state.alerts,
      [symbol]: [alert, ...(state.alerts[symbol] ?? [])]
    }
  }))
}

export function deleteAlert(ticker: string, alertId: string) {
  const symbol = ticker.toUpperCase().trim()
  store.update((state) => ({
    ...state,
    alerts: {
      ...state.alerts,
      [symbol]: (state.alerts[symbol] ?? []).filter((alert) => alert.id !== alertId)
    }
  }))
}

export function clearAlertHistory() {
  store.update((state) => ({ ...state, alertHistory: [] }))
}

export function setQuote(ticker: string, price: number, change: number, pct: number) {
  const symbol = ticker.toUpperCase()
  store.update((state) => {
    const evaluated = evaluateAlerts(state, symbol, price)
    return {
      ...state,
      selectedSymbol: symbol,
      prices: { ...state.prices, [symbol]: price },
      quotes: { ...state.quotes, [symbol]: price },
      trend: { ...state.trend, [symbol]: { change, pct } },
      journals: state.journals[symbol] ? state.journals : { ...state.journals, [symbol]: emptyJournal() },
      watchlist: state.watchlist.includes(symbol) ? state.watchlist : [...state.watchlist, symbol],
      alerts: evaluated.alertsBySymbol,
      alertHistory: evaluated.history
    }
  })
}

export function buy(ticker: string, price: number, qty: number, journalInput?: Partial<TradeJournal>) {
  const symbol = ticker.toUpperCase()
  if (qty <= 0) throw new Error('Quantity must be greater than 0')

  store.update((state) => {
    const cost = price * qty
    if (cost > state.cash) throw new Error('Not enough cash available')

    const prev = state.portfolio[symbol] ?? { shares: 0, avgPrice: 0 }
    const shares = prev.shares + qty
    const avgPrice = (prev.shares * prev.avgPrice + qty * price) / shares
    const journal = normalizeJournal({ ...getJournal(symbol, state.journals), ...journalInput, setupStatus: 'Executed' }, 'Executed')

    return {
      ...state,
      cash: state.cash - cost,
      portfolio: {
        ...state.portfolio,
        [symbol]: { shares, avgPrice }
      },
      journals: {
        ...state.journals,
        [symbol]: journal
      },
      trades: [makeTrade('BUY', symbol, qty, price, state.orderTicket.type, hasJournalContent(journal) ? journal : undefined), ...state.trades].slice(0, MAX_TRADES)
    }
  })
}

export function sell(ticker: string, price: number, qty: number, journalInput?: Partial<TradeJournal>) {
  const symbol = ticker.toUpperCase()
  if (qty <= 0) throw new Error('Quantity must be greater than 0')

  store.update((state) => {
    const prev = state.portfolio[symbol]
    if (!prev) throw new Error('Ticker not owned')
    if (prev.shares < qty) throw new Error('Insufficient shares')

    const remaining = prev.shares - qty
    const portfolio = { ...state.portfolio }
    if (remaining === 0) delete portfolio[symbol]
    else portfolio[symbol] = { shares: remaining, avgPrice: prev.avgPrice }

    const journal = normalizeJournal(
      { ...getJournal(symbol, state.journals), ...journalInput, setupStatus: remaining === 0 ? 'Reviewing' : 'Executed' },
      remaining === 0 ? 'Reviewing' : 'Executed'
    )

    return {
      ...state,
      cash: state.cash + price * qty,
      portfolio,
      journals: {
        ...state.journals,
        [symbol]: journal
      },
      trades: [makeTrade('SELL', symbol, qty, price, state.orderTicket.type, hasJournalContent(journal) ? journal : undefined), ...state.trades].slice(0, MAX_TRADES)
    }
  })
}

export default store
