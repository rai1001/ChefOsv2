-- ============================================================================
-- 00028 — Security Hardening (Codex audit findings, 2026-04-15)
-- ============================================================================
-- CRITICAL: credentials de integraciones PMS/POS expuestos vía SELECT raw
--           (cualquier miembro del hotel podía leer api_tokens, client_secrets,
--            passwords directamente por PostgREST con la anon key)
--
-- HIGH #2:  trigger_pms_sync / trigger_pos_sync / get_integration_sync_logs
--           solo comprobaban membership — cualquier rol podía lanzar syncs
--           y leer response_payload/error_message operativos
--
-- BONUS:    SECURITY DEFINER de M15 agents sin SET search_path (hijacking);
--           RPCs service-only (run_*_agent, _create_agent_suggestion) con
--           EXECUTE concedido a authenticated (debería ser solo service_role)
--
-- NOTA:     HIGH #1 (notification-dispatcher sin auth) se arregla en la edge
--           function, no en SQL. Commit separado.
-- ============================================================================

-- ===========================================================================
-- FASE 1: CRITICAL — restringir SELECT sobre tablas con credentials
-- ===========================================================================
-- Las policies anteriores permitían SELECT a cualquier miembro del hotel, lo
-- que exponía credentials jsonb a través de PostgREST.
-- Fix: SELECT solo para admin+. Los miembros operativos leen metadata a
-- través de las RPCs get_pms_integrations/get_pos_integrations, que son
-- SECURITY DEFINER y NO devuelven la columna credentials.
-- ---------------------------------------------------------------------------

drop policy if exists "pms_integrations_select" on public.pms_integrations;
drop policy if exists "pos_integrations_select" on public.pos_integrations;

create policy "pms_integrations_select_admin" on public.pms_integrations
  for select using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

create policy "pos_integrations_select_admin" on public.pos_integrations
  for select using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

-- ===========================================================================
-- FASE 2: HIGH #2 — sync RPCs requieren rol admin+
-- ===========================================================================

create or replace function public.trigger_pms_sync(
  p_hotel_id        uuid,
  p_integration_id  uuid,
  p_sync_type       text
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_log_id  uuid;
  v_job_id  uuid;
begin
  perform public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin']::public.app_role[]);

  if not exists (
    select 1 from public.pms_integrations
    where id = p_integration_id and hotel_id = p_hotel_id
      and (is_active = true or p_sync_type = 'test_connection')
  ) then
    raise exception 'Integración PMS no encontrada o deshabilitada';
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
  v_required_roles  public.app_role[];
begin
  -- push_kitchen_orders afecta el POS externo (escritura) → rol más estricto
  if p_sync_type = 'push_kitchen_orders' then
    v_required_roles := array['superadmin','direction']::public.app_role[];
  else
    v_required_roles := array['superadmin','direction','admin']::public.app_role[];
  end if;

  perform public.check_membership(auth.uid(), p_hotel_id, v_required_roles);

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

-- get_integration_sync_logs: solo admin+ puede leer logs con payloads sensibles
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
  perform public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin']::public.app_role[]);

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

-- ===========================================================================
-- FASE 4: BONUS — search_path en SECURITY DEFINER de M15 + REVOKE EXECUTE
-- ===========================================================================
-- Codex: SECURITY DEFINER sin SET search_path = public permite hijacking si
-- un atacante puede crear schemas/funciones (no el caso típico en Supabase
-- pero mejor práctica). Normalizamos.
-- ---------------------------------------------------------------------------

alter function public._create_agent_suggestion(
  uuid, public.agent_type, text, text, public.suggestion_action,
  jsonb, jsonb, text, uuid, integer
) set search_path = public;

alter function public.run_price_watcher_agent(uuid)       set search_path = public;
alter function public.run_waste_analyzer_agent(uuid)      set search_path = public;
alter function public.run_stock_optimizer_agent(uuid)     set search_path = public;
alter function public.run_recipe_cost_alert_agent(uuid)   set search_path = public;
alter function public.run_compliance_reminder_agent(uuid) set search_path = public;
alter function public.run_event_planner_agent(uuid, uuid) set search_path = public;
alter function public.run_shopping_optimizer_agent(uuid)  set search_path = public;
alter function public.run_kds_coordinator_agent(uuid, uuid) set search_path = public;
alter function public.run_post_event_agent(uuid, uuid)    set search_path = public;
alter function public.run_forecast_prep_agent(uuid)       set search_path = public;
alter function public.get_agent_suggestions(uuid, public.suggestion_status, integer) set search_path = public;
alter function public.approve_suggestion(uuid, uuid)      set search_path = public;
alter function public.reject_suggestion(uuid, uuid, text) set search_path = public;
alter function public.get_agent_configs(uuid)             set search_path = public;
alter function public.upsert_agent_config(uuid, public.agent_type, boolean, jsonb) set search_path = public;
alter function public.run_all_automejora_agents(uuid)     set search_path = public;

-- REVOKE EXECUTE sobre RPCs internas/service-only (solo el worker las llama)
-- Patrón idéntico a 00024_security_fixes.sql (claim_next_job, complete_job, etc.)

revoke execute on function public._create_agent_suggestion(
  uuid, public.agent_type, text, text, public.suggestion_action,
  jsonb, jsonb, text, uuid, integer
) from public, anon, authenticated;
grant execute on function public._create_agent_suggestion(
  uuid, public.agent_type, text, text, public.suggestion_action,
  jsonb, jsonb, text, uuid, integer
) to service_role;

revoke execute on function public.run_price_watcher_agent(uuid)       from public, anon, authenticated;
grant  execute on function public.run_price_watcher_agent(uuid)       to service_role;

revoke execute on function public.run_waste_analyzer_agent(uuid)      from public, anon, authenticated;
grant  execute on function public.run_waste_analyzer_agent(uuid)      to service_role;

revoke execute on function public.run_stock_optimizer_agent(uuid)     from public, anon, authenticated;
grant  execute on function public.run_stock_optimizer_agent(uuid)     to service_role;

revoke execute on function public.run_recipe_cost_alert_agent(uuid)   from public, anon, authenticated;
grant  execute on function public.run_recipe_cost_alert_agent(uuid)   to service_role;

revoke execute on function public.run_compliance_reminder_agent(uuid) from public, anon, authenticated;
grant  execute on function public.run_compliance_reminder_agent(uuid) to service_role;

revoke execute on function public.run_event_planner_agent(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.run_event_planner_agent(uuid, uuid) to service_role;

revoke execute on function public.run_shopping_optimizer_agent(uuid)  from public, anon, authenticated;
grant  execute on function public.run_shopping_optimizer_agent(uuid)  to service_role;

revoke execute on function public.run_kds_coordinator_agent(uuid, uuid) from public, anon, authenticated;
grant  execute on function public.run_kds_coordinator_agent(uuid, uuid) to service_role;

revoke execute on function public.run_post_event_agent(uuid, uuid)    from public, anon, authenticated;
grant  execute on function public.run_post_event_agent(uuid, uuid)    to service_role;

revoke execute on function public.run_forecast_prep_agent(uuid)       from public, anon, authenticated;
grant  execute on function public.run_forecast_prep_agent(uuid)       to service_role;

revoke execute on function public.run_all_automejora_agents(uuid)     from public, anon, authenticated;
grant  execute on function public.run_all_automejora_agents(uuid)     to service_role;
