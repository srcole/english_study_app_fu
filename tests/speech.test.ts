import { afterEach, describe, expect, it, vi } from 'vitest';
import { englishVoices, selectVoice } from '../src/lib/speech';
import { DEFAULT_SETTINGS, loadSettings } from '../src/lib/game';

function voice(name: string, lang = 'en-US', localService = true): SpeechSynthesisVoice {
  return { name, lang, localService, default: false, voiceURI: name };
}
afterEach(() => vi.unstubAllGlobals());

describe('voice preferences', () => {
  it('prefers natural voices and Google voices over the first basic local voice', () => {
    const basic = voice('Basic English');
    const google = voice('Google US English', 'en-US', false);
    const natural = voice('Microsoft Jenny Online (Natural)', 'en-US', false);
    expect(selectVoice([basic, google])).toBe(google);
    expect(selectVoice([basic, google, natural])).toBe(natural);
    expect(selectVoice([voice('Albert'), basic])).toBe(basic);
  });
  it('honors an explicitly selected English voice and falls back if it disappears', () => {
    const british = voice('Daniel', 'en-GB');
    const natural = voice('Ava (Premium)');
    expect(selectVoice([natural, british], british.voiceURI)).toBe(british);
    expect(selectVoice([natural, british], 'removed voice')).toBe(natural);
    expect(englishVoices([voice('Chinese', 'zh-CN'), british])).toEqual([british]);
    expect(selectVoice([voice('Chinese', 'zh-CN')])).toBeUndefined();
  });
  it('migrates the old slow default while preserving other game preferences', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ rate: 0.85, count: 20, direction: 'en-zh' }) });
    expect(loadSettings()).toMatchObject({ rate: 1, count: 20, direction: 'en-zh', voiceURI: '', speechVersion: 1 });
    expect(DEFAULT_SETTINGS.rate).toBe(1);
  });
  it('preserves explicit new voice and speed choices after reload', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ speechVersion: 1, rate: 0.7, voiceURI: 'my-voice' }) });
    expect(loadSettings()).toMatchObject({ rate: 0.7, voiceURI: 'my-voice' });
  });
});
