import { get } from 'svelte/store'
import portfolioStore, { buy, resetStore, sell, setQuote, upsertAlert } from '../src/store'

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
    upsertAlert('AAPL', 'price-above', 190)
    setQuote('AAPL', 188, 2, 1.1)
    setQuote('AAPL', 191, 3, 1.6)

    const state = get(portfolioStore)
    expect(state.alerts['AAPL'][0].status).toBe('triggered')
    expect(state.alertHistory[0].symbol).toBe('AAPL')
    expect(state.alertHistory[0].message).toContain('traded above $190.00')
  })

  test('percent alerts use the arming quote as baseline', () => {
    upsertAlert('NVDA', 'percent-down', 5, 100)
    setQuote('NVDA', 96, -4, -4)
    setQuote('NVDA', 94.9, -5.1, -5.1)

    const state = get(portfolioStore)
    expect(state.alerts['NVDA'][0].status).toBe('triggered')
    expect(state.alertHistory[0].message).toContain('fell 5.00% from $100.00')
  })
})
