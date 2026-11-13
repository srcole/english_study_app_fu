import { expect, test } from '@playwright/test';

test('CEFR selection opens priority range, persists, and generates only matching questions', async ({ page }) => {
  await page.route('**/demo-vocabulary.json', async route => {
    const response = await route.fetch();
    const words = await response.json();
    await route.fulfill({ json: [...words.map((word: Record<string, unknown>) => ({ ...word, cefr_level: null })),
      { ...words[0], id: 1998, cefr_level: 'A1', priority: 1 },
      { ...words[0], id: 1999, cefr_level: 'A2', priority: 2 },
      { ...words[0], id: 2000, cefr_level: 'B1', priority: 3 },
      { ...words[0], id: 2001, english: 'constraint', cefr_level: 'C1', priority: 3 },
      { ...words[0], id: 2002, english: 'incentive', cefr_level: 'C1', priority: 4 },
      { ...words[0], id: 2003, english: 'elusive', cefr_level: 'C2', priority: 5 },
    ] });
  });
  await page.goto('/');
  await page.getByText('Fine-tune your fu').click();
  for (const level of ['A1', 'A2', 'B1']) {
    await page.getByRole('checkbox', { name: level, exact: true }).check();
  }
  await expect(page.getByText('3 matching entries', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'All levels', exact: true }).click();
  await page.getByRole('checkbox', { name: 'C1', exact: true }).check();
  await page.getByRole('checkbox', { name: 'C2', exact: true }).check();
  await expect(page.getByLabel('Priority cutoff')).toHaveValue('5');
  await expect(page.getByText('3 matching entries', { exact: false })).toBeVisible();
  await page.reload();
  await page.getByText('Fine-tune your fu').click();
  await expect(page.getByRole('checkbox', { name: 'C1', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'C2', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'A1', exact: true })).not.toBeChecked();
  await page.getByRole('switch').click();
  await page.getByRole('button', { name: 'Let’s fu this' }).click();
  const encountered = [];
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.word-tags').getByText(/^C[12]$/)).toBeVisible();
    await page.getByRole('button', { name: 'My brain is tofu' }).click();
    encountered.push(await page.locator('.answer-card h2').textContent());
    if (i < 2) await page.getByRole('button', { name: 'Next piece of fu' }).click();
  }
  expect(encountered.sort()).toEqual(['constraint', 'elusive', 'incentive']);
});

test('migrates an existing single-level preference and clears back to all levels', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fu-settings', JSON.stringify({ cefrLevel: 'A1', maxPriority: 5 })));
  await page.goto('/');
  await page.getByText('Fine-tune your fu').click();
  await expect(page.getByRole('checkbox', { name: 'A1', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'All levels', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'A1', exact: true })).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fu-settings')!).cefrLevels)).toEqual([]);
});
