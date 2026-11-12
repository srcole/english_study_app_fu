export interface Word {
  id: number;
  chinese: string;
  english: string;
  category_l1: string;
  category_l2: string;
  priority: number;
  example_en: string;
  example_zh: string;
  part_of_speech: string;
  is_idiom: boolean;
  is_slang: boolean;
  pronunciation: string;
}
export type Direction = 'zh-en' | 'en-zh' | 'mixed';
export interface Settings {
  direction: Direction;
  kind: 'all' | 'words' | 'idioms' | 'slang';
  maxPriority: number;
  count: number;
  category: string;
  autoSpeak: boolean;
  rate: number;
  voiceURI: string;
  speechVersion: number;
  includeRude: boolean;
}
export interface Question { word: Word; direction: Exclude<Direction, 'mixed'> }
export interface Answer extends Question { guess: string; correct: boolean; selfMarked: boolean; skipped: boolean }
export interface GameRecord {
  id: string;
  user_id: string;
  created_at?: string;
  score: number;
  total: number;
  settings: Settings;
  answers: Answer[];
}
