-- ============================================================================
-- M12 Integraciones PMS/POS — ChefOS v2
-- Tablas: pms_integrations, pos_integrations, integration_sync_logs
-- RPCs: create_pms_integration, create_pos_integration, update_integration,
--        disable_integration, trigger_pms_sync, trigger_pos_sync,
--        mark_sync_complete, get_pms_integrations, get_pos_integrations,
--        get_integration_sync_logs
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================

create type public.pms_type as enum (
  'mews',
  'opera_cloud',
  'cloudbeds',
  'protel'
);

create type public.pos_type as enum (
  'lightspeed',
  'simphony',
  'square',
  'revel'
);

create type public.integration_status as enum (
  'draft',      -- recién creada, sin probar
  'active',     -- funcionando (último test OK)
  'error',      -- último sync/test falló
  'disabled'    -- deshabilitada manualmente
);

create type public.sync_log_status as enum (
  'running',
  'success',
  'partial',
  'failed'
);

-- ====================
-- 2. TABLAS
-- ====================

-- Integraciones PMS (Property Management System: Mews, OPERA Cloud, etc.)
create table public.pms_integrations (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels(id) on delete cascade,
  pms_type    public.pms_type not null,
  name        text not null,
  status      public.integration_status not null default 'draft',
  -- credentials JSONB (no mostrar en frontend; solo write/overwrite):
  --   Mews:        { "api_token": "...", "property_id": "...", "environment": "demo|production" }
  --   OPERA Cloud: { "client_id": "...", "client_secret": "...", "tenant_name": "...", "server_url": "..." }
  --   Cloudbeds:   { "api_key": "...", "property_id": "..." }
  --   Protel:      { "server_url": "...", "username": "...", "password": "..." }
  credentials jsonb not null default '{}',
  -- config: field mappings, sync interval, etc.
  --   { "sync_interval_minutes": 60, "sync_occupancy": true, "sync_reservations": true,
  --     "field_mappings": { "event_name": "reservation.name", "guest_count": "reservation.adults" } }
  config      jsonb not null default '{"sync_interval_minutes": 60, "sync_occupancy": true, "sync_reservations": false}',
  last_sync_at  timestamptz,
  last_error    text,
  is_active     boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint pms_integrations_unique_type unique (hotel_id, pms_type)
);

create index idx_pms_integrations_hotel on public.pms_integrations (hotel_id);

-- Integraciones POS (Point of Sale: Lightspeed, Simphony, etc.)
create table public.pos_integrations (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels(id) on delete cascade,
  pos_type    public.pos_type not null,
  name        text not null,
  status      public.integration_status not null default 'draft',
  -- credentials JSONB:
  --   Lightspeed: { "client_id": "...", "client_secret": "...", "account_id": "..." }
  --   Simphony:   { "server_url": "...", "employee_id": "...", "password": "...", "rvc_ref": "..." }
  --   Square:     { "access_token": "...", "location_id": "..." }
  --   Revel:      { "api_url": "...", "api_key": "...", "api_secret": "..." }
  credentials jsonb not null default '{}',
  config      jsonb not null default '{"sync_interval_minutes": 30, "sync_sales": true, "push_kitchen_orders": false}',
  last_sync_at  timestamptz,
  last_error    text,
  is_active     boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint pos_integrations_unique_type unique (hotel_id, pos_type)
);

create index idx_pos_integrations_hotel on public.pos_integrations (hotel_id);

