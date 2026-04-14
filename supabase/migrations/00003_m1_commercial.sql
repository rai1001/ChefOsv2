-- ============================================================================
-- M1 Comercial — Eventos, Clientes, BEO
-- State machine: draft → pending_confirmation → confirmed → in_preparation
--                → in_operation → completed | any → cancelled → archived
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.event_status as enum (
  'draft',
  'pending_confirmation',
  'confirmed',
  'in_preparation',
  'in_operation',
  'completed',
  'cancelled',
  'archived'
);

create type public.event_type as enum (
  'banquet',
  'buffet',
  'coffee_break',
  'cocktail',
  'room_service',
  'catering',
  'restaurant'
);

create type public.service_type as enum (
  'buffet',
  'seated',
  'cocktail',
  'mixed'
);

create type public.vip_level as enum (
  'standard',
  'silver',
  'gold',
  'platinum'
);

-- ====================
-- 2. TABLES
-- ====================

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  company text,
  contact_person text,
  email text,
  phone text,
  tax_id text,
  vip_level public.vip_level not null default 'standard',
  lifetime_value numeric(12,2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_hotel on public.clients(hotel_id);
create index idx_clients_hotel_name on public.clients(hotel_id, name);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  event_type public.event_type not null,
  service_type public.service_type not null default 'seated',
  event_date date not null,
  start_time time,
  end_time time,
  guest_count integer not null default 0,
  venue text,
  setup_time interval,
  teardown_time interval,
  status public.event_status not null default 'draft',
  notes text,
  beo_number text,
  cancel_reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_events_hotel on public.events(hotel_id);
create index idx_events_hotel_date on public.events(hotel_id, event_date);
create index idx_events_hotel_status on public.events(hotel_id, status);
create index idx_events_client on public.events(client_id);

-- Event versions (BEO versioning)
create table public.event_versions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  version_number integer not null,
  data jsonb not null,
  changed_by uuid not null references auth.users(id),
  change_reason text,
  created_at timestamptz not null default now(),
  unique (event_id, version_number)
);

create index idx_event_versions_event on public.event_versions(event_id);

-- Event menus (join table — menús se crearán en M2)
create table public.event_menus (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  menu_id uuid, -- FK to menus added in M2 migration
  menu_name text not null, -- denormalized for BEO
  sort_order integer not null default 0,
  servings_override integer,
  created_at timestamptz not null default now()
);

create index idx_event_menus_event on public.event_menus(event_id);

-- Event spaces
create table public.event_spaces (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  space_name text not null,
  setup_type text,
  capacity integer,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_event_spaces_event on public.event_spaces(event_id);

-- ====================
-- 3. AUDIT TRIGGERS
-- ====================
create trigger audit_clients
  after insert or update or delete on public.clients
  for each row execute function public.audit_trigger_fn();

create trigger audit_events
  after insert or update or delete on public.events
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 4. RLS POLICIES
-- ====================

-- Clients: miembros del hotel pueden leer, commercial/admin pueden escribir
alter table public.clients enable row level security;

create policy "clients_read" on public.clients
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = clients.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
    )
  );

create policy "clients_write" on public.clients
  for all using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = clients.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

-- Events: miembros del hotel pueden leer, commercial/admin pueden escribir
alter table public.events enable row level security;

create policy "events_read" on public.events
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = events.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
    )
  );

create policy "events_write" on public.events
  for all using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = events.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

-- Event versions: same as events
alter table public.event_versions enable row level security;

create policy "event_versions_read" on public.event_versions
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = event_versions.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
    )
  );

-- Event menus: same as events
alter table public.event_menus enable row level security;

create policy "event_menus_read" on public.event_menus
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = event_menus.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
    )
  );

create policy "event_menus_write" on public.event_menus
  for all using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = event_menus.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

-- Event spaces: same as events
alter table public.event_spaces enable row level security;

create policy "event_spaces_read" on public.event_spaces
  for select using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = event_spaces.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
    )
  );

