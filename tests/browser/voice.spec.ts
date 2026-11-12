import { expect, test } from '@playwright/test';

test('voice settings migrate speed, preview selected voices, persist and apply during a round', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('fu-settings')) localStorage.setItem('fu-settings', JSON.stringify({ rate: 0.85 }));
    const voices = [
      { name: 'Basic English', voiceURI: 'basic', lang: 'en-US', localService: true, default: true },
      { name: 'Google US English', voiceURI: 'google', lang: 'en-US', localService: false, default: false },
      { name: 'Daniel', voiceURI: 'daniel', lang: 'en-GB', localService: true, default: false },
    ];
    const spoken: { voice: string; rate: number; lang: string; text: string }[] = [];
    Object.defineProperty(window, '__spoken', { value: spoken });
    // A plain utterance lets the test inspect selected voice metadata without an OS voice.
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class { text: string; constructor(text: string) { this.text = text; } } });
    window.speechSynthesis.getVoices = () => voices as SpeechSynthesisVoice[];
    window.speechSynthesis.speak = utterance => spoken.push({ voice: utterance.voice?.voiceURI ?? '', rate: utterance.rate, lang: utterance.lang, text: utterance.text });
    window.speechSynthesis.cancel = () => {};
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Voice settings' })).toBeVisible();
  await expect(page.locator('#voice-speed')).toHaveValue('1');
  await expect(page.locator('#english-voice option').first()).toHaveText('Automatic — Google US English (en-US)');
  await page.getByRole('button', { name: 'Preview voice' }).click();
  expect(await page.evaluate(() => (window as unknown as { __spoken: unknown[] }).__spoken.at(-1))).toMatchObject({ voice: 'google', rate: 1, lang: 'en-US' });
  await page.getByLabel('English voice', { exact: true }).selectOption('daniel');
  await page.getByRole('button', { name: 'Preview voice' }).click();
  expect(await page.evaluate(() => (window as unknown as { __spoken: unknown[] }).__spoken.at(-1))).toMatchObject({ voice: 'daniel', rate: 1, lang: 'en-GB' });
  await page.reload();
  await page.getByRole('button', { name: 'Let’s fu this' }).click();
  await page.getByLabel('Your best guess').fill('my unfinished answer');
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  await expect(page.locator('#english-voice')).toHaveValue('daniel');
  await page.locator('#voice-speed').selectOption('0.7');
  await page.getByRole('button', { name: 'Back to my fu' }).click();
  await expect(page.getByLabel('Your best guess')).toHaveValue('my unfinished answer');
  await page.getByRole('button', { name: 'Check my fu' }).click();
  expect(await page.evaluate(() => (window as unknown as { __spoken: unknown[] }).__spoken.at(-1))).toMatchObject({ voice: 'daniel', rate: 0.7, lang: 'en-GB' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
