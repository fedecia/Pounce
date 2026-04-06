import { buildResearchSnapshot } from '../src/research'

describe('buildResearchSnapshot', () => {
  test('builds a live-looking snapshot from Yahoo search payload', () => {
    const snapshot = buildResearchSnapshot('AAPL', {
      quotes: [
        {
          symbol: 'AAPL',
          shortname: 'Apple Inc.',
          sectorDisp: 'Technology',
          industryDisp: 'Consumer Electronics'
        }
      ],
      news: [
        {
          title: 'Apple upgrade follows strong iPhone demand outlook',
          publisher: 'Reuters',
          link: 'https://example.com/apple-upgrade',
          providerPublishTime: 1775435471
        },
        {
          title: 'Apple faces new regulatory probe in Europe',
          publisher: 'Bloomberg',
          link: 'https://example.com/apple-probe',
          providerPublishTime: 1775436471
        }
      ]
    })

    expect(snapshot.sourceLabel).toBe('Yahoo Finance company search/news')
    expect(snapshot.headlines).toHaveLength(2)
    expect(snapshot.headlines[0].tag).toBe('Product')
    expect(snapshot.headlines[0].sentiment).toBe('Bullish')
    expect(snapshot.headlines[1].tag).toBe('Regulatory')
    expect(snapshot.headlines[1].sentiment).toBe('Cautious')
    expect(snapshot.signals).toContain('Technology exposure')
    expect(snapshot.signals).toContain('Consumer Electronics')
    expect(snapshot.updatedAt).toBeTruthy()
  })

  test('falls back when no headlines are available', () => {
    const snapshot = buildResearchSnapshot('MSFT', { quotes: [], news: [] })

    expect(snapshot.headlines).toHaveLength(2)
    expect(snapshot.sourceLabel).toBe('Fallback desk notes')
    expect(snapshot.signals).toContain('Watch liquidity')
  })
})
