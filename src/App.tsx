import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowDownUp, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleHelp, Headphones, History, Leaf, LogIn, LogOut, Mail, RotateCcw, Settings2, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { FuMascot } from './components/FuMascot';
import { VoiceSettings } from './components/VoiceSettings';
import { DEFAULT_SETTINGS, filterWords, isCorrect, loadSettings, makeQuestions, stripNotes } from './lib/game';
import { configured, getHistory, loadVocabulary, saveGame, supabase } from './lib/supabase';
import { speakEnglish, stopSpeaking } from './lib/speech';
import type { Answer, GameRecord, Question, Settings, Word } from './lib/types';

type Screen = 'home' | 'question' | 'feedback' | 'summary';
type Modal = 'login' | 'history' | 'help' | 'quit' | null;
const errorMessage = (error: unknown) => error instanceof Error ? error.message :
  typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Something went wrong. Please try again.';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!configured);
  const [demo, setDemo] = useState(!configured);
  const [demoWords, setDemoWords] = useState<Word[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [reload, setReload] = useState(0);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>('home');
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [email, setEmail] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [guess, setGuess] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saveError, setSaveError] = useState('');
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousUser = useRef<string | null>(null);
  const submitLock = useRef(false);
  const userId = session?.user.id;
  const demoMode = demo || !configured;
  const activeWords = demoMode || !session ? demoWords : words;
  const pool = filterWords(activeWords, settings);
  const question = questions[answers.length];
  const feedback = answers.at(-1);
  const score = answers.filter(a => a.correct).length;
  const categories = [...new Set(activeWords.map(w => w.category_l1))].sort((a, b) => a.localeCompare(b, 'zh'));

  useEffect(() => {
    const controller = new AbortController();
    fetch('/demo-vocabulary.json', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('The demo vocabulary could not load. Please reload the page.');
      return response.json();
    }).then(setDemoWords).catch(error => { if (!controller.signal.aborted) setDataError(errorMessage(error)); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has('error_description')) {
      setAuthError(params.get('error_description')!);
      setModal('login');
      window.history.replaceState(null, '', window.location.pathname);
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthReady(true);
    }).catch(error => { if (active) { setAuthError(errorMessage(error)); setAuthReady(true); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      setAuthReady(true);
      if (next && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) { setDemo(false); setModal(null); setAuthMessage(''); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (previousUser.current !== (userId ?? null)) {
      stopSpeaking(); setScreen('home'); setAnswers([]); setQuestions([]); setRecord(null);
      setWords([]); setHistory([]);
      previousUser.current = userId ?? null;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || demoMode) return;
    const controller = new AbortController();
    setDataLoading(true); setDataError('');
    loadVocabulary(controller.signal).then(data => { if (!controller.signal.aborted) setWords(data); })
      .catch(error => { if (!controller.signal.aborted) setDataError(errorMessage(error)); })
      .finally(() => { if (!controller.signal.aborted) setDataLoading(false); });
    return () => controller.abort();
  }, [userId, demoMode, reload]);

  useEffect(() => {
    try { localStorage.setItem('fu-settings', JSON.stringify(settings)); } catch { /* Private browsing can disable storage. */ }
  }, [settings]);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (modal && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!modal && dialogRef.current?.open) dialogRef.current.close();
  }, [modal]);

  useEffect(() => {
    if (screen !== 'question') headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
    submitLock.current = false;
  }, [screen]);

  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    const onHidden = () => { if (document.hidden) stopSpeaking(); };
    document.addEventListener('visibilitychange', onHidden);
    return () => { stopSpeaking(); document.removeEventListener('visibilitychange', onHidden); };
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(old => ({ ...old, [key]: value }));
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase || authBusy || cooldown) return;
    setAuthBusy(true); setAuthError(''); setAuthMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: {
        emailRedirectTo: `${window.location.origin}/`, shouldCreateUser: true,
      } });
      if (error) throw error;
      setAuthMessage('Check your inbox! Tap the sign-in link in your email, then come back for some fu. First time? Your account is created automatically.');
      setCooldown(60);
    } catch (error) { setAuthError(errorMessage(error)); }
    finally { setAuthBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) { setAuthError(error.message); return; }
    stopSpeaking(); setDemo(false); setScreen('home');
  }

  function startGame(review?: Question[]) {
    if (!demoMode && !session) { setModal('login'); return; }
    const next = review ?? makeQuestions(activeWords, settings);
    if (!next.length) return;
    stopSpeaking(); setSpeechError(''); setQuestions(next); setAnswers([]); setGuess('');
    setRecord(null); setSaveStatus('idle'); setSaveError(''); setScreen('question');
  }

  function speak(word: Word, sentenceOnly = false) {
    setSpeechError('');
    speakEnglish(sentenceOnly ? word.example_en : `${word.english}. ${word.example_en}`, settings.rate, setSpeechError, settings.voiceURI);
  }

  function submitAnswer(skipped = false) {
    if (!question || submitLock.current || (!skipped && !guess.trim())) return;
    submitLock.current = true;
    setAnswers(old => [...old, { ...question, guess: skipped ? '' : guess.trim(), correct: !skipped && isCorrect(guess, question), selfMarked: false, skipped }]);
    setScreen('feedback'); setSpeechError('');
    // Speak inside the user's submit/click gesture, including on mobile browsers.
    if (settings.autoSpeak) speak(question.word);
  }

  async function persist(nextRecord: GameRecord) {
    setSaveStatus('saving'); setSaveError('');
    try { await saveGame(nextRecord); setSaveStatus('saved'); }
    catch (error) { setSaveStatus('failed'); setSaveError(errorMessage(error)); }
  }

  function nextQuestion() {
    stopSpeaking(); setSpeechError('');
    if (answers.length < questions.length) { setGuess(''); setScreen('question'); return; }
    setScreen('summary');
    if (session && !demoMode) {
      const nextRecord: GameRecord = {
        id: crypto.randomUUID(), user_id: session.user.id, score, total: answers.length,
        settings: { ...settings, count: answers.length }, answers,
      };
      setRecord(nextRecord);
      void persist(nextRecord);
    }
  }

  async function openHistory() {
    setModal('history'); setHistoryError('');
    if (!userId || demoMode) return;
    setHistoryLoading(true);
    try { setHistory(await getHistory(userId)); }
    catch (error) { setHistoryError(errorMessage(error)); }
    finally { setHistoryLoading(false); }
  }

  function goHome() {
    setVoiceSettingsOpen(false);
    if (screen === 'question' || screen === 'feedback') { setModal('quit'); return; }
    stopSpeaking(); setScreen('home');
  }

  return <>
    <a className="skip-link" href="#main">Skip to game</a>
    <header className="site-header">
      <div className="nav-inner">
        <button className="brand" onClick={goHome} aria-label="What the Fu home"><span className="brand-icon">fu<span>.</span></span><span>what the <b>fu?</b></span></button>
        <nav aria-label="Main navigation">
          <button className={`nav-link ${screen === 'home' ? 'active' : ''}`} onClick={goHome}>The dojo</button>
          <button className="nav-link" onClick={() => void openHistory()}><History size={16} /><span>My rounds</span></button>
          <button className="nav-link" aria-label="Voice settings" onClick={() => { stopSpeaking(); setVoiceSettingsOpen(true); }}><Settings2 size={16} /><span>Voice settings</span></button>
          <span className="nav-divider" />
          {session ? <button className="account-button" title={session.user.email} onClick={() => void signOut()}><LogOut size={16} /><span>Sign out</span></button> :
            <button className="account-button" onClick={() => setModal('login')}><LogIn size={16} /><span>Sign in</span></button>}
        </nav>
      </div>
    </header>

    <main id="main" className={`page page-${screen}`}>
      {voiceSettingsOpen && <VoiceSettings settings={settings} onChange={patch => setSettings(old => ({ ...old, ...patch }))} onClose={() => { stopSpeaking(); setVoiceSettingsOpen(false); }} />}
      <div hidden={voiceSettingsOpen}>
      {authError && modal !== 'login' && <div className="notice error" role="alert">{authError}<button onClick={() => { setAuthError(''); setModal('login'); }}>Try signing in</button></div>}
      {screen === 'home' && <>
        <section className="hero">
          <div className="hero-copy"><div className="eyebrow"><span className="tiny-dot" /> YOUR DAILY DOSE OF VOCABULARY FU</div>
            <h1 ref={headingRef} tabIndex={-1}>Small words.<br />Big <span className="fu-underline">fu energy.</span></h1>
            <p>A little English. A little 中文. A suspiciously confident<br className="desktop-break" /> piece of tofu. Let’s make some words stick.</p>
            <div className="hero-chips"><span><CheckCircle2 size={14} /> Useful, real-life English</span><span><Volume2 size={14} /> Listen & learn</span><span>零压力 · No pressure</span></div>
          </div>
          <div className="mascot-scene"><div className="speech-bubble">“I know kung fu.<br /><b>Vocabulary kung fu.”</b><span>— Master Tofu, probably</span></div><FuMascot /><span className="mascot-label">100% tofu. 0% judgment.</span></div>
        </section>

        <div className="home-grid">
          <section className="setup-card" aria-labelledby="setup-title">
            <div className="card-heading"><span className="section-icon"><Settings2 size={20} /></span><div><h2 id="setup-title">Make it your kind of fu.</h2><p>Set your round. Flex your brain. Repeat.</p></div><span className="step-badge">01 / SET UP</span></div>
            <fieldset className="direction-field"><legend>Which way are we going? <span>选择方向</span></legend>
              <div className="direction-options">
                {([
                  ['zh-en', '中', 'EN', 'Chinese → English', 'See Chinese. Guess English.'],
                  ['en-zh', 'EN', '中', 'English → Chinese', 'Flip it. Find the Chinese.'],
                  ['mixed', '中', 'EN', 'Mix it up', 'A little bit of both.'],
                ] as const).map(([value, from, to, label, hint]) => <label key={value} className={`direction-option ${settings.direction === value ? 'selected' : ''}`}>
                  <input type="radio" name="direction" value={value} checked={settings.direction === value} onChange={() => update('direction', value)} />
                  <span className="radio-indicator">{settings.direction === value && <Check size={11} />}</span>
                  <span className="language-pair"><b>{from}</b>{value === 'mixed' ? <ArrowDownUp size={16} /> : <ArrowRight size={16} />}<b>{to}</b></span>
                  <strong>{label}</strong><small>{hint}</small>
                </label>)}
              </div>
            </fieldset>
            <details className="filter-disclosure">
              <summary><span className="filter-title"><Settings2 size={17} /> Fine-tune your fu <span className="small-label">Filters</span></span><span className="filter-summary">{settings.count} questions · P1–{settings.maxPriority}<ChevronDown size={16} /></span></summary>
              <div className="filters">
                <label>Vocabulary flavor<select value={settings.kind} onChange={e => { update('kind', e.target.value as Settings['kind']); update('category', ''); }}><option value="all">A bit of everything</option><option value="words">Useful words only</option><option value="idioms">Idioms only</option><option value="slang">Slang & informal only</option></select></label>
                <label>Number of questions<select value={settings.count} onChange={e => update('count', Number(e.target.value))}>{[5, 10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n} questions</option>)}</select></label>
                <label>Priority cutoff<select value={settings.maxPriority} onChange={e => update('maxPriority', Number(e.target.value))}><option value={1}>P1 only · essential</option><option value={2}>P1–P2 · everyday</option><option value={3}>P1–P3 · broaden your fu</option><option value={4}>P1–P4 · niche included</option><option value={5}>All priorities</option></select><small>1 is highest priority. P1–P2 includes levels 1 and 2.</small></label>
                <label>Topic / 主题<select value={settings.category} onChange={e => update('category', e.target.value)}><option value="">All topics</option>{categories.map(c => <option value={c} key={c}>{c}</option>)}</select></label>
                <label>Speaking speed<select value={settings.rate} onChange={e => update('rate', Number(e.target.value))}><option value={1}>Normal · 1× (default)</option><option value={0.85}>Slower · 0.85×</option><option value={0.7}>Slow · 0.7×</option></select></label>
                <label className="checkbox-field"><input type="checkbox" checked={settings.includeRude} onChange={e => update('includeRude', e.target.checked)} /><span>Include rude / insulting slang<small>Off by default. Keep your fu friendly.</small></span></label>
                <button className="text-button reset-filters" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}><RotateCcw size={13} /> Reset settings</button>
              </div>
            </details>
            <div className="sound-row"><div className="sound-copy"><Volume2 size={19} /><div><strong>Let the words do the talking.</strong><small>Read the English word + example after every guess.</small></div></div><button className={`switch ${settings.autoSpeak ? 'on' : ''}`} role="switch" aria-checked={settings.autoSpeak} aria-label="Automatic English pronunciation" onClick={() => update('autoSpeak', !settings.autoSpeak)}><span /></button></div>
            {dataError && <div className="notice error" role="alert">{dataError} <button onClick={() => setReload(n => n + 1)}>Retry loading</button></div>}
            <div className="start-area"><button className="primary start-button" disabled={!authReady || (session && !demoMode && dataLoading) || !pool.length} onClick={() => startGame()}><span>{!authReady ? 'Checking your login…' : dataLoading && !demoMode ? 'Gathering the fu…' : !demoMode && !session ? 'Sign in & let’s fu this' : 'Let’s fu this'}</span><ArrowRight size={21} /></button>
              <div className="round-note">{pool.length ? <><span className="tiny-dot" /> {Math.min(settings.count, pool.length)} questions · about {Math.max(1, Math.ceil(Math.min(settings.count, pool.length) * 0.3))} min · {pool.length.toLocaleString()} matching entries</> : 'No matches. Broaden your filters to find some fu.'}</div>
              {pool.length > 0 && pool.length < settings.count && <p className="small-note">Only {pool.length} entries match, so this round will use them all without repeats.</p>}
              {!session && !demoMode && <button className="text-button demo-link" onClick={() => { setDemo(true); setDataError(''); }}>Just looking? Try a demo round <ArrowRight size={14} /></button>}
            </div>
          </section>

          <aside className="home-sidebar">
            <section className="how-card"><div className="eyebrow">THE ANCIENT ART OF GUESSING</div><h2>Three steps to<br />more fu.</h2><ol className="steps"><li><span>1</span><div><strong>Meet your word.</strong><p>Chinese or English. You choose<br />the direction.</p></div></li><li><span>2</span><div><strong>Give it your best guess.</strong><p>Type an answer. No timer.<br />No vocabulary police.</p></div></li><li><span>3</span><div><strong>Hear it. Keep it.</strong><p>Get the answer, an example,<br />and a little pronunciation fu.</p></div></li></ol><div className="how-footer"><Leaf size={16} /><span>Wrong answers are just future right ones.</span></div></section>
            <section className="fu-note"><span className="note-star">✳</span><div><strong>A little fu every day.</strong><p>Five minutes beats zero minutes.<br />Master Tofu has done the math.<br /><span>(He used his tiny tofu fingers.)</span></p></div></section>
          </aside>
        </div>
        <div className="collection-strip"><div className="collection-icon"><Sparkles size={21} /></div><div><strong>Big vocabulary. Bite-sized rounds.</strong><span>1,476 vocabulary entries + 100 idioms + 100 slang & informal expressions.</span></div><span className="collection-badge">Made for 中文 speakers</span></div>
        {demoMode && <p className="demo-notice">You’re in the little fu demo · {demoWords.length} sample entries · scores aren’t saved. {configured ? <button onClick={() => { setDemo(false); if (!session) setModal('login'); }}>Use my account →</button> : 'Connect Supabase to unlock email login and the full collection.'}</p>}
      </>}

      {screen === 'question' && question && <section className="play-shell">
        <div className="play-top"><button className="text-button" onClick={goHome}><ArrowLeft size={16} /> Leave round</button><span>{demoMode ? 'DEMO DOJO' : 'THE VOCABULARY DOJO'}</span><span>{score} correct</span></div>
        <div className="progress-row"><span>Question {answers.length + 1} <span className="muted">of {questions.length}</span></span><span className="muted">A little more fu with every word.</span></div>
        <progress value={answers.length} max={questions.length} aria-label="Round progress" />
        <div className="question-card"><div className="word-tags"><span>{question.word.is_idiom ? 'IDIOM FU' : question.word.is_slang ? 'SLANG FU' : 'WORD FU'}</span><span>P{question.word.priority}</span><span>{question.word.category_l2}</span></div>
          <h1 className="question-heading" ref={headingRef} tabIndex={-1}>{question.direction === 'zh-en' ? 'What’s the English for…' : '这个词用中文怎么说？'}</h1>
          <div className={`prompt ${question.direction === 'zh-en' ? 'chinese' : ''}`} lang={question.direction === 'zh-en' ? 'zh-Hans' : 'en'}>{question.direction === 'zh-en' ? stripNotes(question.word.chinese) : question.word.english}</div>
          <p className="part-of-speech">{question.word.part_of_speech} <span>·</span> {question.direction === 'zh-en' ? 'Type the English word or phrase below.' : '输入简体中文。答出一个主要意思即可。'}</p>
          <form onSubmit={event => { event.preventDefault(); submitAnswer(); }}>
            <label className="answer-label" htmlFor="answer">Your best guess <span>大胆猜，别怕 fu。</span></label>
            <input key={`${question.word.id}-${answers.length}`} id="answer" className="answer-input" value={guess} onChange={e => setGuess(e.target.value)} placeholder={question.direction === 'zh-en' ? 'Let your English fu flow…' : '在这里输入中文…'} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={300} autoFocus onKeyDown={event => { if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }} />
            <button className="primary" disabled={!guess.trim()} type="submit">Check my fu <ArrowRight size={19} /></button>
          </form>
          <button className="text-button skip-button" onClick={() => submitAnswer(true)}>My brain is tofu. Show me. <ArrowRight size={14} /></button>
        </div><p className="under-card">No timer. Take a breath. Even tofu needs time to marinate.</p>
      </section>}

      {screen === 'feedback' && feedback && <section className="play-shell feedback-shell">
        <div className="play-top"><button className="text-button" onClick={goHome}><ArrowLeft size={16} /> Leave round</button><span>QUESTION {answers.length} / {questions.length}</span><button className="text-button" aria-label="Stop audio" onClick={stopSpeaking}><VolumeX size={16} /> Stop audio</button></div>
        <div className={`feedback-banner ${feedback.correct ? 'correct' : 'learning'}`}><span className="feedback-symbol">{feedback.correct ? <Check size={26} /> : <Leaf size={26} />}</span><div><h1 ref={headingRef} tabIndex={-1}>{feedback.correct ? 'Fu-nomenal. You got it!' : feedback.skipped ? 'A fresh piece of brain fu.' : 'A little fu-pas. A little learning.'}</h1><p>{feedback.correct ? 'Master Tofu nods approvingly.' : 'No shame in the learning game. Let’s make this one stick.'}</p></div></div>
        <article className="answer-card"><div className="word-tags"><span>{feedback.word.part_of_speech}</span><span>P{feedback.word.priority}</span><span>{feedback.word.category_l2}</span></div><h2>{feedback.word.english}</h2><div className="pronunciation">{feedback.word.pronunciation}<button className="audio-inline" onClick={() => speak(feedback.word)} aria-label="Read English word and example"><Volume2 size={20} /></button></div><p className="answer-chinese" lang="zh-Hans">{feedback.word.chinese}</p>
          <div className="your-answer"><span>Your guess</span><strong>{feedback.skipped ? 'Skipped — learning mode activated.' : feedback.guess}</strong>{feedback.selfMarked && <small>Self-marked correct</small>}</div>
          {!feedback.correct && !feedback.skipped && <div className="self-mark"><p>Your answer close enough? You decide what counts.</p><button className="secondary self-mark-button" onClick={() => setAnswers(old => old.map((answer, i) => i === old.length - 1 ? { ...answer, correct: true, selfMarked: true } : answer))}><Check size={18} /> Close enough — mark correct</button></div>}
          <div className="example-box"><div className="eyebrow">PUT YOUR FU IN A SENTENCE <button className="audio-inline" onClick={() => speak(feedback.word, true)} aria-label="Read English example"><Volume2 size={17} /></button></div><p lang="en">{feedback.word.example_en}</p><p lang="zh-Hans">{feedback.word.example_zh}</p></div>
          <div className="feedback-tools"><button className="secondary" onClick={() => speak(feedback.word)}><Headphones size={16} /> Listen again</button><span>{settings.autoSpeak ? 'Auto-read is on' : 'Auto-read is off'} · {settings.rate}× speed</span></div>
          {speechError && <p className="notice" role="status">{speechError}</p>}
          <button className="primary" onClick={nextQuestion}>{answers.length === questions.length ? 'Show me my fu score' : 'Next piece of fu'}<ArrowRight size={19} /></button>
        </article>
      </section>}

      {screen === 'summary' && <section className="summary-shell"><div className="eyebrow">ROUND COMPLETE · 收获满满</div><FuMascot happy /><h1 ref={headingRef} tabIndex={-1}>{score === answers.length ? 'Un-fu-gettable.' : 'Look at all that fresh fu.'}</h1><p>You showed up. Your vocabulary got a little bigger. Tofu approves.</p><div className="score-card"><div><strong>{score}<span> / {answers.length}</span></strong><span>correct answers</span></div><div><strong>{Math.round(score / Math.max(1, answers.length) * 100)}<span>%</span></strong><span>round accuracy</span></div><div><strong>{answers.filter(a => !a.correct).length}</strong><span>words to revisit</span></div></div>
        <div className="save-status" role="status">{demoMode ? 'Demo round · progress is not saved.' : saveStatus === 'saving' ? 'Saving your fu…' : saveStatus === 'saved' ? '✓ Your round is saved to your account.' : saveStatus === 'failed' ? <><span>Couldn’t save this round: {saveError}</span><button disabled={!record} onClick={() => record && void persist(record)}>Retry saving</button></> : ''}</div>
        <div className="summary-actions"><button className="primary" onClick={() => startGame()}><RotateCcw size={17} /> Another round of fu</button><button className="secondary" onClick={goHome}><Settings2 size={17} /> Change settings</button></div>
        {answers.some(a => !a.correct) && <section className="review-card"><div className="review-heading"><h2>A little extra marinating.</h2><button className="text-button" onClick={() => startGame(answers.filter(a => !a.correct).map(({ word, direction }) => ({ word, direction })))}>Practice these again <ArrowRight size={14} /></button></div><p>Your missed and skipped words. Give them another look.</p><div className="review-list">{answers.filter(a => !a.correct).map(answer => <div key={answer.word.id}><span><strong>{answer.word.english}</strong><small lang="zh-Hans">{answer.word.chinese}</small></span><button className="audio-inline" aria-label={`Listen to ${answer.word.english}`} onClick={() => speak(answer.word)}><Volume2 size={19} /></button></div>)}</div></section>}
        {speechError && <p className="notice" role="status">{speechError}</p>}
      </section>}
      </div>
    </main>

    <footer className="site-footer"><span><span className="mini-fu">fu.</span> A little practice. A lot of possibility.</span><div><span>Made with a healthy lack of seriousness.</span><button onClick={() => setModal('help')}><CircleHelp size={15} /> How it works</button></div></footer>

    <dialog ref={dialogRef} className="modal" onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null); }} aria-labelledby="modal-title">
      <div className="modal-content"><button className="modal-close" aria-label="Close dialog" onClick={() => setModal(null)}><X size={20} /></button>
        {modal === 'login' && <><span className="modal-icon"><Mail size={26} /></span><h2 id="modal-title">Your inbox is the key to fu.</h2><p>Sign in or create an account with an email link.<br />No password to remember. More room for words.</p>
          {!configured ? <div className="notice">Email login is available once Supabase is connected. For now, enjoy a demo round.</div> : <form onSubmit={signIn}><label htmlFor="email">Email address</label><input id="email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} /><button className="primary" disabled={authBusy || cooldown > 0}>{authBusy ? 'Sending your link…' : cooldown ? `Send another link in ${cooldown}s` : 'Email me a sign-in link'}<ArrowRight size={17} /></button></form>}
          {authError && <p className="notice error" role="alert">{authError}</p>}{authMessage && <p className="notice success" role="status">{authMessage}</p>}<button className="text-button modal-demo" onClick={() => { setDemo(true); setModal(null); }}>Try the demo first <ArrowRight size={14} /></button><p className="small-note">Your email is used for login. Completed rounds are private to your account.</p>
        </>}
        {modal === 'history' && <><span className="modal-icon"><History size={25} /></span><h2 id="modal-title">Your recent fu.</h2><p>Your last 10 completed rounds. Small steps add up.</p>{!session || demoMode ? <div className="notice">Sign in and play a full round to start your history.<button onClick={() => { setDemo(false); setModal('login'); }}>Sign in</button></div> : historyLoading ? <p role="status">Fetching your fu…</p> : historyError ? <div className="notice error" role="alert">{historyError}<button onClick={() => void openHistory()}>Retry</button></div> : !history.length ? <p>No rounds yet. Your first fu is waiting.</p> : <div className="history-list">{history.map(game => <div key={game.id}><div><strong>{game.settings.direction === 'zh-en' ? 'Chinese → English' : game.settings.direction === 'en-zh' ? 'English → Chinese' : 'Mixed directions'}</strong><small>{new Date(game.created_at!).toLocaleString()} · {game.settings.kind}</small></div><span>{game.score}<small> / {game.total}</small></span></div>)}</div>}</>}
        {modal === 'help' && <><span className="modal-icon"><CircleHelp size={25} /></span><h2 id="modal-title">A quick guide to fu.</h2><div className="help-copy"><p><b>Choose a direction.</b> Read Chinese and type English, reverse it, or mix both. Chinese answers use Simplified Chinese.</p><p><b>Open the filters.</b> Pick words, idioms, or slang; choose a topic, question count, and priority cutoff. Priority 1 is the most essential. Questions are shuffled without repeats.</p><p><b>Guess, then listen.</b> Every answer reveals the English, pronunciation, and a translated example. Automatic audio uses your device’s English voice. You can turn it off or replay it.</p><p><b>Be fair to yourself.</b> Capitalization and punctuation don’t matter. Common spelling variants and Chinese alternatives are accepted. The checker isn’t a translation model; use “Close enough — mark correct” whenever you want to count your answer as correct.</p><p><b>Finish your round.</b> Signed-in completed rounds are saved privately. Demo and unfinished rounds are not saved. Refreshing during a game starts over.</p></div></>}
        {modal === 'quit' && <><h2 id="modal-title">Taking a fu break?</h2><p>This unfinished round won’t be saved. Your settings will stay ready for next time.</p><button className="primary" onClick={() => setModal(null)}>Keep playing</button><button className="secondary full-width" onClick={() => { stopSpeaking(); setScreen('home'); setModal(null); }}>Leave this round</button></>}
      </div>
    </dialog>
  </>;
}
