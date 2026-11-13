let current: SpeechSynthesisUtterance | null = null;
let startTimer: ReturnType<typeof setTimeout> | undefined;
export const DEVICE_VOICE = '__device_default__';

export function preferDeviceVoices(): boolean {
  return typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
}

export function englishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

// Voice quality has no standard browser rating. Prefer named natural/enhanced
// voices, then Google's voices, instead of blindly choosing the first local one.
function voiceScore(voice: SpeechSynthesisVoice): number {
  if (/albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|trinoids|whisper|wobble|zarvox/i.test(voice.name)) return -100;
  let score = /natural|neural|premium|enhanced/i.test(voice.name) ? 100 : 0;
  if (/google/i.test(voice.name)) score += 70;
  if (/samantha|ava|allison|susan|alex|daniel|serena/i.test(voice.name)) score += 30;
  if (/^en[-_]US$/i.test(voice.lang)) score += 15;
  if (!voice.localService) score += 5;
  return score;
}

export function selectVoice(voices: SpeechSynthesisVoice[], voiceURI = '', preferLocal = preferDeviceVoices()): SpeechSynthesisVoice | undefined {
  if (voiceURI === DEVICE_VOICE) return undefined;
  const english = englishVoices(voices);
  return english.find(voice => voice.voiceURI === voiceURI) ??
    (preferLocal ? english.find(voice => voice.localService) : undefined) ?? english[0];
}

export function stopSpeaking() {
  const hadCurrent = current !== null;
  current = null;
  clearTimeout(startTimer);
  startTimer = undefined;
  if ('speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    // Do not cancel an idle engine just before its first mobile playback.
    if (hadCurrent || synth.speaking || synth.pending) synth.cancel();
  }
}

export function speakEnglish(text: string, rate: number, onError: (message: string) => void, voiceURI = '') {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    onError('This browser does not support speech. The pronunciation and examples are still here to read.');
    return;
  }
  stopSpeaking();
  const voices = window.speechSynthesis.getVoices();
  const voice = selectVoice(voices, voiceURI);
  // Mobile voice lists can be empty or partial until the first user interaction.
  // Leave voice unset and use lang instead of preventing the device from speaking.
  const utterance = new SpeechSynthesisUtterance(text);
  current = utterance; // Retain a reference while the browser speaks.
  utterance.lang = voice?.lang ?? 'en-US';
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  utterance.volume = 1;
  utterance.pitch = 1;
  const finish = () => {
    if (current !== utterance) return;
    clearTimeout(startTimer);
    startTimer = undefined;
    current = null;
  };
  utterance.onstart = () => {
    if (current !== utterance) return;
    clearTimeout(startTimer);
    startTimer = undefined;
    onError('');
  };
  utterance.onerror = event => {
    if (current !== utterance) return;
    finish();
    if (event.error !== 'canceled' && event.error !== 'interrupted') {
      onError(event.error === 'not-allowed'
        ? 'Your browser blocked speech. Tap “Listen again” directly. If this page is inside another app, open it in Safari or Chrome.'
        : `Speech could not play (${event.error}). In Voice settings, try “Device default English”, then tap Preview voice. Check media volume and your device’s English voice installation.`);
    }
  };
  utterance.onend = finish;
  // Some phone engines fail without firing an error. Surface a recovery path.
  startTimer = setTimeout(() => {
    if (current !== utterance) return;
    stopSpeaking();
    onError('Speech did not start. Tap “Listen again”, or try “Device default English” in Voice settings. Check media volume; if using an in-app browser, open this site in Safari or Chrome.');
  }, 8000);
  try {
    const synth = window.speechSynthesis;
    // cancel() does not clear a paused engine. Keep resume/speak synchronous
    // inside the original tap: deferring playback can lose iOS user activation.
    if (synth.paused) synth.resume();
    synth.speak(utterance);
    if (synth.paused) synth.resume();
  } catch {
    finish();
    onError('Your browser could not start speech. Try “Device default English” in Voice settings, or open the site directly in Safari or Chrome.');
  }
}
