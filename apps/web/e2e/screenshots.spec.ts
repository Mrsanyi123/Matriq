import { expect, test, type Page } from '@playwright/test';
import { CHAPTER_1_ANSWERS, answerQuestions, startDemo } from './helpers';

/**
 * Captures reference screenshots (demo mode) into apps/web/screenshots/.
 * Run with `pnpm --filter @matriq/web screenshots` against a production build.
 */
const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

test('capture screenshots', async ({ page }) => {
  test.setTimeout(120_000);
  await startDemo(page);
  // Some progress so the screens are not empty: chapter 1 read and practised.
  await page.goto('/learn/functions-and-graphs');
  await page.getByRole('link', { name: /Practice this chapter/ }).click();
  await answerQuestions(page, CHAPTER_1_ANSWERS);
  await expect(page.getByTestId('results')).toBeVisible();

  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    const shot = (name: string) => page.screenshot({ path: `screenshots/${size.name}-${name}.png` });

    await page.goto('/home');
    await expect(page.getByTestId('continue-card')).toBeVisible();
    await settle(page);
    await shot('dashboard');

    await page.goto('/learn');
    await expect(page.locator('[data-node-state="current"]')).toBeVisible();
    await settle(page);
    await shot('learn');

    await page.goto('/learn/functions-and-graphs');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await settle(page);
    await shot('lesson');

    await page.goto('/learn/limits-and-continuity/practice');
    await expect(page.getByText('Question 1 / 3')).toBeVisible();
    await page.getByRole('button', { name: '7', exact: true }).click();
    await page.getByRole('button', { name: /Give me a hint/ }).click();
    await settle(page);
    await shot('practice');
    await page.getByRole('button', { name: /Check answer/ }).click();
    await expect(page.getByTestId('feedback')).toBeVisible();
    await settle(page);
    await shot('practice-feedback');

    await page.goto('/progress');
    await expect(page.getByTestId('streak-card')).toBeVisible();
    await settle(page);
    await shot('progress');
  }
});
