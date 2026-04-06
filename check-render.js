import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'http://localhost:8899';
const LOG_DIR = './logs';
const SCREENSHOT_PATH = path.join(LOG_DIR, 'screenshot.png');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'render-errors.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
fs.writeFileSync(ERROR_LOG_PATH, '');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (error) => {
    errors.push(`[PAGE ERROR] ${error.message}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    await page.waitForSelector('text=Pounce', { timeout: 10000 });
    await page.waitForSelector('text=Quote workstation', { timeout: 10000 });
    await page.waitForSelector('text=Open positions', { timeout: 10000 });
    await page.waitForSelector('#ticker-input', { timeout: 10000 });

    await page.fill('#ticker-input', 'AAPL');
    await page.getByRole('button', { name: /Get price/i }).click();

    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Buying power') && text.includes('AAPL') && /\$\d/.test(text);
    }, { timeout: 10000 });

    await page.locator('input[type="number"]').first().fill('2');
    await page.getByRole('button', { name: /Buy shares/i }).click();

    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('2 sh') || text.includes('2 shares');
    }, { timeout: 10000 });

    const bodyText = await page.locator('body').innerText();
    if (!bodyText.includes('AAPL')) {
      errors.push('[UI ERROR] AAPL not visible after quote fetch.');
    }
    if (!(bodyText.includes('2 sh') || bodyText.includes('2 shares'))) {
      errors.push('[UI ERROR] Bought position not reflected in portfolio/account surfaces.');
    }

    await page.screenshot({ path: path.join(LOG_DIR, 'debug_post_buy.png'), fullPage: true });
  } catch (error) {
    errors.push(`[LOAD ERROR] ${error instanceof Error ? error.message : String(error)}`);
    try {
      await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    } catch {}
  }

  if (errors.length > 0) {
    try {
      await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    } catch {}
    fs.appendFileSync(ERROR_LOG_PATH, errors.join('\n') + '\n');
    console.log('❌ Smoke test failed. Check logs/render-errors.log and logs/screenshot.png');
    await browser.close();
    process.exit(1);
  }

  console.log('✅ Smoke test passed.');
  await browser.close();
})();
