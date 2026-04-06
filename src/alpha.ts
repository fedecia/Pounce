import type { ChartSeries, Quote, Timeframe } from './types'

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const QUOTE_CACHE_TTL_MS = 15_000

type ChartPoint = {
  close: number
  timestamp: number
  volume?: number
}

type CachedQuote = {
  expiresAt: number
  quote: Quote
}

type CachedSeries = {
  expiresAt: number
  series: ChartSeries
}

const quoteCache = new Map<string, CachedQuote>()
const chartCache = new Map<string, CachedSeries>()

function hashSymbol(symbol: string) {
  return symbol
    .toUpperCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function normalizeSymbol(symbol: string) {
  return symbol.toUpperCase().trim()
}

function fallbackQuote(sym: string): Quote {
  const symbol = normalizeSymbol(sym)
  const seed = hashSymbol(symbol)
  const base = 40 + (seed % 260)
  const drift = ((seed % 17) - 8) * 0.37
  const intraday = ((seed % 9) - 4) * 0.61
  const price = Number((base + drift + intraday).toFixed(2))
  const change = Number((drift / 2).toFixed(2))
  const changePercent = `${((change / Math.max(price - change, 1)) * 100).toFixed(2)}%`

  return {
    symbol,
    price,
    change,
    changePercent,
    source: 'fallback',
    asOf: new Date().toISOString()
  }
}

function parseChangePercent(changePercent: string) {
  const value = Number.parseFloat(String(changePercent).replace('%', ''))
  return Number.isFinite(value) ? value : 0
}

function buildQuoteFromChart(symbol: string, points: ChartPoint[]): Quote {
  const latest = points[points.length - 1]
  const previous = points[points.length - 2] ?? points[0] ?? latest
  const price = Number(latest.close.toFixed(2))
  const change = Number((latest.close - previous.close).toFixed(2))
  const changePercent = `${(previous.close ? (change / previous.close) * 100 : 0).toFixed(2)}%`

  return {
    symbol,
    price,
    change,
    changePercent,
    source: 'live',
    asOf: new Date(latest.timestamp * 1000).toISOString()
  }
}

function extractChartPoints(payload: unknown): ChartPoint[] {
  const result = (payload as { chart?: { result?: Array<Record<string, unknown>> } })?.chart?.result?.[0]
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : []
  const closes = Array.isArray((result?.indicators as { quote?: Array<{ close?: Array<number | null> }> })?.quote?.[0]?.close)
    ? (result?.indicators as { quote?: Array<{ close?: Array<number | null> }> }).quote?.[0]?.close ?? []
    : []
  const volumes = Array.isArray((result?.indicators as { quote?: Array<{ volume?: Array<number | null> }> })?.quote?.[0]?.volume)
    ? (result?.indicators as { quote?: Array<{ volume?: Array<number | null> }> }).quote?.[0]?.volume ?? []
    : []

  return timestamps
    .map<ChartPoint | null>((timestamp, index) => {
      const close = closes[index]
      if (typeof timestamp !== 'number' || typeof close !== 'number' || !Number.isFinite(close)) return null
      const volume = volumes[index]
      return { timestamp, close, ...(typeof volume === 'number' && Number.isFinite(volume) ? { volume } : {}) }
    })
    .filter((point): point is ChartPoint => point !== null)
}

async function fetchYahooChart(symbol: string, range = '5d', interval = '1d'): Promise<ChartPoint[]> {
  const url = new URL(`${YAHOO_URL}/${encodeURIComponent(symbol)}`)
  url.searchParams.set('range', range)
  url.searchParams.set('interval', interval)
  url.searchParams.set('includePrePost', 'false')

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Quote source returned ${response.status}`)
  }

  const payload = await response.json()
  const points = extractChartPoints(payload)
  if (points.length === 0) throw new Error('Quote source returned no chart data')
  return points
}

export async function fetchQuote(sym: string): Promise<Quote> {
  const symbol = normalizeSymbol(sym)
  const cached = quoteCache.get(symbol)
  if (cached && cached.expiresAt > Date.now()) return cached.quote

  try {
    const points = await fetchYahooChart(symbol)
    const quote = buildQuoteFromChart(symbol, points)
    quoteCache.set(symbol, {
      quote,
      expiresAt: Date.now() + QUOTE_CACHE_TTL_MS
    })
    return quote
  } catch {
    const quote = fallbackQuote(symbol)
    quoteCache.set(symbol, {
      quote,
      expiresAt: Date.now() + QUOTE_CACHE_TTL_MS
    })
    return quote
  }
}

const timeframeConfig: Record<Timeframe, { range: string; interval: string; maxPoints: number }> = {
  '1D': { range: '1d', interval: '5m', maxPoints: 78 },
  '1W': { range: '5d', interval: '30m', maxPoints: 65 },
  '1M': { range: '1mo', interval: '1d', maxPoints: 23 },
  '3M': { range: '3mo', interval: '1d', maxPoints: 65 },
  '1Y': { range: '1y', interval: '1wk', maxPoints: 52 }
}

function downsample(points: ChartPoint[], maxPoints: number) {
  if (points.length <= maxPoints) return points
  const stride = points.length / maxPoints
  return Array.from({ length: maxPoints }, (_, index) => points[Math.min(points.length - 1, Math.floor(index * stride))])
}

function buildFallbackSeries(symbol: string, timeframe: Timeframe, quote: Quote): ChartSeries {
  const normalizedSymbol = normalizeSymbol(symbol)
  const previousClose = quote.price - quote.change
  const points = timeframeConfig[timeframe].maxPoints
  const pct = parseChangePercent(quote.changePercent) / 100
  const baseStart = previousClose > 0 ? previousClose : quote.price
  const seed = hashSymbol(normalizedSymbol)
  const driftMultiplier = timeframe === '1D' ? 0.25 : timeframe === '1W' ? 0.5 : timeframe === '1M' ? 0.9 : timeframe === '3M' ? 1.5 : 2.8

  const seriesPoints = Array.from({ length: points }, (_, index) => {
    const progress = points === 1 ? 1 : index / (points - 1)
    const anchoredTrend = baseStart * pct * progress * driftMultiplier
    const oscillation = Math.sin(progress * Math.PI * (2 + (seed % 3))) * Math.max(quote.price * 0.006, 0.35)
    const wiggle = Math.cos(progress * Math.PI * (5 + (seed % 5))) * Math.max(quote.price * 0.003, 0.18)
    const value = index === points - 1 ? quote.price : baseStart + anchoredTrend + oscillation + wiggle
    return Number(value.toFixed(2))
  })

  return {
    symbol: normalizedSymbol,
    timeframe,
    points: seriesPoints,
    volume: 0,
    source: 'fallback',
    asOf: quote.asOf
  }
}

export async function fetchChartSeries(sym: string, timeframe: Timeframe = '1D'): Promise<ChartSeries> {
  const symbol = normalizeSymbol(sym)
  const cacheKey = `${symbol}:${timeframe}`
  const cached = chartCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.series

  try {
    const config = timeframeConfig[timeframe]
    const rawPoints = await fetchYahooChart(symbol, config.range, config.interval)
    const points = downsample(rawPoints, config.maxPoints)
    const series: ChartSeries = {
      symbol,
      timeframe,
      points: points.map((point) => Number(point.close.toFixed(2))),
      volume: points.reduce((sum, point) => sum + (point.volume ?? 0), 0),
      source: 'live',
      asOf: new Date(points[points.length - 1].timestamp * 1000).toISOString()
    }
    chartCache.set(cacheKey, {
      series,
      expiresAt: Date.now() + QUOTE_CACHE_TTL_MS
    })
    return series
  } catch {
    const quote = await fetchQuote(symbol)
    const series = buildFallbackSeries(symbol, timeframe, quote)
    chartCache.set(cacheKey, {
      series,
      expiresAt: Date.now() + QUOTE_CACHE_TTL_MS
    })
    return series
  }
}
