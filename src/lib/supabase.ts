import { createClient } from '@supabase/supabase-js';
import type { GameRecord, Word } from './types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const configured = Boolean(url && key && !url.includes('YOUR_PROJECT') && !key.includes('REPLACE_ME'));
export const supabase = configured ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
}) : null;

export async function loadVocabulary(signal: AbortSignal): Promise<Word[]> {
  if (!supabase) throw new Error('Supabase is not connected yet. Try a demo round.');
  const result: Word[] = [];
  // Supabase's default result cap is 1,000; load every page, not only the first one.
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from('vocabulary').select('*')
      .order('id').range(start, start + 999).abortSignal(signal);
    if (error) throw error;
    result.push(...(data as Word[]));
    if (data.length < 1000) break;
  }
  if (!result.length) throw new Error('The vocabulary shelf is empty. Import supabase/seed.sql, then retry.');
  return result;
}

export async function saveGame(record: GameRecord) {
  if (!supabase) throw new Error('Supabase is not connected.');
  const { error } = await supabase.from('game_sessions').upsert(record, { onConflict: 'id' });
  if (error) throw error;
}

export async function getHistory(userId: string): Promise<GameRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('game_sessions')
    .select('id,user_id,created_at,score,total,settings').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(10);
  if (error) throw error;
  return data as GameRecord[];
}
