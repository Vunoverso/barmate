-- BarMate Supabase foundation
-- Base multi-tenant schema and app-state storage.
-- Shared-database safe: do not add foreign keys to pre-existing shared tables.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id text primary key default gen_random_uuid()::text,
  legal_name text not null,
  trade_name text not null,
  document text,
  slug text not null unique,
  status text not null default 'TRIAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key default gen_random_uuid()::text,
  name text,
  email text unique,
  phone text,
  password_hash text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  user_id text not null,
  role text not null default 'OWNER',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

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

create index if not exists idx_open_orders_org_created_at on public.open_orders (organization_id, created_at desc);
create index if not exists idx_guest_requests_org_status on public.guest_requests (organization_id, status);
create index if not exists idx_memberships_user on public.memberships (user_id);
create index if not exists idx_memberships_org on public.memberships (organization_id);

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.memberships enable row level security;
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

drop policy if exists "memberships read own org" on public.memberships;
create policy "memberships read own org" on public.memberships
  for select using (true);

drop policy if exists "organizations read" on public.organizations;
create policy "organizations read" on public.organizations
  for select using (true);

drop policy if exists "users read" on public.users;
create policy "users read" on public.users
  for select using (true);

-- Seed helper rows for app defaults can be added later through SQL or Prisma.
