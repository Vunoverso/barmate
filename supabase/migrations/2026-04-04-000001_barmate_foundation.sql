create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id text primary key,
  trade_name text not null,
  owner_email text,
  owner_name text,
  owner_user_id uuid references auth.users(id) on delete set null,
  plan_id text not null default 'trial',
  status text not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trial_ends_at timestamptz
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.app_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id text references public.organizations(id) on delete cascade,
  collection_name text not null,
  document_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, collection_name, document_key)
);

create table if not exists public.site_content (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  subject text not null,
  priority text not null default 'medium',
  status text not null default 'open',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cancellations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  reason text not null,
  status text not null default 'pending',
  ltv numeric(12,2) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_config (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.is_org_member(target_org_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.app_documents enable row level security;
alter table public.site_content enable row level security;
alter table public.tickets enable row level security;
alter table public.cancellations enable row level security;
alter table public.admin_config enable row level security;

drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

drop policy if exists organizations_member_update on public.organizations;
create policy organizations_member_update
on public.organizations
for update
to authenticated
using (public.is_org_member(id));

drop policy if exists organization_members_select_self on public.organization_members;
create policy organization_members_select_self
on public.organization_members
for select
to authenticated
using (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists app_documents_member_access on public.app_documents;
create policy app_documents_member_access
on public.app_documents
for all
to authenticated
using (organization_id is not null and public.is_org_member(organization_id))
with check (organization_id is not null and public.is_org_member(organization_id));

drop policy if exists tickets_member_access on public.tickets;
create policy tickets_member_access
on public.tickets
for all
to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists cancellations_member_access on public.cancellations;
create policy cancellations_member_access
on public.cancellations
for all
to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists site_content_public_read on public.site_content;
create policy site_content_public_read
on public.site_content
for select
to anon, authenticated
using (true);

comment on table public.app_documents is 'Tabela de compatibilidade para migracao gradual do modelo documento do Firestore para Supabase.';
comment on function public.is_org_member(text) is 'Helper de RLS para validar acesso a organizacoes do BarMate.';