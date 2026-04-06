import { get } from 'svelte/store'
import portfolioStore, { applyStrategyTemplate, buy, resetStore, sell, setQuote, updateAlertEventAction, upsertAlert, updateTradeJournal } from '../src/store'

beforeEach(() => {
  resetStore()
})

describe('Portfolio Store', () => {
  test('buy updates portfolio and cash', () => {
    buy('AAPL', 170, 2)

    const state = get(portfolioStore)
    expect(state.portfolio['AAPL'].shares).toBe(2)
    expect(state.portfolio['AAPL'].avgPrice).toBe(170)
    expect(state.cash).toBe(10000 - 170 * 2)
  })

  test('buy accumulates shares for same ticker', () => {
    buy('AAPL', 170, 2)
    buy('AAPL', 180, 3)

    const state = get(portfolioStore)
    expect(state.portfolio['AAPL'].shares).toBe(5)
    expect(state.portfolio['AAPL'].avgPrice).toBeCloseTo((170 * 2 + 180 * 3) / 5)
    expect(state.cash).toBe(10000 - 170 * 2 - 180 * 3)
  })

  test('sell reduces shares and increases cash', () => {
    buy('AAPL', 170, 5)
    sell('AAPL', 175, 2)

    const state = get(portfolioStore)
    expect(state.portfolio['AAPL'].shares).toBe(3)
    expect(state.cash).toBe(10000 - 170 * 5 + 175 * 2)
  })

  test('sell fails if ticker not owned', () => {
    expect(() => sell('AAPL', 170, 1)).toThrow('Ticker not owned')
  })

  test('sell fails if insufficient shares', () => {
    buy('AAPL', 170, 1)
    expect(() => sell('AAPL', 170, 2)).toThrow('Insufficient shares')
  })

  test('sell removes ticker if shares == 0', () => {
    buy('AAPL', 170, 1)
    sell('AAPL', 170, 1)

    const state = get(portfolioStore)
    expect(state.portfolio['AAPL']).toBeUndefined()
  })

  test('price alerts trigger and land in history on quote refresh', () => {
    updateTradeJournal('AAPL', {
      thesis: 'Semiconductor demand still looks underappreciated.',
      entryRationale: 'Momentum reclaim through weekly resistance.',
      setupStatus: 'Ready'
    })
    upsertAlert('AAPL', 'price-above', 190)
    setQuote('AAPL', 188, 2, 1.1)
    setQuote('AAPL', 191, 3, 1.6)

    const state = get(portfolioStore)
    expect(state.alerts['AAPL'][0].status).toBe('triggered')
    expect(state.alertHistory[0].symbol).toBe('AAPL')
    expect(state.alertHistory[0].message).toContain('traded above $190.00')
    expect(state.alertHistory[0].whyItMatters).toContain('underappreciated')
    expect(state.alertHistory[0].thesisStatus).toBe('Ready')
    expect(state.alertHistory[0].nextAction).toBe('enter')
  })

  test('percent alerts use the arming quote as baseline', () => {
    upsertAlert('NVDA', 'percent-down', 5, 100)
    setQuote('NVDA', 96, -4, -4)
    setQuote('NVDA', 94.9, -5.1, -5.1)

    const state = get(portfolioStore)
    expect(state.alerts['NVDA'][0].status).toBe('triggered')
    expect(state.alertHistory[0].message).toContain('fell 5.00% from $100.00')
  })

  test('triggered alert events can be marked reviewed, skipped, or snoozed', () => {
    upsertAlert('MSFT', 'price-below', 300)
    setQuote('MSFT', 299, -3, -1)

    const firstEvent = get(portfolioStore).alertHistory[0]
    updateAlertEventAction(firstEvent.id, 'reviewed')
    expect(get(portfolioStore).alertHistory[0].workflowState).toBe('reviewed')

    updateAlertEventAction(firstEvent.id, 'snoozed', '2026-04-06T04:00:00.000Z')
    expect(get(portfolioStore).alertHistory[0].workflowState).toBe('snoozed')
    expect(get(portfolioStore).alertHistory[0].snoozedUntil).toBe('2026-04-06T04:00:00.000Z')

    updateAlertEventAction(firstEvent.id, 'skipped')
    expect(get(portfolioStore).alertHistory[0].workflowState).toBe('skipped')
    expect(get(portfolioStore).alertHistory[0].snoozedUntil).toBeUndefined()
  })

  test('strategy template prefill populates empty journal fields', () => {
    applyStrategyTemplate('AAPL', 'breakout-continuation')

    const journal = get(portfolioStore).journals['AAPL']
    expect(journal.strategyTemplateId).toBe('breakout-continuation')
    expect(journal.strategyTemplateName).toBe('Breakout continuation')
    expect(journal.thesisSummary).toContain('resistance')
    expect(journal.postTradeNotes).toContain('Did volume actually confirm?')
  })

  test('strategy template prefill keeps existing custom fields', () => {
    updateTradeJournal('AAPL', { thesis: 'My custom thesis', riskPlan: 'Risk against Friday low.' })
    applyStrategyTemplate('AAPL', 'oversold-bounce', 'prefill')

    const journal = get(portfolioStore).journals['AAPL']
    expect(journal.thesis).toBe('My custom thesis')
    expect(journal.riskPlan).toBe('Risk against Friday low.')
    expect(journal.strategyTemplateId).toBe('oversold-bounce')
    expect(journal.entryRationale).toContain('capitulation signs')
  })
})
