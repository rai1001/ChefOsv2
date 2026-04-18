-- ============================================================================
-- Fix: create_event y update_event aceptan client_id arbitrario sin validar
-- que el cliente pertenece al mismo hotel que el evento.
--
-- Al ser SECURITY DEFINER, get_events_calendar hace LEFT JOIN clients por id
-- sin RLS, por lo que un client_id de otro tenant devolvía el nombre de ese
-- cliente al llamante (cross-tenant client name disclosure).
--
-- Fix: validar hotel_id del cliente antes de asignarlo al evento.
-- ============================================================================

-- ─── create_event ────────────────────────────────────────────────────────────

create or replace function public.create_event(
  p_hotel_id    uuid,
  p_name        text,
  p_event_type  public.event_type,
  p_service_type public.service_type,
  p_event_date  date,
  p_guest_count integer,
  p_client_id   uuid default null,
  p_start_time  time default null,
  p_end_time    time default null,
  p_venue       text default null,
  p_notes       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role       public.app_role;
  v_event_id   uuid;
  v_beo_number text;
begin
  v_role := public.check_membership(
    auth.uid(), p_hotel_id,
    array['superadmin', 'direction', 'admin', 'commercial']::public.app_role[]
  );

  -- Validate client belongs to same hotel (cross-tenant data leak prevention)
  if p_client_id is not null then
    if not exists (
      select 1 from public.clients
      where id = p_client_id and hotel_id = p_hotel_id
    ) then
      raise exception 'client does not belong to this hotel'
        using errcode = 'P0020';
    end if;
  end if;

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

-- ─── update_event ─────────────────────────────────────────────────────────────

create or replace function public.update_event(
  p_hotel_id      uuid,
  p_event_id      uuid,
  p_data          jsonb,
  p_change_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role           public.app_role;
  v_current_status public.event_status;
  v_version        integer;
  v_new_client_id  uuid;
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
    raise exception 'cannot update event in status %', v_current_status
      using errcode = 'P0011';
  end if;

  -- Validate new client_id belongs to same hotel (cross-tenant scope check)
  if p_data ? 'client_id' and p_data ->> 'client_id' is not null then
    v_new_client_id := (p_data ->> 'client_id')::uuid;
    if not exists (
      select 1 from public.clients
      where id = v_new_client_id and hotel_id = p_hotel_id
    ) then
      raise exception 'client does not belong to this hotel'
        using errcode = 'P0020';
    end if;
  end if;

  -- Update allowed fields
  update public.events set
    name         = coalesce(p_data ->> 'name', name),
    event_type   = coalesce((p_data ->> 'event_type')::public.event_type, event_type),
    service_type = coalesce((p_data ->> 'service_type')::public.service_type, service_type),
    event_date   = coalesce((p_data ->> 'event_date')::date, event_date),
    start_time   = coalesce((p_data ->> 'start_time')::time, start_time),
    end_time     = coalesce((p_data ->> 'end_time')::time, end_time),
    guest_count  = coalesce((p_data ->> 'guest_count')::integer, guest_count),
    venue        = coalesce(p_data ->> 'venue', venue),
    notes        = coalesce(p_data ->> 'notes', notes),
    client_id    = case
                     when p_data ? 'client_id'
                     then (p_data ->> 'client_id')::uuid
                     else client_id
                   end,
    updated_at   = now()
  where id = p_event_id and hotel_id = p_hotel_id;

  -- Version snapshot
  select coalesce(max(version_number), 0) + 1 into v_version
  from public.event_versions where event_id = p_event_id;

  insert into public.event_versions (event_id, hotel_id, version_number, data, changed_by, change_reason)
  select p_event_id, p_hotel_id, v_version, to_jsonb(e), auth.uid(), p_change_reason
  from public.events e where e.id = p_event_id;
end;
$$;
