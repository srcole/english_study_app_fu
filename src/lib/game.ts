import type { Question, Settings, Word } from './types';

export const DEFAULT_SETTINGS: Settings = {
  direction: 'zh-en', kind: 'all', maxPriority: 2, count: 10,
  category: '', cefrLevel: 'all', autoSpeak: true, rate: 1, voiceURI: '', speechVersion: 1, includeRude: false,
};

export function filterWords(words: Word[], settings: Settings): Word[] {
  return words.filter(word =>
    word.priority <= settings.maxPriority &&
    (!settings.category || word.category_l1 === settings.category) &&
    (!settings.cefrLevel || settings.cefrLevel === 'all' ||
      (settings.cefrLevel === 'unrated' ? !word.cefr_level : word.cefr_level === settings.cefrLevel)) &&
    (settings.includeRude || !/粗鲁|粗话|贬义/.test(word.chinese)) &&
    (settings.kind === 'all' ||
      (settings.kind === 'words' && !word.is_idiom && !word.is_slang) ||
      (settings.kind === 'idioms' && word.is_idiom) ||
      (settings.kind === 'slang' && word.is_slang)),
  );
}

export function makeQuestions(words: Word[], settings: Settings, random = Math.random): Question[] {
  const pool = [...filterWords(words, settings)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(100, Math.max(1, settings.count))).map(word => ({
    word,
    direction: settings.direction === 'mixed' ? (random() < 0.5 ? 'zh-en' : 'en-zh') : settings.direction,
  }));
}

export function stripNotes(value: string): string {
  return value.replace(/（[^）]*）|\([^)]*\)/g, '').trim();
}

export function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'")
    .replace(/[-‐‑–—]/g, ' ').replace(/[.,!?。！？、，：:;；"“”'…]/g, '')
    .replace(/\s+/g, ' ').trim();
}

const synonyms: Record<string, string[]> = {
  airplane: ['aeroplane', 'plane'], apartment: ['flat'], elevator: ['lift'],
  restroom: ['bathroom', 'toilet', 'washroom'], pants: ['trousers'],
  soccer: ['football'], fries: ['french fries', 'chips'], gray: ['grey'],
  movie: ['film'], subway: ['metro', 'underground'], vacation: ['holiday'],
  autumn: ['fall'], candy: ['sweets'], mom: ['mum'], cellphone: ['cell phone', 'mobile phone'],
  phone: ['telephone', 'mobile', 'mobile phone', 'cell phone'],
};

export function acceptedAnswers(question: Question): string[] {
  if (question.direction === 'zh-en') {
    const en = question.word.english;
    return [en, ...(synonyms[en.toLowerCase()] ?? [])].map(normalize);
  }
  const gloss = stripNotes(question.word.chinese);
  const pieces = gloss.split(/[；;、]|或/g).map(v => v.trim()).filter(Boolean);
  const variants = [gloss, ...pieces];
  // Chinese adjectival 的 is optional in an isolated vocabulary answer.
  for (const piece of pieces) if (piece.endsWith('的')) variants.push(piece.slice(0, -1));
  return variants.map(v => normalize(v).replace(/\s/g, ''));
}

export function isCorrect(guess: string, question: Question): boolean {
  const value = question.direction === 'en-zh' ? normalize(guess).replace(/\s/g, '') : normalize(guess);
  return Boolean(value) && acceptedAnswers(question).includes(value);
}

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem('fu-settings') ?? '{}');
    return {
      direction: ['zh-en', 'en-zh', 'mixed'].includes(raw.direction) ? raw.direction : DEFAULT_SETTINGS.direction,
      kind: ['all', 'words', 'idioms', 'slang'].includes(raw.kind) ? raw.kind : DEFAULT_SETTINGS.kind,
      maxPriority: [1, 2, 3, 4, 5].includes(raw.maxPriority) ? raw.maxPriority : 2,
      count: [5, 10, 20, 30, 50, 100].includes(raw.count) ? raw.count : 10,
      category: typeof raw.category === 'string' ? raw.category : '',
      cefrLevel: ['all', 'B2', 'C1', 'C2', 'unrated'].includes(raw.cefrLevel) ? raw.cefrLevel : 'all',
      autoSpeak: typeof raw.autoSpeak === 'boolean' ? raw.autoSpeak : true,
      // Upgrade existing installations from the old slow default once.
      rate: raw.speechVersion === 1 && [0.7, 0.85, 1].includes(raw.rate) ? raw.rate : 1,
      voiceURI: typeof raw.voiceURI === 'string' ? raw.voiceURI : '',
      speechVersion: 1,
      includeRude: raw.includeRude === true,
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}
