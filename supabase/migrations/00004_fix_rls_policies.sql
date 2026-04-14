-- Fix: RLS policies usando "for all" causan que SELECT requiera roles de escritura.
-- Separar en policies explícitas para cada operación.

-- === EVENTS ===
drop policy if exists "events_write" on public.events;

create policy "events_insert" on public.events
  for insert with check (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = events.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

create policy "events_update" on public.events
  for update using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = events.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

create policy "events_delete" on public.events
  for delete using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = events.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin')
    )
  );

-- === CLIENTS ===
drop policy if exists "clients_write" on public.clients;

create policy "clients_insert" on public.clients
  for insert with check (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = clients.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

create policy "clients_update" on public.clients
  for update using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = clients.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

-- === EVENT MENUS ===
drop policy if exists "event_menus_write" on public.event_menus;

create policy "event_menus_insert" on public.event_menus
  for insert with check (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = event_menus.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

-- === EVENT SPACES ===
drop policy if exists "event_spaces_write" on public.event_spaces;

create policy "event_spaces_insert" on public.event_spaces
  for insert with check (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = event_spaces.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

-- === D0 HOTELS (same fix) ===
drop policy if exists "hotel_manage" on public.hotels;

create policy "hotel_update" on public.hotels
  for update using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = hotels.id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin')
    )
  );

-- === D0 MEMBERSHIPS (same fix) ===
drop policy if exists "membership_manage" on public.memberships;

create policy "membership_insert" on public.memberships
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.hotel_id = memberships.hotel_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('superadmin', 'direction', 'admin')
    )
  );

create policy "membership_update" on public.memberships
  for update using (
    exists (
      select 1 from public.memberships m
      where m.hotel_id = memberships.hotel_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('superadmin', 'direction', 'admin')
    )
  );
