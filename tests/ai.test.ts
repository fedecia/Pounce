import { buildBacktestSummaryInput, createAiClient, emptyAiState } from '../src/ai'
import type { ResearchSnapshot } from '../src/research'
import type { AppState } from '../src/store'

const ai = createAiClient()

const research: ResearchSnapshot = {
  catalyst: 'Fresh product and earnings headlines are keeping the name active.',
  thesis: 'The setup looks constructive if buyers keep accepting the move after the catalyst.',
  headlines: [
    {
      title: 'Apple upgrade follows strong iPhone demand outlook',
      source: 'Reuters',
      tag: 'Product',
      sentiment: 'Bullish'
    },
    {
      title: 'Apple faces new regulatory probe in Europe',
      source: 'Bloomberg',
      tag: 'Regulatory',
      sentiment: 'Cautious'
    }
  ],
  signals: ['Technology exposure', 'Consumer Electronics', 'Earnings sensitivity'],
  sourceLabel: 'Yahoo Finance company search/news',
  updatedAt: '2026-04-06T03:00:00.000Z'
}

function makeState(): AppState {
  return {
    cash: 10000,
    startingCash: 10000,
    portfolio: {},
    prices: { AAPL: 210 },
    quotes: { AAPL: 210 },
    trend: { AAPL: { change: 3, pct: 1.45 } },
    trades: [],
    watchlist: ['AAPL'],
    alerts: {
      AAPL: [
        {
          id: 'alert-1',
          symbol: 'AAPL',
          condition: 'price-above',
          target: 212,
          status: 'active',
          createdAt: '2026-04-06T03:00:00.000Z',
          updatedAt: '2026-04-06T03:00:00.000Z'
        }
      ]
    },
    alertHistory: [],
    journals: {
      AAPL: {
        thesis: 'Product strength is still underappreciated.',
        thesisSummary: 'Constructive if follow-through sticks.',
        entryRationale: 'Momentum reclaim after catalyst.',
        triggerSummary: 'Hold above the breakout area.',
        riskPlan: 'Keep size moderate and cut failed follow-through.',
        invalidationSummary: 'Failed breakout and fast headline fade.',
        exitPlan: 'Scale into strength.',
        postTradeNotes: '',
        setupStatus: 'Ready',
        conviction: 'Medium',
        priority: 'Standard'
      }
    },
    ai: emptyAiState(),
    selectedSymbol: 'AAPL',
    selectedTimeframe: '1D',
    orderTicket: {
      type: 'Market',
      tif: 'Day'
    }
  }
}

describe('ai client', () => {
  test('drafts a structured thesis from research', async () => {
    const draft = await ai.draftThesis({
      symbol: 'AAPL',
      journal: makeState().journals.AAPL,
      research,
      price: 210,
      trendPct: 1.45
    })

    expect(draft.thesisSummary).toMatch(/AAPL/)
    expect(draft.triggerSummary.length).toBeGreaterThan(10)
    expect(draft.citations.length).toBeGreaterThanOrEqual(3)
    expect(draft.confidenceNote).toMatch(/AI-assisted draft/i)
  })

  test('critiques an incomplete thesis', async () => {
    const critique = await ai.critiqueThesis({
      symbol: 'TSLA',
      journal: {
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
      },
      research
    })

    expect(critique.gaps.length).toBeGreaterThan(2)
    expect(critique.verdict).toMatch(/not ready/i)
  })

  test('builds plain-english backtest planning summary from app state', async () => {
    const state = makeState()
    const summary = await ai.summarizeBacktest(buildBacktestSummaryInput(state, 'AAPL'))

    expect(summary.headline).toMatch(/backtest/i)
    expect(summary.summary).toMatch(/plain english/i)
    expect(summary.caveats).toHaveLength(3)
  })
})
