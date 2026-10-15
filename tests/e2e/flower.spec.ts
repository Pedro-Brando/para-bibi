import { test, expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

const BASE = 'http://localhost:5179/';

async function open(page: Page, query: string) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 45_000 });
  return errors;
}

async function pinkPixels(page: Page) {
  const png = PNG.sync.read(await page.screenshot());
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]!, g = png.data[i + 1]!, b = png.data[i + 2]!;
    if (r > 120 && r > g + 40 && b > 60) n++;
  }
  return n;
}

for (const backend of ['webgl', 'auto'] as const) {
  test.describe(`backend=${backend}`, () => {
    test('fully grown flower shows plenty of pink', async ({ page }) => {
      const errors = await open(page, `?backend=${backend}&growth=1&freeze=1`);
      await page.waitForTimeout(500);
      // Medido em Chromium headless (SwiftShader, 1280x800): 147 pixels; limiar = metade da contagem medida.
      expect(await pinkPixels(page)).toBeGreaterThan(73);
      expect(errors).toEqual([]);
    });

    test('growth 0 shows no petals', async ({ page }) => {
      await open(page, `?backend=${backend}&growth=0&freeze=1`);
      await page.waitForTimeout(500);
      expect(await pinkPixels(page)).toBeLessThan(400);
    });

    test('scrubbing 1 -> 0 -> 1 is reversible and error-free', async ({ page }) => {
      const errors = await open(page, `?backend=${backend}&growth=1&freeze=1`);
      await page.waitForTimeout(300);
      const full = await pinkPixels(page);
      for (const g of [0.7, 0.3, 0, 0.5, 1]) {
        await page.evaluate((v) => window.__quarrymill!.setGrowth(v), g);
        await page.waitForTimeout(150);
      }
      const again = await pinkPixels(page);
      expect(Math.abs(again - full) / full).toBeLessThan(0.05);
      expect(errors).toEqual([]);
    });
  });
}

test('resize and high DPR keep DPR capped at 2 without errors', async ({ browser }) => {
  const ctx = await browser.newContext({ deviceScaleFactor: 3, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = await open(page, '?backend=webgl&growth=1&freeze=1');
  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForTimeout(200);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__quarrymill!.dpr())).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('reports which backend it used', async ({ page }) => {
  await open(page, '?backend=webgl&growth=1&freeze=1');
  expect(await page.evaluate(() => window.__quarrymill!.backend)).toBe('webgl2');
});
