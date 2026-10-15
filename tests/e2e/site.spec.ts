import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5179/';

async function enter(page: Page, errors: string[]) {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '?backend=webgl', { timeout: 90_000 });
  await expect(page.locator('.entry h1')).toHaveText('Ana Beatriz');
  const button = page.getByRole('button', { name: 'clique para entrar' });
  await expect(button).toBeEnabled({ timeout: 150_000 });
  await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 120_000 });
  await button.click();
  await page.waitForFunction(() => window.__quarrymill?.entered === true);
}

/** Rola (scroll nativo) até `to` e espera o progresso suavizado chegar lá. */
async function scrollTo(page: Page, to: number) {
  await page.evaluate((t) => window.scrollTo(0, t * (document.documentElement.scrollHeight - innerHeight)), to);
  await page.waitForFunction((t) => Math.abs(window.__quarrymill!.progress!() - t) < 0.002, to, { timeout: 120_000 });
}

test('entry screen, click to enter, scroll to the end reaches explore mode without errors', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  await enter(page, errors);
  await expect(page.locator('.entry')).toHaveCount(0, { timeout: 5000 });
  await scrollTo(page, 1);
  await expect(page.getByRole('button', { name: 'recomeçar' })).toBeVisible();
  await expect(page.locator('.place-label')).toHaveText('Ana Beatriz · São Paulo · 3 de outubro de 2026 · 3:53');
  expect(errors).toEqual([]);
});

// Capturas do bloco C para conferência visual: SITE_SHOTS=<pasta> npx playwright test --grep @site
test('@gallery @site captures', async ({ page }) => {
  test.setTimeout(900_000);
  const dir = process.env.SITE_SHOTS ?? 'gallery';
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + '?backend=webgl', { timeout: 90_000 });
  await expect(page.getByRole('button', { name: 'clique para entrar' })).toBeEnabled({ timeout: 150_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/01-entry.png` });
  await page.getByRole('button', { name: 'clique para entrar' }).click();
  await page.waitForTimeout(2500);
  const only = process.env.SITE_ONLY?.split(',');
  const at = async (name: string, p: number, wait = 1500) => {
    if (only && !only.some((o) => name.startsWith(o))) return;
    await scrollTo(page, p);
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${dir}/${name}.png` });
  };
  await at('02-seed', 0.05);
  await at('03-flower-growing', 0.26);
  await at('04-flower-grown', 0.36);
  await at('05-ascent', 0.45);
  await at('06-storm', 0.56);
  await at('07-sky-opening', 0.66);
  await at('08-orion-phrase', 0.745);
  await at('09-poem-line', 0.8);
  await at('10-poem-line', 0.83);
  await at('11-poem-couplet', 0.965);
  await at('12-nights', 0.99, 2500);
  await at('13-explore', 1, 4000);
  await page.mouse.move(1000, 200);
  await page.getByRole('button', { name: 'Os dois' }).click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${dir}/14-explore-both.png` });
  expect(errors).toEqual([]);
});
