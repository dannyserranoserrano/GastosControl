-- =====================================================================
-- GastoControl — Esquema de Supabase (Postgres + Row Level Security)
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase.
-- =====================================================================

create extension if not exists pgcrypto;

-- Categorías por usuario y proyecto
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default 'MoreHorizontal',
  color text not null default 'stone',
  project text not null default '',
  unique (user_id, name)
);

-- Categorías específicas por proyecto (migración desde el esquema global)
alter table public.categories add column if not exists project text not null default '';
alter table public.categories drop constraint if exists categories_user_id_name_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_user_id_project_name_key') then
    alter table public.categories add constraint categories_user_id_project_name_key unique (user_id, project, name);
  end if;
end $$;

-- Gastos por usuario
create table if not exists public.expenses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vendor text not null default '',
  date text not null,
  amount numeric not null default 0,
  category text not null default 'Otros',
  project text not null default '',
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  receipts jsonb not null default '[]'::jsonb,
  receipt_path text,
  receipt_url text,
  created_at timestamptz not null default now()
);

alter table public.expenses add column if not exists project text not null default '';
alter table public.expenses add column if not exists receipts jsonb not null default '[]'::jsonb;

create index if not exists expenses_user_idx on public.expenses (user_id, date desc);

-- Presupuesto por usuario (una fila por usuario)
create table if not exists public.budget (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.budget add column if not exists alert_at numeric not null default 80;
alter table public.budget add column if not exists category_budgets jsonb not null default '{}'::jsonb;
alter table public.budget add column if not exists project_budgets jsonb not null default '{}'::jsonb;
alter table public.budget add column if not exists period text not null default 'monthly';
-- Presupuestos por proyecto: { "<proyecto>": { total, alert_at, category_budgets, period } }
alter table public.budget add column if not exists projects jsonb not null default '{}'::jsonb;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budget enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own budget" on public.budget;
create policy "own budget" on public.budget
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Storage para imágenes de tickets (opcional)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "receipts public read" on storage.objects;
create policy "receipts public read" on storage.objects
  for select using (bucket_id = 'receipts');

drop policy if exists "receipts authenticated insert" on storage.objects;
create policy "receipts authenticated insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'receipts');
