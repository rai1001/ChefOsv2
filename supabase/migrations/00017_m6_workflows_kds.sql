-- ============================================================================
-- M6 Avanzado — ChefOS v2
-- Workflows por evento, tareas con state machine completa, mise en place,
-- KDS (comandas de cocina), shopping list, plantillas repetitivas
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.workflow_status as enum (
  'draft',
  'active',
  'completed',
  'cancelled'
);

create type public.task_status as enum (
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create type public.ko_status as enum (
  'pending',
  'acknowledged',
  'in_progress',
  'ready',
  'delivered',
  'cancelled'
);

create type public.ko_item_status as enum (
  'pending',
  'in_progress',
  'ready',
  'skipped'
);

-- ====================
-- 2. TABLES
-- ====================

-- Workflows: agrupan tareas de un evento o plan
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  plan_id uuid references public.production_plans(id) on delete set null,
  name text not null,
  status public.workflow_status not null default 'draft',
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_workflows_hotel on public.workflows(hotel_id);
create index idx_workflows_event on public.workflows(event_id) where event_id is not null;
create index idx_workflows_hotel_status on public.workflows(hotel_id, status);

-- Workflow tasks: tareas con state machine completa (incluye blocked)
create table public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null,
  description text,
  department public.department not null default 'general',
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'todo',
  assigned_to uuid references auth.users(id) on delete set null,
  blocked_reason text,
  estimated_minutes integer,
  actual_minutes integer,
  depends_on_task_id uuid references public.workflow_tasks(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_wf_tasks_workflow on public.workflow_tasks(workflow_id);
create index idx_wf_tasks_hotel on public.workflow_tasks(hotel_id);
create index idx_wf_tasks_dept on public.workflow_tasks(hotel_id, department);
create index idx_wf_tasks_assigned on public.workflow_tasks(assigned_to) where assigned_to is not null;
create index idx_wf_tasks_status on public.workflow_tasks(workflow_id, status);

-- Mise en place lists (una por workflow + departamento)
create table public.mise_en_place_lists (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  department public.department not null default 'general',
  title text not null,
  created_at timestamptz not null default now()
);
create index idx_mep_lists_workflow on public.mise_en_place_lists(workflow_id);
create index idx_mep_lists_hotel on public.mise_en_place_lists(hotel_id);

-- Mise en place items (checklist por lista)
create table public.mise_en_place_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.mise_en_place_lists(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  description text not null,
  quantity numeric(10,3),
  unit text,
  is_done boolean not null default false,
  done_by uuid references auth.users(id) on delete set null,
  done_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_mep_items_list on public.mise_en_place_items(list_id);
create index idx_mep_items_hotel on public.mise_en_place_items(hotel_id);

-- Kitchen orders (comandas de cocina por partida)
create table public.kitchen_orders (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  station public.department not null,
  status public.ko_status not null default 'pending',
  sequence_number integer not null default 1,
  notes text,
  fired_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ko_hotel on public.kitchen_orders(hotel_id);
create index idx_ko_hotel_station on public.kitchen_orders(hotel_id, station, status);
create index idx_ko_event on public.kitchen_orders(event_id) where event_id is not null;

-- Kitchen order items
create table public.kitchen_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.kitchen_orders(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  title text not null,
  servings integer not null default 1,
  status public.ko_item_status not null default 'pending',
  notes text,
  fired_at timestamptz,
  ready_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_ko_items_order on public.kitchen_order_items(order_id);
create index idx_ko_items_hotel on public.kitchen_order_items(hotel_id);

-- Recurring task templates (plantillas por día de semana)
create table public.recurring_task_templates (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  title text not null,
  description text,
  department public.department not null default 'general',
  priority public.task_priority not null default 'normal',
  byweekday jsonb not null default '[0,1,2,3,4,5,6]', -- 0=Mon..6=Sun
  estimated_minutes integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_recurring_hotel on public.recurring_task_templates(hotel_id);

-- ====================
-- 3. TRIGGERS: updated_at + audit
-- ====================
create trigger set_workflows_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();

create trigger set_wf_tasks_updated_at
  before update on public.workflow_tasks
  for each row execute function public.set_updated_at();

create trigger set_ko_updated_at
  before update on public.kitchen_orders
  for each row execute function public.set_updated_at();

create trigger set_recurring_updated_at
  before update on public.recurring_task_templates
  for each row execute function public.set_updated_at();

create trigger audit_workflows
  after insert or update or delete on public.workflows
  for each row execute function public.audit_trigger_fn();

create trigger audit_kitchen_orders
  after insert or update or delete on public.kitchen_orders
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 4. RLS
-- ====================
alter table public.workflows enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.mise_en_place_lists enable row level security;
alter table public.mise_en_place_items enable row level security;
alter table public.kitchen_orders enable row level security;
alter table public.kitchen_order_items enable row level security;
alter table public.recurring_task_templates enable row level security;

-- workflows
create policy "workflows_read" on public.workflows
  for select using (public.is_member_of(hotel_id));
create policy "workflows_write" on public.workflows
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  );

-- workflow_tasks: cualquier miembro puede actualizar estado (cooks incluidos)
create policy "wf_tasks_read" on public.workflow_tasks
  for select using (public.is_member_of(hotel_id));
create policy "wf_tasks_insert" on public.workflow_tasks
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  );
create policy "wf_tasks_update" on public.workflow_tasks
  for update using (public.is_member_of(hotel_id));

-- mise_en_place
create policy "mep_lists_read" on public.mise_en_place_lists
  for select using (public.is_member_of(hotel_id));
create policy "mep_lists_write" on public.mise_en_place_lists
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  );

create policy "mep_items_read" on public.mise_en_place_items
  for select using (public.is_member_of(hotel_id));
create policy "mep_items_update" on public.mise_en_place_items
  for update using (public.is_member_of(hotel_id));
create policy "mep_items_insert" on public.mise_en_place_items
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef')
  );

-- kitchen orders
create policy "ko_read" on public.kitchen_orders
  for select using (public.is_member_of(hotel_id));
create policy "ko_write" on public.kitchen_orders
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef','cook','operations')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef','cook','operations')
  );

