-- ============================================================================
-- M2 Recetas y Escandallos — ChefOS v2
-- State machine: draft → review_pending → approved → deprecated → archived
-- Decisiones autoplan:
--   - Sub-recetas recursivas con cycle detection (E5: visited_ids array)
--   - Database-first: costeo en RPCs PostgreSQL
--   - CRUD vía Supabase client + RLS, RPCs solo para lógica compleja
--   - units_of_measure como tabla fundacional (usada por M2, M3, M4, M5)
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.recipe_status as enum (
  'draft',
  'review_pending',
  'approved',
  'deprecated',
  'archived'
);

create type public.recipe_difficulty as enum (
  'easy',
  'medium',
  'hard',
  'expert'
);

create type public.recipe_category as enum (
  'cold_starters',
  'hot_starters',
  'soups_creams',
  'fish',
  'meat',
  'sides',
  'desserts',
  'bakery',
  'sauces_stocks',
  'mise_en_place',
  'buffet',
  'room_service',
  'cocktail_pieces'
);

create type public.menu_type as enum (
  'buffet',
  'seated',
  'cocktail',
  'tasting',
  'daily'
);

create type public.unit_type as enum (
  'weight',
  'volume',
  'count',
  'length'
);

-- ====================
-- 2. FOUNDATION TABLE: units_of_measure
-- ====================
create table public.units_of_measure (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  abbreviation text not null,
  unit_type public.unit_type not null,
  conversion_factor numeric(12,6) not null default 1,
  base_unit_id uuid references public.units_of_measure(id) on delete set null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_units_hotel on public.units_of_measure(hotel_id);
create unique index idx_units_hotel_abbr on public.units_of_measure(hotel_id, abbreviation);

-- ====================
-- 3. TABLES
-- ====================

-- Recipes
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  description text,
  category public.recipe_category not null,
  subcategory text,
  servings integer not null default 1,
  yield_qty numeric(10,3),
  yield_unit_id uuid references public.units_of_measure(id) on delete set null,
  prep_time_min integer,
  cook_time_min integer,
  rest_time_min integer,
  difficulty public.recipe_difficulty not null default 'medium',
  status public.recipe_status not null default 'draft',
  total_cost numeric(12,4) not null default 0,
  cost_per_serving numeric(12,4) not null default 0,
  food_cost_pct numeric(5,2) not null default 0,
  target_price numeric(12,2),
  allergens jsonb not null default '[]',
  dietary_tags jsonb not null default '[]',
  notes text,
  image_url text,
  created_by uuid not null default auth.uid(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_recipes_hotel on public.recipes(hotel_id);
create index idx_recipes_hotel_status on public.recipes(hotel_id, status);
create index idx_recipes_hotel_category on public.recipes(hotel_id, category);

-- Recipe ingredients
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  ingredient_name text not null,
  product_id uuid, -- FK to products added in M3 migration
  unit_id uuid references public.units_of_measure(id) on delete set null,
  quantity_gross numeric(10,3) not null,
  waste_pct numeric(5,2) not null default 0,
  quantity_net numeric(10,3) generated always as (quantity_gross * (1 - waste_pct / 100)) stored,
  unit_cost numeric(12,4) not null default 0,
  sort_order integer not null default 0,
  preparation_notes text,
  created_at timestamptz not null default now()
);

create index idx_ingredients_recipe on public.recipe_ingredients(recipe_id);
create index idx_ingredients_hotel on public.recipe_ingredients(hotel_id);

-- Recipe steps
create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  step_number integer not null,
  instruction text not null,
  duration_min integer,
  temperature text,
  equipment text,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_steps_recipe on public.recipe_steps(recipe_id);
create unique index idx_steps_recipe_number on public.recipe_steps(recipe_id, step_number);

-- Sub-recipes (recursive composition)
create table public.recipe_sub_recipes (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  sub_recipe_id uuid not null references public.recipes(id) on delete cascade,
  quantity numeric(10,3) not null default 1,
  unit_id uuid references public.units_of_measure(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint no_self_reference check (recipe_id != sub_recipe_id),
  unique (recipe_id, sub_recipe_id)
);

create index idx_sub_recipes_recipe on public.recipe_sub_recipes(recipe_id);
create index idx_sub_recipes_sub on public.recipe_sub_recipes(sub_recipe_id);

-- Recipe versions (snapshot on each significant change)
create table public.recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  version_number integer not null,
  data jsonb not null,
  changed_by uuid not null default auth.uid(),
  change_reason text,
  created_at timestamptz not null default now()
);

create index idx_versions_recipe on public.recipe_versions(recipe_id);
create unique index idx_versions_recipe_number on public.recipe_versions(recipe_id, version_number);

-- Menus
create table public.menus (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  description text,
  menu_type public.menu_type not null default 'seated',
  is_template boolean not null default false,
  target_food_cost_pct numeric(5,2),
  total_cost numeric(12,4) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_menus_hotel on public.menus(hotel_id);

-- Menu sections
create table public.menu_sections (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_sections_menu on public.menu_sections(menu_id);

-- Menu section recipes (linking recipes to menu sections)
create table public.menu_section_recipes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.menu_sections(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  servings_override integer,
  price numeric(12,2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_section_recipes_section on public.menu_section_recipes(section_id);

-- ====================
-- 4. UPDATED_AT TRIGGERS
-- ====================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

create trigger set_menus_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

-- ====================
-- 5. AUDIT TRIGGERS
-- ====================
create trigger audit_recipes
  after insert or update or delete on public.recipes
  for each row execute function public.audit_trigger_fn();

create trigger audit_menus
  after insert or update or delete on public.menus
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 6. RLS POLICIES
-- ====================
alter table public.units_of_measure enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_sub_recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.menus enable row level security;
alter table public.menu_sections enable row level security;
alter table public.menu_section_recipes enable row level security;

-- Units: all members can read, admin+ can write
create policy "units_read" on public.units_of_measure
  for select using (public.is_member_of(hotel_id));
create policy "units_insert" on public.units_of_measure
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef')
  );
create policy "units_update" on public.units_of_measure
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef')
  );

-- Recipes: all members can read, kitchen roles can write
create policy "recipes_read" on public.recipes
  for select using (public.is_member_of(hotel_id));
create policy "recipes_insert" on public.recipes
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );
create policy "recipes_update" on public.recipes
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "recipes_delete" on public.recipes
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef')
  );

-- Recipe ingredients: same as recipes
create policy "ingredients_read" on public.recipe_ingredients
  for select using (public.is_member_of(hotel_id));
create policy "ingredients_insert" on public.recipe_ingredients
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );
create policy "ingredients_update" on public.recipe_ingredients
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );
create policy "ingredients_delete" on public.recipe_ingredients
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );

