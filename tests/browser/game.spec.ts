import { expect, test } from '@playwright/test';

test('play a complete filtered round, hear feedback, self-mark and review mistakes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.defineProperty(window, '__spoken', { value: spoken });
    window.speechSynthesis.speak = utterance => { spoken.push(utterance.text); };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Small words. Big fu energy.' })).toBeVisible();
  await expect(page.locator('details')).not.toHaveAttribute('open');
  await page.getByText('Fine-tune your fu').click();
  await page.getByLabel('Number of questions').selectOption('5');
  await page.getByLabel('Vocabulary flavor').selectOption('idioms');
  await page.getByLabel('Priority cutoff').selectOption('3');
  await page.getByRole('button', { name: 'Let’s fu this' }).click();
  await expect(page.getByText('IDIOM FU', { exact: true })).toBeVisible();
  await page.getByLabel('Your best guess').fill('deliberately wrong');
  await page.getByLabel('Your best guess').press('Enter');
  await expect(page.getByRole('heading', { name: 'A little fu-pas. A little learning.' })).toBeVisible();
  await expect(page.locator('.example-box p[lang=en]')).not.toBeEmpty();
  expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length)).toBe(1);
  await page.getByRole('button', { name: 'Close enough — mark correct' }).click();
  await expect(page.getByRole('heading', { name: 'Fu-nomenal. You got it!' })).toBeVisible();
  await expect(page.getByText('Self-marked correct', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next piece of fu' }).click();
  await expect(page.getByText('1 correct', { exact: true })).toBeVisible();
  for (let i = 1; i < 5; i++) {
    await expect(page.getByLabel('Your best guess')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Skipped — learning mode activated.')).toBeVisible();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'Look at all that fresh fu.' })).toBeVisible();
  await expect(page.locator('.review-list>div')).toHaveCount(4);
  await expect(page.getByText('Demo round · progress is not saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Practice these again' }).click();
  await expect(page.getByText('of 4', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your best guess')).toHaveValue('');
  expect(errors).toEqual([]);
});

test('reverse translation, audio toggle, empty filters and leaving a round', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /English → Chinese/ }).check();
  await page.getByRole('switch').click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await page.getByText('Fine-tune your fu').click();
  await page.getByLabel('Vocabulary flavor').selectOption('slang');
  await page.getByLabel('Priority cutoff').selectOption('1');
  await expect(page.getByRole('button', { name: 'Let’s fu this' })).toBeDisabled();
  await expect(page.getByText('No matches. Broaden your filters to find some fu.')).toBeVisible();
  await page.getByLabel('Priority cutoff').selectOption('3');
  await page.getByRole('button', { name: 'Let’s fu this' }).click();
  await expect(page.getByRole('heading', { name: '这个词用中文怎么说？' })).toBeVisible();
  await page.getByRole('button', { name: 'Leave round' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Leave this round' }).click();
  await expect(page.getByRole('heading', { name: 'Small words. Big fu energy.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: /English → Chinese/ })).toBeChecked();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
});

test('mobile layout and email login explanation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Make it your kind of fu.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Email login is available once Supabase is connected.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('desktop home screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Let’s fu this' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true });
});