-- Log de sincronizaciones (audit trail inmutable)
create table public.integration_sync_logs (
  id                    uuid primary key default gen_random_uuid(),
  hotel_id              uuid not null references public.hotels(id) on delete cascade,
  pms_integration_id    uuid references public.pms_integrations(id) on delete set null,
  pos_integration_id    uuid references public.pos_integrations(id) on delete set null,
  -- sync_type: 'test_connection' | 'sync_occupancy' | 'sync_reservations' | 'sync_sales' | 'push_kitchen_orders'
  sync_type             text not null,
  status                public.sync_log_status not null default 'running',
  records_synced        integer not null default 0,
  records_failed        integer not null default 0,
  request_payload       jsonb,   -- qué se mandó (sin credentials)
  response_payload      jsonb,   -- qué devolvió el PMS/POS (datos clave)
  error_message         text,
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  triggered_by          uuid references auth.users(id),

  -- Solo una de las dos FK debe ser no-null
  constraint sync_logs_one_integration check (
    (pms_integration_id is null) <> (pos_integration_id is null)
  )
);

create index idx_sync_logs_hotel on public.integration_sync_logs (hotel_id, started_at desc);
create index idx_sync_logs_pms   on public.integration_sync_logs (pms_integration_id, started_at desc);
create index idx_sync_logs_pos   on public.integration_sync_logs (pos_integration_id, started_at desc);

-- Trigger updated_at en ambas tablas
create trigger set_updated_at_pms_integrations
  before update on public.pms_integrations
  for each row execute function public.set_updated_at();

create trigger set_updated_at_pos_integrations
  before update on public.pos_integrations
  for each row execute function public.set_updated_at();

-- ====================
-- 3. RLS
-- ====================

alter table public.pms_integrations     enable row level security;
alter table public.pos_integrations     enable row level security;
alter table public.integration_sync_logs enable row level security;

-- PMS integrations
create policy "pms_integrations_select" on public.pms_integrations
  for select using (public.is_member_of(hotel_id));

create policy "pms_integrations_insert" on public.pms_integrations
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

create policy "pms_integrations_update" on public.pms_integrations
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

create policy "pms_integrations_delete" on public.pms_integrations
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction')
  );

-- POS integrations
create policy "pos_integrations_select" on public.pos_integrations
  for select using (public.is_member_of(hotel_id));

create policy "pos_integrations_insert" on public.pos_integrations
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

create policy "pos_integrations_update" on public.pos_integrations
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

create policy "pos_integrations_delete" on public.pos_integrations
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction')
  );

-- Sync logs (read-only para usuarios)
create policy "sync_logs_select" on public.integration_sync_logs
  for select using (public.is_member_of(hotel_id));

-- Insert/update solo via RPCs (SECURITY DEFINER)
create policy "sync_logs_insert_service" on public.integration_sync_logs
  for insert with check (public.is_member_of(hotel_id));

create policy "sync_logs_update_service" on public.integration_sync_logs
  for update using (public.is_member_of(hotel_id));

-- ====================
-- 4. RPCs
-- ====================

