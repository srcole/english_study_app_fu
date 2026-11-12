import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Headphones, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { englishVoices, selectVoice, speakEnglish, stopSpeaking } from '../lib/speech';
import type { Settings } from '../lib/types';

export function VoiceSettings({ settings, onChange, onClose }: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const supported = 'speechSynthesis' in window;
  function refresh() {
    if (supported) setVoices(englishVoices(window.speechSynthesis.getVoices()));
  }
  useEffect(() => {
    titleRef.current?.focus();
    if (!supported) return;
    const update = () => setVoices(englishVoices(window.speechSynthesis.getVoices()));
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', update); stopSpeaking(); };
  }, [supported]);
  const automatic = selectVoice(voices);
  const selected = selectVoice(voices, settings.voiceURI);
  const missing = settings.voiceURI && !voices.some(voice => voice.voiceURI === settings.voiceURI);
  function change(patch: Partial<Settings>) {
    stopSpeaking(); setError(''); onChange(patch);
  }
  return <section className="voice-settings">
    <button className="text-button" onClick={onClose}><ArrowLeft size={16} /> Back to my fu</button>
    <div className="voice-settings-heading"><span className="section-icon"><Headphones size={24} /></span><div><div className="eyebrow">LESS ROBOT. MORE FU.</div><h1 ref={titleRef} tabIndex={-1}>Voice settings</h1></div></div>
    <p>Find a voice you like. Every word and example will use it.</p>
    <div className="setup-card voice-settings-card">
      <label htmlFor="english-voice">English voice</label>
      <select id="english-voice" value={settings.voiceURI} disabled={!supported} onChange={event => change({ voiceURI: event.target.value })}>
        <option value="">Automatic{automatic ? ` — ${automatic.name} (${automatic.lang})` : ' — best available English voice'}</option>
        {missing && <option value={settings.voiceURI}>Saved voice unavailable — using automatic</option>}
        {voices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}{voice.localService ? '' : ' · online'}</option>)}
      </select>
      <p className="small-note">Automatic prefers natural or enhanced voices when available. Preview a few to find your favorite. Online voices may need an internet connection.</p>
      {missing && <p className="notice" role="status">Your saved voice isn’t available in this browser. We’ll use {automatic?.name ?? 'the automatic voice'} until it returns.</p>}
      {!supported ? <p className="notice" role="status">This browser doesn’t support speech playback. You can still read the pronunciation and examples.</p> : !voices.length && <p className="notice" role="status">No English voices are available yet. Refresh the list, or add an English voice in your device’s speech settings.</p>}
      <button className="text-button" onClick={refresh} disabled={!supported}><RotateCcw size={14} /> Refresh voice list</button>
      <label htmlFor="voice-speed">Speaking speed</label>
      <select id="voice-speed" value={settings.rate} onChange={event => change({ rate: Number(event.target.value) })}>
        <option value={1}>Normal · 1× (default)</option><option value={0.85}>Slower · 0.85×</option><option value={0.7}>Slow · 0.7×</option>
      </select>
      <div className="sound-row"><div className="sound-copy"><Volume2 size={19} /><div><strong>Read after every guess</strong><small>Automatically speak the English word and example.</small></div></div><button className={`switch ${settings.autoSpeak ? 'on' : ''}`} role="switch" aria-checked={settings.autoSpeak} aria-label="Automatic English pronunciation" onClick={() => change({ autoSpeak: !settings.autoSpeak })}><span /></button></div>
      <div className="example-box"><div className="eyebrow">GIVE THIS VOICE A LITTLE FU TEST</div><p>“Opportunity. Every day is a new opportunity to learn something useful.”</p><p className="small-note">{selected ? `${selected.name} · ${selected.lang} · ${settings.rate}×` : `English · ${settings.rate}×`}</p></div>
      <div className="voice-preview-actions"><button className="primary" disabled={!supported} onClick={() => { setError(''); speakEnglish('Opportunity. Every day is a new opportunity to learn something useful.', settings.rate, setError, settings.voiceURI); }}><Volume2 size={18} /> Preview voice</button><button className="secondary" onClick={stopSpeaking}><VolumeX size={17} /> Stop</button></div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <p className="small-note">Saved automatically in this browser. You can change voices during a round without losing your place.</p>
    </div>
  </section>;
}
