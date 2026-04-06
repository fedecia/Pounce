import { test, expect } from '@playwright/test'

test('Pounce dashboard loads and supports a basic paper trade flow with accountability surfaced', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByText('Pounce').first()).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Workflow' })).toBeVisible()
  await expect(page.getByText('What matters now')).toBeVisible()
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
  await expect(page.getByText(/AAPL · 2 shares/i).first()).toBeVisible()
  await expect(page.getByText(/trend is stabilizing/i).first()).toBeVisible()

  await page.getByRole('button', { name: /Draft thesis from research/i }).click()
  await expect(page.getByTestId('thesis-ai-draft')).toContainText(/AI-assisted draft/i)

  await page.getByRole('button', { name: /Stress-test my thesis/i }).click()
  await expect(page.getByTestId('thesis-ai-critique')).toContainText(/AI thesis critique/i)

  await page.getByRole('button', { name: /Explain this setup like a backtest coach/i }).click()
  await expect(page.getByTestId('backtest-ai-summary')).toContainText(/AI-assisted summary/i)

  await expect(page.getByText('Open positions missing risk plan')).toBeVisible()
})
