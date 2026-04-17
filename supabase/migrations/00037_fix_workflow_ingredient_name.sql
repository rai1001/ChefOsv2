-- ============================================================================
-- Fix generate_event_workflow (00017): ri.name → ri.ingredient_name
--
-- recipe_ingredients no tiene columna `name`; la columna real es
-- `ingredient_name`. El RPC fallaba con 42703 al generar el mise en place
-- desde el detalle del evento. Esto bloquea las pantallas /production/mise-en-place,
-- KDS y Kanban porque dependen del workflow generado.
-- ============================================================================

create or replace function public.generate_event_workflow(
  p_hotel_id uuid,
  p_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_event record;
  v_workflow_id uuid;
  v_list_id uuid;
  v_recipe record;
  v_task_count integer := 0;
  v_mep_count integer := 0;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef']::public.app_role[]);

  select * into v_event
  from public.events
  where id = p_event_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'evento no encontrado' using errcode = 'P0010';
  end if;

  select id into v_workflow_id
  from public.workflows
  where hotel_id = p_hotel_id and event_id = p_event_id;

  if v_workflow_id is null then
    insert into public.workflows (hotel_id, event_id, name, status, created_by)
    values (
      p_hotel_id, p_event_id,
      'Workflow — ' || v_event.name,
      'draft', auth.uid()
    )
    returning id into v_workflow_id;
  end if;

  for v_recipe in (
    select distinct
      r.id as recipe_id,
      r.name as recipe_name,
      public.category_to_department(r.category) as dept,
      coalesce(em.servings_override, v_event.guest_count, 1)::integer
        * coalesce(msr.servings_override, 1)::integer as servings_needed
    from public.event_menus em
    join public.menus m on m.id = em.menu_id
    join public.menu_sections ms on ms.menu_id = m.id
    join public.menu_section_recipes msr on msr.section_id = ms.id
    join public.recipes r on r.id = msr.recipe_id
    where em.event_id = p_event_id
      and r.status = 'approved'
    order by dept, r.name
  )
  loop
    insert into public.workflow_tasks (
      workflow_id, hotel_id, title, department,
      priority, status, sort_order
    ) values (
      v_workflow_id, p_hotel_id,
      v_recipe.recipe_name || ' (' || v_recipe.servings_needed || ' raciones)',
      v_recipe.dept,
      case when v_event.event_type in ('banquet','catering') then 'high' else 'normal' end::public.task_priority,
      'todo',
      v_task_count
    );
    v_task_count := v_task_count + 1;

    select id into v_list_id
    from public.mise_en_place_lists
    where workflow_id = v_workflow_id and department = v_recipe.dept;

    if v_list_id is null then
      insert into public.mise_en_place_lists (workflow_id, hotel_id, department, title)
      values (
        v_workflow_id, p_hotel_id, v_recipe.dept,
        'Mise en place — ' || v_recipe.dept::text
      )
      returning id into v_list_id;
    end if;

    -- FIX: ingredient_name (no name)
    insert into public.mise_en_place_items (
      list_id, hotel_id, recipe_id, description, quantity, unit, sort_order
    )
    select
      v_list_id,
      p_hotel_id,
      r.id,
      ri.ingredient_name || ' para ' || v_recipe.recipe_name,
      round((ri.quantity_gross * v_recipe.servings_needed::numeric / nullif(r.servings,0)::numeric)::numeric, 3),
      u.abbreviation,
      row_number() over (order by ri.ingredient_name)
    from public.recipes r
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    left join public.units_of_measure u on u.id = ri.unit_id
    where r.id = v_recipe.recipe_id
      and ri.quantity_gross > 0;

    get diagnostics v_mep_count = row_count;
  end loop;

  perform public.emit_event(
    p_hotel_id, 'workflow', v_workflow_id, 'produccion.workflow_generado',
    jsonb_build_object(
      'event_id', p_event_id,
      'tasks', v_task_count,
      'mep_items', v_mep_count
    )
  );

  return v_workflow_id;
end;
$$;
