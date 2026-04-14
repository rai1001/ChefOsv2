-- ============================================================================
-- M6 Produccion — ChefOS v2
-- Plan de produccion diario, items por receta/departamento, tareas
-- MVP simplificado: sin workflows, sin mise en place, sin KDS
-- Genera plan desde eventos confirmados del dia
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.plan_status as enum (
  'draft',
  'active',
  'in_progress',
  'completed'
);

create type public.plan_item_status as enum (
  'pending',
  'in_progress',
  'done',
  'cancelled'
);

create type public.department as enum (
  'cocina_caliente',
  'cocina_fria',
  'pasteleria',
  'panaderia',
  'charcuteria',
  'pescaderia',
  'garde_manger',
  'servicio',
  'economato',
  'general'
);

create type public.task_priority as enum (
  'low',
  'normal',
  'high',
  'urgent'
);

-- ====================
-- 2. TABLES
-- ====================

-- Production plans (one per day)
create table public.production_plans (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  plan_date date not null,
  status public.plan_status not null default 'draft',
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_plans_hotel on public.production_plans(hotel_id);
create index idx_plans_hotel_date on public.production_plans(hotel_id, plan_date);
create unique index idx_plans_hotel_date_unique on public.production_plans(hotel_id, plan_date);

-- Production plan items (recipe × event → task for a department)
create table public.production_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.production_plans(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  department public.department not null default 'general',
  servings_needed integer not null default 1,
  priority public.task_priority not null default 'normal',
  status public.plan_item_status not null default 'pending',
  assigned_to uuid references auth.users(id),
  notes text,
  started_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_plan_items_plan on public.production_plan_items(plan_id);
create index idx_plan_items_hotel on public.production_plan_items(hotel_id);
create index idx_plan_items_dept on public.production_plan_items(hotel_id, department);
create index idx_plan_items_status on public.production_plan_items(plan_id, status);
create index idx_plan_items_assigned on public.production_plan_items(assigned_to) where assigned_to is not null;

-- Generic tasks (standalone, not tied to a recipe)
create table public.production_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.production_plans(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  title text not null,
  description text,
  department public.department not null default 'general',
  priority public.task_priority not null default 'normal',
  status public.plan_item_status not null default 'pending',
  assigned_to uuid references auth.users(id),
  blocked_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_tasks_plan on public.production_tasks(plan_id);
create index idx_tasks_hotel on public.production_tasks(hotel_id);
create index idx_tasks_hotel_dept on public.production_tasks(hotel_id, department);

-- ====================
-- 3. TRIGGERS
-- ====================
create trigger set_plans_updated_at
  before update on public.production_plans
  for each row execute function public.set_updated_at();

create trigger audit_production_plans
  after insert or update or delete on public.production_plans
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 4. RLS
-- ====================
alter table public.production_plans enable row level security;
alter table public.production_plan_items enable row level security;
alter table public.production_tasks enable row level security;

-- Plans: all read, chef+ write
create policy "plans_read" on public.production_plans
  for select using (public.is_member_of(hotel_id));
create policy "plans_insert" on public.production_plans
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "plans_update" on public.production_plans
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );

-- Plan items: all read, chef+ manage, cook can update status
create policy "plan_items_read" on public.production_plan_items
  for select using (public.is_member_of(hotel_id));
create policy "plan_items_insert" on public.production_plan_items
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "plan_items_update" on public.production_plan_items
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );

-- Tasks: same as plan items
create policy "tasks_read" on public.production_tasks
  for select using (public.is_member_of(hotel_id));
create policy "tasks_insert" on public.production_tasks
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "tasks_update" on public.production_tasks
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );

-- ====================
-- 5. HELPER: Map recipe_category → department
-- ====================
create or replace function public.category_to_department(p_cat public.recipe_category)
returns public.department
language plpgsql
immutable
as $$
begin
  return case p_cat
    when 'cold_starters' then 'cocina_fria'
    when 'hot_starters' then 'cocina_caliente'
    when 'soups_creams' then 'cocina_caliente'
    when 'fish' then 'cocina_caliente'
    when 'meat' then 'cocina_caliente'
    when 'sides' then 'cocina_caliente'
    when 'desserts' then 'pasteleria'
    when 'bakery' then 'panaderia'
    when 'sauces_stocks' then 'cocina_caliente'
    when 'mise_en_place' then 'general'
    when 'buffet' then 'servicio'
    when 'room_service' then 'servicio'
    when 'cocktail_pieces' then 'cocina_fria'
    else 'general'
  end;
end;
$$;

-- ====================
-- 6. RPCs
-- ====================

