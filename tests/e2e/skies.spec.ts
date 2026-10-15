import { test, expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

const BASE = 'http://localhost:5179/';
// Medido em Chromium headless (SwiftShader, 1280x800), view=sky em São Paulo: pixels acesos (86676
// em 15 out 2026). O mínimo fica em cerca de 40% disso: estrelas, Lua ou linhas sumindo falham.
const SKY_LIT_MEASURED = 86_676;
const SKY_LIT_MIN = Math.round(SKY_LIT_MEASURED * 0.4);

async function open(page: Page, query: string, errors: string[]) {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + query, { timeout: 90_000 });
  await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 120_000 });
}

function countPixels(png: PNG) {
  let lit = 0, black = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]!, g = png.data[i + 1]!, b = png.data[i + 2]!;
    if (Math.max(r, g, b) > 32) lit++;
    if (r === 0 && g === 0 && b === 0) black++;
  }
  return { lit, black };
}

test('view=sky shows the clear real sky over Orion without errors or black pixels', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  await open(page, '?backend=webgl&growth=1&freeze=1&view=sky', errors);
  await page.waitForTimeout(1500);
  const { lit, black } = countPixels(PNG.sync.read(await page.screenshot({ timeout: 120_000 })));
  console.log(`view=sky lit=${lit} black=${black}`);
  expect(black).toBe(0);
  expect(lit).toBeGreaterThan(SKY_LIT_MIN);
  expect(errors).toEqual([]);
});

// Capturas do bloco B para conferência visual: npx playwright test --grep @skies
test('@gallery @skies captures', async ({ page }) => {
  test.setTimeout(600_000);
  const dir = process.env.SKY_SHOTS ?? 'gallery';
  const errors: string[] = [];
  await open(page, '?backend=webgl&growth=1&freeze=1', errors);
  const shot = async (name: string, sky: Record<string, number>, look: 'orion' | 'moon' | 'default') => {
    await page.evaluate(([s, l]) => { window.__quarrymill!.sky!.set(s); window.__quarrymill!.sky!.look(l); }, [sky, look] as const);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${dir}/${name}.png` });
  };
  await shot('1-eorzea-storm-from-below', { uCoverage: 1, uWorldBlend: 0, uOrion: 0, uCityBlend: 0 }, 'orion');
  await shot('2-passage-midway', { uCoverage: 0.5, uWorldBlend: 0.5, uOrion: 0 }, 'orion');
  await shot('3-real-sky-orion-sp', { uCoverage: 0, uWorldBlend: 1, uOrion: 1, uCityBlend: 0 }, 'orion');
  await shot('4-real-sky-orion-gv', { uCityBlend: 1 }, 'orion');
  await shot('5-moon-sp', { uCityBlend: 0 }, 'moon');
  await shot('6-default-view-clear', { uCoverage: 0 }, 'default');
  expect(errors).toEqual([]);
});
