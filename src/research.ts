type ResearchSentiment = 'Bullish' | 'Balanced' | 'Cautious'

export type ResearchHeadline = {
  title: string
  source: string
  tag: string
  sentiment: ResearchSentiment
  link?: string
  publishedAt?: string
}

export type ResearchSnapshot = {
  catalyst: string
  thesis: string
  headlines: ResearchHeadline[]
  signals: string[]
  sourceLabel: string
  updatedAt?: string
}

type YahooNewsItem = {
  title?: string
  publisher?: string
  link?: string
  providerPublishTime?: number
  relatedTickers?: string[]
}

type YahooQuoteItem = {
  symbol?: string
  shortname?: string
  longname?: string
  exchDisp?: string
  sectorDisp?: string
  industryDisp?: string
}

type YahooSearchResponse = {
  quotes?: YahooQuoteItem[]
  news?: YahooNewsItem[]
}

type CachedResearch = {
  expiresAt: number
  snapshot: ResearchSnapshot
}

const RESEARCH_CACHE_TTL_MS = 5 * 60_000
const SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search'
const researchCache = new Map<string, CachedResearch>()

const fallback: ResearchSnapshot = {
  catalyst: 'Cross-asset flows and single-name momentum are shaping the current tape.',
  thesis: 'Monitor execution quality, sizing discipline, and liquidity before leaning into conviction.',
  headlines: [
    { title: 'Rotation remains selective beneath the index surface', source: 'Morning Note', tag: 'Macro', sentiment: 'Balanced' },
    { title: 'Traders favor liquid leaders as breadth remains uneven', source: 'Desk Color', tag: 'Flow', sentiment: 'Balanced' }
  ],
  signals: ['Watch liquidity', 'Respect trend', 'Scale entries'],
  sourceLabel: 'Fallback desk notes'
}

function normalizeSymbol(symbol: string) {
  return symbol.toUpperCase().trim()
}