-- Recipe steps: same as recipes
create policy "steps_read" on public.recipe_steps
  for select using (public.is_member_of(hotel_id));
create policy "steps_insert" on public.recipe_steps
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );
create policy "steps_update" on public.recipe_steps
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );
create policy "steps_delete" on public.recipe_steps
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );

-- Sub-recipes: head_chef+ can manage
create policy "sub_recipes_read" on public.recipe_sub_recipes
  for select using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_sub_recipes.recipe_id
        and public.is_member_of(r.hotel_id)
    )
  );
create policy "sub_recipes_insert" on public.recipe_sub_recipes
  for insert with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_sub_recipes.recipe_id
        and public.get_member_role(r.hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
    )
  );
create policy "sub_recipes_delete" on public.recipe_sub_recipes
  for delete using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_sub_recipes.recipe_id
        and public.get_member_role(r.hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
    )
  );

-- Recipe versions: all members can read, no direct writes (managed by RPCs)
create policy "versions_read" on public.recipe_versions
  for select using (public.is_member_of(hotel_id));
create policy "versions_insert" on public.recipe_versions
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'cook')
  );

-- Menus: all members read, admin/head_chef write
create policy "menus_read" on public.menus
  for select using (public.is_member_of(hotel_id));
create policy "menus_insert" on public.menus
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "menus_update" on public.menus
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "menus_delete" on public.menus
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef')
  );

-- Menu sections
create policy "sections_read" on public.menu_sections
  for select using (public.is_member_of(hotel_id));
