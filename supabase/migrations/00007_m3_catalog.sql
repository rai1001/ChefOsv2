-- ============================================================================
-- M3 Catálogo y Proveedores — ChefOS v2
-- Productos, categorías, proveedores, ofertas, aliases
-- units_of_measure ya existe (creado en M2)
-- Decisiones autoplan:
--   - CRUD vía Supabase client + RLS, RPCs solo para lógica compleja
--   - Import masivo aceptado (autoplan #4: onboarding crítico)
--   - Tablas del Apéndice A excluidas del MVP (proveedor_config, etc.)
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.storage_type as enum (
  'ambient',
  'refrigerated',
  'frozen'
);

create type public.alias_source as enum (
  'manual',
  'ocr',
  'voice'
);

-- ====================
-- 2. TABLES
-- ====================

-- Product categories (hierarchical)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_categories_hotel on public.categories(hotel_id);
create index idx_categories_parent on public.categories(parent_id);
create unique index idx_categories_hotel_name on public.categories(hotel_id, name);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  sku text,
  default_unit_id uuid references public.units_of_measure(id) on delete set null,
  min_stock numeric(10,3),
  max_stock numeric(10,3),
  reorder_point numeric(10,3),
  allergens jsonb not null default '[]',
  storage_type public.storage_type not null default 'ambient',
  shelf_life_days integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_hotel on public.products(hotel_id);
create index idx_products_hotel_category on public.products(hotel_id, category_id);
create index idx_products_hotel_name on public.products(hotel_id, name);
create index idx_products_hotel_sku on public.products(hotel_id, sku) where sku is not null;

-- Product aliases (for OCR/voice matching)
create table public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  alias_name text not null,
  source_type public.alias_source not null default 'manual',
  confidence_score numeric(3,2) not null default 1.00,
  created_at timestamptz not null default now()
);

create index idx_aliases_product on public.product_aliases(product_id);
create index idx_aliases_hotel_name on public.product_aliases(hotel_id, alias_name);

-- Suppliers
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  tax_id text,
  payment_terms text,
  delivery_days jsonb not null default '[]',
  min_order_amount numeric(12,2),
  rating numeric(2,1) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_suppliers_hotel on public.suppliers(hotel_id);
create index idx_suppliers_hotel_name on public.suppliers(hotel_id, name);

-- Supplier offers (prices per product per supplier)
create table public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_id uuid references public.units_of_measure(id) on delete set null,
  unit_price numeric(12,4) not null,
  min_quantity numeric(10,3),
  valid_from date,
  valid_to date,
  is_preferred boolean not null default false,
  sku_supplier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_offers_hotel on public.supplier_offers(hotel_id);
create index idx_offers_supplier on public.supplier_offers(supplier_id);
create index idx_offers_product on public.supplier_offers(product_id);
create index idx_offers_preferred on public.supplier_offers(hotel_id, product_id) where is_preferred = true;

-- ====================
-- 3. UPDATED_AT TRIGGERS
-- ====================
create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create trigger set_offers_updated_at
  before update on public.supplier_offers
  for each row execute function public.set_updated_at();

-- ====================
-- 4. AUDIT TRIGGERS
-- ====================
create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function public.audit_trigger_fn();

create trigger audit_suppliers
  after insert or update or delete on public.suppliers
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 5. RLS POLICIES
-- ====================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_aliases enable row level security;
alter table public.suppliers enable row level security;
alter table public.supplier_offers enable row level security;

-- Categories: all members read, admin/head_chef/procurement write
create policy "categories_read" on public.categories
  for select using (public.is_member_of(hotel_id));
create policy "categories_insert" on public.categories
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );
create policy "categories_update" on public.categories
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );

-- Products: all read, kitchen + procurement write
create policy "products_read" on public.products
  for select using (public.is_member_of(hotel_id));
create policy "products_insert" on public.products
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );
create policy "products_update" on public.products
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );
create policy "products_delete" on public.products
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

