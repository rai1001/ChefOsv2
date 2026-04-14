-- ============================================================================
-- D0 Identity & Security — ChefOS v2
-- Primera migración: tenants, hotels, profiles, memberships, audit, events
-- Decisiones clave del autoplan:
--   - Membership guard en CADA RPC (E1)
--   - RLS con restricción por rol, no solo hotel_id (E4)
--   - hotel_id en domain_events (E10)
--   - Audit trail via triggers (CEO Section 3)
-- ============================================================================

-- ====================
-- 0. EXTENSIONS
-- ====================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ====================
-- 1. ENUMS
-- ====================
create type public.app_role as enum (
  'superadmin',
  'direction',
  'admin',
  'head_chef',
  'sous_chef',
  'cook',
  'commercial',
  'procurement',
  'warehouse',
  'room',
  'reception',
  'operations',
  'maintenance'
);

-- ====================
-- 2. TABLES
-- ====================

-- Tenant = empresa/grupo
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Hotel = unidad operativa
create table public.hotels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  timezone text not null default 'Europe/Madrid',
  currency text not null default 'EUR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index idx_hotels_tenant on public.hotels(tenant_id);

-- Profile = datos del usuario (extiende auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- Membership = user + hotel + role
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, hotel_id)
);

create index idx_memberships_user on public.memberships(user_id);
create index idx_memberships_hotel on public.memberships(hotel_id);
create index idx_memberships_user_default on public.memberships(user_id, is_default) where is_default = true;

-- Audit logs — inmutable
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_hotel_entity on public.audit_logs(hotel_id, entity_type, entity_id);
create index idx_audit_hotel_user on public.audit_logs(hotel_id, user_id, created_at desc);

-- Domain events — outbox pattern (E10: con hotel_id)
create table public.domain_events (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}',
  version integer not null default 1,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_events_hotel_type on public.domain_events(hotel_id, event_type);
create index idx_events_unprocessed on public.domain_events(created_at) where processed_at is null;

-- ====================
-- 3. MEMBERSHIP GUARD HELPER (E1)
-- Cada RPC debe llamar a esto al inicio
-- ====================
create or replace function public.check_membership(
  p_user_id uuid,
  p_hotel_id uuid,
  p_required_roles public.app_role[] default null
)
returns public.app_role
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  select role into v_role
  from public.memberships
  where user_id = p_user_id
    and hotel_id = p_hotel_id
    and is_active = true;

  if v_role is null then
    raise exception 'unauthorized: no active membership for this hotel'
      using errcode = 'P0001';
  end if;

  if p_required_roles is not null and v_role != all(p_required_roles) then
    raise exception 'forbidden: role % not allowed for this operation', v_role
      using errcode = 'P0002';
  end if;

  return v_role;
end;
$$;

-- ====================
-- 4. HELPER: emit domain event
-- ====================
create or replace function public.emit_event(
  p_hotel_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_event_id uuid;
begin
  insert into public.domain_events (hotel_id, aggregate_type, aggregate_id, event_type, payload)
  values (p_hotel_id, p_aggregate_type, p_aggregate_id, p_event_type, p_payload)
  returning id into v_event_id;

  return v_event_id;
end;
$$;

-- ====================
-- 5. AUDIT TRIGGER (automático, no confiar en la app)
-- ====================
create or replace function public.audit_trigger_fn()
returns trigger
language plpgsql
security definer
as $$
declare
  v_hotel_id uuid;
  v_user_id uuid;
  v_action text;
begin
  v_user_id := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  -- Intentar extraer hotel_id de la fila
  if TG_OP = 'DELETE' then
    v_hotel_id := old.hotel_id;
    v_action := 'DELETE';
  elsif TG_OP = 'INSERT' then
    v_hotel_id := new.hotel_id;
    v_action := 'INSERT';
  else
    v_hotel_id := new.hotel_id;
    v_action := 'UPDATE';
  end if;

  -- Solo auditar si hotel_id existe
  if v_hotel_id is not null then
    insert into public.audit_logs (hotel_id, user_id, action, entity_type, entity_id, old_values, new_values)
    values (
      v_hotel_id,
      v_user_id,
      v_action,
      TG_TABLE_NAME,
      coalesce(new.id, old.id),
      case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    );
  end if;

  return coalesce(new, old);
end;
$$;

-- Attach audit trigger to key tables
create trigger audit_hotels
  after insert or update or delete on public.hotels
  for each row execute function public.audit_trigger_fn();

create trigger audit_memberships
  after insert or update or delete on public.memberships
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 6. PROFILE AUTO-CREATE ON SIGNUP
-- ====================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ====================
-- 7. ENSURE SINGLE DEFAULT MEMBERSHIP
-- ====================
create or replace function public.ensure_single_default()
returns trigger
language plpgsql
as $$
begin
  if new.is_default = true then
    update public.memberships
    set is_default = false
    where user_id = new.user_id
      and id != new.id
      and is_default = true;
  end if;
  return new;
end;
$$;

create trigger membership_single_default
  before insert or update on public.memberships
  for each row execute function public.ensure_single_default();

-- ====================
-- 8. ROW LEVEL SECURITY
-- ====================

-- Tenants: solo miembros de hoteles del tenant
alter table public.tenants enable row level security;

create policy "tenant_read" on public.tenants
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.tenant_id = tenants.id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
    )
  );

