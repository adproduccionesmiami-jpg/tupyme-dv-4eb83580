-- 0) Extensión para UUID
create extension if not exists pgcrypto;

-- 1) Enums
do $$ begin
  create type public.org_status as enum ('active','inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('admin','seller');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_status as enum ('active','inactive');
exception when duplicate_object then null; end $$;

-- 2) Tables
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.org_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'seller',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now()
);

-- Unicidad: un usuario solo una membership por organización
do $$ begin
  alter table public.memberships
    add constraint memberships_org_user_unique unique (organization_id, user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_memberships_user on public.memberships(user_id);
create index if not exists idx_memberships_org on public.memberships(organization_id);

-- 3) RLS
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

-- Limpia policies previas si existen (para evitar "duplicated policy")
drop policy if exists org_select_for_members on public.organizations;
drop policy if exists org_update_admin_only on public.organizations;
drop policy if exists mem_select_self_or_admin on public.memberships;
drop policy if exists mem_admin_manage on public.memberships;

-- Organizations: ver solo si eres miembro activo
create policy org_select_for_members
on public.organizations
for select
to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

-- Organizations: actualizar solo admin activo
create policy org_update_admin_only
on public.organizations
for update
to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role = 'admin'
      and m.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role = 'admin'
      and m.status = 'active'
  )
);

-- Memberships: ver si es tuya o si eres admin de esa org
create policy mem_select_self_or_admin
on public.memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.memberships a
    where a.organization_id = memberships.organization_id
      and a.user_id = auth.uid()
      and a.role = 'admin'
      and a.status = 'active'
  )
);

-- Memberships: admin gestiona miembros de su org
create policy mem_admin_manage
on public.memberships
for all
to authenticated
using (
  exists (
    select 1 from public.memberships a
    where a.organization_id = memberships.organization_id
      and a.user_id = auth.uid()
      and a.role = 'admin'
      and a.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.memberships a
    where a.organization_id = memberships.organization_id
      and a.user_id = auth.uid()
      and a.role = 'admin'
      and a.status = 'active'
  )
);