-- Product aliases: same as products
create policy "aliases_read" on public.product_aliases
  for select using (public.is_member_of(hotel_id));
create policy "aliases_insert" on public.product_aliases
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );
create policy "aliases_delete" on public.product_aliases
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );

-- Suppliers: all read, procurement + admin write
create policy "suppliers_read" on public.suppliers
  for select using (public.is_member_of(hotel_id));
create policy "suppliers_insert" on public.suppliers
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );
create policy "suppliers_update" on public.suppliers
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );
create policy "suppliers_delete" on public.suppliers
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin')
  );

-- Supplier offers: all read, procurement + admin write
create policy "offers_read" on public.supplier_offers
  for select using (public.is_member_of(hotel_id));
create policy "offers_insert" on public.supplier_offers
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );
create policy "offers_update" on public.supplier_offers
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );
create policy "offers_delete" on public.supplier_offers
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );

-- ====================
-- 6. RPCs
-- ====================

-- 6a. Set preferred offer (only one per product per hotel)
create or replace function public.set_preferred_offer(
  p_hotel_id uuid,
  p_offer_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_product_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','procurement']::public.app_role[]);

  -- Get the product_id for this offer
  select product_id into v_product_id
  from public.supplier_offers
  where id = p_offer_id and hotel_id = p_hotel_id;

  if v_product_id is null then
    raise exception 'offer not found' using errcode = 'P0404';
  end if;

  -- Unset any existing preferred for this product
  update public.supplier_offers
  set is_preferred = false
  where hotel_id = p_hotel_id
    and product_id = v_product_id
    and is_preferred = true;

  -- Set new preferred
  update public.supplier_offers
  set is_preferred = true
  where id = p_offer_id and hotel_id = p_hotel_id;
end;
$$;

-- 6b. Search products (full-text with optional category filter)
create or replace function public.search_products(
  p_hotel_id uuid,
  p_query text,
  p_category_id uuid default null
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
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'sku', p.sku,
      'category_name', c.name,
      'storage_type', p.storage_type,
      'is_active', p.is_active,
      'preferred_price', (
        select so.unit_price
        from public.supplier_offers so
        where so.product_id = p.id and so.is_preferred = true
        limit 1
      ),
      'preferred_supplier', (
        select s.name
        from public.supplier_offers so
        join public.suppliers s on s.id = so.supplier_id
        where so.product_id = p.id and so.is_preferred = true
        limit 1
      )
    ) order by p.name), '[]')
    from public.products p
    left join public.categories c on c.id = p.category_id
    where p.hotel_id = p_hotel_id
      and p.is_active = true
      and p.name ilike '%' || p_query || '%'
      and (p_category_id is null or p.category_id = p_category_id)
  );
end;
$$;

-- 6c. Get product with all offers
create or replace function public.get_product_with_offers(
  p_hotel_id uuid,
  p_product_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_result jsonb;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'sku', p.sku,
    'category_name', c.name,
    'category_id', p.category_id,
    'default_unit', u.abbreviation,
    'min_stock', p.min_stock,
    'max_stock', p.max_stock,
    'reorder_point', p.reorder_point,
    'allergens', p.allergens,
    'storage_type', p.storage_type,
    'shelf_life_days', p.shelf_life_days,
    'offers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', so.id,
        'supplier_id', so.supplier_id,
        'supplier_name', s.name,
        'unit_price', so.unit_price,
        'unit', ou.abbreviation,
        'min_quantity', so.min_quantity,
        'valid_from', so.valid_from,
        'valid_to', so.valid_to,
        'is_preferred', so.is_preferred,
        'sku_supplier', so.sku_supplier
      ) order by so.is_preferred desc, so.unit_price asc), '[]')
      from public.supplier_offers so
      join public.suppliers s on s.id = so.supplier_id
      left join public.units_of_measure ou on ou.id = so.unit_id
      where so.product_id = p.id and so.hotel_id = p_hotel_id
    ),
    'aliases', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', pa.id,
        'alias_name', pa.alias_name,
        'source_type', pa.source_type
      )), '[]')
      from public.product_aliases pa
      where pa.product_id = p.id
    )
  ) into v_result
  from public.products p
  left join public.categories c on c.id = p.category_id
  left join public.units_of_measure u on u.id = p.default_unit_id
  where p.id = p_product_id and p.hotel_id = p_hotel_id;

  if v_result is null then
    raise exception 'product not found' using errcode = 'P0404';
  end if;

  return v_result;
