-- ============================================================================
-- M3 Extendido — ChefOS v2
-- Apendice A del PRD: proveedor_config, incidencia_proveedor, precio_historial,
-- referencia_proveedor (conversiones)
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.incident_type as enum (
  'delay',
  'quality',
  'quantity',
  'wrong_product',
  'no_delivery',
  'other'
);

create type public.incident_severity as enum (
  'info',
  'warning',
  'critical'
);

-- ====================
-- 2. TABLES
-- ====================

-- Supplier config: lead times, cut-off, min order, reception window
create table public.supplier_configs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  delivery_days jsonb not null default '[]',         -- ['mon','tue',...]
  cutoff_time time,                                  -- hora_corte_pedido
  lead_time_hours integer,                           -- lead_time_min_horas
  min_order_amount numeric(12,2),
  min_order_units numeric(10,3),
  reception_window_start time,
  reception_window_end time,
  allows_urgent_delivery boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, supplier_id)
);
create index idx_supplier_configs_hotel on public.supplier_configs(hotel_id);

-- Supplier incidents
create table public.supplier_incidents (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  incident_type public.incident_type not null,
  description text,
  severity public.incident_severity not null default 'warning',
  occurred_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_supplier_incidents_hotel on public.supplier_incidents(hotel_id);
create index idx_supplier_incidents_supplier on public.supplier_incidents(supplier_id, occurred_at desc);

-- Price history (auto-populated via trigger)
create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  offer_id uuid references public.supplier_offers(id) on delete set null,
  recorded_at timestamptz not null default now(),
  old_price numeric(12,4),
  new_price numeric(12,4) not null,
  variation_pct numeric(6,2),                         -- (new-old)/old * 100
  created_at timestamptz not null default now()
);
create index idx_price_history_product on public.price_history(hotel_id, product_id, recorded_at desc);
create index idx_price_history_supplier on public.price_history(hotel_id, supplier_id, recorded_at desc);

-- Product-supplier references (codigo proveedor + conversiones)
create table public.product_supplier_refs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  supplier_code text not null,                        -- codigo_proveedor
  supplier_name text,                                 -- nombre como aparece en factura
  purchase_unit_id uuid references public.units_of_measure(id) on delete set null,
  conversion_factor numeric(12,4) not null default 1, -- 1 caja = 12 kg → 12
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, supplier_id, supplier_code)
);
create index idx_product_refs_hotel on public.product_supplier_refs(hotel_id);
create index idx_product_refs_product on public.product_supplier_refs(product_id);

-- ====================
-- 3. TRIGGERS: updated_at + audit
-- ====================
create trigger set_supplier_configs_updated_at
  before update on public.supplier_configs
  for each row execute function public.set_updated_at();

create trigger set_product_refs_updated_at
  before update on public.product_supplier_refs
  for each row execute function public.set_updated_at();

create trigger audit_supplier_configs
  after insert or update or delete on public.supplier_configs
  for each row execute function public.audit_trigger_fn();

create trigger audit_supplier_incidents
  after insert or update or delete on public.supplier_incidents
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 4. TRIGGER: auto-register price changes on supplier_offers
-- ====================
create or replace function public.log_offer_price_change()
returns trigger
language plpgsql
as $$
declare
  v_variation numeric(6,2);
begin
  -- Only log when price actually changes
  if tg_op = 'UPDATE' and old.unit_price is distinct from new.unit_price then
    v_variation := case
      when old.unit_price is null or old.unit_price = 0 then null
      else round(((new.unit_price - old.unit_price) / old.unit_price * 100)::numeric, 2)
    end;

    insert into public.price_history (
      hotel_id, product_id, supplier_id, offer_id,
      old_price, new_price, variation_pct
    ) values (
      new.hotel_id, new.product_id, new.supplier_id, new.id,
      old.unit_price, new.unit_price, v_variation
    );
  elsif tg_op = 'INSERT' then
    -- Log initial price as new entry (old_price null)
    insert into public.price_history (
      hotel_id, product_id, supplier_id, offer_id,
      old_price, new_price, variation_pct
    ) values (
      new.hotel_id, new.product_id, new.supplier_id, new.id,
      null, new.unit_price, null
    );
  end if;
  return new;
end;
$$;

create trigger log_offer_price_change_trg
  after insert or update of unit_price on public.supplier_offers
  for each row execute function public.log_offer_price_change();

-- ====================
-- 5. RLS
-- ====================
alter table public.supplier_configs enable row level security;
alter table public.supplier_incidents enable row level security;
alter table public.price_history enable row level security;
alter table public.product_supplier_refs enable row level security;

-- supplier_configs
create policy "supplier_configs_read" on public.supplier_configs
  for select using (public.is_member_of(hotel_id));
create policy "supplier_configs_write" on public.supplier_configs
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','procurement')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','procurement')
  );

-- supplier_incidents
create policy "supplier_incidents_read" on public.supplier_incidents
  for select using (public.is_member_of(hotel_id));