function dedupe(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function sentimentFromHeadline(title: string): ResearchSentiment {
  const lower = title.toLowerCase()
  if (/(beat|surge|jump|rally|expand|growth|bull|upgrade|record|strong|gain)/.test(lower)) return 'Bullish'
  if (/(risk|cut|fall|drop|miss|probe|delay|weak|bear|downgrade|lawsuit|setback)/.test(lower)) return 'Cautious'
  return 'Balanced'
}

function formatPublishedAt(timestamp?: number) {
  if (!timestamp) return undefined
  return new Date(timestamp * 1000).toISOString()
}

function classifyHeadlineTag(title: string): string {
  const lower = title.toLowerCase()
  if (/(earnings|revenue|profit|margin|guidance|quarter)/.test(lower)) return 'Earnings'
  if (/(ai|chip|iphone|product|launch|model|software|cloud)/.test(lower)) return 'Product'
  if (/(regulat|antitrust|china|tariff|policy|approval|probe|lawsuit)/.test(lower)) return 'Regulatory'
  if (/(buyback|dividend|valuation|analyst|price target|upgrade|downgrade)/.test(lower)) return 'Street'
  if (/(demand|supply|factory|deliveries|lead time|orders)/.test(lower)) return 'Demand'
  return 'News'
}

function buildSignals(symbol: string, quote: YahooQuoteItem | undefined, headlines: ResearchHeadline[]): string[] {
  const joined = headlines.map((item) => item.title.toLowerCase()).join(' ')
  const signals = [
    quote?.sectorDisp ? `${quote.sectorDisp} exposure` : '',
    quote?.industryDisp ? quote.industryDisp : '',
    /earnings|guidance|margin|profit|revenue/.test(joined) ? 'Earnings sensitivity' : 'Headline sensitivity',
    /regulat|probe|lawsuit|china|tariff|policy/.test(joined) ? 'Policy risk' : 'Macro/liquidity watch',
    /upgrade|downgrade|price target|analyst|valuation/.test(joined) ? 'Street revisions in play' : `${symbol} tape-driven setup`
  ]

  return dedupe(signals).slice(0, 4)
}

export function buildResearchSnapshot(symbol: string, payload: YahooSearchResponse): ResearchSnapshot {
  const normalized = normalizeSymbol(symbol)
  const quote = payload.quotes?.find((item) => normalizeSymbol(item.symbol || '') === normalized) ?? payload.quotes?.[0]
  const headlines = (payload.news ?? [])
    .filter((item) => item.title && item.publisher)
    .slice(0, 4)
    .map((item) => ({
      title: item.title as string,
      source: item.publisher as string,
      tag: classifyHeadlineTag(item.title as string),
      sentiment: sentimentFromHeadline(item.title as string),
      link: item.link,
      publishedAt: formatPublishedAt(item.providerPublishTime)
    }))

  if (headlines.length === 0) {
    return {
      ...fallback,
      sourceLabel: 'Fallback desk notes',
      updatedAt: new Date().toISOString()
    }
  }

  const companyName = quote?.shortname || quote?.longname || normalized
  const sector = quote?.sectorDisp || 'its sector'
  const industry = quote?.industryDisp || 'its industry group'
  const dominantTag = headlines[0]?.tag || 'News'
  const cautiousCount = headlines.filter((item) => item.sentiment === 'Cautious').length
  const bullishCount = headlines.filter((item) => item.sentiment === 'Bullish').length
  const stance: ResearchSentiment = bullishCount > cautiousCount ? 'Bullish' : cautiousCount > bullishCount ? 'Cautious' : 'Balanced'

  const catalyst =
    stance === 'Bullish'
      ? `${companyName} is being driven by fresh ${dominantTag.toLowerCase()} headlines, with current coverage leaning constructive around ${industry.toLowerCase()} demand and execution.`
      : stance === 'Cautious'
        ? `${companyName} is trading against a more fragile headline set, with recent ${dominantTag.toLowerCase()} coverage keeping attention on risk around ${industry.toLowerCase()} execution.`
        : `${companyName} remains a headline-driven name, with recent ${dominantTag.toLowerCase()} coverage pointing to an active but mixed setup across ${sector.toLowerCase()}.`

  const thesis =
    stance === 'Bullish'
      ? `The tape is rewarding upside narrative persistence here, but conviction still depends on whether ${companyName} can translate attention into durable operating follow-through.`
      : stance === 'Cautious'
        ? `News flow is credible enough to matter, but the setup argues for tighter risk control until ${companyName} shows cleaner evidence that the bearish thread is fading.`
        : `The story is not one-dimensional right now: headline flow is active, but traders still need to separate durable fundamental change from short-term positioning noise.`

  return {
    catalyst,
    thesis,
    headlines,
    signals: buildSignals(normalized, quote, headlines),
    sourceLabel: 'Yahoo Finance company search/news',
    updatedAt: new Date().toISOString()
  }
}

export async function fetchResearchSnapshot(symbol: string): Promise<ResearchSnapshot> {
  const normalized = normalizeSymbol(symbol)
  const cached = researchCache.get(normalized)
  if (cached && cached.expiresAt > Date.now()) return cached.snapshot

  try {
    const url = new URL(SEARCH_URL)
    url.searchParams.set('q', normalized)
    url.searchParams.set('quotesCount', '1')
    url.searchParams.set('newsCount', '6')
    url.searchParams.set('enableFuzzyQuery', 'false')

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) throw new Error(`Research source returned ${response.status}`)
    const payload = (await response.json()) as YahooSearchResponse
    const snapshot = buildResearchSnapshot(normalized, payload)
    researchCache.set(normalized, { snapshot, expiresAt: Date.now() + RESEARCH_CACHE_TTL_MS })
    return snapshot
  } catch {
    const snapshot = { ...fallback, updatedAt: new Date().toISOString() }
    researchCache.set(normalized, { snapshot, expiresAt: Date.now() + RESEARCH_CACHE_TTL_MS })
    return snapshot
  }
}
