-- ============================================================================
-- M5 Inventario — ChefOS v2
-- Stock por lotes (FIFO), movimientos inmutables, mermas, alertas
-- MVP simplificado: sin conteo ciego, sin reservas evento, sin forensics
-- Auto-stock: trigger en goods_receipt_lines crea lotes automaticamente
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.location_type as enum (
  'dry',
  'refrigerated',
  'frozen',
  'ambient'
);

create type public.movement_type as enum (
  'reception',
  'consumption',
  'waste',
  'adjustment',
  'transfer',
  'return'
);

create type public.waste_type as enum (
  'expired',
  'damaged',
  'overproduction',
  'preparation',
  'other'
);

-- ====================
-- 2. TABLES
-- ====================

-- Storage locations (almacenes)
create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  name text not null,
  location_type public.location_type not null default 'ambient',
  parent_id uuid references public.storage_locations(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_storage_loc_hotel on public.storage_locations(hotel_id);
create unique index idx_storage_loc_hotel_name on public.storage_locations(hotel_id, name);

-- Stock lots (lotes — FIFO by expiry then received_at)
create table public.stock_lots (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  storage_location_id uuid references public.storage_locations(id) on delete set null,
  goods_receipt_line_id uuid references public.goods_receipt_lines(id) on delete set null,
  lot_number text,
  expiry_date date,
  initial_quantity numeric(10,3) not null check (initial_quantity >= 0),
  current_quantity numeric(10,3) not null check (current_quantity >= 0),
  unit_cost numeric(12,4),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_lots_hotel on public.stock_lots(hotel_id);
create index idx_lots_hotel_product on public.stock_lots(hotel_id, product_id);
create index idx_lots_fifo on public.stock_lots(hotel_id, product_id, expiry_date asc nulls last, received_at asc);
create index idx_lots_expiry on public.stock_lots(hotel_id, expiry_date) where current_quantity > 0;
create index idx_lots_receipt_line on public.stock_lots(goods_receipt_line_id) where goods_receipt_line_id is not null;

-- Stock movements (ledger inmutable)
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_id uuid references public.stock_lots(id) on delete set null,
  movement_type public.movement_type not null,
  quantity numeric(10,3) not null,
  unit_cost numeric(12,4),
  reference_type text,
  reference_id uuid,
  from_location_id uuid references public.storage_locations(id) on delete set null,
  to_location_id uuid references public.storage_locations(id) on delete set null,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_movements_hotel on public.stock_movements(hotel_id);
create index idx_movements_hotel_product on public.stock_movements(hotel_id, product_id);
create index idx_movements_lot on public.stock_movements(lot_id);
create index idx_movements_hotel_type on public.stock_movements(hotel_id, movement_type);
create index idx_movements_created on public.stock_movements(hotel_id, created_at desc);

-- Waste records (mermas)
create table public.waste_records (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_id uuid references public.stock_lots(id) on delete set null,
  quantity numeric(10,3) not null check (quantity > 0),
  waste_type public.waste_type not null,
  department text,
  reason text,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_waste_hotel on public.waste_records(hotel_id);
create index idx_waste_hotel_product on public.waste_records(hotel_id, product_id);
create index idx_waste_hotel_type on public.waste_records(hotel_id, waste_type);

-- ====================
-- 3. AUDIT TRIGGERS
-- ====================
create trigger audit_stock_lots
  after insert or update or delete on public.stock_lots
  for each row execute function public.audit_trigger_fn();

create trigger audit_waste_records
  after insert or update or delete on public.waste_records
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 4. RLS POLICIES
-- ====================

-- Storage locations
alter table public.storage_locations enable row level security;

create policy "storage_loc_read" on public.storage_locations
  for select using (public.is_member_of(hotel_id));
create policy "storage_loc_insert" on public.storage_locations
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );
create policy "storage_loc_update" on public.storage_locations
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );

-- Stock lots
alter table public.stock_lots enable row level security;

create policy "lots_read" on public.stock_lots
  for select using (public.is_member_of(hotel_id));
create policy "lots_insert" on public.stock_lots
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );
create policy "lots_update" on public.stock_lots
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );

-- Stock movements (append-only for non-admin)
alter table public.stock_movements enable row level security;

create policy "movements_read" on public.stock_movements
  for select using (public.is_member_of(hotel_id));
create policy "movements_insert" on public.stock_movements
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement', 'cook')
  );

-- Waste records
alter table public.waste_records enable row level security;

create policy "waste_read" on public.waste_records
  for select using (public.is_member_of(hotel_id));
create policy "waste_insert" on public.waste_records
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement', 'cook')
  );

-- ====================
-- 5. AUTO-STOCK FROM GOODS RECEIPTS
-- ====================
-- When goods_receipt_lines are inserted (accepted quality), auto-create stock lots
create or replace function public.auto_create_stock_lot()
returns trigger
language plpgsql
security definer
as $$
declare
  v_hotel_id uuid;
  v_product_id uuid;
  v_lot_id uuid;
  v_unit_cost numeric(12,4);
  v_received_by uuid;