create policy "supplier_incidents_insert" on public.supplier_incidents
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','procurement','warehouse')
  );
create policy "supplier_incidents_update" on public.supplier_incidents
  for update using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','procurement')
  );

-- price_history: read-only for members (triggers populate it)
create policy "price_history_read" on public.price_history
  for select using (public.is_member_of(hotel_id));

-- product_supplier_refs
create policy "product_refs_read" on public.product_supplier_refs
  for select using (public.is_member_of(hotel_id));
create policy "product_refs_write" on public.product_supplier_refs
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','procurement')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','procurement')
  );

-- ====================
-- 6. RPCs
-- ====================

-- 6a. Record supplier incident
create or replace function public.record_supplier_incident(
  p_hotel_id uuid,
  p_supplier_id uuid,
  p_incident_type public.incident_type,
  p_description text,
  p_severity public.incident_severity default 'warning',
  p_purchase_order_id uuid default null,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','procurement','warehouse']::public.app_role[]);

  insert into public.supplier_incidents (
    hotel_id, supplier_id, purchase_order_id,
    incident_type, description, severity, occurred_at, recorded_by
  ) values (
    p_hotel_id, p_supplier_id, p_purchase_order_id,
    p_incident_type, p_description, p_severity, p_occurred_at, auth.uid()
  )
  returning id into v_id;

  perform public.emit_event(
    p_hotel_id,
    'supplier_incident',
    v_id,
    'proveedor.incidencia_created',
    jsonb_build_object(
      'supplier_id', p_supplier_id,
      'incident_type', p_incident_type,
      'severity', p_severity,
      'purchase_order_id', p_purchase_order_id
    )
  );

  return v_id;
end;
$$;

-- 6b. Get supplier metrics (on-time %, incidents 30d, avg delay)
create or replace function public.get_supplier_metrics(
  p_hotel_id uuid,
  p_supplier_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_total_orders integer;
  v_completed_orders integer;
  v_incidents_30d integer;
  v_critical_incidents_30d integer;
  v_rating numeric(2,1);
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select count(*) into v_total_orders
  from public.purchase_orders
  where hotel_id = p_hotel_id and supplier_id = p_supplier_id;

  select count(*) into v_completed_orders
  from public.purchase_orders
  where hotel_id = p_hotel_id and supplier_id = p_supplier_id
    and status = 'received';

  select count(*) into v_incidents_30d
  from public.supplier_incidents
  where hotel_id = p_hotel_id and supplier_id = p_supplier_id
    and occurred_at >= now() - interval '30 days';

  select count(*) into v_critical_incidents_30d
  from public.supplier_incidents
  where hotel_id = p_hotel_id and supplier_id = p_supplier_id
    and severity = 'critical'
    and occurred_at >= now() - interval '30 days';

  select rating into v_rating
  from public.suppliers where id = p_supplier_id and hotel_id = p_hotel_id;

  return jsonb_build_object(
    'supplier_id', p_supplier_id,
    'total_orders', v_total_orders,
    'completed_orders', v_completed_orders,
    'completion_rate_pct', case
      when v_total_orders = 0 then null
      else round((v_completed_orders::numeric / v_total_orders * 100), 1)
    end,
    'incidents_30d', v_incidents_30d,
    'critical_incidents_30d', v_critical_incidents_30d,
    'rating', v_rating
  );
end;
$$;

-- 6c. Get price trend for product
create or replace function public.get_price_trend(
  p_hotel_id uuid,
  p_product_id uuid,
  p_months integer default 6
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
      'recorded_at', ph.recorded_at,
      'supplier_name', s.name,
      'supplier_id', ph.supplier_id,
      'old_price', ph.old_price,
      'new_price', ph.new_price,
      'variation_pct', ph.variation_pct
    ) order by ph.recorded_at desc), '[]')
    from public.price_history ph
    join public.suppliers s on s.id = ph.supplier_id
    where ph.hotel_id = p_hotel_id
      and ph.product_id = p_product_id
      and ph.recorded_at >= now() - (p_months || ' months')::interval
  );
end;
$$;

-- 6d. Match product by supplier code (for OCR albaran)
create or replace function public.match_product_by_supplier_code(
  p_hotel_id uuid,
  p_supplier_id uuid,
  p_supplier_code text
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
    'ref_id', psr.id,
    'product_id', psr.product_id,
    'product_name', p.name,
    'conversion_factor', psr.conversion_factor,
    'purchase_unit', u.abbreviation,
    'default_unit', du.abbreviation
  ) into v_result
  from public.product_supplier_refs psr
  join public.products p on p.id = psr.product_id
  left join public.units_of_measure u on u.id = psr.purchase_unit_id
  left join public.units_of_measure du on du.id = p.default_unit_id
  where psr.hotel_id = p_hotel_id
    and psr.supplier_id = p_supplier_id
    and psr.supplier_code = p_supplier_code
  limit 1;

  return v_result;
end;
$$;
