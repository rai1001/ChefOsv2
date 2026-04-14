-- 00012_fix_inventory_rpcs.sql
-- Fix P1: record_waste ownership validation + no-lot-found guard
-- Fix P1: transfer_stock split-lot for partial transfers
-- Fix P2: get_stock_levels LEFT JOIN so 0-stock products appear

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. get_stock_levels — LEFT JOIN to include products with no lots
-- ─────────────────────────────────────────────────────────────────────────────
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
      'sku', p.sku,
      'category', c.name,
      'unit', u.symbol,
      'current_stock', coalesce(s.total_qty, 0),
      'total_value', coalesce(s.total_qty, 0) * coalesce(s.avg_cost, 0),
      'avg_cost', s.avg_cost,
      'earliest_expiry', s.earliest_expiry,
      'lot_count', coalesce(s.lot_count, 0),
      'alert_level', case
        when coalesce(s.total_qty, 0) <= 0 then 'critical'
        when p.reorder_point is not null and coalesce(s.total_qty, 0) <= p.reorder_point then 'low'
        when p.min_stock is not null and coalesce(s.total_qty, 0) <= p.min_stock then 'warning'
        else 'ok'
      end
    ) order by
      case
        when coalesce(s.total_qty, 0) <= 0 then 0
        when p.reorder_point is not null and coalesce(s.total_qty, 0) <= p.reorder_point then 1
        else 2
      end,
      p.name
    ), '[]')
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join public.units_of_measure u on u.id = p.default_unit_id
    left join (
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. record_waste — ownership validation + no-lot-found guard
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Find lot: explicit (with ownership validation) or FIFO
  if p_lot_id is not null then
    -- Validate lot belongs to this hotel AND this product
    select id, current_quantity
    into v_lot_id, v_available
    from public.stock_lots
    where id = p_lot_id
      and hotel_id = p_hotel_id
      and product_id = p_product_id;

    if v_lot_id is null then
      raise exception 'lot not found or does not belong to this hotel/product'
        using errcode = 'P0404';
    end if;
  else
    -- FIFO selection
    select id, current_quantity
    into v_lot_id, v_available
    from public.stock_lots
    where hotel_id = p_hotel_id
      and product_id = p_product_id
      and current_quantity > 0
    order by expiry_date asc nulls last, received_at asc
    limit 1;

    if v_lot_id is null then
      raise exception 'no stock available for product'
        using errcode = 'P0020';
    end if;
  end if;

  if v_available < p_quantity then
    raise exception 'insufficient stock in lot (available: %)', v_available
      using errcode = 'P0020';
  end if;

  -- Deduct from lot
  update public.stock_lots
  set current_quantity = current_quantity - p_quantity
  where id = v_lot_id;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. transfer_stock — split-lot for partial transfers, keep full-lot fast path
-- Return type changed void → uuid, so must drop first
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.transfer_stock(uuid, uuid, numeric, uuid, text);

create or replace function public.transfer_stock(
  p_hotel_id uuid,
  p_lot_id uuid,
  p_quantity numeric,
  p_to_location_id uuid,
  p_notes text default null
)
returns uuid  -- returns the (possibly new) lot id at the destination
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_product_id uuid;
  v_from_location_id uuid;
  v_available numeric;
  v_unit_cost numeric;
  v_expiry date;
  v_supplier_id uuid;
  v_received_at timestamptz;
  v_dest_lot_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','procurement']::public.app_role[]);

  -- Fetch source lot (validates hotel ownership via WHERE)
  select product_id, storage_location_id, current_quantity,
         unit_cost, expiry_date, supplier_id, received_at
  into v_product_id, v_from_location_id, v_available,
       v_unit_cost, v_expiry, v_supplier_id, v_received_at
  from public.stock_lots
  where id = p_lot_id and hotel_id = p_hotel_id;

  if v_product_id is null then
    raise exception 'lot not found' using errcode = 'P0404';
  end if;

  if v_available < p_quantity then
    raise exception 'insufficient stock (available: %)', v_available using errcode = 'P0020';
  end if;

  if p_quantity <= 0 then
    raise exception 'quantity must be positive' using errcode = 'P0001';
  end if;

  if v_available = p_quantity then
    -- Full transfer: just move the lot
    update public.stock_lots
    set storage_location_id = p_to_location_id
    where id = p_lot_id;

    v_dest_lot_id := p_lot_id;
  else
    -- Partial transfer: reduce source, create new lot at destination
    update public.stock_lots
    set current_quantity = current_quantity - p_quantity
    where id = p_lot_id;

    insert into public.stock_lots (
      hotel_id, product_id, storage_location_id,
      initial_quantity, current_quantity, unit_cost,
      expiry_date, supplier_id, received_at
    ) values (
      p_hotel_id, v_product_id, p_to_location_id,
      p_quantity, p_quantity, v_unit_cost,
      v_expiry, v_supplier_id, v_received_at
    ) returning id into v_dest_lot_id;
  end if;

  -- Movement log
  insert into public.stock_movements (
    hotel_id, product_id, lot_id, movement_type,
    quantity, from_location_id, to_location_id,
    created_by, notes
  ) values (
    p_hotel_id, v_product_id, p_lot_id, 'transfer',
    p_quantity, v_from_location_id, p_to_location_id,
    auth.uid(), p_notes
  );

  return v_dest_lot_id;
end;
$$;
