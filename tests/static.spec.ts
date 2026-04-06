import { test, expect } from '@playwright/test'

test('Pounce workspace uses stage navigation and supports a basic paper trade flow with accountability surfaced', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Pounce').first()).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Workflow stages' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What matters now' })).toBeVisible()

  await page.getByTestId('stage-tab-thesis').click()
  await expect(page.getByRole('heading', { name: 'Why this trade exists' })).toBeVisible()
  await expect(page.getByText('Setup snapshot')).toBeVisible()

  await page.getByTestId('stage-tab-backtest').click()
  await expect(page.getByRole('heading', { name: 'Would this have worked?' })).toBeVisible()

  await page.getByTestId('stage-tab-act').click()
  await expect(page.getByText('Quote workstation')).toBeVisible()

  await page.locator('#ticker-input').fill('AAPL')
  await page.getByRole('button', { name: /^Get price$/i }).click()

  await expect(page.getByText('Buying power', { exact: true })).toBeVisible()
  await expect(page.getByText('AAPL').first()).toBeVisible()
  await expect(page.getByText('Trade preview')).toBeVisible()
  await expect(page.getByText(/Max affordable:/i)).toBeVisible()
  await expect(page.getByText('Awaiting quote')).not.toBeVisible()

  await page.getByLabel('Core thesis').fill('Earnings reset looks overdone and the trend is stabilizing.')
  await page.getByLabel('Entry rationale').fill('Momentum reclaim through prior resistance.')
  await page.getByRole('spinbutton', { name: /Shares/i }).fill('2')
  await expect(page.getByRole('button', { name: /Buy shares/i })).toBeEnabled()
  await page.getByRole('button', { name: /Buy shares/i }).click()
  await expect(page.getByText(/Bought 2 shares of AAPL/i)).toBeVisible()


  await page.getByRole('button', { name: /Draft thesis from research/i }).click()
  await expect(page.getByTestId('thesis-ai-draft')).toContainText(/AI-assisted draft/i)

  await page.getByRole('button', { name: /Stress-test my thesis/i }).click()
  await expect(page.getByTestId('thesis-ai-critique')).toContainText(/AI thesis critique/i)

  await page.getByTestId('stage-tab-backtest').click()
  await page.getByRole('button', { name: /Explain this setup like a backtest coach/i }).click()
  await expect(page.getByTestId('backtest-ai-summary')).toContainText(/AI-assisted summary/i)

  await page.getByTestId('stage-tab-monitor').click()
  await expect(page.getByText('Open positions missing risk plan')).toBeVisible()

  await page.getByTestId('stage-tab-review').click()
  await expect(page.getByRole('heading', { name: 'Learn from the outcome' })).toBeVisible()
})
