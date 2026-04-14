-- ============================================================================
-- Fix code review — 3 bugs bloqueadores detectados en revisión
-- Bug 1: consume_reservation — stock_lot puede quedar negativo sin lock
-- Bug 2: release_reservation — falta FOR UPDATE (race condition)
-- Bug 3: alerts duplicadas — ON CONFLICT DO NOTHING sin constraint única
-- ============================================================================

-- ====================
-- FIX 1 + 2: consume_reservation y release_reservation
-- ====================

-- consume_reservation:
--   Añadido SELECT ... FOR UPDATE en stock_lots antes de decrementar
--   para serializar accesos concurrentes al mismo lote.
--   Si la qty pedida supera el stock real del lote, lanza excepción.
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
  v_lot record;
  v_new_consumed numeric(10,3);
  v_new_status public.reservation_status;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','warehouse']::public.app_role[]);

  -- Lock la reserva primero
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

  -- Lock el lote y verificar stock real disponible (FIX 1)
  select * into v_lot
  from public.stock_lots
  where id = v_res.lot_id
  for update;

  if v_lot.current_quantity < p_qty then
    raise exception 'stock insuficiente en lote (qty real: %, solicitada: %)',
      v_lot.current_quantity, p_qty using errcode = 'P0060';
  end if;

  v_new_consumed := v_res.qty_consumed + p_qty;
  v_new_status := case
    when v_new_consumed >= v_res.qty_reserved then 'consumed'
    else 'partial'
  end;

  -- Decrementar lote (ahora seguro: lock + validación previos)
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

-- release_reservation:
--   Añadido FOR UPDATE al SELECT de la reserva (FIX 2)
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

  -- FOR UPDATE para serializar liberaciones concurrentes (FIX 2)
  select * into v_res
  from public.stock_reservations
  where id = p_reservation_id and hotel_id = p_hotel_id
  for update;

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

-- ====================
-- FIX 3: Columna alert_date + índices únicos para deduplicación diaria
-- ====================

-- Añadir columna alert_date (date, IMMUTABLE — no depende de timezone) a la tabla
alter table public.alerts
  add column if not exists alert_date date not null default current_date;

-- Poblar alert_date en alertas existentes (si las hubiera)
update public.alerts set alert_date = created_at::date where alert_date is null;

-- Alerta sin entidad: máximo una activa por hotel+tipo+día
-- Si el usuario descarta (dismissed_at IS NOT NULL), la constraint no aplica
-- y puede generarse una nueva el siguiente día.
create unique index alerts_no_entity_daily
  on public.alerts (hotel_id, alert_type, alert_date)
  where related_entity_id is null
    and dismissed_at is null
    and auto_resolved_at is null;

-- Alerta con entidad: máximo una activa por hotel+tipo+entidad+día
-- Evita duplicar "cost_overrun" para el mismo evento en el mismo día.
create unique index alerts_entity_daily
  on public.alerts (hotel_id, alert_type, related_entity_id, alert_date)
  where related_entity_id is not null
    and dismissed_at is null
    and auto_resolved_at is null;