create policy "ko_items_read" on public.kitchen_order_items
  for select using (public.is_member_of(hotel_id));
create policy "ko_items_write" on public.kitchen_order_items
  for all using (public.is_member_of(hotel_id))
  with check (public.is_member_of(hotel_id));

-- recurring templates
create policy "recurring_read" on public.recurring_task_templates
  for select using (public.is_member_of(hotel_id));
create policy "recurring_write" on public.recurring_task_templates
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef')
  );

-- ====================
-- 5. RPCs
-- ====================

-- 5a. generate_event_workflow — crea workflow + tasks + mise en place desde evento
create or replace function public.generate_event_workflow(
  p_hotel_id uuid,
  p_event_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_event record;
  v_workflow_id uuid;
  v_list_id uuid;
  v_dept public.department;
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

  -- Reutilizar workflow si ya existe para este evento
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

  -- Crear tareas por departamento desde las recetas del evento
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
    -- Crear tarea de producción por receta
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

    -- Crear mise en place list por departamento (una sola por depto)
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

    -- Poblar MeP con ingredientes de la receta que requieren prep
    insert into public.mise_en_place_items (
      list_id, hotel_id, recipe_id, description, quantity, unit, sort_order
    )
    select
      v_list_id,
      p_hotel_id,
      r.id,
      ri.name || ' para ' || v_recipe.recipe_name,
      round((ri.quantity_gross * v_recipe.servings_needed::numeric / nullif(r.servings,0)::numeric)::numeric, 3),
      u.abbreviation,
      row_number() over (order by ri.name)
    from public.recipes r
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    left join public.units_of_measure u on u.id = ri.unit_id
    where r.id = v_recipe.recipe_id
      and ri.quantity_gross > 0;

    get diagnostics v_mep_count = row_count;
  end loop;

  -- Activar workflow si tiene tareas
  if v_task_count > 0 then
    update public.workflows
    set status = 'active', updated_at = now()
    where id = v_workflow_id;
  end if;

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

-- 5b. generate_shopping_list — necesidad de ingredientes - stock = lista de compra
create or replace function public.generate_shopping_list(
  p_hotel_id uuid,
  p_date date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_result jsonb;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','procurement']::public.app_role[]);

  -- Ingredientes necesarios (escalados) − stock disponible = necesidad de compra
  -- Agrupados por proveedor preferido
  with needed as (
    select
      ri.product_id,
      sum(
        ri.quantity_gross
        * coalesce(em.servings_override, e.guest_count, 1)::numeric
        * coalesce(msr.servings_override, 1)::numeric
        / nullif(r.servings, 0)::numeric
      ) as qty_needed
    from public.events e
    join public.event_menus em on em.event_id = e.id
    join public.menus m on m.id = em.menu_id
    join public.menu_sections ms on ms.menu_id = m.id
    join public.menu_section_recipes msr on msr.section_id = ms.id
    join public.recipes r on r.id = msr.recipe_id
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    where e.hotel_id = p_hotel_id
      and e.event_date = p_date
      and e.status in ('confirmed', 'in_operation')
      and r.status = 'approved'
      and ri.product_id is not null
    group by ri.product_id
  ),
  available as (
    select product_id, sum(current_quantity) as qty_available
    from public.stock_lots
    where hotel_id = p_hotel_id and current_quantity > 0
    group by product_id
  ),
  shortage as (
    select
      n.product_id,
      n.qty_needed,
      coalesce(a.qty_available, 0) as qty_available,
      greatest(0, n.qty_needed - coalesce(a.qty_available, 0)) as qty_to_order
    from needed n
    left join available a on a.product_id = n.product_id
    where n.qty_needed > coalesce(a.qty_available, 0)
  )
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'supplier_id', so.supplier_id,
      'supplier_name', sup.name,
      'items', items.list
    ) order by sup.name),
    '[]'
  ) into v_result
  from (
    select
      so2.supplier_id,
      jsonb_agg(jsonb_build_object(
        'product_id', s.product_id,
        'product_name', p.name,
        'qty_needed', s.qty_needed,
        'qty_available', s.qty_available,
        'qty_to_order', s.qty_to_order,
        'unit', u.abbreviation,
        'unit_price', so2.unit_price
      ) order by p.name) as list
    from shortage s
    join public.products p on p.id = s.product_id
    left join public.units_of_measure u on u.id = p.default_unit_id
    left join public.supplier_offers so2 on so2.product_id = s.product_id
      and so2.hotel_id = p_hotel_id
      and so2.is_preferred = true
    group by so2.supplier_id
  ) items
  join public.supplier_offers so on so.supplier_id = items.supplier_id
    and so.hotel_id = p_hotel_id
  join public.suppliers sup on sup.id = items.supplier_id;

  perform public.emit_event(
    p_hotel_id, 'hotel', p_hotel_id, 'automatizacion.pedido_sugerido',
    jsonb_build_object('date', p_date, 'suppliers', jsonb_array_length(coalesce(v_result, '[]')))
  );

  return coalesce(v_result, '[]');
