import { test, expect } from '@playwright/test'

test('Pounce workspace uses stage navigation and supports a basic paper trade flow with accountability surfaced', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Pounce').first()).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Workflow stages' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What matters now' })).toBeVisible()
  await expect(page.getByTestId('pounce-story-strip')).toContainText('Pounce readout')
  await expect(page.getByTestId('share-card-mini')).toContainText('If you screenshotted this, it would make sense')
  await expect(page.getByTestId('interactive-chart')).toBeVisible()
  await expect(page.getByTestId('chart-viewport-label')).toContainText('drag to pan')
  await expect(page.getByTestId('chart-readout-card')).toContainText('Viewport readout')
  const viewportBeforeZoom = await page.getByTestId('chart-viewport-label').textContent()
  await page.getByLabel('Zoom out chart').click()
  await expect(page.getByTestId('chart-viewport-label')).not.toHaveText(viewportBeforeZoom ?? '')
  const windowChangeBeforePan = await page.getByTestId('chart-window-change').textContent()
  await page.getByLabel('Pan chart left').click()
  await expect(page.getByTestId('chart-window-change')).not.toHaveText(windowChangeBeforePan ?? '')
  await page.getByLabel('Reset chart view').click()
  await expect(page.getByTestId('chart-viewport-label')).toContainText('drag to pan')
  await page.getByTestId('desk-tone-toggle').getByRole('button', { name: 'Playful' }).click()
  await expect(page.getByTestId('stage-tab-research')).toContainText('Scout')

  await page.getByTestId('stage-tab-thesis').click()
  await expect(page.getByRole('heading', { name: 'Why this trade exists' })).toBeVisible()
  await expect(page.getByText('Setup at a glance')).toBeVisible()
  await page.getByTestId('strategy-template-select').selectOption('breakout-continuation')
  await page.getByRole('button', { name: 'Load starter' }).click()
  await expect(page.getByText(/Door kicker loaded into the setup worksheet/i)).toBeVisible()
  await expect(page.getByText(/Breakout continuation/i).first()).toBeVisible()
  await expect(page.getByTestId('setup-share-card')).toContainText('Shareable setup snapshot')

  await page.getByTestId('stage-tab-backtest').click()
  await expect(page.getByRole('heading', { name: 'Would this have worked?' })).toBeVisible()

  await page.getByTestId('stage-tab-act').click()
  await expect(page.getByText('Quote workspace')).toBeVisible()

  await page.locator('#ticker-input').fill('AAPL')
  await page.getByRole('button', { name: /^Get quote$/i }).click()

  await expect(page.getByText('Buying power', { exact: true })).toBeVisible()
  await expect(page.getByText('AAPL').first()).toBeVisible()
  await expect(page.getByText('Trade preview')).toBeVisible()
  await expect(page.getByText(/Max you can afford:/i)).toBeVisible()
  await expect(page.getByText('Awaiting quote')).not.toBeVisible()

  await page.getByLabel('Core thesis').fill('Earnings reset looks overdone and the trend is stabilizing.')
  await page.getByLabel('One-line thesis').fill('Reset feels priced in; trend quality is improving.')
  await page.getByLabel('Entry rationale').fill('Momentum reclaim through prior resistance.')
  await page.getByLabel('Trigger summary').fill('Only act on a clean reclaim with volume.')
  await page.getByLabel('Risk plan').fill('Cut it if the reclaim fails and momentum slips.')
  await page.getByRole('spinbutton', { name: /Shares/i }).fill('2')
  await expect(page.getByTestId('share-card-mini')).toContainText('Clean setup')
  await expect(page.getByTestId('share-card-mini')).toContainText('3/3 locked')
  await expect(page.getByRole('button', { name: /^Buy$/i })).toBeEnabled()
  await page.getByRole('button', { name: /^Buy$/i }).click()

  await page.getByRole('button', { name: /Draft from research/i }).click()
  await expect(page.getByTestId('thesis-ai-draft')).toContainText(/AI-assisted draft/i)

  await page.getByRole('button', { name: /Stress-test my thesis/i }).click()
  await expect(page.getByTestId('thesis-ai-critique')).toContainText(/AI thesis critique/i)

  await page.getByTestId('stage-tab-backtest').click()
  await page.getByRole('button', { name: /Give me the backtest read/i }).click()
  await expect(page.getByTestId('backtest-ai-summary')).toContainText(/AI-assisted summary/i)

  await page.getByTestId('stage-tab-monitor').click()
  await expect(page.getByText('Open positions missing a risk plan')).toBeVisible()

  await page.getByTestId('stage-tab-review').click()
  await expect(page.getByRole('heading', { name: 'Learn from the outcome' })).toBeVisible()
})
