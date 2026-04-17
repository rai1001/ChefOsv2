-- ============================================================================
-- domain_events — dedup window para emit_event
--
-- Problema: si un trigger se dispara 2 veces por un row (p.ej. UPDATE que
-- encadena otro UPDATE en cascada), emit_event creaba 2 eventos idénticos.
-- Los consumidores reaccionaban 2 veces → notificaciones duplicadas,
-- jobs automáticos lanzados 2x, etc.
--
-- Solución: ventana de dedup por (hotel_id, aggregate_type, aggregate_id,
-- event_type). Si ya existe un evento idéntico en los últimos N segundos
-- (default 5s), devolver ese id sin insertar.
--
-- Trade-off: eventos legítimamente repetidos dentro de 5s (improbable en
-- la práctica) serían dedup. Si un caller necesita emit dobles cercanos,
-- pasar p_dedup_window_seconds = 0 para desactivar.
-- ============================================================================

-- Index para que el SELECT de dedup sea barato
create index if not exists idx_domain_events_dedup
  on public.domain_events (hotel_id, aggregate_type, aggregate_id, event_type, created_at desc);

-- Drop primero porque añadimos un nuevo param (cambio de signature)
drop function if exists public.emit_event(uuid, text, uuid, text, jsonb);

create or replace function public.emit_event(
  p_hotel_id uuid,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_dedup_window_seconds int default 5
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  -- Dedup: si ya existe un evento idéntico en la ventana, devolver ese id
  if p_dedup_window_seconds > 0 then
    select id into v_event_id
    from public.domain_events
    where hotel_id = p_hotel_id
      and aggregate_type = p_aggregate_type
      and aggregate_id = p_aggregate_id
      and event_type = p_event_type
      and created_at > now() - (p_dedup_window_seconds || ' seconds')::interval
    order by created_at desc
    limit 1;

    if v_event_id is not null then
      return v_event_id;
    end if;
  end if;

  insert into public.domain_events
    (hotel_id, aggregate_type, aggregate_id, event_type, payload)
  values
    (p_hotel_id, p_aggregate_type, p_aggregate_id, p_event_type, p_payload)
  returning id into v_event_id;

  return v_event_id;
end;
$$;

comment on function public.emit_event(uuid, text, uuid, text, jsonb, int) is
  'Publica un domain event. Dedup window 5s por (hotel, agg_type, agg_id, event_type). 0 desactiva dedup.';

-- Llamadas existentes siguen funcionando: p_dedup_window_seconds tiene default.
-- Los grants previos a public.emit_event se restablecen (service_role + authenticated ejecutan).
grant execute on function public.emit_event(uuid, text, uuid, text, jsonb, int)
  to authenticated, service_role;