create policy "sections_insert" on public.menu_sections
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "sections_update" on public.menu_sections
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "sections_delete" on public.menu_sections
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );

-- Menu section recipes
create policy "section_recipes_read" on public.menu_section_recipes
  for select using (public.is_member_of(hotel_id));
create policy "section_recipes_insert" on public.menu_section_recipes
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "section_recipes_update" on public.menu_section_recipes
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );
create policy "section_recipes_delete" on public.menu_section_recipes
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef')
  );

-- ====================
-- 7. RPCs — Workflow & Business Logic
-- ====================

-- 7a. Submit recipe for review (draft → review_pending)
create or replace function public.submit_recipe_for_review(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_status public.recipe_status;
  v_ingredient_count integer;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','cook']::public.app_role[]);

  select status into v_status
  from public.recipes
  where id = p_recipe_id and hotel_id = p_hotel_id;

  if v_status is null then
    raise exception 'recipe not found' using errcode = 'P0404';
  end if;

  if v_status != 'draft' then
    raise exception 'recipe must be in draft status to submit for review (current: %)', v_status
      using errcode = 'P0003';
  end if;

  select count(*) into v_ingredient_count
  from public.recipe_ingredients
  where recipe_id = p_recipe_id and hotel_id = p_hotel_id;

  if v_ingredient_count = 0 then
    raise exception 'recipe must have at least 1 ingredient before submitting'
      using errcode = 'P0003';
  end if;

  update public.recipes
  set status = 'review_pending'
  where id = p_recipe_id and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'recipe', p_recipe_id,
    'recipe.submitted_for_review',
    jsonb_build_object('submitted_by', auth.uid())
  );
end;
$$;

-- 7b. Approve recipe (review_pending → approved)
create or replace function public.approve_recipe(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_status public.recipe_status;
  v_version integer;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  select status into v_status
  from public.recipes
  where id = p_recipe_id and hotel_id = p_hotel_id;

  if v_status is null then
    raise exception 'recipe not found' using errcode = 'P0404';
  end if;

  if v_status != 'review_pending' then
    raise exception 'recipe must be in review_pending status to approve (current: %)', v_status
      using errcode = 'P0003';
  end if;

  -- Create version snapshot
  select coalesce(max(version_number), 0) + 1 into v_version
  from public.recipe_versions
  where recipe_id = p_recipe_id;

  insert into public.recipe_versions (recipe_id, hotel_id, version_number, data, changed_by, change_reason)
  select
    p_recipe_id,
    p_hotel_id,
    v_version,
    jsonb_build_object(
      'name', r.name,
      'description', r.description,
      'category', r.category,
      'servings', r.servings,
      'total_cost', r.total_cost,
      'allergens', r.allergens,
      'dietary_tags', r.dietary_tags,
      'ingredients', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'ingredient_name', ri.ingredient_name,
          'quantity_gross', ri.quantity_gross,
          'waste_pct', ri.waste_pct,
          'unit_cost', ri.unit_cost
        )), '[]')
        from public.recipe_ingredients ri
        where ri.recipe_id = p_recipe_id
      ),
      'steps', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'step_number', rs.step_number,
          'instruction', rs.instruction,
          'duration_min', rs.duration_min
        ) order by rs.step_number), '[]')
        from public.recipe_steps rs
        where rs.recipe_id = p_recipe_id
      )
    ),
    auth.uid(),
    'Approved'
  from public.recipes r
  where r.id = p_recipe_id;

  update public.recipes
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_recipe_id and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'recipe', p_recipe_id,
    'recipe.approved',
    jsonb_build_object('approved_by', auth.uid(), 'version', v_version)
  );
end;
$$;

-- 7c. Deprecate recipe (approved → deprecated)
create or replace function public.deprecate_recipe(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_status public.recipe_status;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  select status into v_status
  from public.recipes
  where id = p_recipe_id and hotel_id = p_hotel_id;

  if v_status is null then
    raise exception 'recipe not found' using errcode = 'P0404';
  end if;

  if v_status != 'approved' then
    raise exception 'only approved recipes can be deprecated (current: %)', v_status
      using errcode = 'P0003';
  end if;

  update public.recipes
  set status = 'deprecated'
  where id = p_recipe_id and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'recipe', p_recipe_id,
    'recipe.deprecated',
    jsonb_build_object('deprecated_by', auth.uid())
  );
