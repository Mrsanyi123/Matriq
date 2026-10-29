import { expect, type Page } from '@playwright/test';

/** Demo answers for chapter 1 (Functions & graphs) of the bundled demo content. */
export const CHAPTER_1_ANSWERS = ['8', '9', 'Domain'] as const;

/** Welcome → "Try the demo" → onboarding (all defaults, named Hana) → dashboard. */
export async function startDemo(page: Page, name = 'Hana') {
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByText('Accounts are not configured on this build')).toBeVisible();
  await page.getByTestId('try-demo').click();
  await expect(page).toHaveURL(/\/onboarding$/);

  const next = page.getByTestId('onboarding-next');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which grade are you in?');
  await expect(page.getByRole('radio', { name: 'Grade 12' })).toHaveAttribute('aria-checked', 'true');
  await next.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which stream are you in?');
  await next.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which subjects do you study?');
  await expect(page.getByRole('checkbox', { name: 'Mathematics' })).toHaveAttribute('aria-checked', 'true');
  await next.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What are you preparing for?');
  await next.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose your app language');
  await next.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How long do you want to study each day?');
  await next.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What should we call you?');
  await page.getByRole('textbox').fill(name);
  await page.getByRole('button', { name: /Start learning/ }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
}

/** Answers every question of the open practice session with `answers`. */
export async function answerQuestions(page: Page, answers: readonly string[], opts: { hintOnFirst?: boolean } = {}) {
  for (const [i, answer] of answers.entries()) {
    await expect(page.getByText(`Question ${i + 1} / ${answers.length}`)).toBeVisible();
    if (i === 0 && opts.hintOnFirst) {
      await page.getByRole('button', { name: /Give me a hint/ }).click();
      await expect(page.getByText('AI help · Demo')).toBeVisible();
      await page.getByRole('button', { name: /Another hint/ }).click();
      await expect(page.getByTestId('hint')).toHaveCount(2);
    }
    await page.getByRole('button', { name: answer, exact: true }).click();
    await page.getByRole('button', { name: /Check answer/ }).click();
    await expect(page.getByTestId('feedback')).toBeVisible();
    await page.getByRole('button', { name: i === answers.length - 1 ? /See results/ : /Next question/ }).click();
  }
}
