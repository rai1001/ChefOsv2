-- ============================================================================
-- M1 BEO extendido — ChefOS v2
-- event_operational_impact: necesidades de ingredientes por departamento
-- get_event_beo: BEO completo como JSONB
-- calculate_event_cost_estimate: food cost teórico pre-evento
-- generate_event_operational_impact: poblar tabla desde menús del evento
-- ============================================================================

-- ====================
-- 1. TABLA
-- ====================

-- Impacto operacional: ingredientes necesarios por evento+producto+departamento
create table public.event_operational_impact (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null, -- denormalized for speed/BEO
  quantity_needed numeric(12,3) not null default 0,
  unit text,
  department public.department not null default 'general',
  generated_at timestamptz not null default now(),
  unique (event_id, product_id, department)
);

create index idx_eoi_event on public.event_operational_impact(event_id);
create index idx_eoi_hotel on public.event_operational_impact(hotel_id);
create index idx_eoi_dept on public.event_operational_impact(event_id, department);

-- ====================
-- 2. RLS
-- ====================

alter table public.event_operational_impact enable row level security;

create policy "eoi_read" on public.event_operational_impact
  for select using (public.is_member_of(hotel_id));

create policy "eoi_write" on public.event_operational_impact
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  );

-- ====================
-- 3. RPCs
-- ====================

-- 3a. generate_event_operational_impact
-- Agrega ingredientes de todos los menús del evento (escalados por pax) y los
-- inserta/actualiza en event_operational_impact por producto+departamento.
create or replace function public.generate_event_operational_impact(
  p_hotel_id uuid,
  p_event_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_event record;
  v_count integer;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef']::public.app_role[]);

  select * into v_event
  from public.events
  where id = p_event_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'evento no encontrado' using errcode = 'P0010';
  end if;

  -- Borrar impacto anterior para recalcular limpio
  delete from public.event_operational_impact
  where event_id = p_event_id;

  -- Insertar impacto agregado desde menús → secciones → recetas → ingredientes
  insert into public.event_operational_impact (
    hotel_id, event_id, product_id, product_name,
    quantity_needed, unit, department
  )
  select
    p_hotel_id,
    p_event_id,
    ri.product_id,
    coalesce(p.name, ri.name) as product_name,
    round(sum(
      ri.quantity_gross
      * coalesce(em.servings_override, v_event.guest_count, 1)::numeric
      * coalesce(msr.servings_override, 1)::numeric
      / nullif(r.servings, 0)::numeric
    )::numeric, 3) as quantity_needed,
    u.abbreviation as unit,
    public.category_to_department(r.category) as department
  from public.event_menus em
  join public.menus m on m.id = em.menu_id
  join public.menu_sections ms on ms.menu_id = m.id
  join public.menu_section_recipes msr on msr.section_id = ms.id
  join public.recipes r on r.id = msr.recipe_id
  join public.recipe_ingredients ri on ri.recipe_id = r.id
  left join public.products p on p.id = ri.product_id
  left join public.units_of_measure u on u.id = ri.unit_id
  where em.event_id = p_event_id
    and r.status = 'approved'
    and ri.quantity_gross > 0
  group by ri.product_id, coalesce(p.name, ri.name), u.abbreviation, public.category_to_department(r.category);

  get diagnostics v_count = row_count;

  perform public.emit_event(
    p_hotel_id, 'event', p_event_id, 'comercial.impacto_operacional_generado',
    jsonb_build_object('rows', v_count)
  );

  return v_count;
end;
$$;

-- 3b. calculate_event_cost_estimate
-- Devuelve el coste teórico de alimentación del evento (SUM recipe cost × servings).
-- Usa recipe_ingredients.unit_cost (snapshot del último sync de precios).
create or replace function public.calculate_event_cost_estimate(
  p_hotel_id uuid,
  p_event_id uuid
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_event record;
  v_cost numeric;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

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

  -- Actualizar theoretical_cost en el evento
  update public.events
  set theoretical_cost = v_cost, updated_at = now()
  where id = p_event_id and hotel_id = p_hotel_id;

  return v_cost;
end;
$$;

-- 3c. get_event_beo
-- Devuelve el BEO completo como JSONB: cabecera + cliente + menús + impacto + coste.
create or replace function public.get_event_beo(
  p_hotel_id uuid,
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  return (
    select jsonb_build_object(
      -- Cabecera
      'id', e.id,
      'beo_number', e.beo_number,
      'name', e.name,
      'event_type', e.event_type,
      'service_type', e.service_type,
      'event_date', e.event_date,
      'start_time', e.start_time,
      'end_time', e.end_time,
      'guest_count', e.guest_count,
      'venue', e.venue,
      'setup_time', e.setup_time,
      'teardown_time', e.teardown_time,
      'status', e.status,
      'notes', e.notes,
      'theoretical_cost', e.theoretical_cost,
      'actual_cost', e.actual_cost,
      -- Cliente
      'client', case when c.id is not null then
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'email', c.email,
          'phone', c.phone,
          'company', c.company
        ) else null end,
      -- Hotel
      'hotel', jsonb_build_object(
        'id', h.id,
        'name', h.name
      ),
      -- Menús con secciones y recetas
      'menus', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'id', em.id,
            'menu_name', em.menu_name,
            'sort_order', em.sort_order,
            'servings_override', em.servings_override,
            'sections', (
              select coalesce(jsonb_agg(
                jsonb_build_object(
                  'id', ms.id,
                  'name', ms.name,
                  'course_type', ms.course_type,
                  'recipes', (
                    select coalesce(jsonb_agg(
                      jsonb_build_object(
                        'id', r.id,
                        'name', r.name,
                        'servings_override', msr.servings_override,
                        'unit_cost', r.unit_cost,
                        'yield_pct', r.yield_pct
                      ) order by msr.sort_order
                    ), '[]')
                    from public.menu_section_recipes msr
                    join public.recipes r on r.id = msr.recipe_id
                    where msr.section_id = ms.id
                  )
                ) order by ms.sort_order
              ), '[]')
              from public.menu_sections ms
              where ms.menu_id = em.menu_id
            )
          ) order by em.sort_order
        ), '[]')
        from public.event_menus em
        where em.event_id = e.id
      ),
      -- Impacto operacional por departamento
      'operational_impact', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'department', department,
            'items', items
          ) order by department
        ), '[]')
        from (
          select
            department,
            jsonb_agg(
              jsonb_build_object(
                'product_id', product_id,
                'product_name', product_name,
                'quantity_needed', quantity_needed,
                'unit', unit
              ) order by product_name
            ) as items
          from public.event_operational_impact
          where event_id = e.id
          group by department
        ) impact_by_dept
      ),
      -- Espacios
      'spaces', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'space_name', es.space_name,
            'capacity', es.capacity,
            'setup_style', es.setup_style
          )
        ), '[]')
        from public.event_spaces es
        where es.event_id = e.id
      )
    )
    from public.events e
    left join public.clients c on c.id = e.client_id
    join public.hotels h on h.id = e.hotel_id
    where e.id = p_event_id and e.hotel_id = p_hotel_id
  );
end;
$$;
