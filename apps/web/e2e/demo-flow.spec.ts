import { expect, test } from '@playwright/test';
import { CHAPTER_1_ANSWERS, answerQuestions, startDemo } from './helpers';

test('guests are sent to the welcome screen', async ({ page }) => {
  await page.goto('/home');
  await expect(page).toHaveURL(/\/welcome$/);
  await page.goto('/learn/functions-and-graphs/practice');
  await expect(page).toHaveURL(/\/welcome$/);
});

test('full demo journey: onboarding → lesson → practice → progress → Amharic', async ({ page }) => {
  await startDemo(page);

  // Dashboard starts empty.
  await expect(page.getByTestId('stat-xp')).toContainText('0');
  await expect(page.getByTestId('continue-card')).toContainText('Functions & graphs');
  await expect(page.getByText('You are trying Matriq without an account.')).toBeVisible();

  // Learning path.
  await page.getByRole('navigation', { name: 'Navigation' }).getByRole('link', { name: 'Learn' }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your learning path');
  const current = page.locator('[data-node-state="current"]');
  await expect(current).toContainText('Functions & graphs');
  await expect(page.locator('[data-node-state="idle"]')).toHaveCount(2);

  // Lesson reader with the quick-notes toggle.
  await current.click();
  await expect(page).toHaveURL(/\/learn\/functions-and-graphs$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Functions & graphs');
  await expect(page.getByRole('img', { name: 'Line graph of f(x) = 2x + 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Quick notes' }).click();
  await expect(page.getByRole('button', { name: 'Quick notes' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'What to remember' })).toBeVisible();
  await expect(page.getByTestId('lesson-notes')).toContainText('The domain is the set of valid inputs');

  // Practice three questions with a hint.
  await page.getByRole('link', { name: /Practice this chapter/ }).click();
  await expect(page).toHaveURL(/\/learn\/functions-and-graphs\/practice$/);
  await answerQuestions(page, CHAPTER_1_ANSWERS, { hintOnFirst: true });

  // Results: 3 × 10 XP for correct answers + 50 for completing the chapter.
  await expect(page.getByRole('heading', { name: 'Chapter practice done!' })).toBeVisible();
  await expect(page.getByTestId('result-score')).toHaveText('3/3');
  await expect(page.getByTestId('result-xp')).toHaveText('+80');
  await expect(page.getByText('First step')).toBeVisible();

  // Back on the path the chapter is complete and chapter 2 is current.
  await page.getByRole('link', { name: /Back to chapters/ }).click();
  await expect(page.locator('[data-node-state="complete"]')).toContainText('Functions & graphs');
  await expect(page.locator('[data-node-state="current"]')).toContainText('Limits & continuity');

  // Dashboard reflects XP (10 for reading + 80) and progress.
  await page.getByRole('navigation', { name: 'Navigation' }).getByRole('link', { name: 'Home' }).click();
  await expect(page.getByTestId('stat-xp')).toContainText('90');
  await expect(page.getByTestId('stat-chapters')).toContainText('1/3');
  await expect(page.getByTestId('stat-questions')).toContainText('3');
  await expect(page.getByTestId('stat-accuracy')).toContainText('100%');
  await expect(page.getByTestId('stat-streak')).toContainText('1');
  await expect(page.getByTestId('continue-card')).toContainText('Limits & continuity');

  // Progress page shows the earned badge.
  await page.goto('/progress');
  await expect(page.getByTestId('progress-chapters')).toContainText('1/3');
  await expect(page.locator('li[data-earned="true"]')).toContainText('First step');

  // Switching to Amharic changes the whole interface and persists.
  await page.getByRole('banner').getByRole('button', { name: 'App language' }).click();
  await page.getByRole('dialog').getByRole('radio', { name: /አማርኛ/ }).click();
  const nav = page.getByRole('navigation').first();
  await expect(nav.getByRole('link', { name: 'መነሻ' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'እድገት' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'am');
  await page.reload();
  await expect(page.getByRole('navigation').first().getByRole('link', { name: 'መነሻ' })).toBeVisible();
  // Lesson content stays in English.
  await page.goto('/learn/functions-and-graphs');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Functions & graphs');
  await expect(page.getByRole('button', { name: 'አጭር ማስታወሻ' })).toBeVisible();
});

test('no horizontal scrolling at 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await startDemo(page, 'Abebe');
  for (const path of [
    '/home',
    '/learn',
    '/learn/functions-and-graphs',
    '/learn/functions-and-graphs/practice',
    '/practice',
    '/progress',
    '/settings',
    '/profile',
    '/tutor',
  ]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
  // Phones get the bottom tab bar, not the sidebar.
  await expect(page.getByRole('navigation', { name: 'Navigation' }).last()).toContainText('Library');
});