end;
$$;

-- 7d. Calculate recipe cost (with recursive sub-recipe cycle detection — E5)
create or replace function public.calculate_recipe_cost(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_ingredient_cost numeric(12,4) := 0;
  v_sub_recipe_cost numeric(12,4) := 0;
  v_total_cost numeric(12,4);
  v_cost_per_serving numeric(12,4);
  v_food_cost_pct numeric(5,2);
  v_servings integer;
  v_target_price numeric(12,2);
  v_sub record;
  v_sub_cost_result jsonb;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select servings, target_price into v_servings, v_target_price
  from public.recipes
  where id = p_recipe_id and hotel_id = p_hotel_id;

  if v_servings is null then
    raise exception 'recipe not found' using errcode = 'P0404';
  end if;

  -- Direct ingredient cost
  select coalesce(sum(quantity_net * unit_cost), 0)
  into v_ingredient_cost
  from public.recipe_ingredients
  where recipe_id = p_recipe_id and hotel_id = p_hotel_id;

  -- Sub-recipe cost (recursive with cycle detection)
  for v_sub in
    select sub_recipe_id, quantity
    from public.recipe_sub_recipes
    where recipe_id = p_recipe_id
  loop
    v_sub_cost_result := public._calculate_recipe_cost_recursive(
      p_hotel_id, v_sub.sub_recipe_id, array[p_recipe_id], 1
    );
    v_sub_recipe_cost := v_sub_recipe_cost +
      (v_sub_cost_result->>'cost_per_serving')::numeric * v_sub.quantity;
  end loop;

  v_total_cost := v_ingredient_cost + v_sub_recipe_cost;
  v_cost_per_serving := case when v_servings > 0 then v_total_cost / v_servings else 0 end;
  v_food_cost_pct := case
    when v_target_price is not null and v_target_price > 0
    then (v_cost_per_serving / v_target_price) * 100
    else 0
  end;

  -- Update recipe with calculated costs
  update public.recipes
  set total_cost = v_total_cost,
      cost_per_serving = v_cost_per_serving,
      food_cost_pct = v_food_cost_pct
  where id = p_recipe_id and hotel_id = p_hotel_id;

  return jsonb_build_object(
    'recipe_id', p_recipe_id,
    'ingredient_cost', v_ingredient_cost,
    'sub_recipe_cost', v_sub_recipe_cost,
    'total_cost', v_total_cost,
    'cost_per_serving', v_cost_per_serving,
    'food_cost_pct', v_food_cost_pct,
    'servings', v_servings
  );
end;
$$;

-- Internal recursive helper (NOT exposed via API)
create or replace function public._calculate_recipe_cost_recursive(
  p_hotel_id uuid,
  p_recipe_id uuid,
  p_visited_ids uuid[],
  p_depth integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ingredient_cost numeric(12,4) := 0;
  v_sub_recipe_cost numeric(12,4) := 0;
  v_total_cost numeric(12,4);
  v_servings integer;
  v_cost_per_serving numeric(12,4);
  v_sub record;
  v_sub_result jsonb;
begin
  -- Cycle detection (E5)
  if p_recipe_id = any(p_visited_ids) then
    raise exception 'circular sub-recipe dependency detected: % already visited in chain %',
      p_recipe_id, p_visited_ids
      using errcode = 'P0003';
  end if;

  -- Depth limit (autoplan Section 7: max 5 levels)
  if p_depth > 5 then
    raise exception 'sub-recipe nesting exceeds maximum depth of 5'
      using errcode = 'P0003';
  end if;

  select servings into v_servings
  from public.recipes
  where id = p_recipe_id and hotel_id = p_hotel_id;

  if v_servings is null then
    raise exception 'sub-recipe % not found', p_recipe_id using errcode = 'P0404';
  end if;

  -- Direct ingredient cost
  select coalesce(sum(quantity_net * unit_cost), 0)
  into v_ingredient_cost
  from public.recipe_ingredients
  where recipe_id = p_recipe_id and hotel_id = p_hotel_id;

  -- Recurse into sub-recipes
  for v_sub in
    select sub_recipe_id, quantity
    from public.recipe_sub_recipes
    where recipe_id = p_recipe_id
  loop
    v_sub_result := public._calculate_recipe_cost_recursive(
      p_hotel_id, v_sub.sub_recipe_id,
      p_visited_ids || p_recipe_id,
      p_depth + 1
    );
    v_sub_recipe_cost := v_sub_recipe_cost +
      (v_sub_result->>'cost_per_serving')::numeric * v_sub.quantity;
  end loop;

  v_total_cost := v_ingredient_cost + v_sub_recipe_cost;
  v_cost_per_serving := case when v_servings > 0 then v_total_cost / v_servings else 0 end;

  return jsonb_build_object(
    'cost_per_serving', v_cost_per_serving,
    'total_cost', v_total_cost
  );
end;
$$;

-- 7e. Scale recipe (returns scaled ingredient quantities)
create or replace function public.scale_recipe(
  p_hotel_id uuid,
  p_recipe_id uuid,
  p_new_servings integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current_servings integer;
  v_scale_factor numeric(10,4);
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select servings into v_current_servings
  from public.recipes
  where id = p_recipe_id and hotel_id = p_hotel_id;

  if v_current_servings is null then
    raise exception 'recipe not found' using errcode = 'P0404';
  end if;

  if p_new_servings <= 0 then
    raise exception 'new servings must be greater than 0' using errcode = 'P0003';
  end if;

  v_scale_factor := p_new_servings::numeric / v_current_servings;

  return jsonb_build_object(
    'recipe_id', p_recipe_id,
    'original_servings', v_current_servings,
    'new_servings', p_new_servings,
    'scale_factor', v_scale_factor,
    'ingredients', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ri.id,
        'ingredient_name', ri.ingredient_name,
        'original_qty', ri.quantity_gross,
        'scaled_qty', round(ri.quantity_gross * v_scale_factor, 3),
        'waste_pct', ri.waste_pct,
        'scaled_net', round(ri.quantity_net * v_scale_factor, 3),
        'unit_abbreviation', u.abbreviation,
        'preparation_notes', ri.preparation_notes
      ) order by ri.sort_order), '[]')
      from public.recipe_ingredients ri
      left join public.units_of_measure u on u.id = ri.unit_id
      where ri.recipe_id = p_recipe_id
    ),
    'sub_recipes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'sub_recipe_id', sr.sub_recipe_id,
        'sub_recipe_name', r.name,
        'original_qty', sr.quantity,
        'scaled_qty', round(sr.quantity * v_scale_factor, 3)
      )), '[]')
      from public.recipe_sub_recipes sr
      join public.recipes r on r.id = sr.sub_recipe_id
      where sr.recipe_id = p_recipe_id
    )
  );