-- 6a. Generate production plan from confirmed events for a date
create or replace function public.generate_production_plan(
  p_hotel_id uuid,
  p_date date
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_plan_id uuid;
  v_item_count integer := 0;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef']::public.app_role[]);

  -- Check if plan already exists
  select id into v_plan_id
  from public.production_plans
  where hotel_id = p_hotel_id and plan_date = p_date;

  if v_plan_id is not null then
    raise exception 'plan already exists for this date' using errcode = 'P0030';
  end if;

  -- Create plan
  insert into public.production_plans (hotel_id, plan_date, created_by)
  values (p_hotel_id, p_date, auth.uid())
  returning id into v_plan_id;

  -- Generate items from events → event_menus → menus → sections → recipes
  insert into public.production_plan_items (
    plan_id, hotel_id, recipe_id, event_id, title,
    department, servings_needed, priority, sort_order
  )
  select
    v_plan_id,
    p_hotel_id,
    r.id,
    e.id,
    r.name || ' — ' || e.name,
    public.category_to_department(r.category),
    coalesce(em.servings_override, e.guest_count, 1) *
      coalesce(msr.servings_override, 1),
    case
      when e.event_type in ('banquet', 'catering') then 'high'
      when e.event_type in ('buffet', 'cocktail') then 'normal'
      else 'normal'
    end::public.task_priority,
    row_number() over (order by
      public.category_to_department(r.category),
      e.start_time nulls last,
      r.name
    )
  from public.events e
  join public.event_menus em on em.event_id = e.id
  join public.menus m on m.id = em.menu_id
  join public.menu_sections ms on ms.menu_id = m.id
  join public.menu_section_recipes msr on msr.section_id = ms.id
  join public.recipes r on r.id = msr.recipe_id
  where e.hotel_id = p_hotel_id
    and e.event_date = p_date
    and e.status in ('confirmed', 'in_preparation')
    and r.status = 'approved';

  get diagnostics v_item_count = row_count;

  -- If no items generated, create empty plan anyway (tasks can be added manually)

  perform public.emit_event(
    p_hotel_id, 'production_plan', v_plan_id, 'production_plan.created',
    jsonb_build_object('date', p_date, 'items', v_item_count)
  );

  return v_plan_id;
end;
$$;

-- 6b. Transition plan status
create or replace function public.transition_production_plan(
  p_hotel_id uuid,
  p_plan_id uuid,
  p_new_status public.plan_status
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current public.plan_status;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef']::public.app_role[]);

  select status into v_current
  from public.production_plans
  where id = p_plan_id and hotel_id = p_hotel_id;

  if v_current is null then
    raise exception 'plan not found' using errcode = 'P0404';
  end if;

  -- Validate transition
  if not (v_current, p_new_status) in (
    ('draft', 'active'),
    ('active', 'in_progress'),
    ('in_progress', 'completed'),
    ('draft', 'active')
  ) then
    raise exception 'invalid transition: % -> %', v_current, p_new_status using errcode = 'P0012';
  end if;

  update public.production_plans
  set status = p_new_status
  where id = p_plan_id and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'production_plan', p_plan_id,
    'production_plan.' || p_new_status,
    jsonb_build_object('from', v_current, 'to', p_new_status)
  );
end;
$$;

-- 6c. Transition plan item status (start, complete, cancel)
create or replace function public.transition_plan_item(
  p_hotel_id uuid,
  p_item_id uuid,
  p_new_status public.plan_item_status
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current public.plan_item_status;
  v_plan_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','cook']::public.app_role[]);

  select status, plan_id into v_current, v_plan_id
  from public.production_plan_items
  where id = p_item_id and hotel_id = p_hotel_id;

  if v_current is null then
    raise exception 'item not found' using errcode = 'P0404';
  end if;

  -- Validate transition
  if not (v_current, p_new_status) in (
    ('pending', 'in_progress'),
    ('in_progress', 'done'),
    ('in_progress', 'cancelled'),
    ('pending', 'cancelled')
  ) then
    raise exception 'invalid transition: % -> %', v_current, p_new_status using errcode = 'P0012';
  end if;

  update public.production_plan_items
  set status = p_new_status,
      started_at = case when p_new_status = 'in_progress' then now() else started_at end,
      completed_at = case when p_new_status in ('done', 'cancelled') then now() else completed_at end
  where id = p_item_id and hotel_id = p_hotel_id;

  -- Auto-complete plan if all items done/cancelled
  if p_new_status in ('done', 'cancelled') then
    if not exists (
      select 1 from public.production_plan_items
      where plan_id = v_plan_id
        and status not in ('done', 'cancelled')
    ) then
      update public.production_plans
      set status = 'completed'
      where id = v_plan_id;
    end if;
  end if;
end;
$$;

-- 6d. Get production summary for a date
create or replace function public.get_production_summary(
  p_hotel_id uuid,
  p_date date
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_plan_id uuid;
  v_result jsonb;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select id into v_plan_id
  from public.production_plans
  where hotel_id = p_hotel_id and plan_date = p_date;

  if v_plan_id is null then
    return jsonb_build_object(
      'has_plan', false,
      'date', p_date,
      'events_count', (
        select count(*) from public.events
        where hotel_id = p_hotel_id and event_date = p_date
          and status in ('confirmed', 'in_preparation')
      )
    );
  end if;

  select jsonb_build_object(
    'has_plan', true,
    'plan_id', pp.id,
    'date', pp.plan_date,
    'status', pp.status,
    'total_items', (select count(*) from public.production_plan_items where plan_id = pp.id),
    'pending', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'pending'),
    'in_progress', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'in_progress'),
    'done', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'done'),
    'cancelled', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'cancelled'),
    'by_department', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'department', dept,
        'total', total,
        'done', done_count
      ) order by dept), '[]')
      from (
        select
          department as dept,
          count(*) as total,
          count(*) filter (where status = 'done') as done_count
        from public.production_plan_items
        where plan_id = pp.id
        group by department
      ) depts
    ),
    'events', (
      select coalesce(jsonb_agg(distinct jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'guest_count', e.guest_count,
        'start_time', e.start_time
      )), '[]')
      from public.production_plan_items ppi
      join public.events e on e.id = ppi.event_id
      where ppi.plan_id = pp.id
    )
  ) into v_result
  from public.production_plans pp
  where pp.id = v_plan_id;

  return v_result;
end;
$$;
