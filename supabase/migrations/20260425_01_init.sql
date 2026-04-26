-- BarMate Supabase foundation
-- Base multi-tenant schema and app-state storage.
-- Shared-database safe: only manage BarMate operational state tables here.

create extension if not exists pgcrypto;

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.open_orders (
  id text primary key,
  organization_id text,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  items jsonb not null default '[]'::jsonb,
  status text,
  client_id text,
  client_name text,
  user_id text,
  is_shared boolean not null default false,
  viewer_count integer not null default 0,
  deleted_at timestamptz
);

create table if not exists public.guest_requests (
  id text primary key,
  organization_id text,
  name text not null,
  status text not null default 'pending',
  intent text not null default 'view',
  associated_order_id text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_state add column if not exists key text;
alter table public.app_state add column if not exists value jsonb not null default '{}'::jsonb;
alter table public.app_state add column if not exists updated_at timestamptz not null default now();

alter table public.open_orders add column if not exists id text;
alter table public.open_orders add column if not exists organization_id text;
alter table public.open_orders add column if not exists name text;
alter table public.open_orders add column if not exists created_at timestamptz not null default now();
alter table public.open_orders add column if not exists updated_at timestamptz not null default now();
alter table public.open_orders add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.open_orders add column if not exists status text;
alter table public.open_orders add column if not exists client_id text;
alter table public.open_orders add column if not exists client_name text;
alter table public.open_orders add column if not exists user_id text;
alter table public.open_orders add column if not exists is_shared boolean not null default false;
alter table public.open_orders add column if not exists viewer_count integer not null default 0;
alter table public.open_orders add column if not exists deleted_at timestamptz;

alter table public.guest_requests add column if not exists id text;
alter table public.guest_requests add column if not exists organization_id text;
alter table public.guest_requests add column if not exists name text;
alter table public.guest_requests add column if not exists status text not null default 'pending';
alter table public.guest_requests add column if not exists intent text not null default 'view';
alter table public.guest_requests add column if not exists associated_order_id text;
alter table public.guest_requests add column if not exists requested_at timestamptz not null default now();
alter table public.guest_requests add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_open_orders_org_created_at on public.open_orders (organization_id, created_at desc);
create index if not exists idx_guest_requests_org_status on public.guest_requests (organization_id, status);

alter table public.app_state enable row level security;
alter table public.open_orders enable row level security;
alter table public.guest_requests enable row level security;

-- Transitional policies:
-- The app is still using browser-side Supabase access while Supabase Auth/BFF is being wired.
-- These policies keep the app working during the migration, but they should be replaced by
-- organization-aware policies once session context is available.

drop policy if exists "transitional read app_state" on public.app_state;
create policy "transitional read app_state" on public.app_state
  for select using (true);

drop policy if exists "transitional write app_state" on public.app_state;
create policy "transitional write app_state" on public.app_state
  for insert with check (true);

drop policy if exists "transitional update app_state" on public.app_state;
create policy "transitional update app_state" on public.app_state
  for update using (true) with check (true);

drop policy if exists "transitional delete app_state" on public.app_state;
create policy "transitional delete app_state" on public.app_state
  for delete using (true);

drop policy if exists "transitional read open_orders" on public.open_orders;
create policy "transitional read open_orders" on public.open_orders
  for select using (true);

drop policy if exists "transitional write open_orders" on public.open_orders;
create policy "transitional write open_orders" on public.open_orders
  for insert with check (true);

drop policy if exists "transitional update open_orders" on public.open_orders;
create policy "transitional update open_orders" on public.open_orders
  for update using (true) with check (true);

drop policy if exists "transitional delete open_orders" on public.open_orders;
create policy "transitional delete open_orders" on public.open_orders
  for delete using (true);

drop policy if exists "transitional read guest_requests" on public.guest_requests;
create policy "transitional read guest_requests" on public.guest_requests
  for select using (true);

drop policy if exists "transitional write guest_requests" on public.guest_requests;
create policy "transitional write guest_requests" on public.guest_requests
  for insert with check (true);

drop policy if exists "transitional update guest_requests" on public.guest_requests;
create policy "transitional update guest_requests" on public.guest_requests
  for update using (true) with check (true);

drop policy if exists "transitional delete guest_requests" on public.guest_requests;
create policy "transitional delete guest_requests" on public.guest_requests
  for delete using (true);

-- Seed helper rows for app defaults can be added later through SQL or the app.
