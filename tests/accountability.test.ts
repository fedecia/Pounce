import { getAccountabilitySummary } from '../src/lib/accountability'
import { emptyAiState } from '../src/ai'
import type { AppState } from '../src/store'

const makeState = (): AppState => ({
  cash: 10000,
  startingCash: 10000,
  portfolio: {},
  prices: {},
  quotes: {},
  trend: {},
  trades: [],
  watchlist: ['AAPL', 'MSFT', 'TSLA', 'NVDA'],
  alerts: {},
  alertHistory: [],
  journals: {},
  ai: emptyAiState(),
  selectedSymbol: 'AAPL',
  selectedTimeframe: '1D',
  orderTicket: {
    type: 'Market',
    tif: 'Day'
  }
})

describe('accountability summary', () => {
  test('flags missing thesis and risk plan for open positions', () => {
    const state = makeState()
    state.portfolio.AAPL = { shares: 10, avgPrice: 100 }
    state.journals.AAPL = {
      thesis: '',
      entryRationale: 'Breakout through prior highs',
      riskPlan: '',
      exitPlan: '',
      postTradeNotes: '',
      setupStatus: 'Executed'
    }

    const summary = getAccountabilitySummary(state)

    expect(summary.openWithoutThesis.map((item) => item.symbol)).toEqual(['AAPL'])
    expect(summary.openWithoutRisk.map((item) => item.symbol)).toEqual(['AAPL'])
    expect(summary.symbolsNeedingAttention).toBe(1)
  })

  test('flags closed trades with no post-trade notes', () => {
    const state = makeState()
    state.journals.MSFT = {
      thesis: 'Cloud strength is still being repriced.',
      entryRationale: 'Held through earnings reaction',
      riskPlan: 'Exit on failed gap hold',
      exitPlan: '',
      postTradeNotes: '',
      setupStatus: 'Reviewing'
    }
    state.trades = [
      {
        id: 'sell-msft',
        side: 'SELL',
        ticker: 'MSFT',
        qty: 5,
        price: 420,
        value: 2100,
        timestamp: '2026-04-06T03:00:00.000Z',
        orderType: 'Market',
        journal: state.journals.MSFT
      }
    ]

    const summary = getAccountabilitySummary(state)

    expect(summary.reviewMissingNotes).toHaveLength(1)
    expect(summary.reviewMissingNotes[0].symbol).toBe('MSFT')
  })

  test('flags ready setups that were never traded', () => {
    const state = makeState()
    state.journals.TSLA = {
      thesis: 'Waiting for reclaim of range highs.',
      entryRationale: 'Only want it on confirmation',
      riskPlan: 'Cut on failed breakout',
      exitPlan: '',
      postTradeNotes: '',
      setupStatus: 'Ready'
    }

    const summary = getAccountabilitySummary(state)

    expect(summary.staleReady).toHaveLength(1)
    expect(summary.staleReady[0].symbol).toBe('TSLA')
  })

  test('reports clean state when journals are complete', () => {
    const state = makeState()
    state.portfolio.NVDA = { shares: 3, avgPrice: 880 }
    state.journals.NVDA = {
      thesis: 'AI demand is still outrunning expectations.',
      entryRationale: 'Trend resumed after consolidation',
      riskPlan: 'Trim if daily trend breaks and volume confirms',
      exitPlan: 'Scale into strength',
      postTradeNotes: '',
      setupStatus: 'Executed'
    }

    const summary = getAccountabilitySummary(state)

    expect(summary.totalIssues).toBe(0)
    expect(summary.completionRate).toBe(100)
  })
})
