-- Prisma/NextAuth tables for the server-side credentials auth flow.
-- These tables are intentionally separate from the transitional Supabase app_state/open_orders tables.

create table if not exists public."User" (
  id text primary key,
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text,
  "passwordHash" text,
  phone text,
  status text not null default 'active',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Organization" (
  id text primary key,
  "legalName" text not null,
  "tradeName" text not null,
  document text,
  slug text not null unique,
  status text not null default 'TRIAL',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Membership" (
  id text primary key,
  "organizationId" text not null references public."Organization"(id) on delete cascade,
  "userId" text not null references public."User"(id) on delete cascade,
  role text not null default 'OWNER',
  status text not null default 'active',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("organizationId", "userId")
);

create table if not exists public."Account" (
  id text primary key,
  "userId" text not null references public."User"(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  refresh_token_expires_in integer,
  unique (provider, "providerAccountId")
);

create table if not exists public."Session" (
  id text primary key,
  "sessionToken" text not null unique,
  "userId" text not null references public."User"(id) on delete cascade,
  expires timestamptz not null
);

create table if not exists public."VerificationToken" (
  identifier text not null,
  token text not null unique,
  expires timestamptz not null,
  unique (identifier, token)
);

create index if not exists idx_prisma_membership_user on public."Membership" ("userId");
create index if not exists idx_prisma_membership_org on public."Membership" ("organizationId");
create index if not exists idx_prisma_account_user on public."Account" ("userId");
create index if not exists idx_prisma_session_user on public."Session" ("userId");