import { test, expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

const BASE = 'http://localhost:5179/';

// Contagens medidas em Chromium headless (SwiftShader, 1280x800) com a flor da seed do nome:
// crescimento 1: 31604 pixels acesos; crescimento 0 (só a semente brilhando): 6453; preto puro: 0 em ambos.
const GROWN_LIT_MIN = 12_000; // cerca de 40% da contagem medida
const SEED_ONLY_LIT_MAX = 10_000; // passa com o brilho da semente, falha se houver flor

async function open(page: Page, query: string) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 45_000 });
  return errors;
}

// `lit`: pixels visivelmente acesos (a flor e seu brilho); `black`: pixels (0,0,0), que o fundo #07060d nunca
// produz, então qualquer um denuncia NaN ou geometria quebrada no shader.
async function pixelStats(page: Page) {
  const png = PNG.sync.read(await page.screenshot());
  let lit = 0, black = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]!, g = png.data[i + 1]!, b = png.data[i + 2]!;
    if (Math.max(r, g, b) > 32) lit++;
    if (r === 0 && g === 0 && b === 0) black++;
  }
  return { lit, black };
}

for (const backend of ['webgl', 'auto'] as const) {
  test.describe(`backend=${backend}`, () => {
    test('fully grown flower lights up the frame without black pixels or errors', async ({ page }) => {
      const errors = await open(page, `?backend=${backend}&growth=1&freeze=1`);
      await page.waitForTimeout(500);
      const { lit, black } = await pixelStats(page);
      expect(lit).toBeGreaterThan(GROWN_LIT_MIN);
      expect(black).toBe(0);
      expect(errors).toEqual([]);
    });

    test('growth 0 shows only the glowing seed', async ({ page }) => {
      await open(page, `?backend=${backend}&growth=0&freeze=1`);
      await page.waitForTimeout(500);
      const { lit, black } = await pixelStats(page);
      expect(lit).toBeLessThan(SEED_ONLY_LIT_MAX);
      expect(black).toBe(0);
    });

    test('scrubbing 1 -> 0 -> 1 is reversible and error-free', async ({ page }) => {
      const errors = await open(page, `?backend=${backend}&growth=1&freeze=1`);
      await page.waitForTimeout(300);
      const full = await pixelStats(page);
      for (const g of [0.7, 0.3, 0, 0.5, 1]) {
        await page.evaluate((v) => window.__quarrymill!.setGrowth(v), g);
        await page.waitForTimeout(150);
      }
      const again = await pixelStats(page);
      expect(Math.abs(again.lit - full.lit) / full.lit).toBeLessThan(0.05);
      expect(again.black).toBe(0);
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
