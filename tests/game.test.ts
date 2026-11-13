import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, acceptedAnswers, filterWords, isCorrect, makeQuestions, normalize } from '../src/lib/game';
import type { Word } from '../src/lib/types';

const word: Word = {
  id: 1, chinese: '冰箱', english: 'refrigerator', category_l1: '居家', category_l2: '家电',
  priority: 1, example_en: 'We need a new refrigerator.', example_zh: '我们需要新的冰箱。',
  part_of_speech: 'noun', is_idiom: false, is_slang: false, pronunciation: '/rɪˈfrɪdʒəˌreɪtər/',
};
const words: Word[] = [word,
  { ...word, id: 2, is_idiom: true, priority: 2, english: 'break the ice' },
  { ...word, id: 3, is_slang: true, priority: 3, english: 'no cap' },
  { ...word, id: 4, category_l1: '健康', priority: 1 },
  { ...word, id: 5, is_slang: true, chinese: '很生气（粗鲁用语）', priority: 2 },
];

describe('learning filters and question selection', () => {
  it('uses smaller numbers as higher priority and excludes rude terms by default', () => {
    expect(filterWords(words, DEFAULT_SETTINGS).map(w => w.id)).toEqual([1, 2, 4]);
  });
  it('combines expression type, priority and topic filters', () => {
    expect(filterWords(words, { ...DEFAULT_SETTINGS, kind: 'idioms' }).map(w => w.id)).toEqual([2]);
    expect(filterWords(words, { ...DEFAULT_SETTINGS, kind: 'slang', maxPriority: 3 }).map(w => w.id)).toEqual([3]);
    expect(filterWords(words, { ...DEFAULT_SETTINGS, category: '健康' }).map(w => w.id)).toEqual([4]);
    expect(filterWords(words, { ...DEFAULT_SETTINGS, kind: 'words' }).map(w => w.id)).toEqual([1, 4]);
    expect(filterWords(words, { ...DEFAULT_SETTINGS, includeRude: true }).map(w => w.id)).toContain(5);
  });
  it('never repeats entries or pads a small filtered pool', () => {
    const questions = makeQuestions(words, { ...DEFAULT_SETTINGS, count: 100 });
    expect(questions).toHaveLength(3);
    expect(new Set(questions.map(q => q.word.id)).size).toBe(3);
  });
  it('filters exact CEFR levels, preserves unrated entries, and combines with priority and topic', () => {
    const pool: Word[] = [word, { ...word, id: 10, cefr_level: 'B2', priority: 2 },
      { ...word, id: 11, cefr_level: 'C1', priority: 3 },
      { ...word, id: 12, cefr_level: 'C2', priority: 5 },
      { ...word, id: 13, cefr_level: null },
      { ...word, id: 14, cefr_level: 'A1' }, { ...word, id: 15, cefr_level: 'A2' },
      { ...word, id: 16, cefr_level: 'B1' }];
    const settings = { ...DEFAULT_SETTINGS, maxPriority: 5 };
    expect(filterWords(pool, settings)).toHaveLength(8);
    expect(filterWords(pool, { ...settings, cefrLevels: ['A1', 'B1', 'C1'] }).map(w => w.id)).toEqual([11, 14, 16]);
    expect(filterWords(pool, { ...settings, cefrLevels: ['C2', 'unrated'] }).map(w => w.id)).toEqual([1, 12, 13]);
    for (const [level, id] of [['A1', 14], ['A2', 15], ['B1', 16], ['B2', 10], ['C1', 11], ['C2', 12]] as const) {
      expect(filterWords(pool, { ...settings, cefrLevels: [level] }).map(w => w.id)).toEqual([id]);
    }
    expect(filterWords(pool, { ...settings, cefrLevels: ['unrated'] }).map(w => w.id)).toEqual([1, 13]);
    expect(filterWords(pool, { ...settings, cefrLevels: ['C1'], maxPriority: 2 })).toEqual([]);
    expect(filterWords(pool, { ...settings, cefrLevels: ['C1'], category: '健康' })).toEqual([]);
  });
  it('supports both directions in a mixed round and empty pools', () => {
    const questions = makeQuestions(words, { ...DEFAULT_SETTINGS, direction: 'mixed' }, () => 0.2);
    expect(questions.every(q => q.direction === 'zh-en')).toBe(true);
    expect(makeQuestions(words, { ...DEFAULT_SETTINGS, direction: 'mixed' }, () => 0.8).every(q => q.direction === 'en-zh')).toBe(true);
    expect(makeQuestions([], DEFAULT_SETTINGS)).toEqual([]);
  });
});

describe('answer matching', () => {
  it('normalizes capitalization, punctuation, whitespace, apostrophes and hyphens', () => {
    expect(isCorrect('  REFRIGERATOR! ', { word, direction: 'zh-en' })).toBe(true);
    expect(normalize(' “T-SHIRT” ')).toBe('t shirt');
    expect(normalize('don’t')).toBe('dont');
  });
  it('accepts known English alternatives without loose substring matches', () => {
    const question = { word: { ...word, english: 'airplane' }, direction: 'zh-en' as const };
    expect(isCorrect('aeroplane', question)).toBe(true);
    expect(isCorrect('plane', question)).toBe(true);
    expect(isCorrect('air', question)).toBe(false);
    expect(isCorrect('', question)).toBe(false);
  });
  it('accepts individual Chinese meanings and ignores usage notes', () => {
    const question = { word: { ...word, chinese: '漂亮的；好看的（非正式）' }, direction: 'en-zh' as const };
    expect(isCorrect('漂亮', question)).toBe(true);
    expect(isCorrect('好看的', question)).toBe(true);
    expect(isCorrect('非正式', question)).toBe(false);
    expect(isCorrect('好', question)).toBe(false);
    expect(acceptedAnswers({ ...question, word: { ...word, chinese: '叔叔或舅舅' } })).toContain('舅舅');
  });
});
