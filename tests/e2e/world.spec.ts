import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

const BASE = 'http://localhost:5179/';

// Medido em Chromium headless (SwiftShader, 1280x800), cena completa, flor crescida, sem raio:
// pixels acesos (445164 em 15 out 2026). O mínimo fica em cerca de 40% disso: a cena escura demais (silhuetas ou céu sumindo) falha.
const FULL_LIT_MIN = 180_000;

test('scene=full loads Quarrymill without errors, black pixels or a dark frame', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '?backend=webgl&growth=1&freeze=1', { timeout: 90_000 });
  await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 120_000 });
  await page.waitForTimeout(1000);
  const png = PNG.sync.read(await page.screenshot({ timeout: 120_000 }));
  let lit = 0, black = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]!, g = png.data[i + 1]!, b = png.data[i + 2]!;
    if (Math.max(r, g, b) > 32) lit++;
    if (r === 0 && g === 0 && b === 0) black++;
  }
  console.log(`scene=full lit=${lit} black=${black}`);
  expect(black).toBe(0);
  expect(lit).toBeGreaterThan(FULL_LIT_MIN);
  expect(await page.locator('.place-label').textContent()).toBe('Bibi Bilota · South Shroud · 01:01 ET · Trovoada');
  expect(errors).toEqual([]);
});
