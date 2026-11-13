import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test.use({ baseURL: 'http://127.0.0.1:5174' });

test('connected app sends a magic link, loads both vocabulary pages and saves account history', async ({ page }) => {
  const sample = JSON.parse(readFileSync('public/demo-vocabulary.json', 'utf8'));
  const vocabulary = Array.from({ length: 1676 }, (_, i) => ({ ...sample[i % sample.length], id: i + 1 }));
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'student@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const records: Record<string, unknown>[] = [];
  const ranges: string[] = [];
  let otpBody: { email?: string; create_user?: boolean } = {};
  let redirect = '';
  await page.route('https://fu-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers });
    if (url.pathname === '/auth/v1/otp') {
      otpBody = request.postDataJSON(); redirect = url.searchParams.get('redirect_to') ?? '';
      return route.fulfill({ json: {}, headers });
    }
    if (url.pathname === '/auth/v1/user') return route.fulfill({ json: user, headers });
    if (url.pathname === '/rest/v1/vocabulary') {
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 1000);
      ranges.push(`${offset}:${limit}`);
      return route.fulfill({ json: vocabulary.slice(offset, offset + limit), headers });
    }
    if (url.pathname === '/rest/v1/game_sessions') {
      if (request.method() === 'POST') {
        records.push({ ...request.postDataJSON(), created_at: new Date().toISOString() });
        return route.fulfill({ status: 201, json: null, headers });
      }
      return route.fulfill({ json: records, headers });
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers });
    return route.fulfill({ status: 400, json: { message: `Unexpected mock endpoint ${url.pathname}` }, headers });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Email address').fill(user.email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('Check your inbox!', { exact: false })).toBeVisible();
  expect(otpBody.email).toBe(user.email);
  expect(otpBody.create_user).toBe(true);
  expect(redirect).toBe('http://127.0.0.1:5174/');

  // Model an already-verified email session; real email delivery remains a deployment check.
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, exp: expires })).toString('base64url')}.test`;
  await page.evaluate(session => localStorage.setItem('sb-fu-test-auth-token', JSON.stringify(session)), {
    access_token: token, refresh_token: 'test-refresh-token', expires_at: expires,
    expires_in: 3600, token_type: 'bearer', user,
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByText('Fine-tune your fu').click();
  await page.getByLabel('Priority cutoff').selectOption('5');
  await page.getByLabel('Include rude / insulting slang').check();
  await page.getByLabel('Number of questions').selectOption('5');
  await page.getByRole('switch').click();
  await expect(page.getByText('1,676 matching entries', { exact: false })).toBeVisible();
  expect(ranges).toContain('0:1000');
  expect(ranges).toContain('1000:1000');
  await page.getByRole('button', { name: 'Let’s fu this' }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'My brain is tofu' }).click();
    await page.getByRole('button', { name: i === 4 ? 'Show me my fu score' : 'Next piece of fu' }).click();
  }
  await expect(page.getByText('Your round is saved to your account.', { exact: false })).toBeVisible();
  expect(records).toHaveLength(1);
  expect(records[0].user_id).toBe(user.id);
  expect(records[0].total).toBe(5);
  expect(records[0].score).toBe(0);
  await page.getByRole('button', { name: 'My rounds' }).click();
  await expect(page.locator('.history-list>div')).toHaveCount(1);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});
