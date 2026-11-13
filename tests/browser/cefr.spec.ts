import { expect, test } from '@playwright/test';

test('CEFR selection opens priority range, persists, and generates only matching questions', async ({ page }) => {
  await page.route('**/demo-vocabulary.json', async route => {
    const response = await route.fetch();
    const words = await response.json();
    await route.fulfill({ json: [...words,
      { ...words[0], id: 2001, english: 'constraint', cefr_level: 'C1', priority: 3 },
      { ...words[0], id: 2002, english: 'incentive', cefr_level: 'C1', priority: 4 },
      { ...words[0], id: 2003, english: 'elusive', cefr_level: 'C2', priority: 5 },
    ] });
  });
  await page.goto('/');
  await page.getByText('Fine-tune your fu').click();
  await page.getByLabel('CEFR level', { exact: true }).selectOption('C1');
  await expect(page.getByLabel('Priority cutoff')).toHaveValue('5');
  await expect(page.getByText('2 matching entries', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByText('Fine-tune your fu').click();
  await expect(page.getByLabel('CEFR level', { exact: true })).toHaveValue('C1');
  await page.getByRole('switch').click();
  await page.getByRole('button', { name: 'Let’s fu this' }).click();
  await expect(page.locator('.word-tags').getByText('C1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My brain is tofu' }).click();
  await expect(page.locator('.answer-card h2')).toHaveText(/constraint|incentive/);
  await page.getByRole('button', { name: 'Next piece of fu' }).click();
  await expect(page.locator('.word-tags').getByText('C1', { exact: true })).toBeVisible();
});