-- Hotels: solo miembros activos del hotel
alter table public.hotels enable row level security;

create policy "hotel_read" on public.hotels
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = hotels.id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
    )
  );

create policy "hotel_manage" on public.hotels
  for all using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = hotels.id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin')
    )
  );

-- Profiles: cada usuario ve el suyo, admins ven los del hotel
alter table public.profiles enable row level security;

create policy "profile_own" on public.profiles
  for all using (id = auth.uid());

create policy "profile_hotel_read" on public.profiles
  for select using (
    exists (
      select 1 from public.memberships m1
      join public.memberships m2 on m1.hotel_id = m2.hotel_id
      where m1.user_id = auth.uid()
        and m1.is_active = true
        and m2.user_id = profiles.id
        and m2.is_active = true
    )
  );

-- Memberships: cada usuario ve las suyas + admins del hotel
alter table public.memberships enable row level security;

create policy "membership_own" on public.memberships
  for select using (user_id = auth.uid());

create policy "membership_hotel_read" on public.memberships
  for select using (
    exists (
      select 1 from public.memberships m
      where m.hotel_id = memberships.hotel_id
        and m.user_id = auth.uid()
        and m.is_active = true
    )
  );

-- Solo admins pueden modificar memberships (E4: role-based RLS)
create policy "membership_manage" on public.memberships
  for all using (
    exists (
      select 1 from public.memberships m
      where m.hotel_id = memberships.hotel_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('superadmin', 'direction', 'admin')
    )
  );

-- Audit logs: solo dirección/admin pueden leer
alter table public.audit_logs enable row level security;

create policy "audit_read" on public.audit_logs
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = audit_logs.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin')
    )
  );

-- audit_logs insert solo via trigger (security definer), no direct
create policy "audit_no_direct_insert" on public.audit_logs
  for insert with check (false);

-- Domain events: solo lectura para admins
alter table public.domain_events enable row level security;

create policy "events_read" on public.domain_events
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = domain_events.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin')
    )
  );

-- ====================
-- 9. RPCs D0
-- ====================

-- 9.1 Get active hotel for current user
create or replace function public.get_active_hotel()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'membership_id', m.id,
    'hotel_id', h.id,
    'hotel_name', h.name,
    'hotel_slug', h.slug,
    'timezone', h.timezone,
    'currency', h.currency,
    'role', m.role,
    'tenant_id', m.tenant_id
  ) into v_result
  from public.memberships m
  join public.hotels h on h.id = m.hotel_id
  where m.user_id = auth.uid()
    and m.is_active = true
    and h.is_active = true
  order by m.is_default desc, m.created_at asc
  limit 1;

  if v_result is null then
    raise exception 'no active membership found'
      using errcode = 'P0003';
  end if;

  return v_result;
end;
$$;

-- 9.2 Get all hotels for current user
create or replace function public.get_user_hotels()
returns jsonb
language plpgsql
security definer
as $$
begin
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'membership_id', m.id,
          'hotel_id', h.id,
          'hotel_name', h.name,
          'hotel_slug', h.slug,
          'role', m.role,
          'is_default', m.is_default
        )
        order by m.is_default desc, h.name asc
      )
      from public.memberships m
      join public.hotels h on h.id = m.hotel_id
      where m.user_id = auth.uid()
        and m.is_active = true
        and h.is_active = true
    ),
    '[]'::jsonb
  );
end;
$$;

