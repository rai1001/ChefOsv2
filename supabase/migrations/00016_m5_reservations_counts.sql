-- ============================================================================
-- M5 Avanzado — ChefOS v2
-- Reservas FIFO por evento, conteos ciegos, forensics, reglas caducidad
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.reservation_status as enum (
  'pending',    -- creada, sin consumir
  'partial',    -- consumida parcialmente
  'consumed',   -- consumida completamente
  'released'    -- liberada sin consumo
);

create type public.count_status as enum (
  'open',
  'in_progress',
  'review',
  'closed'
);

create type public.count_type as enum (
  'full',       -- conteo total del almacen
  'partial',    -- conteo por ubicacion
  'blind'       -- conteo ciego (sin ver cantidades esperadas)
);

create type public.expiry_treatment as enum (
  'fresh',
  'cooked',
  'frozen',
  'preserved',
  'chilled',
  'other'
);

-- ====================
-- 2. ALTER EXISTING TABLES
-- ====================
alter table public.events
  add column if not exists actual_cost numeric(12,2),
  add column if not exists theoretical_cost numeric(12,2);

-- ====================
-- 3. TABLES
-- ====================

-- Reservas de stock por evento (FIFO)
create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_id uuid references public.stock_lots(id) on delete set null,
  qty_reserved numeric(10,3) not null check (qty_reserved > 0),
  qty_consumed numeric(10,3) not null default 0 check (qty_consumed >= 0),
  status public.reservation_status not null default 'pending',
  is_shortfall boolean not null default false,   -- true = stock insuficiente
  unit_cost_at_reservation numeric(12,4),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_reservations_hotel on public.stock_reservations(hotel_id);
create index idx_reservations_event on public.stock_reservations(event_id);
create index idx_reservations_hotel_product on public.stock_reservations(hotel_id, product_id);
create index idx_reservations_lot on public.stock_reservations(lot_id)
  where lot_id is not null;
create index idx_reservations_status on public.stock_reservations(hotel_id, status)
  where status in ('pending', 'partial');

-- Reglas de caducidad por tratamiento/producto
create table public.expiry_rules (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,   -- null = regla general
  treatment public.expiry_treatment not null default 'fresh',
  max_days_after_opening integer,
  max_days_ambient integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, product_id, treatment)
);
create index idx_expiry_rules_hotel on public.expiry_rules(hotel_id);
create index idx_expiry_rules_product on public.expiry_rules(hotel_id, product_id);

-- Sesiones de conteo de inventario
create table public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  count_type public.count_type not null default 'full',
  status public.count_status not null default 'open',
  is_blind boolean not null default false,
  location_id uuid references public.storage_locations(id) on delete set null,
  label text,
  notes text,
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_counts_hotel on public.stock_counts(hotel_id);
create index idx_counts_hotel_status on public.stock_counts(hotel_id, status);

