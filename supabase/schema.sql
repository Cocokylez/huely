-- Huely — Supabase schema. Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled',
  color_count int  not null default 8,
  palette     jsonb not null default '[]'::jsonb,
  mixer       jsonb not null default '[]'::jsonb,
  thumb       text,
  created_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Each user can only see and modify their own projects.
create policy "read own projects"   on public.projects for select using (auth.uid() = user_id);
create policy "insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "delete own projects" on public.projects for delete using (auth.uid() = user_id);

create index if not exists projects_user_created_idx
  on public.projects (user_id, created_at desc);
