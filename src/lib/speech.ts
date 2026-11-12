let current: SpeechSynthesisUtterance | null = null;

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

export function selectVoice(voices: SpeechSynthesisVoice[], voiceURI = ''): SpeechSynthesisVoice | undefined {
  const english = englishVoices(voices);
  return english.find(voice => voice.voiceURI === voiceURI) ?? english[0];
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  current = null;
}

export function speakEnglish(text: string, rate: number, onError: (message: string) => void, voiceURI = '') {
  if (!('speechSynthesis' in window)) {
    onError('This browser does not support speech. The pronunciation and examples are still here to read.');
    return;
  }
  stopSpeaking();
  const voices = window.speechSynthesis.getVoices();
  const voice = selectVoice(voices, voiceURI);
  if (voices.length && !voice) {
    onError('No English voice is installed. Add an English voice in your device’s speech settings, then reload.');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  current = utterance; // Retain a reference while the browser speaks.
  utterance.lang = voice?.lang ?? 'en-US';
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  utterance.onerror = event => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') {
      onError('Audio could not start. Tap “Listen again” or check your device’s English voice settings.');
    }
    if (current === utterance) current = null;
  };
  utterance.onend = () => { if (current === utterance) current = null; };
  window.speechSynthesis.speak(utterance);
}
