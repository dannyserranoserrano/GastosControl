-- =====================================================================
-- GastoControl — Esquema de Supabase (Postgres + Row Level Security)
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase.
-- =====================================================================

create extension if not exists pgcrypto;

-- Categorías por usuario
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default 'MoreHorizontal',
  color text not null default 'stone',
  unique (user_id, name)
);

-- Gastos por usuario
create table if not exists public.expenses (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  vendor text not null default '',
  date text not null,
  amount numeric not null default 0,
  category text not null default 'Otros',
  notes text not null default '',
  items jsonb not null default '[]'::jsonb,
  receipt_path text,
  receipt_url text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_idx on public.expenses (user_id, date desc);

-- Presupuesto por usuario (una fila por usuario)
create table if not exists public.budget (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.budget add column if not exists alert_at numeric not null default 80;

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