-- Líneas del conteo (una por producto/lote)
create table public.stock_count_lines (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.stock_counts(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  lot_id uuid references public.stock_lots(id) on delete set null,
  expected_qty numeric(10,3),       -- sistema (oculto en modo ciego)
  counted_qty numeric(10,3),        -- introducido por el operario
  variance_qty numeric(10,3) generated always as (
    case
      when counted_qty is not null and expected_qty is not null
        then counted_qty - expected_qty
      else null
    end
  ) stored,
  adjustment_applied boolean not null default false,
  notes text,
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_count_lines_count on public.stock_count_lines(count_id);
create index idx_count_lines_hotel on public.stock_count_lines(hotel_id);
create index idx_count_lines_product on public.stock_count_lines(hotel_id, product_id);

-- ====================
-- 4. TRIGGERS: updated_at + audit
-- ====================
create trigger set_reservations_updated_at
  before update on public.stock_reservations
  for each row execute function public.set_updated_at();

create trigger set_expiry_rules_updated_at
  before update on public.expiry_rules
  for each row execute function public.set_updated_at();

create trigger set_counts_updated_at
  before update on public.stock_counts
  for each row execute function public.set_updated_at();

create trigger audit_stock_reservations
  after insert or update or delete on public.stock_reservations
  for each row execute function public.audit_trigger_fn();

create trigger audit_stock_counts
  after insert or update or delete on public.stock_counts
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 5. RLS
-- ====================
alter table public.stock_reservations enable row level security;
alter table public.expiry_rules enable row level security;
alter table public.stock_counts enable row level security;
alter table public.stock_count_lines enable row level security;

-- stock_reservations
create policy "reservations_read" on public.stock_reservations
  for select using (public.is_member_of(hotel_id));
create policy "reservations_write" on public.stock_reservations
  for all using (
    public.get_member_role(hotel_id) in (
      'superadmin','direction','admin','head_chef','sous_chef','warehouse'
    )
  ) with check (
    public.get_member_role(hotel_id) in (
      'superadmin','direction','admin','head_chef','sous_chef','warehouse'
    )
  );

-- expiry_rules
create policy "expiry_rules_read" on public.expiry_rules
  for select using (public.is_member_of(hotel_id));
create policy "expiry_rules_write" on public.expiry_rules
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef')
  );

-- stock_counts
create policy "counts_read" on public.stock_counts
  for select using (public.is_member_of(hotel_id));
create policy "counts_write" on public.stock_counts
  for all using (
    public.get_member_role(hotel_id) in (
      'superadmin','direction','admin','head_chef','warehouse'
    )
  ) with check (
    public.get_member_role(hotel_id) in (
      'superadmin','direction','admin','head_chef','warehouse'
    )
  );

-- stock_count_lines: escritura más amplia (cualquier miembro puede contar)
create policy "count_lines_read" on public.stock_count_lines
  for select using (public.is_member_of(hotel_id));
create policy "count_lines_insert" on public.stock_count_lines
  for insert with check (
    public.get_member_role(hotel_id) in (
      'superadmin','direction','admin','head_chef','sous_chef','warehouse'
    )
  );
create policy "count_lines_update" on public.stock_count_lines
  for update using (
    public.get_member_role(hotel_id) in (
      'superadmin','direction','admin','head_chef','sous_chef','warehouse'
    )
  );

-- ====================
-- 6. RPCs
-- ====================

-- 6a. reserve_stock_for_event — FIFO desde event_menus → recetas → ingredientes
create or replace function public.reserve_stock_for_event(
  p_hotel_id uuid,
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_event record;
  v_ingredient record;
  v_lot record;
  v_qty_remaining numeric(10,3);
  v_qty_to_reserve numeric(10,3);
  v_reserved_count integer := 0;
  v_shortfall_count integer := 0;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','warehouse']::public.app_role[]);

  select * into v_event
  from public.events
  where id = p_event_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'evento no encontrado' using errcode = 'P0010';
  end if;

  if v_event.status not in ('confirmed', 'in_operation') then
    raise exception 'el evento debe estar confirmado para reservar stock' using errcode = 'P0020';
  end if;

  -- Eliminar reservas pendientes previas para re-calcular
  delete from public.stock_reservations
  where hotel_id = p_hotel_id
    and event_id = p_event_id
    and status = 'pending';

  -- Agregar ingredientes necesarios: event → menus → sections → recipes → ingredients
  for v_ingredient in (
    select
      ri.product_id,
      sum(
        ri.quantity_gross *
        (
          coalesce(em.servings_override, v_event.guest_count, 1)::numeric
          * coalesce(msr.servings_override, 1)::numeric
          / nullif(r.servings, 0)::numeric
        )
      ) as qty_needed
    from public.event_menus em
    join public.menus m on m.id = em.menu_id
    join public.menu_sections ms on ms.menu_id = m.id
    join public.menu_section_recipes msr on msr.section_id = ms.id
    join public.recipes r on r.id = msr.recipe_id
    join public.recipe_ingredients ri on ri.recipe_id = r.id
    where em.event_id = p_event_id
      and ri.product_id is not null
      and r.status = 'approved'
    group by ri.product_id
  )
  loop
    v_qty_remaining := v_ingredient.qty_needed;

    -- FIFO: lotes ordenados por fecha de caducidad ASC (primero los que caducan antes)
    for v_lot in (
      select id, current_quantity, unit_cost, expiry_date
      from public.stock_lots
      where hotel_id = p_hotel_id
        and product_id = v_ingredient.product_id
        and current_quantity > 0
      order by expiry_date asc nulls last, received_at asc
    )
    loop
      exit when v_qty_remaining <= 0;

      v_qty_to_reserve := least(v_qty_remaining, v_lot.current_quantity);

      insert into public.stock_reservations (
        hotel_id, event_id, product_id, lot_id,
        qty_reserved, qty_consumed, status, is_shortfall,
        unit_cost_at_reservation, created_by
      ) values (
        p_hotel_id, p_event_id, v_ingredient.product_id, v_lot.id,
        v_qty_to_reserve, 0, 'pending', false,
        v_lot.unit_cost, auth.uid()
      );

      v_qty_remaining := v_qty_remaining - v_qty_to_reserve;
      v_reserved_count := v_reserved_count + 1;
    end loop;

    -- Shortfall: stock insuficiente para cubrir la necesidad
    if v_qty_remaining > 0 then
      insert into public.stock_reservations (
        hotel_id, event_id, product_id, lot_id,
        qty_reserved, qty_consumed, status, is_shortfall,
        unit_cost_at_reservation, created_by
      ) values (
        p_hotel_id, p_event_id, v_ingredient.product_id, null,
        v_qty_remaining, 0, 'pending', true,
        null, auth.uid()
      );
      v_shortfall_count := v_shortfall_count + 1;
    end if;
  end loop;

  perform public.emit_event(
    p_hotel_id, 'event', p_event_id, 'inventario.stock_reservado',
    jsonb_build_object(
      'event_id', p_event_id,
      'reserved_lines', v_reserved_count,
      'shortfalls', v_shortfall_count
    )
  );

  return jsonb_build_object(
    'event_id', p_event_id,
    'reserved_lines', v_reserved_count,
    'shortfalls', v_shortfall_count
  );
end;
$$;

-- 6b. consume_reservation — convierte reserva en consumo real
create or replace function public.consume_reservation(
  p_hotel_id uuid,
  p_reservation_id uuid,
  p_qty numeric
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_res record;
  v_new_consumed numeric(10,3);
  v_new_status public.reservation_status;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','warehouse']::public.app_role[]);

  select * into v_res
  from public.stock_reservations
  where id = p_reservation_id and hotel_id = p_hotel_id
  for update;

  if not found then
    raise exception 'reserva no encontrada' using errcode = 'P0010';
  end if;

  if v_res.is_shortfall then
    raise exception 'no se puede consumir un shortfall' using errcode = 'P0030';
  end if;

  if v_res.status in ('consumed', 'released') then
    raise exception 'la reserva ya está cerrada' using errcode = 'P0040';
  end if;

  if p_qty > (v_res.qty_reserved - v_res.qty_consumed) then
    raise exception 'cantidad supera la reserva disponible' using errcode = 'P0050';
  end if;

  v_new_consumed := v_res.qty_consumed + p_qty;
  v_new_status := case
    when v_new_consumed >= v_res.qty_reserved then 'consumed'
    else 'partial'
  end;

  -- Decrementar lote
  update public.stock_lots
  set current_quantity = current_quantity - p_qty
  where id = v_res.lot_id;

  -- Registrar movimiento de consumo
  insert into public.stock_movements (
    hotel_id, product_id, lot_id, movement_type,
    quantity, unit_cost, reference_type, reference_id,
    notes, created_by
  ) values (
    p_hotel_id, v_res.product_id, v_res.lot_id, 'consumption',
    p_qty, v_res.unit_cost_at_reservation, 'reservation', p_reservation_id,
    null, auth.uid()
  );

  -- Actualizar reserva
  update public.stock_reservations
  set qty_consumed = v_new_consumed,
      status = v_new_status,
      updated_at = now()
  where id = p_reservation_id;
end;
$$;

-- 6c. release_reservation — libera stock sin consumo
create or replace function public.release_reservation(
  p_hotel_id uuid,
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_res record;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  select * into v_res
  from public.stock_reservations
  where id = p_reservation_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'reserva no encontrada' using errcode = 'P0010';
  end if;

  if v_res.status in ('consumed', 'released') then
    raise exception 'la reserva ya está cerrada' using errcode = 'P0040';
  end if;

  update public.stock_reservations
  set status = 'released', updated_at = now()
  where id = p_reservation_id;
end;
$$;

-- 6d. calculate_real_cost — coste real del evento desde movimientos de consumo
create or replace function public.calculate_real_cost(
  p_hotel_id uuid,
  p_event_id uuid
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_total_cost numeric(12,2);
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select coalesce(
    sum(sr.qty_consumed * sr.unit_cost_at_reservation), 0
  ) into v_total_cost
  from public.stock_reservations sr
  where sr.hotel_id = p_hotel_id
    and sr.event_id = p_event_id
    and sr.status in ('partial', 'consumed')
    and sr.is_shortfall = false
    and sr.unit_cost_at_reservation is not null;

  -- Actualizar evento con coste real
  update public.events
  set actual_cost = v_total_cost, updated_at = now()
  where id = p_event_id and hotel_id = p_hotel_id;

  return v_total_cost;
end;
$$;

-- 6e. get_event_reservations — listar reservas de un evento con detalle
create or replace function public.get_event_reservations(
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
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', sr.id,
      'product_id', sr.product_id,
      'product_name', p.name,
      'lot_id', sr.lot_id,
      'lot_number', sl.lot_number,
      'expiry_date', sl.expiry_date,
      'qty_reserved', sr.qty_reserved,
      'qty_consumed', sr.qty_consumed,
      'qty_available', sr.qty_reserved - sr.qty_consumed,
      'status', sr.status,
      'is_shortfall', sr.is_shortfall,
      'unit_cost', sr.unit_cost_at_reservation,
      'total_cost', sr.qty_consumed * sr.unit_cost_at_reservation
    ) order by p.name, sr.is_shortfall), '[]')
    from public.stock_reservations sr
    join public.products p on p.id = sr.product_id
    left join public.stock_lots sl on sl.id = sr.lot_id
    where sr.hotel_id = p_hotel_id
      and sr.event_id = p_event_id
  );
end;
$$;

-- 6f. start_stock_count — iniciar sesión de conteo
create or replace function public.start_stock_count(
  p_hotel_id uuid,
  p_count_type public.count_type default 'full',
  p_is_blind boolean default false,
  p_label text default null,
  p_location_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_count_id uuid;
  v_line_count integer := 0;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','warehouse']::public.app_role[]);

  insert into public.stock_counts (
    hotel_id, count_type, status, is_blind,
    location_id, label, created_by
  ) values (
    p_hotel_id, p_count_type, 'open', p_is_blind,
    p_location_id, p_label, auth.uid()
  )
  returning id into v_count_id;

  -- Poblar líneas desde lotes actuales
  insert into public.stock_count_lines (
    count_id, hotel_id, product_id, lot_id, expected_qty
  )
  select
    v_count_id,
    p_hotel_id,
    sl.product_id,
    sl.id,
    sl.current_quantity
  from public.stock_lots sl
  where sl.hotel_id = p_hotel_id
    and sl.current_quantity > 0
    and (p_location_id is null or sl.storage_location_id = p_location_id)
  order by sl.product_id, sl.expiry_date asc nulls last;

  get diagnostics v_line_count = row_count;

  -- Cambiar estado a in_progress si hay líneas
  if v_line_count > 0 then
    update public.stock_counts
    set status = 'in_progress'
    where id = v_count_id;
  end if;

  return v_count_id;
end;
$$;

-- 6g. submit_stock_count_line — registrar cantidad contada en una línea
create or replace function public.submit_stock_count_line(
  p_hotel_id uuid,
  p_line_id uuid,
  p_counted_qty numeric,
  p_notes text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_count_status public.count_status;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','warehouse']::public.app_role[]);

  select sc.status into v_count_status
  from public.stock_count_lines scl
  join public.stock_counts sc on sc.id = scl.count_id
  where scl.id = p_line_id and scl.hotel_id = p_hotel_id;

  if not found then
    raise exception 'línea de conteo no encontrada' using errcode = 'P0010';
  end if;

  if v_count_status not in ('open', 'in_progress') then
    raise exception 'el conteo ya está cerrado' using errcode = 'P0040';
  end if;

  if p_counted_qty < 0 then
    raise exception 'la cantidad contada no puede ser negativa' using errcode = 'P0060';
  end if;

  update public.stock_count_lines
  set counted_qty = p_counted_qty,
      notes = coalesce(p_notes, notes),
      submitted_by = auth.uid(),
      submitted_at = now()
  where id = p_line_id and hotel_id = p_hotel_id;
end;
$$;

-- 6h. review_stock_count — revisar y aplicar ajustes
create or replace function public.review_stock_count(
  p_hotel_id uuid,
  p_count_id uuid,
  p_apply_adjustments boolean default true
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_count record;
  v_line record;
  v_adjusted integer := 0;
  v_total_variance numeric(12,3) := 0;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  select * into v_count
  from public.stock_counts
  where id = p_count_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'conteo no encontrado' using errcode = 'P0010';
  end if;

  if v_count.status not in ('in_progress', 'review') then
    raise exception 'el conteo debe estar en progreso o revisión' using errcode = 'P0040';
  end if;

  -- Cambiar a estado review
  update public.stock_counts
  set status = 'review', reviewed_by = auth.uid(), updated_at = now()
  where id = p_count_id;

  if p_apply_adjustments then
    -- Aplicar ajustes solo en líneas con variance != 0 y counted_qty not null
    for v_line in (
      select scl.*, sl.current_quantity as lot_current
      from public.stock_count_lines scl
      left join public.stock_lots sl on sl.id = scl.lot_id
      where scl.count_id = p_count_id
        and scl.hotel_id = p_hotel_id
        and scl.counted_qty is not null
        and scl.adjustment_applied = false
        and scl.variance_qty is not null
        and scl.variance_qty <> 0
    )
    loop
      -- Ajustar lote
      if v_line.lot_id is not null then
        update public.stock_lots
        set current_quantity = greatest(0, v_line.counted_qty)
        where id = v_line.lot_id;

        -- Movimiento de ajuste
        insert into public.stock_movements (
          hotel_id, product_id, lot_id, movement_type,
          quantity, unit_cost, reference_type, reference_id,
          notes, created_by
        ) values (
          p_hotel_id, v_line.product_id, v_line.lot_id, 'adjustment',
          v_line.variance_qty,                           -- positivo = sobrante, negativo = faltante
          (select unit_cost from public.stock_lots where id = v_line.lot_id),
          'stock_count', p_count_id,
          'Ajuste por conteo ' || coalesce(v_count.label, p_count_id::text),
          auth.uid()
        );

        -- Marcar línea como ajustada
        update public.stock_count_lines
        set adjustment_applied = true
        where id = v_line.id;

        v_adjusted := v_adjusted + 1;
        v_total_variance := v_total_variance + v_line.variance_qty;
      end if;
    end loop;

    -- Cerrar conteo
    update public.stock_counts
    set status = 'closed', closed_at = now(), updated_at = now()
    where id = p_count_id;
  end if;

  return jsonb_build_object(
    'count_id', p_count_id,
    'adjustments_applied', v_adjusted,
    'total_variance', v_total_variance,
    'status', case when p_apply_adjustments then 'closed' else 'review' end
  );
end;
$$;

-- 6i. get_stock_forensics — análisis de merma sistemática por producto
create or replace function public.get_stock_forensics(
  p_hotel_id uuid,
  p_product_id uuid,
  p_months integer default 3
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_since timestamptz;
  v_received numeric(10,3) := 0;
  v_consumed_reserved numeric(10,3) := 0;
  v_consumed_direct numeric(10,3) := 0;
  v_waste numeric(10,3) := 0;
  v_adjusted_positive numeric(10,3) := 0;
  v_adjusted_negative numeric(10,3) := 0;
  v_unexplained_loss numeric(10,3);
  v_waste_rate_pct numeric(6,2);
  v_unexplained_rate_pct numeric(6,2);
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  v_since := now() - (p_months || ' months')::interval;

  -- Total recibido (receptions)
  select coalesce(sum(quantity), 0) into v_received
  from public.stock_movements
  where hotel_id = p_hotel_id
    and product_id = p_product_id
    and movement_type = 'reception'
    and created_at >= v_since;

  -- Consumido desde reservas (reference_type = 'reservation')
  select coalesce(sum(quantity), 0) into v_consumed_reserved
  from public.stock_movements
  where hotel_id = p_hotel_id
    and product_id = p_product_id
    and movement_type = 'consumption'
    and reference_type = 'reservation'
    and created_at >= v_since;

  -- Consumido directo (sin reserva)
  select coalesce(sum(quantity), 0) into v_consumed_direct
  from public.stock_movements
  where hotel_id = p_hotel_id
    and product_id = p_product_id
    and movement_type = 'consumption'
    and (reference_type is null or reference_type <> 'reservation')
    and created_at >= v_since;

  -- Merma registrada
  select coalesce(sum(quantity), 0) into v_waste
  from public.waste_records
  where hotel_id = p_hotel_id
    and product_id = p_product_id
    and created_at >= v_since;

  -- Ajustes positivos (sobrantes) y negativos (faltantes)
  select
    coalesce(sum(case when quantity > 0 then quantity else 0 end), 0),
    coalesce(abs(sum(case when quantity < 0 then quantity else 0 end)), 0)
  into v_adjusted_positive, v_adjusted_negative
  from public.stock_movements
  where hotel_id = p_hotel_id
    and product_id = p_product_id
    and movement_type = 'adjustment'
    and created_at >= v_since;

  -- Pérdida no explicada = recibido − consumo − merma + ajustes negativos
  v_unexplained_loss := v_received
    - v_consumed_reserved
    - v_consumed_direct
    - v_waste
    + v_adjusted_positive
    - v_adjusted_negative;

  -- Tasas porcentuales
  v_waste_rate_pct := case
    when v_received > 0 then round((v_waste / v_received * 100)::numeric, 2)
    else null
  end;

  v_unexplained_rate_pct := case
    when v_received > 0 and v_unexplained_loss < 0
      then round((abs(v_unexplained_loss) / v_received * 100)::numeric, 2)
    else 0
  end;

  return jsonb_build_object(
    'product_id', p_product_id,
    'period_months', p_months,
    'since', v_since,
    'received', v_received,
    'consumed_from_reservations', v_consumed_reserved,
    'consumed_direct', v_consumed_direct,
    'waste_recorded', v_waste,
    'adjustments_positive', v_adjusted_positive,
    'adjustments_negative', v_adjusted_negative,
    'unexplained_loss', case when v_unexplained_loss < 0 then abs(v_unexplained_loss) else 0 end,
    'unexplained_surplus', case when v_unexplained_loss > 0 then v_unexplained_loss else 0 end,
    'waste_rate_pct', v_waste_rate_pct,
    'unexplained_loss_rate_pct', v_unexplained_rate_pct,
    'alert', case
      when v_unexplained_rate_pct >= 15 then 'critical'
      when v_unexplained_rate_pct >= 8 then 'warning'
      when v_waste_rate_pct >= 20 then 'warning'
      else 'ok'
    end
  );
end;
$$;

-- 6j. Trigger: al completar evento, calcular coste real automáticamente
create or replace function public.auto_calculate_event_cost()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total_cost numeric(12,2);
begin
  if new.status = 'completed' and old.status <> 'completed' then
    select coalesce(sum(sr.qty_consumed * sr.unit_cost_at_reservation), 0)
    into v_total_cost
    from public.stock_reservations sr
    where sr.hotel_id = new.hotel_id
      and sr.event_id = new.id
      and sr.status in ('partial', 'consumed')
      and sr.is_shortfall = false
      and sr.unit_cost_at_reservation is not null;

    new.actual_cost := v_total_cost;
  end if;
  return new;
end;
$$;

create trigger auto_calculate_event_cost_trg
  before update of status on public.events
  for each row execute function public.auto_calculate_event_cost();