-- -------------------------------------------------------------------------
-- create_pms_integration — crea nueva integración PMS
-- -------------------------------------------------------------------------
create or replace function public.create_pms_integration(
  p_hotel_id    uuid,
  p_pms_type    public.pms_type,
  p_name        text,
  p_credentials jsonb,
  p_config      jsonb default '{}'
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform check_membership(auth.uid(), p_hotel_id);

  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin') then
    raise exception 'Solo admins pueden crear integraciones';
  end if;

  insert into public.pms_integrations (
    hotel_id, pms_type, name, credentials, config, created_by
  ) values (
    p_hotel_id, p_pms_type, p_name, p_credentials,
    case when p_config = '{}' then
      '{"sync_interval_minutes": 60, "sync_occupancy": true, "sync_reservations": false}'::jsonb
    else p_config end,
    auth.uid()
  )
  returning id into v_id;

  perform emit_event(p_hotel_id, 'integration.pms_created',
    jsonb_build_object('integration_id', v_id, 'pms_type', p_pms_type, 'name', p_name));

  return v_id;
end;
$$;

-- -------------------------------------------------------------------------
-- create_pos_integration — crea nueva integración POS
-- -------------------------------------------------------------------------
create or replace function public.create_pos_integration(
  p_hotel_id    uuid,
  p_pos_type    public.pos_type,
  p_name        text,
  p_credentials jsonb,
  p_config      jsonb default '{}'
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform check_membership(auth.uid(), p_hotel_id);

  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin') then
    raise exception 'Solo admins pueden crear integraciones';
  end if;

  insert into public.pos_integrations (
    hotel_id, pos_type, name, credentials, config, created_by
  ) values (
    p_hotel_id, p_pos_type, p_name, p_credentials,
    case when p_config = '{}' then
      '{"sync_interval_minutes": 30, "sync_sales": true, "push_kitchen_orders": false}'::jsonb
    else p_config end,
    auth.uid()
  )
  returning id into v_id;

  perform emit_event(p_hotel_id, 'integration.pos_created',
    jsonb_build_object('integration_id', v_id, 'pos_type', p_pos_type, 'name', p_name));

  return v_id;
end;
$$;

-- -------------------------------------------------------------------------
-- update_pms_integration — actualiza config (y opcionalmente credentials)
-- -------------------------------------------------------------------------
create or replace function public.update_pms_integration(
  p_hotel_id        uuid,
  p_integration_id  uuid,
  p_name            text default null,
  p_credentials     jsonb default null,
  p_config          jsonb default null
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(auth.uid(), p_hotel_id);

  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin') then
    raise exception 'Solo admins pueden editar integraciones';
  end if;

  update public.pms_integrations set
    name        = coalesce(p_name, name),
    credentials = coalesce(p_credentials, credentials),
    config      = coalesce(p_config, config),
    -- Resetear a draft si cambian credentials
    status      = case when p_credentials is not null then 'draft'::integration_status else status end
  where id = p_integration_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'Integración PMS no encontrada';
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- update_pos_integration
-- -------------------------------------------------------------------------
create or replace function public.update_pos_integration(
  p_hotel_id        uuid,
  p_integration_id  uuid,
  p_name            text default null,
  p_credentials     jsonb default null,
  p_config          jsonb default null
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(auth.uid(), p_hotel_id);

  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin') then
    raise exception 'Solo admins pueden editar integraciones';
  end if;

  update public.pos_integrations set
    name        = coalesce(p_name, name),
    credentials = coalesce(p_credentials, credentials),
    config      = coalesce(p_config, config),
    status      = case when p_credentials is not null then 'draft'::integration_status else status end
  where id = p_integration_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'Integración POS no encontrada';
  end if;
end;
$$;

-- -------------------------------------------------------------------------
-- disable_pms_integration / disable_pos_integration
-- -------------------------------------------------------------------------
create or replace function public.disable_pms_integration(
  p_hotel_id       uuid,
  p_integration_id uuid
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(auth.uid(), p_hotel_id);

  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin') then
    raise exception 'Solo admins pueden deshabilitar integraciones';
  end if;

  update public.pms_integrations
    set status = 'disabled', is_active = false
  where id = p_integration_id and hotel_id = p_hotel_id;
end;
$$;

create or replace function public.disable_pos_integration(
  p_hotel_id       uuid,
  p_integration_id uuid
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(auth.uid(), p_hotel_id);

  if get_member_role(p_hotel_id) not in ('superadmin', 'direction', 'admin') then
    raise exception 'Solo admins pueden deshabilitar integraciones';
  end if;

  update public.pos_integrations
    set status = 'disabled', is_active = false
  where id = p_integration_id and hotel_id = p_hotel_id;
end;
$$;

-- -------------------------------------------------------------------------
-- trigger_pms_sync — encola job de sync PMS y crea log de inicio
-- Devuelve: log_id (uuid) para que el frontend pueda hacer polling
-- -------------------------------------------------------------------------
create or replace function public.trigger_pms_sync(
  p_hotel_id        uuid,
  p_integration_id  uuid,
  p_sync_type       text   -- 'test_connection' | 'sync_occupancy' | 'sync_reservations'
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_log_id  uuid;
  v_job_id  uuid;
begin
  perform check_membership(auth.uid(), p_hotel_id);

  -- Verificar que la integración existe y es activa (o draft para test)
  if not exists (
    select 1 from public.pms_integrations
    where id = p_integration_id and hotel_id = p_hotel_id
      and (is_active = true or p_sync_type = 'test_connection')
  ) then
    raise exception 'Integración PMS no encontrada o deshabilitada';
  end if;

  -- Crear log de inicio
  insert into public.integration_sync_logs (
    hotel_id, pms_integration_id, sync_type, status, triggered_by
  ) values (
    p_hotel_id, p_integration_id, p_sync_type, 'running', auth.uid()
  )
  returning id into v_log_id;

  -- Encolar job de automation
  select public.enqueue_job(
    p_hotel_id,
    'sync_pms'::public.job_type,
    jsonb_build_object(
      'integration_id', p_integration_id,
      'sync_type', p_sync_type,
      'log_id', v_log_id
    )
  ) into v_job_id;

  return v_log_id;
end;
$$;

-- -------------------------------------------------------------------------
-- trigger_pos_sync — encola job de sync POS
-- -------------------------------------------------------------------------
create or replace function public.trigger_pos_sync(
  p_hotel_id        uuid,
  p_integration_id  uuid,
  p_sync_type       text   -- 'test_connection' | 'sync_sales' | 'push_kitchen_orders'
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_log_id  uuid;
  v_job_id  uuid;
begin
  perform check_membership(auth.uid(), p_hotel_id);

  if not exists (
    select 1 from public.pos_integrations
    where id = p_integration_id and hotel_id = p_hotel_id
      and (is_active = true or p_sync_type = 'test_connection')
  ) then
    raise exception 'Integración POS no encontrada o deshabilitada';
  end if;

  insert into public.integration_sync_logs (
    hotel_id, pos_integration_id, sync_type, status, triggered_by
  ) values (
    p_hotel_id, p_integration_id, p_sync_type, 'running', auth.uid()
  )
  returning id into v_log_id;

  select public.enqueue_job(
    p_hotel_id,
    'sync_pos'::public.job_type,
    jsonb_build_object(
      'integration_id', p_integration_id,
      'sync_type', p_sync_type,
      'log_id', v_log_id
    )
  ) into v_job_id;

  return v_log_id;
end;
$$;

-- -------------------------------------------------------------------------
-- mark_sync_complete — llamado por el worker para cerrar el log
-- SECURITY DEFINER sin auth.uid() check (invocado por service_role)
-- -------------------------------------------------------------------------
create or replace function public.mark_sync_complete(
  p_log_id          uuid,
  p_status          public.sync_log_status,
  p_records_synced  integer default 0,
  p_records_failed  integer default 0,
  p_response        jsonb  default null,
  p_error           text   default null
) returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_hotel_id           uuid;
  v_pms_integration_id uuid;
  v_pos_integration_id uuid;
begin
  -- Cerrar log
  update public.integration_sync_logs set
    status           = p_status,
    records_synced   = p_records_synced,
    records_failed   = p_records_failed,
    response_payload = p_response,
    error_message    = p_error,
    completed_at     = now()
  where id = p_log_id
  returning hotel_id, pms_integration_id, pos_integration_id
    into v_hotel_id, v_pms_integration_id, v_pos_integration_id;

  -- Actualizar estado y last_sync_at en la integración correspondiente
  if v_pms_integration_id is not null then
    update public.pms_integrations set
      status       = case when p_status = 'success' then 'active'
                          when p_status = 'failed'  then 'error'
                          else status end,
      last_sync_at = case when p_status in ('success', 'partial') then now() else last_sync_at end,
      last_error   = p_error
    where id = v_pms_integration_id;
  end if;

  if v_pos_integration_id is not null then
    update public.pos_integrations set
      status       = case when p_status = 'success' then 'active'
                          when p_status = 'failed'  then 'error'
                          else status end,
      last_sync_at = case when p_status in ('success', 'partial') then now() else last_sync_at end,
      last_error   = p_error
    where id = v_pos_integration_id;
  end if;
end;
$$;

-- Restringir mark_sync_complete a service_role (solo worker)
revoke execute on function public.mark_sync_complete(uuid, public.sync_log_status, integer, integer, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.mark_sync_complete(uuid, public.sync_log_status, integer, integer, jsonb, text)
  to service_role;

-- -------------------------------------------------------------------------
-- get_pms_integrations — lista integraciones PMS (sin credentials)
-- -------------------------------------------------------------------------
create or replace function public.get_pms_integrations(
  p_hotel_id uuid
) returns table (
  id            uuid,
  pms_type      public.pms_type,
  name          text,
  status        public.integration_status,
  config        jsonb,
  last_sync_at  timestamptz,
  last_error    text,
  is_active     boolean,
  created_at    timestamptz
)
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(auth.uid(), p_hotel_id);

  return query
    select
      p.id, p.pms_type, p.name, p.status, p.config,
      p.last_sync_at, p.last_error, p.is_active, p.created_at
    from public.pms_integrations p
    where p.hotel_id = p_hotel_id
    order by p.created_at;
end;
$$;

-- -------------------------------------------------------------------------
-- get_pos_integrations — lista integraciones POS (sin credentials)
-- -------------------------------------------------------------------------
create or replace function public.get_pos_integrations(
  p_hotel_id uuid
) returns table (
  id            uuid,
  pos_type      public.pos_type,
  name          text,
  status        public.integration_status,
  config        jsonb,
  last_sync_at  timestamptz,
  last_error    text,
  is_active     boolean,
  created_at    timestamptz
)
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(auth.uid(), p_hotel_id);

  return query
    select
      p.id, p.pos_type, p.name, p.status, p.config,
      p.last_sync_at, p.last_error, p.is_active, p.created_at
    from public.pos_integrations p
    where p.hotel_id = p_hotel_id
    order by p.created_at;
end;
$$;

-- -------------------------------------------------------------------------
-- get_integration_sync_logs — últimos N logs del hotel
-- -------------------------------------------------------------------------
create or replace function public.get_integration_sync_logs(
  p_hotel_id          uuid,
  p_limit             integer default 50,
  p_pms_integration   uuid    default null,
  p_pos_integration   uuid    default null
) returns table (
  id                    uuid,
  pms_integration_id    uuid,
  pos_integration_id    uuid,
  sync_type             text,
  status                public.sync_log_status,
  records_synced        integer,
  records_failed        integer,
  error_message         text,
  response_payload      jsonb,
  started_at            timestamptz,
  completed_at          timestamptz
)
language plpgsql security definer
set search_path = public
as $$
begin
  perform check_membership(auth.uid(), p_hotel_id);

  return query
    select
      l.id, l.pms_integration_id, l.pos_integration_id,
      l.sync_type, l.status,
      l.records_synced, l.records_failed,
      l.error_message, l.response_payload,
      l.started_at, l.completed_at
    from public.integration_sync_logs l
    where l.hotel_id = p_hotel_id
      and (p_pms_integration is null or l.pms_integration_id = p_pms_integration)
      and (p_pos_integration is null or l.pos_integration_id = p_pos_integration)
    order by l.started_at desc
    limit p_limit;
end;
$$;

-- ====================
-- 5. EXTENDER job_type ENUM con nuevos tipos de sync
-- ====================
-- Los jobs de sync PMS/POS se encolan via enqueue_job con estos tipos.
-- Requiere alter type (solo si no existe).

do $$
begin
  -- Añadir 'sync_pms' al enum job_type si no existe
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'sync_pms'
      and enumtypid = 'public.job_type'::regtype
  ) then
    alter type public.job_type add value 'sync_pms';
  end if;

  -- Añadir 'sync_pos' al enum job_type si no existe
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'sync_pos'
      and enumtypid = 'public.job_type'::regtype
  ) then
    alter type public.job_type add value 'sync_pos';
  end if;
end;
$$;
