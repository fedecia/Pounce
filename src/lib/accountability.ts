import type { AppState } from '../store'
import type { SetupStatus } from '../types'

export type AccountabilityBucket = {
  symbol: string
  setupStatus: SetupStatus
  thesis?: string
  detail: string
  priority: 'high' | 'medium'
}

export type AccountabilitySummary = {
  openWithoutThesis: AccountabilityBucket[]
  openWithoutRisk: AccountabilityBucket[]
  reviewMissingNotes: AccountabilityBucket[]
  staleReady: AccountabilityBucket[]
  totalIssues: number
  symbolsNeedingAttention: number
  completionRate: number
}

const snippet = (value = '', max = 96) => {
  const clean = value.trim()
  if (!clean) return ''
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

const hasOpenPosition = (state: AppState, symbol: string) => {
  const position = state.portfolio[symbol]
  return !!position && position.shares > 0
}

const hasTradeHistory = (state: AppState, symbol: string) => state.trades.some((trade) => trade.ticker === symbol)

const latestTrade = (state: AppState, symbol: string) => state.trades.find((trade) => trade.ticker === symbol)

export function getAccountabilitySummary(state: AppState): AccountabilitySummary {
  const symbols = Array.from(new Set([
    ...state.watchlist,
    ...Object.keys(state.journals),
    ...Object.keys(state.portfolio),
    ...state.trades.map((trade) => trade.ticker)
  ]))

  const openWithoutThesis: AccountabilityBucket[] = []
  const openWithoutRisk: AccountabilityBucket[] = []
  const reviewMissingNotes: AccountabilityBucket[] = []
  const staleReady: AccountabilityBucket[] = []

  for (const symbol of symbols) {
    const journal = state.journals[symbol]
    if (!journal) continue

    const open = hasOpenPosition(state, symbol)
    const traded = hasTradeHistory(state, symbol)
    const recentTrade = latestTrade(state, symbol)
    const thesis = snippet(journal.thesis)

    if (open && !journal.thesis.trim()) {
      openWithoutThesis.push({
        symbol,
        setupStatus: journal.setupStatus,
        detail: 'Position is live but the core thesis field is blank.',
        priority: 'high'
      })
    }

    if (open && !journal.riskPlan.trim()) {
      openWithoutRisk.push({
        symbol,
        setupStatus: journal.setupStatus,
        thesis,
        detail: 'Open exposure has no explicit invalidation, sizing, or stop discipline saved.',
        priority: 'high'
      })
    }

    if (traded && !open && !journal.postTradeNotes.trim()) {
      reviewMissingNotes.push({
        symbol,
        setupStatus: journal.setupStatus,
        thesis,
        detail: recentTrade
          ? `Last ${recentTrade.side.toLowerCase()} execution is stored, but the review/post-trade notes are still empty.`
          : 'Trade history exists, but the review/post-trade notes are still empty.',
        priority: 'medium'
      })
    }

    if (journal.setupStatus === 'Ready' && !open && !traded) {
      staleReady.push({
        symbol,
        setupStatus: journal.setupStatus,
        thesis,
        detail: 'Setup is still marked Ready with no execution history. Either trade it, downgrade it, or clear the thesis.',
        priority: 'medium'
      })
    }
  }

  const actionableCount = symbols.reduce((count, symbol) => {
    const journal = state.journals[symbol]
    if (!journal) return count

    const open = hasOpenPosition(state, symbol)
    const traded = hasTradeHistory(state, symbol)
    const hasIssue =
      (open && (!journal.thesis.trim() || !journal.riskPlan.trim())) ||
      (traded && !open && !journal.postTradeNotes.trim()) ||
      (journal.setupStatus === 'Ready' && !open && !traded)

    return count + (hasIssue ? 1 : 0)
  }, 0)

  const totalChecks = symbols.reduce((count, symbol) => {
    const journal = state.journals[symbol]
    if (!journal) return count
    const open = hasOpenPosition(state, symbol)
    const traded = hasTradeHistory(state, symbol)
    return count + (open ? 2 : 0) + (traded && !open ? 1 : 0) + (journal.setupStatus === 'Ready' && !open && !traded ? 1 : 0)
  }, 0)

  const unresolvedChecks = openWithoutThesis.length + openWithoutRisk.length + reviewMissingNotes.length + staleReady.length
  const completionRate = totalChecks > 0 ? Math.max(0, ((totalChecks - unresolvedChecks) / totalChecks) * 100) : 100

  return {
    openWithoutThesis,
    openWithoutRisk,
    reviewMissingNotes,
    staleReady,
    totalIssues: unresolvedChecks,
    symbolsNeedingAttention: actionableCount,
    completionRate
  }
}