end;
$$;

-- 6d. Compare supplier prices for multiple products
create or replace function public.compare_supplier_prices(
  p_hotel_id uuid,
  p_product_ids uuid[]
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
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', p.id,
      'product_name', p.name,
      'offers', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'supplier_name', s.name,
          'unit_price', so.unit_price,
          'unit', u.abbreviation,
          'is_preferred', so.is_preferred,
          'valid_to', so.valid_to
        ) order by so.unit_price asc), '[]')
        from public.supplier_offers so
        join public.suppliers s on s.id = so.supplier_id
        left join public.units_of_measure u on u.id = so.unit_id
        where so.product_id = p.id
          and so.hotel_id = p_hotel_id
          and (so.valid_to is null or so.valid_to >= current_date)
      )
    ) order by p.name), '[]')
    from public.products p
    where p.id = any(p_product_ids) and p.hotel_id = p_hotel_id
  );
end;
$$;

-- 6e. Import products in bulk (for onboarding)
create or replace function public.import_products_bulk(
  p_hotel_id uuid,
  p_products jsonb
)
returns integer
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_count integer := 0;
  v_product jsonb;
  v_category_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','procurement']::public.app_role[]);

  for v_product in select * from jsonb_array_elements(p_products)
  loop
    -- Find or create category
    if v_product->>'category' is not null then
      select id into v_category_id
      from public.categories
      where hotel_id = p_hotel_id
        and name = v_product->>'category';

      if v_category_id is null then
        insert into public.categories (hotel_id, name)
        values (p_hotel_id, v_product->>'category')
        returning id into v_category_id;
      end if;
    else
      v_category_id := null;
    end if;

    -- Insert product (skip duplicates by name)
    insert into public.products (
      hotel_id, category_id, name, description, sku,
      storage_type, shelf_life_days
    ) values (
      p_hotel_id,
      v_category_id,
      v_product->>'name',
      v_product->>'description',
      v_product->>'sku',
      coalesce((v_product->>'storage_type')::public.storage_type, 'ambient'),
      (v_product->>'shelf_life_days')::integer
    )
    on conflict do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ====================
-- 7. ADD FK: recipe_ingredients.product_id → products
-- ====================
-- Now that products table exists, add the foreign key constraint
alter table public.recipe_ingredients
  add constraint fk_ingredient_product
  foreign key (product_id) references public.products(id) on delete set null;

-- ====================
-- 8. SEED: Default product categories
-- ====================
create or replace function public.seed_default_categories(p_hotel_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.categories (hotel_id, name, sort_order) values
    (p_hotel_id, 'Carnes', 1),
    (p_hotel_id, 'Pescados y mariscos', 2),
    (p_hotel_id, 'Verduras y hortalizas', 3),
    (p_hotel_id, 'Frutas', 4),
    (p_hotel_id, 'Lácteos y huevos', 5),
    (p_hotel_id, 'Especias y condimentos', 6),
    (p_hotel_id, 'Aceites y vinagres', 7),
    (p_hotel_id, 'Panadería y harinas', 8),
    (p_hotel_id, 'Conservas y secos', 9),
    (p_hotel_id, 'Congelados', 10),
    (p_hotel_id, 'Bebidas', 11),
    (p_hotel_id, 'Limpieza y desechables', 12)
  on conflict (hotel_id, name) do nothing;
end;
$$;