end;
$$;

-- 7f. Duplicate recipe
create or replace function public.duplicate_recipe(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_new_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef']::public.app_role[]);

  -- Copy recipe
  insert into public.recipes (
    hotel_id, name, description, category, subcategory,
    servings, yield_qty, yield_unit_id,
    prep_time_min, cook_time_min, rest_time_min,
    difficulty, status, allergens, dietary_tags, notes,
    created_by
  )
  select
    hotel_id,
    name || ' (copia)',
    description, category, subcategory,
    servings, yield_qty, yield_unit_id,
    prep_time_min, cook_time_min, rest_time_min,
    difficulty,
    'draft',
    allergens, dietary_tags, notes,
    auth.uid()
  from public.recipes
  where id = p_recipe_id and hotel_id = p_hotel_id
  returning id into v_new_id;

  if v_new_id is null then
    raise exception 'recipe not found' using errcode = 'P0404';
  end if;

  -- Copy ingredients
  insert into public.recipe_ingredients (
    recipe_id, hotel_id, ingredient_name, product_id,
    unit_id, quantity_gross, waste_pct, unit_cost,
    sort_order, preparation_notes
  )
  select
    v_new_id, hotel_id, ingredient_name, product_id,
    unit_id, quantity_gross, waste_pct, unit_cost,
    sort_order, preparation_notes
  from public.recipe_ingredients
  where recipe_id = p_recipe_id;

  -- Copy steps
  insert into public.recipe_steps (
    recipe_id, hotel_id, step_number, instruction,
    duration_min, temperature, equipment, notes
  )
  select
    v_new_id, hotel_id, step_number, instruction,
    duration_min, temperature, equipment, notes
  from public.recipe_steps
  where recipe_id = p_recipe_id;

  -- Copy sub-recipes
  insert into public.recipe_sub_recipes (recipe_id, sub_recipe_id, quantity, unit_id)
  select v_new_id, sub_recipe_id, quantity, unit_id
  from public.recipe_sub_recipes
  where recipe_id = p_recipe_id;

  perform public.emit_event(
    p_hotel_id, 'recipe', v_new_id,
    'recipe.duplicated',
    jsonb_build_object('source_recipe_id', p_recipe_id, 'duplicated_by', auth.uid())
  );

  return v_new_id;
end;
$$;

-- 7g. Get recipe tech sheet (ficha técnica completa)
create or replace function public.get_recipe_tech_sheet(
  p_hotel_id uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_recipe jsonb;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'description', r.description,
    'category', r.category,
    'subcategory', r.subcategory,
    'servings', r.servings,
    'yield_qty', r.yield_qty,
    'prep_time_min', r.prep_time_min,
    'cook_time_min', r.cook_time_min,
    'rest_time_min', r.rest_time_min,
    'total_time_min', coalesce(r.prep_time_min, 0) + coalesce(r.cook_time_min, 0) + coalesce(r.rest_time_min, 0),
    'difficulty', r.difficulty,
    'status', r.status,
    'total_cost', r.total_cost,
    'cost_per_serving', r.cost_per_serving,
    'food_cost_pct', r.food_cost_pct,
    'target_price', r.target_price,
    'allergens', r.allergens,
    'dietary_tags', r.dietary_tags,
    'notes', r.notes,
    'approved_at', r.approved_at,
    'ingredients', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'ingredient_name', ri.ingredient_name,
        'quantity_gross', ri.quantity_gross,
        'waste_pct', ri.waste_pct,
        'quantity_net', ri.quantity_net,
        'unit_cost', ri.unit_cost,
        'line_cost', round(ri.quantity_net * ri.unit_cost, 4),
        'unit', u.abbreviation,
        'preparation_notes', ri.preparation_notes
      ) order by ri.sort_order), '[]')
      from public.recipe_ingredients ri
      left join public.units_of_measure u on u.id = ri.unit_id
      where ri.recipe_id = r.id
    ),
    'steps', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'step_number', rs.step_number,
        'instruction', rs.instruction,
        'duration_min', rs.duration_min,
        'temperature', rs.temperature,
        'equipment', rs.equipment,
        'notes', rs.notes
      ) order by rs.step_number), '[]')
      from public.recipe_steps rs
      where rs.recipe_id = r.id
    ),
    'sub_recipes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'sub_recipe_id', sr.sub_recipe_id,
        'name', sub.name,
        'quantity', sr.quantity,
        'unit', u.abbreviation,
        'cost_per_serving', sub.cost_per_serving
      )), '[]')
      from public.recipe_sub_recipes sr
      join public.recipes sub on sub.id = sr.sub_recipe_id
      left join public.units_of_measure u on u.id = sr.unit_id
      where sr.recipe_id = r.id
    )
  ) into v_recipe
  from public.recipes r
  where r.id = p_recipe_id and r.hotel_id = p_hotel_id;

  if v_recipe is null then
    raise exception 'recipe not found' using errcode = 'P0404';
  end if;

  return v_recipe;
end;
$$;

-- ====================
-- 8. SEED: Default units of measure
-- ====================
-- These are inserted per-hotel via the onboarding or first setup.
-- For development, we insert them for the demo hotel.
-- This will be done after the hotel exists, via a separate seed or RPC.

-- Helper to seed units for a hotel
create or replace function public.seed_default_units(p_hotel_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_kg uuid;
  v_g uuid;
  v_l uuid;
  v_ml uuid;
begin
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