-- Actualizar generate_daily_snapshot para pasar alert_date explícitamente
-- y usar ON CONFLICT con las columnas del índice único
create or replace function public.generate_daily_snapshot(
  p_hotel_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_today date := current_date;
  v_snapshot_id uuid;
  v_events_completed integer;
  v_total_pax integer;
  v_theoretical numeric;
  v_actual numeric;
  v_avg_cost_per_pax numeric;
  v_inventory_value numeric;
  v_low_stock integer;
  v_expiring integer;
  v_waste_7d integer;
  v_pending_orders integer;
  rec record;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  -- Calcular métricas
  select
    count(*) filter (where status = 'completed'),
    coalesce(sum(guest_count) filter (where status = 'completed'), 0),
    coalesce(sum(theoretical_cost) filter (where status = 'completed'), 0),
    coalesce(sum(actual_cost) filter (where status = 'completed'), 0)
  into v_events_completed, v_total_pax, v_theoretical, v_actual
  from public.events
  where hotel_id = p_hotel_id
    and event_date = v_today;

  v_avg_cost_per_pax := case when v_total_pax > 0
    then round(v_actual / v_total_pax, 2) else null end;

  -- FIX performance: LEFT JOIN agrupado en lugar de subquery correlacionado
  select
    coalesce(sum(sl.current_quantity * coalesce(sl.unit_cost, 0)), 0),
    count(distinct p.id) filter (
      where p.reorder_point is not null
        and coalesce(sl_sum.total_qty, 0) <= p.reorder_point
    )
  into v_inventory_value, v_low_stock
  from public.products p
  left join public.stock_lots sl on sl.hotel_id = p_hotel_id and sl.current_quantity > 0
  left join (
    select product_id, sum(current_quantity) as total_qty
    from public.stock_lots
    where hotel_id = p_hotel_id and current_quantity > 0
    group by product_id
  ) sl_sum on sl_sum.product_id = p.id
  where p.hotel_id = p_hotel_id and p.is_active = true;

  select count(*)
  into v_expiring
  from public.stock_lots
  where hotel_id = p_hotel_id
    and current_quantity > 0
    and expiry_date is not null
    and expiry_date <= v_today + 7;

  select count(*)
  into v_waste_7d
  from public.waste_records
  where hotel_id = p_hotel_id
    and created_at >= v_today - interval '7 days';

  select count(*)
  into v_pending_orders
  from public.purchase_orders
  where hotel_id = p_hotel_id
    and status in ('sent', 'confirmed_by_supplier', 'partially_received');

  -- Upsert snapshot
  insert into public.kpi_snapshots (
    hotel_id, snapshot_date,
    events_completed, events_total_pax,
    total_theoretical_cost, total_actual_cost, avg_cost_per_pax,
    inventory_value, low_stock_products, expiring_lots,
    waste_records_7d, pending_orders
  ) values (
    p_hotel_id, v_today,
    v_events_completed, v_total_pax,
    v_theoretical, v_actual, v_avg_cost_per_pax,
    v_inventory_value, v_low_stock, v_expiring,
    v_waste_7d, v_pending_orders
  )
  on conflict (hotel_id, snapshot_date) do update set
    events_completed = excluded.events_completed,
    events_total_pax = excluded.events_total_pax,
    total_theoretical_cost = excluded.total_theoretical_cost,
    total_actual_cost = excluded.total_actual_cost,
    avg_cost_per_pax = excluded.avg_cost_per_pax,
    inventory_value = excluded.inventory_value,
    low_stock_products = excluded.low_stock_products,
    expiring_lots = excluded.expiring_lots,
    waste_records_7d = excluded.waste_records_7d,
    pending_orders = excluded.pending_orders,
    created_at = now()
  returning id into v_snapshot_id;

  -- ── Generar alertas (ON CONFLICT ahora funciona con los índices únicos) ──

  if v_low_stock > 0 then
    insert into public.alerts (hotel_id, alert_type, severity, title, message, details, alert_date)
    values (
      p_hotel_id, 'low_stock',
      case when v_low_stock >= 5 then 'critical' else 'warning' end,
      v_low_stock || ' producto(s) en stock bajo',
      'Hay ' || v_low_stock || ' productos por debajo del punto de pedido.',
      jsonb_build_object('count', v_low_stock, 'snapshot_date', v_today),
      v_today
    )
    on conflict (hotel_id, alert_type, alert_date)
    where related_entity_id is null and dismissed_at is null and auto_resolved_at is null
    do nothing;
  end if;

  if v_expiring > 0 then
    insert into public.alerts (hotel_id, alert_type, severity, title, message, details, alert_date)
    values (
      p_hotel_id, 'expiring_soon',
      case when v_expiring >= 10 then 'critical' else 'warning' end,
      v_expiring || ' lote(s) caducan en 7 días',
      'Revisar lotes próximos a caducar para evitar mermas.',
      jsonb_build_object('count', v_expiring, 'snapshot_date', v_today),
      v_today
    )
    on conflict (hotel_id, alert_type, alert_date)
    where related_entity_id is null and dismissed_at is null and auto_resolved_at is null
    do nothing;
  end if;

  for rec in
    select id, name, theoretical_cost, actual_cost
    from public.events
    where hotel_id = p_hotel_id
      and event_date = v_today
      and status = 'completed'
      and actual_cost is not null
      and theoretical_cost is not null
      and actual_cost > theoretical_cost * 1.15
  loop
    insert into public.alerts (
      hotel_id, alert_type, severity, title, message, details,
      related_entity_id, related_entity_type, alert_date
    )
    values (
      p_hotel_id, 'cost_overrun', 'critical',
      'Cost overrun: ' || rec.name,
      'Coste real supera el teórico en más de un 15%.',
      jsonb_build_object(
        'theoretical', rec.theoretical_cost,
        'actual', rec.actual_cost,
        'overrun_pct', round(100.0 * (rec.actual_cost - rec.theoretical_cost) / nullif(rec.theoretical_cost, 0), 1)
      ),
      rec.id, 'event', v_today
    )
    on conflict (hotel_id, alert_type, related_entity_id, alert_date)
    where related_entity_id is not null and dismissed_at is null and auto_resolved_at is null
    do nothing;
  end loop;

  if v_waste_7d > 10 then
    insert into public.alerts (hotel_id, alert_type, severity, title, message, details, alert_date)
    values (
      p_hotel_id, 'waste_high', 'warning',
      v_waste_7d || ' registros de merma en 7 días',
      'Nivel de merma elevado. Revisar causas.',
      jsonb_build_object('count', v_waste_7d, 'snapshot_date', v_today),
      v_today
    )
    on conflict (hotel_id, alert_type, alert_date)
    where related_entity_id is null and dismissed_at is null and auto_resolved_at is null
    do nothing;
  end if;

  perform public.emit_event(
    p_hotel_id, 'reporting', v_snapshot_id, 'reporting.snapshot_generated',
    jsonb_build_object('date', v_today)
  );

  return v_snapshot_id;
end;
$$;
