-- Run once in the Supabase SQL editor.
-- The app talks to Supabase only from the server with the service key,
-- so RLS is enabled with no policies: nothing is reachable with the anon key.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists entries (
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  input jsonb not null,
  draft text not null default '',
  text text not null default '',
  edited boolean not null default false,
  question jsonb,
  answer text,
  gen_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists entries_user_edited on entries (user_id, edited, date desc);

alter table users enable row level security;
alter table entries enable row level security;

-- Invite codes. Add one row per person.
insert into users (invite_code, name) values ('change-me', '我') on conflict do nothing;
