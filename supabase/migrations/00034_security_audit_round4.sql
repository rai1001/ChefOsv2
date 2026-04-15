-- ============================================================================
-- Security Audit Round 4 — Codex adversarial challenge (2026-04-15)
-- Fixes 11 hallazgos (3 CRITICAL, 7 HIGH, 1 HIGH-KDS) identificados
-- tras revisión de migraciones 00001-00033.
-- ============================================================================

-- ==============================================================================
-- FIX 1 (CRITICAL): create_hotel() IDOR — current_user = 'authenticated'
--   es dead code en SECURITY DEFINER (current_user siempre devuelve el owner).
--   El check de tenant-membership NUNCA se ejecutaba.
-- Solución: distinguir llamada de onboarding (tenant sin hoteles aún) vs llamada
--   directa (tenant con hoteles existentes) usando una query en lugar de
--   current_user, que no es fiable dentro de SECURITY DEFINER.
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
  -- SECURITY: si el tenant ya tiene hoteles, verificar que el caller
  -- tiene rol direction+ en ese tenant antes de añadir otro hotel.
  -- Si el tenant NO tiene hoteles aún (onboarding inicial desde
  -- create_tenant_with_hotel), se omite el check: el usuario acaba de
  -- crear el tenant y aún no tiene membresía.
  if exists (
    select 1 from public.hotels where tenant_id = p_tenant_id limit 1
  ) then
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
-- FIX 2 (CRITICAL): emit_event() callable por anon/authenticated sin check.
--   Sin REVOKE era invocable directamente desde PostgREST, permitiendo inyectar
--   eventos con hotel_id arbitrario y disparar automations/notifications
--   cross-tenant.
-- ==============================================================================
revoke execute on function public.emit_event(
  uuid, text, uuid, text, jsonb
) from public, anon, authenticated;

grant execute on function public.emit_event(
  uuid, text, uuid, text, jsonb
) to service_role;

