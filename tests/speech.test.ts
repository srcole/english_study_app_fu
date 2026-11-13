import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_VOICE, englishVoices, selectVoice, speakEnglish, stopSpeaking } from '../src/lib/speech';
import { DEFAULT_SETTINGS, loadSettings } from '../src/lib/game';

function voice(name: string, lang = 'en-US', localService = true): SpeechSynthesisVoice {
  return { name, lang, localService, default: false, voiceURI: name };
}
afterEach(() => { if (typeof window !== 'undefined') stopSpeaking(); vi.useRealTimers(); vi.unstubAllGlobals(); });

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
  it('prefers installed voices on mobile but respects explicit choices and compatibility mode', () => {
    const local = voice('Samantha');
    const online = voice('Google US English', 'en-US', false);
    expect(selectVoice([online, local], '', true)).toBe(local);
    expect(selectVoice([online, local], online.voiceURI, true)).toBe(online);
    expect(selectVoice([online, local], DEVICE_VOICE, true)).toBeUndefined();
  });
});

function engine(voices: SpeechSynthesisVoice[] = []) {
  vi.useFakeTimers();
  class Utterance { constructor(public text: string) {} }
  const synth = { getVoices: () => voices, paused: false, pending: false, speaking: false,
    speak: vi.fn(), cancel: vi.fn(), resume: vi.fn(() => { synth.paused = false; }) };
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  vi.stubGlobal('window', { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
  return synth;
}

describe('mobile speech lifecycle', () => {
  it('speaks synchronously at full volume and resumes a paused engine without canceling an idle one', () => {
    const synth = engine();
    synth.paused = true;
    speakEnglish('Hello.', 1, vi.fn());
    expect(synth.resume).toHaveBeenCalledOnce();
    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(synth.speak.mock.calls[0][0]).toMatchObject({ text: 'Hello.', rate: 1, lang: 'en-US', volume: 1 });
  });
  it('lets the device resolve English when its voice list is incomplete', () => {
    const synth = engine([voice('Chinese', 'zh-CN')]);
    const error = vi.fn();
    speakEnglish('Hello.', 1, error);
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(synth.speak.mock.calls[0][0].voice).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
  });
  it('reports silent startup failures and cancels the stuck request without automatic retries', () => {
    const synth = engine();
    const error = vi.fn();
    speakEnglish('Hello.', 1, error);
    vi.advanceTimersByTime(8000);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Speech did not start'));
    expect(synth.cancel).toHaveBeenCalledOnce();
    expect(synth.speak).toHaveBeenCalledOnce();
  });
  it('clears the watchdog on start and ignores late errors from replaced speech', () => {
    const synth = engine();
    const error = vi.fn();
    speakEnglish('First.', 1, error);
    const first = synth.speak.mock.calls[0][0];
    speakEnglish('Second.', 1, error);
    const second = synth.speak.mock.calls[1][0];
    first.onerror({ error: 'synthesis-failed' });
    expect(error).not.toHaveBeenCalled();
    second.onstart();
    error.mockClear();
    vi.advanceTimersByTime(9000);
    expect(error).not.toHaveBeenCalled();
  });
  it('gives a direct-tap recovery message when the browser blocks playback', () => {
    const synth = engine();
    const error = vi.fn();
    speakEnglish('Hello.', 1, error);
    synth.speak.mock.calls[0][0].onerror({ error: 'not-allowed' });
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Tap “Listen again” directly'));
    error.mockClear();
    vi.advanceTimersByTime(9000);
    expect(error).not.toHaveBeenCalled();
  });
});
