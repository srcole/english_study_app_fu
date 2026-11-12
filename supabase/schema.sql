-- Run once in Supabase > SQL Editor, before seed.sql.
-- Safe to rerun: policies are dropped/recreated; existing data is retained.
begin;

create table if not exists public.vocabulary (
  id integer primary key,
  chinese text not null check (length(chinese) > 0),
  english text not null check (length(english) > 0),
  category_l1 text not null,
  category_l2 text not null,
  priority integer not null check (priority between 1 and 5),
  example_en text not null,
  example_zh text not null,
  part_of_speech text not null,
  is_idiom boolean not null default false,
  is_slang boolean not null default false,
  pronunciation text not null,
  constraint one_expression_category check (not (is_idiom and is_slang))
);

create table if not exists public.game_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  score integer not null,
  total integer not null check (total between 1 and 100),
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  answers jsonb not null check (jsonb_typeof(answers) = 'array'),
  constraint valid_score check (score >= 0 and score <= total),
  constraint answer_count check (jsonb_array_length(answers) = total),
  constraint bounded_payload check (octet_length(answers::text) <= 250000)
);
create index if not exists game_sessions_user_created_idx on public.game_sessions (user_id, created_at desc);

alter table public.vocabulary enable row level security;
alter table public.game_sessions enable row level security;

revoke all on public.vocabulary from anon, authenticated;
revoke all on public.game_sessions from anon, authenticated;
grant select on public.vocabulary to authenticated;
grant select, insert, update, delete on public.game_sessions to authenticated;

drop policy if exists "Signed in users can read vocabulary" on public.vocabulary;
create policy "Signed in users can read vocabulary" on public.vocabulary
  for select to authenticated using ((select auth.uid()) is not null);

drop policy if exists "Read own rounds" on public.game_sessions;
create policy "Read own rounds" on public.game_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own rounds" on public.game_sessions;
create policy "Insert own rounds" on public.game_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own rounds" on public.game_sessions;
create policy "Update own rounds" on public.game_sessions
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own rounds" on public.game_sessions;
create policy "Delete own rounds" on public.game_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;