-- ==============================================================================
-- FIX 3 (HIGH): Notification RPCs (mark_read, mark_all, get_count) son
--   SECURITY DEFINER sin check_membership. 00033 hardeneó las table policies
--   pero estas RPCs las bypasan completamente. Un ex-miembro puede seguir
--   mutando o consultando badges del hotel del que fue removido.
-- ==============================================================================
create or replace function public.mark_notification_read(
  p_hotel_id        uuid,
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_membership(auth.uid(), p_hotel_id, null);

  update public.notifications
  set is_read = true, read_at = now()
  where id        = p_notification_id
    and hotel_id  = p_hotel_id
    and user_id   = auth.uid()
    and is_read   = false;
end;
$$;

create or replace function public.mark_all_notifications_read(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.check_membership(auth.uid(), p_hotel_id, null);

  update public.notifications
  set is_read = true, read_at = now()
  where hotel_id = p_hotel_id
    and user_id  = auth.uid()
    and is_read  = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_notification_count(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.check_membership(auth.uid(), p_hotel_id, null);

  select count(*) into v_count
  from public.notifications
  where hotel_id = p_hotel_id
    and user_id  = auth.uid()
    and is_read  = false;

  return coalesce(v_count, 0);
end;
$$;

-- ==============================================================================
-- FIX 4 (HIGH): seed_default_units() — SECURITY DEFINER sin auth check.
--   Cualquier caller podía insertar master data en el tenant de otro hotel.
--   Añadir check_membership al inicio; preservar body original con RETURNING.
-- ==============================================================================
create or replace function public.seed_default_units(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kg uuid;
  v_g  uuid;
  v_l  uuid;
  v_ml uuid;
begin
  -- SECURITY: solo admin+ del hotel puede seed
  perform public.check_membership(
    auth.uid(), p_hotel_id,
    array['superadmin', 'direction', 'admin']::public.app_role[]
  );

  -- Weight
  insert into public.units_of_measure (hotel_id, name, abbreviation, unit_type, conversion_factor, is_default)
  values (p_hotel_id, 'Kilogramo', 'kg', 'weight', 1, true)
  returning id into v_kg;

  insert into public.units_of_measure (hotel_id, name, abbreviation, unit_type, conversion_factor, base_unit_id)
  values (p_hotel_id, 'Gramo', 'g', 'weight', 0.001, v_kg);

  -- Volume
  insert into public.units_of_measure (hotel_id, name, abbreviation, unit_type, conversion_factor, is_default)
  values (p_hotel_id, 'Litro', 'L', 'volume', 1, true)
  returning id into v_l;

  insert into public.units_of_measure (hotel_id, name, abbreviation, unit_type, conversion_factor, base_unit_id)
  values (p_hotel_id, 'Mililitro', 'ml', 'volume', 0.001, v_l);

  -- Count
  insert into public.units_of_measure (hotel_id, name, abbreviation, unit_type, conversion_factor, is_default)
  values
    (p_hotel_id, 'Unidad', 'ud', 'count', 1, true),
    (p_hotel_id, 'Docena', 'dz', 'count', 12, false);
end;
$$;

-- ==============================================================================
-- FIX 5 (HIGH): seed_default_storage_locations() — mismo problema.
-- ==============================================================================
create or replace function public.seed_default_storage_locations(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SECURITY: solo admin+ del hotel puede seed
  perform public.check_membership(
    auth.uid(), p_hotel_id,
    array['superadmin', 'direction', 'admin']::public.app_role[]
  );

  insert into public.storage_locations (hotel_id, name, location_type, sort_order)
  values
    (p_hotel_id, 'Camara frigorifica', 'refrigerated', 1),
    (p_hotel_id, 'Congelador',         'frozen',        2),
    (p_hotel_id, 'Almacen seco',       'dry',           3),
    (p_hotel_id, 'Economato',          'ambient',       4)
  on conflict (hotel_id, name) do nothing;
end;
$$;

-- ==============================================================================
-- FIX 6 (HIGH): _calculate_recipe_cost_recursive() — SECURITY DEFINER sin
--   check_membership, callable por cualquier authenticated con hotel_id ajeno.
--   Helper interno: solo debe poder llamarlo la función padre (SECURITY DEFINER).
-- ==============================================================================
revoke execute on function public._calculate_recipe_cost_recursive(
  uuid, uuid, uuid[], integer
) from public, anon, authenticated;

grant execute on function public._calculate_recipe_cost_recursive(
  uuid, uuid, uuid[], integer
) to service_role;

-- ==============================================================================
-- FIX 7 (HIGH): recipe_ingredients y recipe_steps de recetas APROBADAS.
--   El trigger de 00030 protege el status/approved_by/approved_at de recipes,
--   pero las policies ingredients_*/steps_* permitían a sous_chef/cook modificar
--   ingredientes y pasos de recetas ya aprobadas sin re-review.
-- ==============================================================================
create or replace function public.trg_prevent_approved_recipe_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_status text;
begin
  -- Solo bloquear cuando el caller es un usuario directo (no SECURITY DEFINER RPC)
  if current_user != 'authenticated' then
    return coalesce(NEW, OLD);
  end if;

  select status into v_status
  from public.recipes
  where id = coalesce(NEW.recipe_id, OLD.recipe_id);

  if v_status = 'approved' then
    raise exception
      'No se pueden modificar ingredientes o pasos de una receta aprobada. '
      'Usa deprecate_recipe() + nueva versión para hacer cambios.'
      using errcode = 'P0017';
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_ingredients_approved_guard on public.recipe_ingredients;
create trigger trg_ingredients_approved_guard
  before insert or update or delete on public.recipe_ingredients
  for each row execute function public.trg_prevent_approved_recipe_mutation();

drop trigger if exists trg_steps_approved_guard on public.recipe_steps;
create trigger trg_steps_approved_guard
  before insert or update or delete on public.recipe_steps
  for each row execute function public.trg_prevent_approved_recipe_mutation();

-- ==============================================================================
-- FIX 8 (HIGH): Purchase Requests — state machine bypass via UPDATE directo.
--   pr_update / po_update permitían cambiar status directamente, saltando
--   validate_pr_transition / validate_po_transition y sus domain events.
-- ==============================================================================
create or replace function public.trg_prevent_pr_status_bypass()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if OLD.status is distinct from NEW.status
     and current_user = 'authenticated'
  then
    raise exception
      'El estado de la solicitud de compra solo puede cambiarse mediante '
      'approve_purchase_request() o reject_purchase_request()'
      using errcode = 'P0018';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_pr_status_protection on public.purchase_requests;
create trigger trg_pr_status_protection
  before update on public.purchase_requests
  for each row execute function public.trg_prevent_pr_status_bypass();

create or replace function public.trg_prevent_po_status_bypass()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if OLD.status is distinct from NEW.status
     and current_user = 'authenticated'
  then
    raise exception
      'El estado de la orden de compra solo puede cambiarse mediante '
      'send_purchase_order() o receive_purchase_order()'
      using errcode = 'P0019';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_po_status_protection on public.purchase_orders;
create trigger trg_po_status_protection
  before update on public.purchase_orders
  for each row execute function public.trg_prevent_po_status_bypass();

-- ==============================================================================
-- FIX 9 (HIGH): Production — state machine bypass via UPDATE directo.
--   plan_items_update / tasks_update + la policy de cook/sous_chef sobre
--   production_plan_items y production_tasks permitían saltarse
--   transition_plan_item() y reescribir status, asignación, timestamps.
-- ==============================================================================
create or replace function public.trg_prevent_production_status_bypass()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if OLD.status is distinct from NEW.status
     and current_user = 'authenticated'
  then
    raise exception
      'El estado de la tarea de producción solo puede cambiarse mediante '
      'transition_plan_item() o update_task_status()'
      using errcode = 'P0020';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_plan_items_status_protection on public.production_plan_items;
create trigger trg_plan_items_status_protection
  before update on public.production_plan_items
  for each row execute function public.trg_prevent_production_status_bypass();

drop trigger if exists trg_tasks_status_protection on public.production_tasks;
create trigger trg_tasks_status_protection
  before update on public.production_tasks
  for each row execute function public.trg_prevent_production_status_bypass();

-- ==============================================================================
-- FIX 10 (HIGH): kitchen_order_items — policy ko_items_write usaba is_member_of
--   (cualquier miembro del hotel) en lugar de requerir rol operacional.
--   Escalada: cualquier miembro podía reescribir/cancelar/reasignar ítems KDS.
-- ==============================================================================
drop policy if exists "ko_items_write" on public.kitchen_order_items;

create policy "ko_items_write" on public.kitchen_order_items
  for all using (
    public.get_member_role(hotel_id) in (
      'superadmin', 'direction', 'admin',
      'head_chef', 'sous_chef', 'cook', 'operations'
    )
  ) with check (
    public.get_member_role(hotel_id) in (
      'superadmin', 'direction', 'admin',
      'head_chef', 'sous_chef', 'cook', 'operations'
    )
  );
