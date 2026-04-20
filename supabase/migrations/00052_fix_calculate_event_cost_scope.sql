-- ============================================================================
-- Fix: calculate_event_cost_estimate aceptaba cualquier miembro activo para
-- invocar un RPC SECURITY DEFINER que UPDATE public.events.theoretical_cost.
--
-- La policy RLS events_update restringe UPDATE a superadmin/direction/admin/
-- commercial, pero la función bypass la RLS al ser SECURITY DEFINER. El
-- check_membership con lista de roles NULL permitía a cualquier miembro
-- (cook, reception, etc.) mutar costes económicos del evento.
--
-- Fix: restringir a los mismos 4 roles que la policy events_update.
-- Codex report 407407b (Medium).
-- ============================================================================

create or replace function public.calculate_event_cost_estimate(
  p_hotel_id uuid,
  p_event_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_event record;
  v_cost numeric;
begin
  v_role := public.check_membership(
    auth.uid(), p_hotel_id,
    array['superadmin', 'direction', 'admin', 'commercial']::public.app_role[]
  );

  select * into v_event
  from public.events
  where id = p_event_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'evento no encontrado' using errcode = 'P0010';
  end if;

  select coalesce(round(sum(
    ri.unit_cost
    * ri.quantity_gross
    * coalesce(em.servings_override, v_event.guest_count, 1)::numeric
    * coalesce(msr.servings_override, 1)::numeric
    / nullif(r.servings, 0)::numeric
  )::numeric, 2), 0)
  into v_cost
  from public.event_menus em
  join public.menus m on m.id = em.menu_id
  join public.menu_sections ms on ms.menu_id = m.id
  join public.menu_section_recipes msr on msr.section_id = ms.id
  join public.recipes r on r.id = msr.recipe_id
  join public.recipe_ingredients ri on ri.recipe_id = r.id
  where em.event_id = p_event_id
    and r.status = 'approved'
    and ri.unit_cost > 0;

  update public.events
  set theoretical_cost = v_cost, updated_at = now()
  where id = p_event_id and hotel_id = p_hotel_id;

  return v_cost;
end;
$$;