begin
  -- Only for accepted or partial quality
  if new.quality_status = 'rejected' then
    return new;
  end if;

  -- Get context from parent chain
  select gr.hotel_id, gr.received_by
  into v_hotel_id, v_received_by
  from public.goods_receipts gr
  where gr.id = new.receipt_id;

  select pol.product_id
  into v_product_id
  from public.purchase_order_lines pol
  where pol.id = new.order_line_id;

  v_unit_cost := coalesce(new.unit_cost, (
    select pol.unit_price from public.purchase_order_lines pol
    where pol.id = new.order_line_id
  ));

  -- Create stock lot
  insert into public.stock_lots (
    hotel_id, product_id, goods_receipt_line_id,
    lot_number, expiry_date,
    initial_quantity, current_quantity, unit_cost
  ) values (
    v_hotel_id, v_product_id, new.id,
    new.lot_number, new.expiry_date,
    new.quantity_received, new.quantity_received, v_unit_cost
  ) returning id into v_lot_id;

  -- Create reception movement
  insert into public.stock_movements (
    hotel_id, product_id, lot_id, movement_type,
    quantity, unit_cost, reference_type, reference_id,
    created_by, notes
  ) values (
    v_hotel_id, v_product_id, v_lot_id, 'reception',
    new.quantity_received, v_unit_cost,
    'goods_receipt_line', new.id,
    v_received_by, 'Recepcion automatica'
  );

  return new;
end;
$$;

create trigger trg_auto_stock_on_receipt
  after insert on public.goods_receipt_lines
  for each row execute function public.auto_create_stock_lot();

-- ====================
-- 6. RPCs
-- ====================

-- 6a. Get stock levels (aggregated per product, with alerts)
create or replace function public.get_stock_levels(
  p_hotel_id uuid,
  p_location_id uuid default null
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
      'category_name', c.name,
      'storage_type', p.storage_type,
      'current_stock', s.total_qty,
      'unit', u.abbreviation,
      'min_stock', p.min_stock,
      'reorder_point', p.reorder_point,
      'avg_cost', s.avg_cost,
      'total_value', round(s.total_qty * coalesce(s.avg_cost, 0), 2),
      'earliest_expiry', s.earliest_expiry,
      'lot_count', s.lot_count,
      'alert_level', case
        when s.total_qty <= 0 then 'critical'
        when p.reorder_point is not null and s.total_qty <= p.reorder_point then 'low'
        when p.min_stock is not null and s.total_qty <= p.min_stock then 'warning'
        else 'ok'
      end
    ) order by
      case
        when s.total_qty <= 0 then 0
        when p.reorder_point is not null and s.total_qty <= p.reorder_point then 1
        else 2
      end,
      p.name
    ), '[]')
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join public.units_of_measure u on u.id = p.default_unit_id
    inner join (
      select
        sl.product_id,
        coalesce(sum(sl.current_quantity), 0) as total_qty,
        case when sum(sl.current_quantity) > 0
          then round(sum(sl.current_quantity * coalesce(sl.unit_cost, 0)) / nullif(sum(sl.current_quantity), 0), 4)
          else null
        end as avg_cost,
        min(sl.expiry_date) filter (where sl.current_quantity > 0) as earliest_expiry,
        count(*) filter (where sl.current_quantity > 0) as lot_count
      from public.stock_lots sl
      where sl.hotel_id = p_hotel_id
        and (p_location_id is null or sl.storage_location_id = p_location_id)
      group by sl.product_id
    ) s on s.product_id = p.id
    where p.hotel_id = p_hotel_id and p.is_active = true
  );
end;
$$;

-- 6b. Record waste (merma) — deducts from FIFO lot
create or replace function public.record_waste(
  p_hotel_id uuid,
  p_product_id uuid,
  p_lot_id uuid default null,
  p_quantity numeric default 1,
  p_waste_type public.waste_type default 'other',
  p_department text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_lot_id uuid;
  v_waste_id uuid;
  v_available numeric;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','cook']::public.app_role[]);

  -- Find lot: explicit or FIFO
  if p_lot_id is not null then
    v_lot_id := p_lot_id;
  else
    select id into v_lot_id
    from public.stock_lots
    where hotel_id = p_hotel_id
      and product_id = p_product_id
      and current_quantity > 0
    order by expiry_date asc nulls last, received_at asc
    limit 1;
  end if;

  if v_lot_id is not null then
    select current_quantity into v_available
    from public.stock_lots where id = v_lot_id;

    if v_available < p_quantity then
      raise exception 'insufficient stock in lot (available: %)', v_available using errcode = 'P0020';
    end if;

    -- Deduct from lot
    update public.stock_lots
    set current_quantity = current_quantity - p_quantity
    where id = v_lot_id;
  end if;

  -- Record waste
  insert into public.waste_records (
    hotel_id, product_id, lot_id, quantity,
    waste_type, department, reason, recorded_by
  ) values (
    p_hotel_id, p_product_id, v_lot_id, p_quantity,
    p_waste_type, p_department, p_reason, auth.uid()
  ) returning id into v_waste_id;

  -- Movement entry
  insert into public.stock_movements (
    hotel_id, product_id, lot_id, movement_type,
    quantity, reference_type, reference_id,
    created_by, notes
  ) values (
    p_hotel_id, p_product_id, v_lot_id, 'waste',
    -p_quantity, 'waste_record', v_waste_id,
    auth.uid(), coalesce(p_reason, p_waste_type::text)
  );

  perform public.emit_event(
    p_hotel_id, 'waste_record', v_waste_id, 'waste.recorded',
    jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity, 'type', p_waste_type)
  );

  return v_waste_id;
