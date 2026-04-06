import type { StrategyTemplate, StrategyTemplateId } from './types'

export const strategyTemplates: StrategyTemplate[] = [
  {
    id: 'breakout-continuation',
    name: 'Breakout continuation',
    summary: 'For names pressing through resistance with trend, volume, and a clean risk line.',
    setupStatus: 'Ready',
    holdingPeriod: '1 day to 3 weeks',
    thesis: 'The market is starting to reprice this name after a tight base or fresh breakout, and momentum can continue if price holds above the breakout area.',
    entryRationale: 'Enter only if price accepts above resistance, volume confirms participation, and the move is not already too extended from the breakout pivot.',
    riskPlan: 'Risk against the breakout level, prior day low, or failed retest. Keep size smaller if entry is already extended.',
    exitPlan: 'Trim into accelerated upside, especially if price gets climactic. Exit if the breakout fails back into the base on real selling pressure.',
    postTradePrompt: 'Did volume actually confirm? Did I chase extension? Was the breakout clean or just noisy?',
    reviewQuestions: [
      'Was the breakout level obvious before entry?',
      'Did price hold above the level after entry?',
      'Was I buying strength or chasing late?' 
    ]
  },
  {
    id: 'pullback-uptrend',
    name: 'Pullback in uptrend',
    summary: 'For buying orderly weakness inside an existing trend instead of buying the first spike.',
    setupStatus: 'Building',
    holdingPeriod: '2 days to 4 weeks',
    thesis: 'The primary trend is still up, and this pullback offers a better entry if buyers defend a logical support area and momentum re-accelerates.',
    entryRationale: 'Look for support at a prior breakout zone, moving average, or higher low, then wait for a reclaim or reversal signal instead of blind knife-catching.',
    riskPlan: 'Invalidate if support loses character or the trend structure breaks. Size by distance to support, not by hope.',
    exitPlan: 'Take partials into the prior high / extension zone. Exit if the bounce cannot reclaim trend or if relative strength fades fast.',
    postTradePrompt: 'Did support actually hold? Did I wait for confirmation or buy the dip just because it was down?',
    reviewQuestions: [
      'Was the larger uptrend still intact?',
      'Did I define support before entry?',
      'Did the bounce show real follow-through?' 
    ]
  },
  {
    id: 'earnings-follow-through',
    name: 'Earnings follow-through',
    summary: 'For post-earnings names where guidance, gap behavior, and day-two action matter more than the headline alone.',
    setupStatus: 'Ready',
    holdingPeriod: '1 day to 10 trading days',
    thesis: 'Earnings changed expectations enough that institutions may continue repricing the stock beyond the initial gap reaction.',
    entryRationale: 'Focus on names with clean guidance, strong relative volume, and gap-hold behavior. Enter on continuation or orderly consolidation above the post-earnings pivot.',
    riskPlan: 'If the earnings gap cannot hold, the thesis is weaker than advertised. Risk against gap support, the event low, or failed day-two reclaim.',
    exitPlan: 'Pay yourself into sharp continuation days. Exit quickly if the stock fades back into the gap or loses post-event leadership.',
    postTradePrompt: 'Was this real repricing or just a one-day emotional move? Did the stock hold the gap and act like a leader?',
    reviewQuestions: [
      'Was the market treating the report as genuinely important?',
      'Did the stock hold key post-earnings levels?',
      'Did I buy a leader or a one-day wonder?' 
    ]
  },
  {
    id: 'oversold-bounce',
    name: 'Oversold bounce',
    summary: 'For tactical reflex rallies where the edge depends on mean-reversion, not pretending it is a full trend change.',
    setupStatus: 'Watching',
    holdingPeriod: 'Intraday to 5 trading days',
    thesis: 'Selling may be temporarily exhausted, creating room for a sharp bounce even if the bigger chart is still damaged.',
    entryRationale: 'Wait for capitulation signs, failed breakdown follow-through, or a reclaim of a key short-term level. Treat this as tactical until proven otherwise.',
    riskPlan: 'Use tight risk. If the bounce loses the reclaim or sellers immediately retake control, get out instead of arguing with trend damage.',
    exitPlan: 'Be quicker taking profits into resistance, moving averages, or gap-fill zones. Do not overstay a trade that was meant to be a bounce.',
    postTradePrompt: 'Did I respect that this was a countertrend trade? Did I take the bounce or get greedy waiting for a full reversal?',
    reviewQuestions: [
      'Was there actual exhaustion or just a stock that looked cheap?',
      'Did I define nearby resistance before entering?',
      'Did I keep expectations tactical?' 
    ]
  },
  {
    id: 'thesis-driven-swing',
    name: 'Thesis-driven swing starter',
    summary: 'For slower swings where the setup starts with a real narrative and catalyst map, not just a chart screenshot.',
    setupStatus: 'Building',
    holdingPeriod: '1 to 8 weeks',
    thesis: 'There is a non-random reason to care here — valuation, sentiment shift, product cycle, industry rotation, or catalyst timing — and the market may not have fully priced it yet.',
    entryRationale: 'Start small once the chart stops fighting the idea, then build only if price and thesis begin confirming each other.',
    riskPlan: 'Define what would make the thesis wrong in reality, not just on a one-day wiggle. Keep initial size modest until the market agrees.',
    exitPlan: 'Scale out into thesis milestones, catalyst resolution, or obvious extension. Exit faster if the original reason to own it degrades.',
    postTradePrompt: 'What specifically changed my confidence after entry? Was this thesis actually evidence-based or just a story I enjoyed?',
    reviewQuestions: [
      'Did I name the catalyst or re-rating driver clearly?',
      'What evidence strengthened or weakened the thesis after entry?',
      'Did I let the position size earn its way bigger?' 
    ]
  }
]

export const strategyTemplatesById = Object.fromEntries(
  strategyTemplates.map((template) => [template.id, template])
) as Record<StrategyTemplateId, StrategyTemplate>

export function getStrategyTemplate(templateId: string | undefined | null) {
  if (!templateId) return undefined
  return strategyTemplates.find((template) => template.id === templateId)
}
