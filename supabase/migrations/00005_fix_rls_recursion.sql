-- Fix: infinite recursion in memberships RLS policies
-- Causa: membership_hotel_read lee de memberships para evaluar acceso a memberships
-- Solución: función security definer que bypassa RLS para el check

-- 1. Helper function (security definer = no RLS)
create or replace function public.is_member_of(p_hotel_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and hotel_id = p_hotel_id
      and is_active = true
  );
$$;

create or replace function public.get_member_role(p_hotel_id uuid)
returns public.app_role
language sql
security definer
stable
as $$
  select role from public.memberships
  where user_id = auth.uid()
    and hotel_id = p_hotel_id
    and is_active = true
  limit 1;
$$;

-- 2. Fix memberships policies (drop recursive ones)
drop policy if exists "membership_hotel_read" on public.memberships;
drop policy if exists "membership_insert" on public.memberships;
drop policy if exists "membership_update" on public.memberships;

-- Users can see all memberships for hotels they belong to
create policy "membership_hotel_read" on public.memberships
  for select using (
    public.is_member_of(hotel_id)
  );

-- Admins can insert/update memberships
create policy "membership_insert" on public.memberships
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

create policy "membership_update" on public.memberships
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

-- 3. Fix other policies to use the helper (no recursion possible)
drop policy if exists "tenant_read" on public.tenants;
create policy "tenant_read" on public.tenants
  for select using (
    exists (
      select 1 from public.hotels h
      where h.tenant_id = tenants.id
        and public.is_member_of(h.id)
    )
  );

drop policy if exists "hotel_read" on public.hotels;
create policy "hotel_read" on public.hotels
  for select using (public.is_member_of(id));

drop policy if exists "hotel_update" on public.hotels;
create policy "hotel_update" on public.hotels
  for update using (
    public.get_member_role(id) in ('superadmin', 'direction', 'admin')
  );

drop policy if exists "profile_hotel_read" on public.profiles;
create policy "profile_hotel_read" on public.profiles
  for select using (
    exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and m.is_active = true
        and public.is_member_of(m.hotel_id)
    )
  );

drop policy if exists "audit_read" on public.audit_logs;
create policy "audit_read" on public.audit_logs
  for select using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

drop policy if exists "events_read" on public.domain_events;
create policy "events_read" on public.domain_events
  for select using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

-- 4. Fix M1 policies
drop policy if exists "clients_read" on public.clients;
create policy "clients_read" on public.clients
  for select using (public.is_member_of(hotel_id));

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'commercial')
  );

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'commercial')
  );

drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events
  for select using (public.is_member_of(hotel_id));

drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'commercial')
  );

drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'commercial')
  );

drop policy if exists "events_delete" on public.events;
create policy "events_delete" on public.events
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

drop policy if exists "event_versions_read" on public.event_versions;
create policy "event_versions_read" on public.event_versions
  for select using (public.is_member_of(hotel_id));

drop policy if exists "event_menus_read" on public.event_menus;
create policy "event_menus_read" on public.event_menus
  for select using (public.is_member_of(hotel_id));

drop policy if exists "event_menus_insert" on public.event_menus;
create policy "event_menus_insert" on public.event_menus
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'commercial')
  );

drop policy if exists "event_spaces_read" on public.event_spaces;
create policy "event_spaces_read" on public.event_spaces
  for select using (public.is_member_of(hotel_id));

drop policy if exists "event_spaces_insert" on public.event_spaces;
create policy "event_spaces_insert" on public.event_spaces
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'commercial')
  );
