import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const db = new PGlite();
const first = '11111111-1111-4111-8111-111111111111';
const second = '22222222-2222-4222-8222-222222222222';
beforeAll(async () => {
  // Model Supabase's existing Auth schema and database roles in local Postgres.
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${first}'), ('${second}');`);
  await db.exec(readFileSync('supabase/schema.sql', 'utf8'));
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
}, 30000);
afterAll(async () => { await db.close(); });

describe.sequential('Supabase SQL and row-level security', () => {
  it('imports the complete vocabulary and can safely re-import', async () => {
    await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
    const { rows } = await db.query<{ total: number; idioms: number; slang: number }>(
      'select count(*)::int total, count(*) filter (where is_idiom)::int idioms, count(*) filter (where is_slang)::int slang from public.vocabulary');
    expect(rows[0]).toEqual({ total: 2576, idioms: 100, slang: 100 });
  });
  it('denies anonymous database access', async () => {
    await db.exec('set role anon');
    try { await expect(db.query('select * from public.vocabulary')).rejects.toThrow(/permission denied/); }
    finally { await db.exec('reset role'); }
  });
  it('upgrades a legacy database and imports exactly 100 new words per level without changing old entries', async () => {
    await db.exec('delete from public.vocabulary where id > 1376; alter table public.vocabulary drop column cefr_level;');
    const original = (await db.query('select * from public.vocabulary order by id')).rows;
    const migration = readFileSync('supabase/add_cefr_b2_c1_c2.sql', 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    expect((await db.query('select cefr_level, count(*)::int as count from public.vocabulary where cefr_level is not null group by cefr_level order by cefr_level')).rows)
      .toEqual([{ cefr_level: 'B2', count: 100 }, { cefr_level: 'C1', count: 100 }, { cefr_level: 'C2', count: 100 }]);
    const preserved = (await db.query<Record<string, unknown>>('select * from public.vocabulary where id <= 1376 order by id')).rows
      .map(({ cefr_level, ...row }) => { expect(cefr_level).toBeNull(); return row; });
    expect(preserved).toEqual(original);
    expect((await db.query('select count(*)::int as count from public.vocabulary')).rows).toEqual([{ count: 1676 }]);
  });
  it('rejects an occupied expansion ID instead of overwriting unrelated content', async () => {
    await db.exec("update public.vocabulary set english = 'custom-existing-word' where id = 1377");
    await expect(db.exec(readFileSync('supabase/add_cefr_b2_c1_c2.sql', 'utf8'))).rejects.toThrow(/already used by another word/);
    await db.exec('rollback');
    expect((await db.query('select english from public.vocabulary where id = 1377')).rows).toEqual([{ english: 'custom-existing-word' }]);
    await db.exec("update public.vocabulary set english = 'accurate' where id = 1377");
  });
  it('classifies every remaining entry once without changing content or the expansion', async () => {
    const before = (await db.query<Record<string, unknown>>('select * from public.vocabulary order by id')).rows;
    const sql = readFileSync('supabase/classify_remaining_cefr.sql', 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    const after = (await db.query<Record<string, unknown>>('select * from public.vocabulary order by id')).rows;
    expect(after.map(({ cefr_level: _level, ...row }) => row)).toEqual(before.map(({ cefr_level: _level, ...row }) => row));
    expect(after.filter(row => Number(row.id) > 1376)).toEqual(before.filter(row => Number(row.id) > 1376));
    expect((await db.query('select count(*)::int as count from public.vocabulary where cefr_level is null')).rows).toEqual([{ count: 0 }]);
    expect((await db.query('select cefr_level, count(*)::int as count from public.vocabulary group by cefr_level order by cefr_level')).rows).toEqual([
      { cefr_level: 'A1', count: 567 }, { cefr_level: 'A2', count: 214 }, { cefr_level: 'B1', count: 423 },
      { cefr_level: 'B2', count: 221 }, { cefr_level: 'C1', count: 151 }, { cefr_level: 'C2', count: 100 },
    ]);
    await db.exec("update public.vocabulary set cefr_level = 'B2' where id = 1");
    await db.exec(sql);
    expect((await db.query('select cefr_level from public.vocabulary where id = 1')).rows).toEqual([{ cefr_level: 'B2' }]);
    await db.exec("update public.vocabulary set cefr_level = 'A1' where id = 1");
  });
  it('aborts classification when an original ID belongs to a different word', async () => {
    await db.exec("update public.vocabulary set english = 'custom-word' where id = 1");
    await expect(db.exec(readFileSync('supabase/classify_remaining_cefr.sql', 'utf8'))).rejects.toThrow(/refers to a different entry/);
    await db.exec('rollback');
    expect((await db.query('select english from public.vocabulary where id = 1')).rows).toEqual([{ english: 'custom-word' }]);
    await db.exec("update public.vocabulary set english = 'rice' where id = 1");
  });
  it('adds 300 more words per advanced level, preserves existing rows, and is idempotent', async () => {
    const before = (await db.query('select * from public.vocabulary order by id')).rows;
    const sql = readFileSync('supabase/add_cefr_900.sql', 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    expect((await db.query('select * from public.vocabulary where id <= 1676 order by id')).rows).toEqual(before);
    expect((await db.query('select cefr_level, count(*)::int as count from public.vocabulary where id > 1676 group by cefr_level order by cefr_level')).rows)
      .toEqual([{ cefr_level: 'B2', count: 300 }, { cefr_level: 'C1', count: 300 }, { cefr_level: 'C2', count: 300 }]);
    expect((await db.query('select count(*)::int as count from public.vocabulary')).rows).toEqual([{ count: 2576 }]);
    await db.exec("update public.vocabulary set english = 'custom-900-word' where id = 1677");
    await expect(db.exec(sql)).rejects.toThrow(/already used by another word/);
    await db.exec('rollback');
    expect((await db.query('select english from public.vocabulary where id = 1677')).rows).toEqual([{ english: 'custom-900-word' }]);
    await db.exec("update public.vocabulary set english = 'abandon' where id = 1677");
    await db.exec("update public.vocabulary set english = 'abandon' where id = 1");
    await expect(db.exec(sql)).rejects.toThrow(/already exists under a different ID/);
    await db.exec('rollback');
    await db.exec("update public.vocabulary set english = 'rice' where id = 1");
  });
  it('lets signed-in users read vocabulary but not modify it', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${first}'`);
    try {
      expect((await db.query('select * from public.vocabulary limit 1')).rows).toHaveLength(1);
      await expect(db.query("update public.vocabulary set english = 'wrong' where id = 1")).rejects.toThrow(/permission denied/);
    } finally { await db.exec('reset role'); }
  });
  it('allows own round writes, rejects impersonation and isolates two accounts', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${first}'`);
    const insert = `insert into public.game_sessions (id,user_id,score,total,settings,answers) values ($1,$2,1,1,'{}','[{}]')`;
    const gameId = '33333333-3333-4333-8333-333333333333';
    try {
      await db.query(insert, [gameId, first]);
      await expect(db.query(insert, ['44444444-4444-4444-8444-444444444444', second])).rejects.toThrow(/row-level security/);
      expect((await db.query('select * from public.game_sessions')).rows).toHaveLength(1);
      await db.exec(`set request.jwt.claim.sub = '${second}'`);
      expect((await db.query('select * from public.game_sessions')).rows).toHaveLength(0);
      expect((await db.query('update public.game_sessions set score = 0 returning id')).rows).toHaveLength(0);
      expect((await db.query('delete from public.game_sessions returning id')).rows).toHaveLength(0);
      await db.exec(`set request.jwt.claim.sub = '${first}'`);
      await expect(db.query('update public.game_sessions set user_id = $1', [second])).rejects.toThrow(/row-level security/);
      expect((await db.query('update public.game_sessions set score = 0 returning id')).rows).toHaveLength(1);
      await expect(db.query('update public.game_sessions set score = 2')).rejects.toThrow(/valid_score/);
      await expect(db.query("update public.game_sessions set answers = '[]'")).rejects.toThrow(/answer_count/);
    } finally { await db.exec('reset role'); }
  });
});