-- 9.3 Switch active hotel
create or replace function public.switch_active_hotel(p_hotel_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Verify membership exists
  perform public.check_membership(auth.uid(), p_hotel_id);

  -- Clear all defaults for this user
  update public.memberships
  set is_default = false
  where user_id = auth.uid()
    and is_default = true;

  -- Set new default
  update public.memberships
  set is_default = true
  where user_id = auth.uid()
    and hotel_id = p_hotel_id
    and is_active = true;

  -- Emit event
  perform public.emit_event(
    p_hotel_id,
    'membership',
    (select id from public.memberships where user_id = auth.uid() and hotel_id = p_hotel_id),
    'hotel.switched',
    jsonb_build_object('user_id', auth.uid())
  );
end;
$$;

-- 9.4 Create hotel (for onboarding)
create or replace function public.create_hotel(
  p_tenant_id uuid,
  p_name text,
  p_slug text,
  p_timezone text default 'Europe/Madrid',
  p_currency text default 'EUR'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_hotel_id uuid;
  v_user_id uuid := auth.uid();
begin
  -- Insert hotel
  insert into public.hotels (tenant_id, name, slug, timezone, currency)
  values (p_tenant_id, p_name, p_slug, p_timezone, p_currency)
  returning id into v_hotel_id;

  -- Auto-create membership as admin
  insert into public.memberships (user_id, hotel_id, tenant_id, role, is_default)
  values (v_user_id, v_hotel_id, p_tenant_id, 'admin', true);

  -- Emit event
  perform public.emit_event(
    v_hotel_id,
    'hotel',
    v_hotel_id,
    'hotel.created',
    jsonb_build_object('name', p_name, 'created_by', v_user_id)
  );

  return v_hotel_id;
end;
$$;

-- 9.5 Create tenant + first hotel (for signup/onboarding)
create or replace function public.create_tenant_with_hotel(
  p_tenant_name text,
  p_hotel_name text,
  p_hotel_slug text,
  p_timezone text default 'Europe/Madrid',
  p_currency text default 'EUR'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
  v_hotel_id uuid;
begin
  -- Create tenant
  insert into public.tenants (name)
  values (p_tenant_name)
  returning id into v_tenant_id;

  -- Create hotel + admin membership
  v_hotel_id := public.create_hotel(v_tenant_id, p_hotel_name, p_hotel_slug, p_timezone, p_currency);

  return jsonb_build_object(
    'tenant_id', v_tenant_id,
    'hotel_id', v_hotel_id
  );
end;
$$;

-- 9.6 Invite member
create or replace function public.invite_member(
  p_hotel_id uuid,
  p_user_id uuid,
  p_role public.app_role
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_caller_role public.app_role;
  v_tenant_id uuid;
  v_membership_id uuid;
begin
  -- Verify caller has admin access
  v_caller_role := public.check_membership(
    auth.uid(),
    p_hotel_id,
    array['superadmin', 'direction', 'admin']::public.app_role[]
  );

  -- Get tenant_id from hotel
  select tenant_id into v_tenant_id
  from public.hotels
  where id = p_hotel_id;

  -- Create membership
  insert into public.memberships (user_id, hotel_id, tenant_id, role)
  values (p_user_id, p_hotel_id, v_tenant_id, p_role)
  on conflict (user_id, hotel_id) do update
    set role = excluded.role, is_active = true
  returning id into v_membership_id;

  -- Emit event
  perform public.emit_event(
    p_hotel_id,
    'membership',
    v_membership_id,
    'member.invited',
    jsonb_build_object('user_id', p_user_id, 'role', p_role, 'invited_by', auth.uid())
  );

  return v_membership_id;
end;
$$;

-- 9.7 Update member role
create or replace function public.update_member_role(
  p_hotel_id uuid,
  p_target_user_id uuid,
  p_new_role public.app_role
)
returns void
language plpgsql
security definer
as $$
declare
  v_caller_role public.app_role;
begin
  -- Verify caller has admin access
  v_caller_role := public.check_membership(
    auth.uid(),
    p_hotel_id,
    array['superadmin', 'direction', 'admin']::public.app_role[]
  );

  -- Cannot change own role
  if p_target_user_id = auth.uid() then
    raise exception 'cannot change own role'
      using errcode = 'P0004';
  end if;

  update public.memberships
  set role = p_new_role
  where user_id = p_target_user_id
    and hotel_id = p_hotel_id
    and is_active = true;

  -- Emit event
  perform public.emit_event(
    p_hotel_id,
    'membership',
    (select id from public.memberships where user_id = p_target_user_id and hotel_id = p_hotel_id),
    'member.role_changed',
    jsonb_build_object('user_id', p_target_user_id, 'new_role', p_new_role, 'changed_by', auth.uid())
  );
end;
$$;

-- 9.8 Deactivate member (soft delete)
create or replace function public.deactivate_member(
  p_hotel_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_caller_role public.app_role;
begin
  v_caller_role := public.check_membership(
    auth.uid(),
    p_hotel_id,
    array['superadmin', 'direction', 'admin']::public.app_role[]
  );

  if p_target_user_id = auth.uid() then
    raise exception 'cannot deactivate yourself'
      using errcode = 'P0005';
  end if;

  update public.memberships
  set is_active = false, is_default = false
  where user_id = p_target_user_id
    and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id,
    'membership',
    (select id from public.memberships where user_id = p_target_user_id and hotel_id = p_hotel_id),
    'member.deactivated',
    jsonb_build_object('user_id', p_target_user_id, 'deactivated_by', auth.uid())
  );
end;
$$;
