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
    expect(rows[0]).toEqual({ total: 1376, idioms: 100, slang: 100 });
  });
  it('denies anonymous database access', async () => {
    await db.exec('set role anon');
    try { await expect(db.query('select * from public.vocabulary')).rejects.toThrow(/permission denied/); }
    finally { await db.exec('reset role'); }
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