create policy "event_spaces_write" on public.event_spaces
  for all using (
    exists (
      select 1 from public.memberships
      where memberships.hotel_id = event_spaces.hotel_id
        and memberships.user_id = auth.uid()
        and memberships.is_active = true
        and memberships.role in ('superadmin', 'direction', 'admin', 'commercial')
    )
  );

-- ====================
-- 5. STATE MACHINE HELPER
-- ====================
create or replace function public.validate_event_transition(
  p_from public.event_status,
  p_to public.event_status
)
returns boolean
language plpgsql
as $$
begin
  -- Cancelled from any non-terminal state
  if p_to = 'cancelled' and p_from not in ('completed', 'cancelled', 'archived') then
    return true;
  end if;

  -- Archived only from completed or cancelled
  if p_to = 'archived' and p_from in ('completed', 'cancelled') then
    return true;
  end if;

  -- Normal flow
  return (p_from, p_to) in (
    ('draft', 'pending_confirmation'),
    ('pending_confirmation', 'confirmed'),
    ('confirmed', 'in_preparation'),
    ('in_preparation', 'in_operation'),
    ('in_operation', 'completed')
  );
end;
$$;

-- ====================
-- 6. RPCs
-- ====================

-- 6.1 Create event
create or replace function public.create_event(
  p_hotel_id uuid,
  p_name text,
  p_event_type public.event_type,
  p_service_type public.service_type,
  p_event_date date,
  p_guest_count integer,
  p_client_id uuid default null,
  p_start_time time default null,
  p_end_time time default null,
  p_venue text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_event_id uuid;
  v_beo_number text;
begin
  v_role := public.check_membership(
    auth.uid(), p_hotel_id,
    array['superadmin', 'direction', 'admin', 'commercial']::public.app_role[]
  );

  -- Generate BEO number: BEO-YYYYMMDD-XXXX
  v_beo_number := 'BEO-' || to_char(p_event_date, 'YYYYMMDD') || '-' ||
    lpad((
      select count(*) + 1 from public.events
      where hotel_id = p_hotel_id and event_date = p_event_date
    )::text, 4, '0');

  insert into public.events (
    hotel_id, client_id, name, event_type, service_type,
    event_date, start_time, end_time, guest_count,
    venue, notes, beo_number, created_by
  ) values (
    p_hotel_id, p_client_id, p_name, p_event_type, p_service_type,
    p_event_date, p_start_time, p_end_time, p_guest_count,
    p_venue, p_notes, v_beo_number, auth.uid()
  ) returning id into v_event_id;

  -- Create first version snapshot
  insert into public.event_versions (event_id, hotel_id, version_number, data, changed_by, change_reason)
  select v_event_id, p_hotel_id, 1, to_jsonb(e), auth.uid(), 'Evento creado'
  from public.events e where e.id = v_event_id;

  -- Emit domain event
  perform public.emit_event(
    p_hotel_id, 'event', v_event_id, 'event.created',
    jsonb_build_object('name', p_name, 'date', p_event_date, 'pax', p_guest_count)
  );

  return v_event_id;
end;
$$;

-- 6.2 Update event
create or replace function public.update_event(
  p_hotel_id uuid,
  p_event_id uuid,
  p_data jsonb,
  p_change_reason text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current_status public.event_status;
  v_version integer;
begin
  v_role := public.check_membership(
    auth.uid(), p_hotel_id,
    array['superadmin', 'direction', 'admin', 'commercial']::public.app_role[]
  );

  -- Check event belongs to hotel
  select status into v_current_status
  from public.events where id = p_event_id and hotel_id = p_hotel_id;

  if v_current_status is null then
    raise exception 'event not found' using errcode = 'P0010';
  end if;

  if v_current_status in ('completed', 'cancelled', 'archived') then
    raise exception 'cannot update event in status %', v_current_status using errcode = 'P0011';
  end if;

  -- Update allowed fields
  update public.events set
    name = coalesce(p_data ->> 'name', name),
    event_type = coalesce((p_data ->> 'event_type')::public.event_type, event_type),
    service_type = coalesce((p_data ->> 'service_type')::public.service_type, service_type),
    event_date = coalesce((p_data ->> 'event_date')::date, event_date),
    start_time = coalesce((p_data ->> 'start_time')::time, start_time),
    end_time = coalesce((p_data ->> 'end_time')::time, end_time),
    guest_count = coalesce((p_data ->> 'guest_count')::integer, guest_count),
    venue = coalesce(p_data ->> 'venue', venue),
    notes = coalesce(p_data ->> 'notes', notes),
    client_id = case when p_data ? 'client_id' then (p_data ->> 'client_id')::uuid else client_id end,
    updated_at = now()
  where id = p_event_id and hotel_id = p_hotel_id;

  -- Version snapshot
  select coalesce(max(version_number), 0) + 1 into v_version
  from public.event_versions where event_id = p_event_id;

  insert into public.event_versions (event_id, hotel_id, version_number, data, changed_by, change_reason)
  select p_event_id, p_hotel_id, v_version, to_jsonb(e), auth.uid(), p_change_reason
  from public.events e where e.id = p_event_id;
end;
$$;

-- 6.3 Transition event status (generic state machine)
create or replace function public.transition_event(
  p_hotel_id uuid,
  p_event_id uuid,
  p_new_status public.event_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current_status public.event_status;
  v_required_roles public.app_role[];
begin
  -- Determine required roles per transition
  v_required_roles := case p_new_status
    when 'pending_confirmation' then array['commercial', 'direction', 'admin', 'superadmin']::public.app_role[]
    when 'confirmed' then array['commercial', 'direction', 'admin', 'superadmin']::public.app_role[]
    when 'cancelled' then array['direction', 'admin', 'superadmin']::public.app_role[]
    when 'in_preparation' then array['head_chef', 'direction', 'admin', 'superadmin']::public.app_role[]
    when 'in_operation' then array['head_chef', 'direction', 'admin', 'superadmin']::public.app_role[]
    when 'completed' then array['head_chef', 'direction', 'admin', 'superadmin']::public.app_role[]
    when 'archived' then array['direction', 'admin', 'superadmin']::public.app_role[]
    else array['superadmin']::public.app_role[]
  end;

  v_role := public.check_membership(auth.uid(), p_hotel_id, v_required_roles);

  select status into v_current_status
  from public.events where id = p_event_id and hotel_id = p_hotel_id;

  if v_current_status is null then
    raise exception 'event not found' using errcode = 'P0010';
  end if;

  if not public.validate_event_transition(v_current_status, p_new_status) then
    raise exception 'invalid transition: % → %', v_current_status, p_new_status
      using errcode = 'P0012';
  end if;

  -- Confirm requires at least 1 menu
  if p_new_status = 'confirmed' then
    if not exists (select 1 from public.event_menus where event_id = p_event_id) then
      raise exception 'cannot confirm event without menus' using errcode = 'P0013';
    end if;
  end if;

  -- Cancel requires reason
  if p_new_status = 'cancelled' and (p_reason is null or p_reason = '') then
    raise exception 'cancel reason is required' using errcode = 'P0014';
  end if;

  update public.events set
    status = p_new_status,
    cancel_reason = case when p_new_status = 'cancelled' then p_reason else cancel_reason end,
    updated_at = now()
  where id = p_event_id and hotel_id = p_hotel_id;

  -- Emit domain event
  perform public.emit_event(
    p_hotel_id, 'event', p_event_id,
    'event.' || p_new_status::text,
    jsonb_build_object('from', v_current_status, 'to', p_new_status, 'reason', p_reason)
  );
end;
$$;

-- 6.4 Get events calendar
create or replace function public.get_events_calendar(
  p_hotel_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id);

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'event_type', e.event_type,
          'service_type', e.service_type,
          'event_date', e.event_date,
          'start_time', e.start_time,
          'end_time', e.end_time,
          'guest_count', e.guest_count,
          'venue', e.venue,
          'status', e.status,
          'beo_number', e.beo_number,
          'client_name', c.name
        )
        order by e.event_date, e.start_time
      )
      from public.events e
      left join public.clients c on c.id = e.client_id
      where e.hotel_id = p_hotel_id
        and e.event_date between p_from and p_to
        and e.status != 'archived'
    ),
    '[]'::jsonb
  );
end;
$$;
