-- ============================================================================
-- 00029 — Defense in depth: validar sync_type (whitelist) y config activa
-- ============================================================================
-- Codex audit round 2 (2026-04-15) — findings adicionales sobre 00028:
--
-- 1. trigger_pms_sync / trigger_pos_sync aceptan cualquier text en p_sync_type.
--    Un caller válido pero malintencionado podría pasar valores inesperados
--    que el worker traduciría a operaciones no previstas.
--    Fix: whitelist estricta por tipo (PMS vs POS).
--
-- 2. trigger_pos_sync con sync_type='push_kitchen_orders' requiere que la
--    integración tenga config.push_kitchen_orders = true. Si el admin no lo
--    habilitó, la RPC debe rechazar aunque el rol sea válido (defense in
--    depth: el control no puede depender solo del checkbox de la UI).
--    Mismo check para sync_reservations en PMS y sync_sales en POS cuando
--    config lo marca como false.
-- ============================================================================

create or replace function public.trigger_pms_sync(
  p_hotel_id        uuid,
  p_integration_id  uuid,
  p_sync_type       text
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_log_id     uuid;
  v_job_id     uuid;
  v_config     jsonb;
  v_is_active  boolean;
begin
  perform public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin']::public.app_role[]);

  -- Whitelist de sync_type (rechaza texto arbitrario)
  if p_sync_type not in ('test_connection', 'sync_occupancy', 'sync_reservations') then
    raise exception 'sync_type PMS no permitido: %', p_sync_type
      using errcode = 'P0003';
  end if;

  -- Verificar integración + leer config + is_active atómicamente
  select config, is_active into v_config, v_is_active
  from public.pms_integrations
  where id = p_integration_id and hotel_id = p_hotel_id;

  if v_config is null then
    raise exception 'Integración PMS no encontrada';
  end if;

  -- Solo test_connection permitido en draft (integración no activada aún)
  if v_is_active is not true and p_sync_type <> 'test_connection' then
    raise exception 'Integración PMS deshabilitada: solo test_connection permitido';
  end if;

  -- Defense in depth: config debe habilitar el sync_type solicitado
  -- (test_connection siempre permitido; los demás requieren flag en config)
  if p_sync_type = 'sync_occupancy' and coalesce((v_config->>'sync_occupancy')::boolean, false) is not true then
    raise exception 'sync_occupancy deshabilitado en config de la integración';
  end if;
  if p_sync_type = 'sync_reservations' and coalesce((v_config->>'sync_reservations')::boolean, false) is not true then
    raise exception 'sync_reservations deshabilitado en config de la integración';
  end if;

  insert into public.integration_sync_logs (
    hotel_id, pms_integration_id, sync_type, status, triggered_by
  ) values (
    p_hotel_id, p_integration_id, p_sync_type, 'running', auth.uid()
  )
  returning id into v_log_id;

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

create or replace function public.trigger_pos_sync(
  p_hotel_id        uuid,
  p_integration_id  uuid,
  p_sync_type       text
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_log_id          uuid;
  v_job_id          uuid;
  v_config          jsonb;
  v_is_active       boolean;
  v_required_roles  public.app_role[];
begin
  -- Whitelist de sync_type (rechaza texto arbitrario antes de cualquier trabajo)
  if p_sync_type not in ('test_connection', 'sync_sales', 'push_kitchen_orders') then
    raise exception 'sync_type POS no permitido: %', p_sync_type
      using errcode = 'P0003';
  end if;

  -- push_kitchen_orders (escritura en POS externo) requiere rol más estricto
  if p_sync_type = 'push_kitchen_orders' then
    v_required_roles := array['superadmin','direction']::public.app_role[];
  else
    v_required_roles := array['superadmin','direction','admin']::public.app_role[];
  end if;
  perform public.check_membership(auth.uid(), p_hotel_id, v_required_roles);

  -- Verificar integración + leer config + is_active atómicamente
  select config, is_active into v_config, v_is_active
  from public.pos_integrations
  where id = p_integration_id and hotel_id = p_hotel_id;

  if v_config is null then
    raise exception 'Integración POS no encontrada';
  end if;

  if v_is_active is not true and p_sync_type <> 'test_connection' then
    raise exception 'Integración POS deshabilitada: solo test_connection permitido';
  end if;

  -- Defense in depth: config debe habilitar el sync_type solicitado
  if p_sync_type = 'sync_sales' and coalesce((v_config->>'sync_sales')::boolean, false) is not true then
    raise exception 'sync_sales deshabilitado en config de la integración';
  end if;
  if p_sync_type = 'push_kitchen_orders' and coalesce((v_config->>'push_kitchen_orders')::boolean, false) is not true then
    raise exception 'push_kitchen_orders deshabilitado en config de la integración';
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
