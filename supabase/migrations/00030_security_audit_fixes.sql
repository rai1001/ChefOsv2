-- ============================================================================
-- 00030 Security Audit Fixes — ChefOS v2
-- Hallazgos confirmados de auditorías Antigraviti + Codex (2026-04-15)
-- ============================================================================
-- Fix 1  (Antigraviti #1 — CRÍTICO) : IDOR en create_hotel
-- Fix 2  (Antigraviti #2 — CRÍTICO) : HR check_membership firma incorrecta
-- Fix 3  (Codex #1      — ALTA)    : enqueue_job expone jobs service-only
-- Fix 4  (Codex #2      — ALTA)    : events state-machine bypass por UPDATE directo
-- Fix 5  (Codex #3      — ALTA)    : recipes workflow bypass por UPDATE directo
-- Fix 6  (Codex #4      — ALTA)    : agent_suggestions mutables antes de revisión
-- Fix 7  (Codex #4b+5   — ALTA/M)  : approve_suggestion enqueue whitelist + contrato sync_recipe_costs
-- ============================================================================

-- ==============================================================================
-- FIX 1: IDOR en create_hotel
-- Problema: cualquier usuario autenticado podía pasar un tenant_id ajeno y
--   auto-otorgarse rol admin en un hotel del competidor.
-- Solución: verificar que el caller ya tiene rol direction/superadmin en ese
--   tenant. Cuando se llama desde create_tenant_with_hotel (SECURITY DEFINER,
--   current_user != 'authenticated'), se omite el check (el tenant acaba de
--   crearse y el usuario aún no tiene membresía).
-- ==============================================================================
create or replace function public.create_hotel(
  p_tenant_id uuid,
  p_name      text,
  p_slug      text,
  p_timezone  text default 'Europe/Madrid',
  p_currency  text default 'EUR'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
  v_user_id  uuid := auth.uid();
begin
  -- SECURITY: Solo verificar cuando el caller es un usuario autenticado directo.
  -- Cuando se llama desde create_tenant_with_hotel (SECURITY DEFINER, owner ≠ 'authenticated')
  -- current_user NO es 'authenticated', así que el bloque se omite.
  if current_user = 'authenticated' then
    if not exists (
      select 1 from public.memberships
      where user_id   = v_user_id
        and tenant_id = p_tenant_id
        and role      in ('superadmin', 'direction')
        and is_active = true
    ) then
      raise exception 'No tienes permiso para crear hoteles en este tenant'
        using errcode = 'P0001';
    end if;
  end if;

  insert into public.hotels (tenant_id, name, slug, timezone, currency)
  values (p_tenant_id, p_name, p_slug, p_timezone, p_currency)
  returning id into v_hotel_id;

  insert into public.memberships (user_id, hotel_id, tenant_id, role, is_default)
  values (v_user_id, v_hotel_id, p_tenant_id, 'admin', true);

  perform public.emit_event(
    v_hotel_id, 'hotel', v_hotel_id, 'hotel.created',
    jsonb_build_object('name', p_name, 'created_by', v_user_id)
  );

  return v_hotel_id;
end;
$$;

-- ==============================================================================
-- FIX 2: Sobrecarga check_membership(uuid) para retrocompatibilidad con M13 HR
-- Problema: 00026_m13_hr.sql llama check_membership(p_hotel_id) con 1 argumento,
--   pero la función canónica requiere mínimo 2. Todos los RPCs de HR fallan en
--   tiempo de ejecución con "function public.check_membership(uuid) does not exist".
-- Solución: añadir una sobrecarga de 1 argumento que delega al canónico.
--   Al ser llamada desde funciones SECURITY DEFINER (que corren como el owner),
--   no necesita grant explícito a 'authenticated'.
-- ==============================================================================
create or replace function public.check_membership(p_hotel_id uuid)
returns public.app_role
language sql
security definer
set search_path = public
as $$
  select public.check_membership(auth.uid(), p_hotel_id, null);
$$;

-- ==============================================================================
-- FIX 3: enqueue_job — bloquear job types service-only
-- Problema: cualquier miembro (sous_chef, operations…) podía encolar sync_pms,
--   sync_pos o run_agent aunque las RPCs trigger_* ya exigen admin+.
--   El worker los ejecutaba con service_role saltándose esa barrera.
-- Solución: whitelist negativa en enqueue_job. Los tipos privilegiados solo
--   pueden encolarse desde trigger_pms_sync / trigger_pos_sync / run_*_agent
--   (que son service-only o exigen admin+).
-- ==============================================================================
create or replace function public.enqueue_job(
  p_hotel_id    uuid,
  p_job_type    public.job_type,
  p_payload     jsonb default '{}',
  p_scheduled_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role   public.app_role;
  v_job_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','operations']::public.app_role[]);

  -- SECURITY: bloquear job types que solo deben encolarse mediante RPCs privilegiadas
  if p_job_type in ('sync_pms', 'sync_pos', 'run_agent') then
    raise exception
      'El tipo de job "%" debe encolarse mediante su RPC específica (trigger_pms_sync, trigger_pos_sync o run_*_agent)',
      p_job_type
      using errcode = 'P0003';
  end if;

  insert into public.automation_jobs (
    hotel_id, job_type, status, payload, scheduled_at, created_by
  ) values (
    p_hotel_id,
    p_job_type,
    'pending',
    p_payload,
    coalesce(p_scheduled_at, now()),
    auth.uid()
  )
  returning id into v_job_id;

  perform public.emit_event(
    p_hotel_id, 'automation', v_job_id, 'automation.job_enqueued',
    jsonb_build_object('job_type', p_job_type, 'payload', p_payload)
  );

  return v_job_id;
end;
$$;

-- ==============================================================================
-- FIX 4: Trigger — events state-machine bypass
-- Problema: la policy events_write (FOR ALL) permitía UPDATE directo sobre
--   public.events desde PostgREST, saltando validate_event_transition y los
--   emit_event de domain events.
-- Solución: trigger BEFORE UPDATE que rechaza cambios de status cuando
--   current_user = 'authenticated' (llamada directa). Cuando transition_event
--   (SECURITY DEFINER, owner ≠ 'authenticated') actualiza el campo, el trigger
--   lo permite.
-- ==============================================================================
create or replace function public.trg_prevent_event_status_bypass()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if OLD.status is distinct from NEW.status
     and current_user = 'authenticated'
  then
    raise exception
      'El estado del evento solo puede cambiarse mediante transition_event()'
      using errcode = 'P0015';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_events_status_protection on public.events;

create trigger trg_events_status_protection
  before update on public.events
  for each row execute function public.trg_prevent_event_status_bypass();

-- ==============================================================================
-- FIX 5: Trigger — recipes workflow bypass
-- Problema: la policy recipes_update permitía UPDATE directo sobre status,
--   approved_by y approved_at, saltando submit_recipe_for_review / approve_recipe
--   / deprecate_recipe y su generación de snapshots en recipe_versions.
-- Solución: trigger BEFORE UPDATE con la misma lógica current_user que Fix 4.
-- ==============================================================================
create or replace function public.trg_prevent_recipe_workflow_bypass()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    if OLD.status is distinct from NEW.status then
      raise exception
        'El estado de la receta solo puede cambiarse mediante submit_recipe_for_review(), approve_recipe() o deprecate_recipe()'
        using errcode = 'P0016';
    end if;
    if OLD.approved_by is distinct from NEW.approved_by
       or OLD.approved_at is distinct from NEW.approved_at
    then
      raise exception
        'Los campos de aprobación solo pueden modificarse mediante approve_recipe()'
        using errcode = 'P0017';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_recipes_workflow_protection on public.recipes;

create trigger trg_recipes_workflow_protection
  before update on public.recipes
  for each row execute function public.trg_prevent_recipe_workflow_bypass();

-- ==============================================================================
-- FIX 6: agent_suggestions — hacer realmente inmutables las sugerencias pending
-- Problema: la policy agent_suggestions_update permitía a head_chef y superiores
--   modificar action, action_payload, title, evidence antes de aprobar, convirtiendo
--   la sugerencia en cualquier acción arbitraria (vector para encolar run_agent, etc.)
-- Solución: eliminar la policy de UPDATE. Las RPCs approve_suggestion y
--   reject_suggestion son SECURITY DEFINER y no necesitan la policy RLS para
--   actualizar la fila (corren como el owner del schema).
-- ==============================================================================
drop policy if exists "agent_suggestions_update" on public.agent_suggestions;

-- ==============================================================================
-- FIX 7: approve_suggestion — whitelist enqueue_job + contrato sync_recipe_costs
-- Problema A: la rama enqueue_job insertaba cualquier job_type del payload sin
--   validar, reabriendo el vector del Fix 3 por segunda vía.
-- Problema B: la rama sync_recipe_costs pasaba product_id a sync_escandallo_prices,
--   que espera recipe_id → el sync nunca actualizaba ninguna receta.
-- ==============================================================================
create or replace function public.approve_suggestion(
  p_hotel_id      uuid,
  p_suggestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    public.app_role;
  v_sug     record;
  v_result  jsonb := '{}'::jsonb;
  v_job_id  uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  select * into v_sug
  from public.agent_suggestions
  where id        = p_suggestion_id
    and hotel_id  = p_hotel_id
    and status    = 'pending';

  if not found then
    raise exception 'Sugerencia no encontrada o ya revisada' using errcode = 'P0010';
  end if;

  -- Ejecutar acción según tipo
  case v_sug.action

    when 'enqueue_job' then
      declare
        v_job_type public.job_type;
        v_payload  jsonb;
      begin
        v_job_type := (v_sug.action_payload->>'job_type')::public.job_type;
        v_payload  := v_sug.action_payload - 'job_type';

        -- SECURITY FIX: whitelist negativa — agentes nunca deben generar
        -- sugerencias con job types service-only, pero validamos aquí también
        -- como defensa en profundidad.
        if v_job_type in ('sync_pms', 'sync_pos', 'run_agent') then
          raise exception
            'Sugerencia contiene job type privilegiado no permitido: %', v_job_type
            using errcode = 'P0003';
        end if;

        insert into public.automation_jobs (
          hotel_id, job_type, status, payload, created_by
        ) values (
          p_hotel_id, v_job_type, 'pending', v_payload, auth.uid()
        )
        returning id into v_job_id;

        v_result := jsonb_build_object('job_id', v_job_id, 'job_type', v_job_type);
      end;

    when 'sync_recipe_costs' then
      declare
        v_product_id   uuid;
        v_recipe_id    uuid;
        v_sync_count   integer := 0;
      begin
        v_product_id := (v_sug.action_payload->>'product_id')::uuid;

        -- CONTRATO FIX: sync_escandallo_prices espera recipe_id, no product_id.
        -- Expandir product_id → todas las recetas del hotel que usen ese producto.
        for v_recipe_id in
          select distinct ri.recipe_id
          from public.recipe_ingredients ri
          where ri.product_id = v_product_id
            and ri.hotel_id   = p_hotel_id
        loop
          perform public.sync_escandallo_prices(p_hotel_id, v_recipe_id);
          v_sync_count := v_sync_count + 1;
        end loop;

        v_result := jsonb_build_object(
          'synced',           true,
          'product_id',       v_product_id,
          'recipes_updated',  v_sync_count
        );
      end;

    when 'create_notification' then
      declare
        rec record;
      begin
        for rec in
          select m.user_id
          from public.memberships m
          where m.hotel_id  = p_hotel_id
            and m.is_active = true
            and m.role      in ('superadmin','direction','admin','head_chef')
        loop
          perform public.create_notification(
            p_hotel_id, rec.user_id,
            'general', 'warning',
            v_sug.title,
            v_sug.description,
            '/compliance/appcc'
          );
        end loop;
        v_result := jsonb_build_object('notifications_sent', true);
      end;

    when 'none' then
      v_result := jsonb_build_object('info', 'Sugerencia informativa aprobada sin acción adicional');

  end case;

  -- Marcar como aplicada
  update public.agent_suggestions
  set status      = 'applied',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at  = now()
  where id = p_suggestion_id;

  perform public.emit_event(
    p_hotel_id, 'agent', p_suggestion_id, 'agent.suggestion_applied',
    jsonb_build_object(
      'agent_type', v_sug.agent_type,
      'action',     v_sug.action,
      'result',     v_result
    )
  );

  return v_result;
end;
$$;