end;
$$;

-- 6c. Transfer stock between locations
create or replace function public.transfer_stock(
  p_hotel_id uuid,
  p_lot_id uuid,
  p_quantity numeric,
  p_to_location_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_product_id uuid;
  v_from_location_id uuid;
  v_available numeric;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','procurement']::public.app_role[]);

  select product_id, storage_location_id, current_quantity
  into v_product_id, v_from_location_id, v_available
  from public.stock_lots
  where id = p_lot_id and hotel_id = p_hotel_id;

  if v_product_id is null then
    raise exception 'lot not found' using errcode = 'P0404';
  end if;

  if v_available < p_quantity then
    raise exception 'insufficient stock (available: %)', v_available using errcode = 'P0020';
  end if;

  -- Update location
  update public.stock_lots
  set storage_location_id = p_to_location_id
  where id = p_lot_id;

  -- Movement
  insert into public.stock_movements (
    hotel_id, product_id, lot_id, movement_type,
    quantity, from_location_id, to_location_id,
    created_by, notes
  ) values (
    p_hotel_id, v_product_id, p_lot_id, 'transfer',
    p_quantity, v_from_location_id, p_to_location_id,
    auth.uid(), p_notes
  );
end;
$$;

-- 6d. Adjust stock (inventario manual)
create or replace function public.adjust_stock(
  p_hotel_id uuid,
  p_lot_id uuid,
  p_new_quantity numeric,
  p_reason text
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_product_id uuid;
  v_current numeric;
  v_diff numeric;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  select product_id, current_quantity into v_product_id, v_current
  from public.stock_lots
  where id = p_lot_id and hotel_id = p_hotel_id;

  if v_product_id is null then
    raise exception 'lot not found' using errcode = 'P0404';
  end if;

  v_diff := p_new_quantity - v_current;

  update public.stock_lots
  set current_quantity = p_new_quantity
  where id = p_lot_id;

  insert into public.stock_movements (
    hotel_id, product_id, lot_id, movement_type,
    quantity, created_by, notes
  ) values (
    p_hotel_id, v_product_id, p_lot_id, 'adjustment',
    v_diff, auth.uid(), p_reason
  );
end;
$$;

-- 6e. Check stock alerts
create or replace function public.check_stock_alerts(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_alerts jsonb := '[]';
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  -- Low stock alerts
  select coalesce(jsonb_agg(jsonb_build_object(
    'type', 'low_stock',
    'severity', case
      when coalesce(s.total, 0) <= 0 then 'critical'
      else 'warning'
    end,
    'product_id', p.id,
    'product_name', p.name,
    'current_stock', coalesce(s.total, 0),
    'reorder_point', p.reorder_point,
    'min_stock', p.min_stock
  )), '[]') into v_alerts
  from public.products p
  left join (
    select product_id, sum(current_quantity) as total
    from public.stock_lots
    where hotel_id = p_hotel_id and current_quantity > 0
    group by product_id
  ) s on s.product_id = p.id
  where p.hotel_id = p_hotel_id
    and p.is_active = true
    and p.reorder_point is not null
    and coalesce(s.total, 0) <= p.reorder_point;

  -- Expiry alerts (next 7 days)
  v_alerts := v_alerts || (
    select coalesce(jsonb_agg(jsonb_build_object(
      'type', 'expiry',
      'severity', case
        when sl.expiry_date <= current_date then 'critical'
        when sl.expiry_date <= current_date + 3 then 'warning'
        else 'info'
      end,
      'product_id', p.id,
      'product_name', p.name,
      'lot_number', sl.lot_number,
      'expiry_date', sl.expiry_date,
      'quantity', sl.current_quantity
    )), '[]')
    from public.stock_lots sl
    join public.products p on p.id = sl.product_id
    where sl.hotel_id = p_hotel_id
      and sl.current_quantity > 0
      and sl.expiry_date is not null
      and sl.expiry_date <= current_date + 7
  );

  return v_alerts;
end;
$$;

-- ====================
-- 7. SEED: Default storage locations
-- ====================
create or replace function public.seed_default_storage_locations(p_hotel_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.storage_locations (hotel_id, name, location_type, sort_order) values
    (p_hotel_id, 'Camara frigorifica', 'refrigerated', 1),
    (p_hotel_id, 'Congelador', 'frozen', 2),
    (p_hotel_id, 'Almacen seco', 'dry', 3),
    (p_hotel_id, 'Economato', 'ambient', 4)
  on conflict (hotel_id, name) do nothing;
end;
$$;