end;
$$;

-- 5c. Gestión de workflow tasks (assign / start / block / complete)
create or replace function public.assign_workflow_task(
  p_hotel_id uuid,
  p_task_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef']::public.app_role[]);

  update public.workflow_tasks
  set assigned_to = p_user_id, updated_at = now()
  where id = p_task_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'tarea no encontrada' using errcode = 'P0010';
  end if;
end;
$$;

create or replace function public.start_workflow_task(
  p_hotel_id uuid,
  p_task_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current public.task_status;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select status into v_current
  from public.workflow_tasks
  where id = p_task_id and hotel_id = p_hotel_id;

  if v_current is null then
    raise exception 'tarea no encontrada' using errcode = 'P0010';
  end if;

  if v_current not in ('todo', 'blocked') then
    raise exception 'solo se puede iniciar una tarea en estado todo o blocked' using errcode = 'P0020';
  end if;

  update public.workflow_tasks
  set status = 'in_progress', started_at = now(), blocked_reason = null, updated_at = now()
  where id = p_task_id and hotel_id = p_hotel_id;
end;
$$;

create or replace function public.block_workflow_task(
  p_hotel_id uuid,
  p_task_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  update public.workflow_tasks
  set status = 'blocked', blocked_reason = p_reason, updated_at = now()
  where id = p_task_id and hotel_id = p_hotel_id
    and status = 'in_progress';

  if not found then
    raise exception 'tarea no encontrada o no está en progreso' using errcode = 'P0010';
  end if;
end;
$$;

create or replace function public.complete_workflow_task(
  p_hotel_id uuid,
  p_task_id uuid,
  p_actual_minutes integer default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_workflow_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  update public.workflow_tasks
  set status = 'done',
      completed_at = now(),
      actual_minutes = coalesce(p_actual_minutes, actual_minutes),
      updated_at = now()
  where id = p_task_id and hotel_id = p_hotel_id
    and status in ('todo', 'in_progress', 'blocked')
  returning workflow_id into v_workflow_id;

  if v_workflow_id is null then
    raise exception 'tarea no encontrada o ya está cerrada' using errcode = 'P0010';
  end if;

  -- Auto-completar workflow si todas las tareas están done/cancelled
  if not exists (
    select 1 from public.workflow_tasks
    where workflow_id = v_workflow_id
      and status not in ('done', 'cancelled')
  ) then
    update public.workflows
    set status = 'completed', updated_at = now()
    where id = v_workflow_id;
  end if;
end;
$$;

-- 5d. mark_mise_en_place_item
create or replace function public.mark_mise_en_place_item(
  p_hotel_id uuid,
  p_item_id uuid,
  p_is_done boolean
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  update public.mise_en_place_items
  set is_done = p_is_done,
      done_by = case when p_is_done then auth.uid() else null end,
      done_at = case when p_is_done then now() else null end
  where id = p_item_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'ítem no encontrado' using errcode = 'P0010';
  end if;
end;
$$;

-- 5e. create_kitchen_order
create or replace function public.create_kitchen_order(
  p_hotel_id uuid,
  p_station public.department,
  p_event_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_seq integer;
  v_order_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','cook','operations']::public.app_role[]);

  -- Next sequence number for the day
  select coalesce(max(sequence_number), 0) + 1 into v_seq
  from public.kitchen_orders
  where hotel_id = p_hotel_id
    and station = p_station
    and created_at::date = current_date;

  insert into public.kitchen_orders (
    hotel_id, event_id, station, status,
    sequence_number, notes, created_by
  ) values (
    p_hotel_id, p_event_id, p_station, 'pending',
    v_seq, p_notes, auth.uid()
  )
  returning id into v_order_id;

  return v_order_id;
end;
$$;

-- 5f. add_kitchen_order_item
create or replace function public.add_kitchen_order_item(
  p_hotel_id uuid,
  p_order_id uuid,
  p_title text,
  p_servings integer default 1,
  p_recipe_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_item_id uuid;
  v_sort integer;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select coalesce(max(sort_order), 0) + 1 into v_sort
  from public.kitchen_order_items
  where order_id = p_order_id;

  insert into public.kitchen_order_items (
    order_id, hotel_id, recipe_id, title, servings, status, notes, sort_order
  ) values (
    p_order_id, p_hotel_id, p_recipe_id, p_title, p_servings, 'pending', p_notes, v_sort
  )
  returning id into v_item_id;

  -- Pasar comanda a acknowledged si estaba pending
  update public.kitchen_orders
  set status = 'acknowledged', updated_at = now()
  where id = p_order_id and status = 'pending';

  return v_item_id;
end;
$$;

-- 5g. update_kitchen_order_item_status
create or replace function public.update_kitchen_order_item_status(
  p_hotel_id uuid,
  p_item_id uuid,
  p_status public.ko_item_status
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_order_id uuid;
  v_ko_status public.ko_status;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  update public.kitchen_order_items
  set status = p_status,
      fired_at = case when p_status = 'in_progress' and fired_at is null then now() else fired_at end,
      ready_at = case when p_status = 'ready' then now() else ready_at end
  where id = p_item_id and hotel_id = p_hotel_id
  returning order_id into v_order_id;

  if v_order_id is null then
    raise exception 'ítem no encontrado' using errcode = 'P0010';
  end if;

  -- Actualizar estado de la comanda según items
  if not exists (
    select 1 from public.kitchen_order_items
    where order_id = v_order_id and status not in ('ready', 'skipped')
  ) then
    -- Todos los ítems listos: comanda ready
    update public.kitchen_orders
    set status = 'ready', updated_at = now()
    where id = v_order_id;
  elsif exists (
    select 1 from public.kitchen_order_items
    where order_id = v_order_id and status = 'in_progress'
  ) then
    update public.kitchen_orders
    set status = 'in_progress', updated_at = now()
    where id = v_order_id;
  end if;
end;
$$;

-- 5h. generate_tasks_from_recurring_templates — genera tareas del día desde plantillas
create or replace function public.generate_tasks_from_recurring_templates(
  p_hotel_id uuid,
  p_date date default current_date
)
returns integer
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_weekday integer;          -- 0=Mon..6=Sun (ISO: extract dow returns 0=Sun)
  v_workflow_id uuid;
  v_template record;
  v_count integer := 0;
  v_plan_label text;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  -- ISO weekday: Mon=1..Sun=7 → convert to 0-based Mon=0..Sun=6
  v_weekday := (extract(isodow from p_date)::integer - 1);

  v_plan_label := 'Tareas recurrentes — ' || p_date::text;

  -- Reutilizar o crear workflow del día para tareas recurrentes
  select id into v_workflow_id
  from public.workflows
  where hotel_id = p_hotel_id
    and event_id is null
    and name = v_plan_label;

  if v_workflow_id is null then
    insert into public.workflows (hotel_id, name, status, created_by)
    values (p_hotel_id, v_plan_label, 'active', auth.uid())
    returning id into v_workflow_id;
  end if;

  for v_template in (
    select * from public.recurring_task_templates
    where hotel_id = p_hotel_id
      and is_active = true
      and byweekday @> jsonb_build_array(v_weekday)
  )
  loop
    -- Evitar duplicados: no generar si ya existe tarea con mismo título en el workflow
    if not exists (
      select 1 from public.workflow_tasks
      where workflow_id = v_workflow_id and title = v_template.title
    ) then
      insert into public.workflow_tasks (
        workflow_id, hotel_id, title, description,
        department, priority, status, estimated_minutes, sort_order
      ) values (
        v_workflow_id, p_hotel_id, v_template.title, v_template.description,
        v_template.department, v_template.priority, 'todo',
        v_template.estimated_minutes, v_count
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- 5i. get_workflow_detail — resumen completo de un workflow
create or replace function public.get_workflow_detail(
  p_hotel_id uuid,
  p_workflow_id uuid
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
      'id', w.id,
      'name', w.name,
      'status', w.status,
      'event', case when e.id is not null then
        jsonb_build_object('id', e.id, 'name', e.name, 'event_date', e.event_date, 'guest_count', e.guest_count)
        else null end,
      'tasks_total', (select count(*) from public.workflow_tasks where workflow_id = w.id),
      'tasks_done', (select count(*) from public.workflow_tasks where workflow_id = w.id and status = 'done'),
      'tasks_blocked', (select count(*) from public.workflow_tasks where workflow_id = w.id and status = 'blocked'),
      'by_department', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'department', department,
          'tasks', jsonb_agg(jsonb_build_object(
            'id', wt.id, 'title', wt.title, 'status', wt.status,
            'priority', wt.priority, 'assigned_to', wt.assigned_to,
            'blocked_reason', wt.blocked_reason, 'estimated_minutes', wt.estimated_minutes
          ) order by wt.sort_order)
        ) order by department), '[]')
        from (
          select department from public.workflow_tasks
          where workflow_id = w.id group by department
        ) depts
        join public.workflow_tasks wt on wt.workflow_id = w.id and wt.department = depts.department
        group by depts.department
      ),
      'mise_en_place', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'list_id', mel.id,
          'department', mel.department,
          'title', mel.title,
          'total', (select count(*) from public.mise_en_place_items where list_id = mel.id),
          'done', (select count(*) from public.mise_en_place_items where list_id = mel.id and is_done = true)
        ) order by mel.department), '[]')
        from public.mise_en_place_lists mel
        where mel.workflow_id = w.id
      )
    )
    from public.workflows w
    left join public.events e on e.id = w.event_id
    where w.id = p_workflow_id and w.hotel_id = p_hotel_id
  );
end;
$$;
