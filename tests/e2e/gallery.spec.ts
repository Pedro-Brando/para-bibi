import { test } from '@playwright/test';

const BASE = 'http://localhost:5179/';

test('@gallery', async ({ page }) => {
  // Em Chromium headless com SwiftShader cada abertura leva uns 20 s; 13 capturas estouravam 240 s.
  test.setTimeout(600_000);
  const shots: [string, string][] = [];
  for (const g of [0.25, 0.5, 0.75, 1]) shots.push([`ana-${g}`, `?scene=flower&seed=name&growth=${g}&freeze=1`]);
  for (let i = 1; i <= 8; i++) shots.push([`random-${i}`, `?scene=flower&seed=random:${i}&growth=1&freeze=1`]);
  for (const [name, q] of shots) {
    await page.goto(BASE + q);
    await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 45_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `gallery/${name}.png` });
  }
  await page.goto(BASE + '?scene=flower&seed=name&growth=1&freeze=1');
  await page.waitForFunction(() => window.__quarrymill?.ready === true);
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(900, 330, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'gallery/ana-1-angle2.png' });
});
