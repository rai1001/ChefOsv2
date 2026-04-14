-- ============================================================================
-- M7 Alerts + KPI Snapshots — ChefOS v2
-- Tablas: alerts, kpi_snapshots
-- RPCs: generate_daily_snapshot, dismiss_alert, get_active_alerts,
--        get_food_cost_by_event, get_food_cost_by_service, get_cost_variance_report
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================

create type public.alert_severity as enum ('info', 'warning', 'critical');
create type public.alert_type as enum (
  'low_stock',
  'expiring_soon',
  'cost_overrun',
  'food_cost_high',
  'waste_high',
  'pending_approvals',
  'custom'
);

-- ====================
-- 2. TABLAS
-- ====================

-- Alertas generadas (auto o manual)
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  alert_type public.alert_type not null,
  severity public.alert_severity not null default 'warning',
  title text not null,
  message text,
  details jsonb,
  related_entity_id uuid,
  related_entity_type text, -- 'event', 'product', 'stock_lot', etc.
  dismissed_at timestamptz,
  dismissed_by uuid references auth.users(id),
  auto_resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_alerts_hotel_active on public.alerts(hotel_id, created_at desc)
  where dismissed_at is null and auto_resolved_at is null;
create index idx_alerts_hotel_type on public.alerts(hotel_id, alert_type);

-- Snapshots diarios de KPIs
create table public.kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  snapshot_date date not null,
  -- Eventos
  events_completed integer not null default 0,
  events_total_pax integer not null default 0,
  -- Food cost
  total_theoretical_cost numeric(14,2) not null default 0,
  total_actual_cost numeric(14,2) not null default 0,
  avg_cost_per_pax numeric(10,2),
  -- Inventario
  inventory_value numeric(14,2) not null default 0,
  low_stock_products integer not null default 0,
  expiring_lots integer not null default 0,
  -- Mermas
  waste_records_7d integer not null default 0,
  -- Compras
  pending_orders integer not null default 0,
  created_at timestamptz not null default now(),
  unique (hotel_id, snapshot_date)
);

create index idx_kpi_snapshots_hotel_date on public.kpi_snapshots(hotel_id, snapshot_date desc);

-- ====================
-- 3. RLS
-- ====================

alter table public.alerts enable row level security;
create policy "alerts_read" on public.alerts
  for select using (public.is_member_of(hotel_id));
create policy "alerts_write" on public.alerts
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef','procurement')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','sous_chef','procurement')
  );

alter table public.kpi_snapshots enable row level security;
create policy "kpi_snapshots_read" on public.kpi_snapshots
  for select using (public.is_member_of(hotel_id));
create policy "kpi_snapshots_write" on public.kpi_snapshots
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef')
  );

-- ====================
-- 4. RPCs
-- ====================

-- 4a. dismiss_alert
create or replace function public.dismiss_alert(
  p_hotel_id uuid,
  p_alert_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  update public.alerts
  set dismissed_at = now(), dismissed_by = auth.uid()
  where id = p_alert_id and hotel_id = p_hotel_id;

  if not found then
    raise exception 'alerta no encontrada' using errcode = 'P0010';
  end if;
end;
$$;

-- 4b. get_active_alerts
create or replace function public.get_active_alerts(
  p_hotel_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  alert_type public.alert_type,
  severity public.alert_severity,
  title text,
  message text,
  details jsonb,
  related_entity_id uuid,
  related_entity_type text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  return query
  select
    a.id, a.alert_type, a.severity, a.title, a.message,
    a.details, a.related_entity_id, a.related_entity_type, a.created_at
  from public.alerts a
  where a.hotel_id = p_hotel_id
    and a.dismissed_at is null
    and a.auto_resolved_at is null
  order by
    case a.severity
      when 'critical' then 1
      when 'warning'  then 2
      else 3
    end,
    a.created_at desc
  limit p_limit;
end;
$$;

-- 4c. generate_daily_snapshot
-- Calcula KPIs del día y genera alertas si se superan thresholds.
-- Thresholds hardcoded MVP (sin alert_rules tabla):
--   cost_overrun   : actual_cost > theoretical_cost * 1.15  (+15%)
--   waste_high     : waste_records 7d > 10
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

  select coalesce(sum(current_quantity * coalesce(unit_cost, 0)), 0)
  into v_inventory_value
  from public.stock_lots
  where hotel_id = p_hotel_id and current_quantity > 0;

  select count(distinct p.id)
  into v_low_stock
  from public.products p
  where p.hotel_id = p_hotel_id
    and p.is_active = true
    and p.reorder_point is not null
    and coalesce((
      select sum(sl.current_quantity)
      from public.stock_lots sl
      where sl.product_id = p.id and sl.current_quantity > 0
    ), 0) <= p.reorder_point;

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
    and created_at >= v_today - 7;

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

  -- ── Generar alertas automáticas ──────────────────────────────────────────

  -- Stock bajo
  if v_low_stock > 0 then
    insert into public.alerts (hotel_id, alert_type, severity, title, message, details)
    values (
      p_hotel_id, 'low_stock',
      case when v_low_stock >= 5 then 'critical' else 'warning' end,
      v_low_stock || ' producto(s) en stock bajo',
      'Hay ' || v_low_stock || ' productos por debajo del punto de pedido.',
      jsonb_build_object('count', v_low_stock, 'snapshot_date', v_today)
    )
    on conflict do nothing;
  end if;

  -- Caducidades próximas
  if v_expiring > 0 then
    insert into public.alerts (hotel_id, alert_type, severity, title, message, details)
    values (
      p_hotel_id, 'expiring_soon',
      case when v_expiring >= 10 then 'critical' else 'warning' end,
      v_expiring || ' lote(s) caducan en 7 días',
      'Revisar lotes próximos a caducar para evitar mermas.',
      jsonb_build_object('count', v_expiring, 'snapshot_date', v_today)
    )
    on conflict do nothing;
  end if;

  -- Cost overrun: eventos de hoy con actual > theoretical * 1.15
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
      related_entity_id, related_entity_type
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
      rec.id, 'event'
    )
    on conflict do nothing;
  end loop;

  -- Mermas altas
  if v_waste_7d > 10 then
    insert into public.alerts (hotel_id, alert_type, severity, title, message, details)
    values (
      p_hotel_id, 'waste_high', 'warning',
      v_waste_7d || ' registros de merma en 7 días',
      'Nivel de merma elevado. Revisar causas.',
      jsonb_build_object('count', v_waste_7d, 'snapshot_date', v_today)
    )
    on conflict do nothing;
  end if;

  perform public.emit_event(
    p_hotel_id, 'reporting', v_snapshot_id, 'reporting.snapshot_generated',
    jsonb_build_object('date', v_today)
  );

  return v_snapshot_id;
end;
$$;

-- 4d. get_food_cost_by_event
-- Food cost por evento: theoretical vs actual, varianza absoluta y %
create or replace function public.get_food_cost_by_event(
  p_hotel_id uuid,
  p_from date default current_date - 30,
  p_to date default current_date
)
returns table (
  event_id uuid,
  event_name text,
  event_date date,
  event_type public.event_type,
  service_type public.service_type,
  guest_count integer,
  status public.event_status,
  theoretical_cost numeric,
  actual_cost numeric,
  variance_abs numeric,       -- actual - theoretical (positivo = overrun)
  variance_pct numeric,       -- % varianza sobre teórico
  cost_per_pax_theoretical numeric,
  cost_per_pax_actual numeric
)
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  return query
  select
    e.id,
    e.name,
    e.event_date,
    e.event_type,
    e.service_type,
    e.guest_count,
    e.status,
    e.theoretical_cost,
    e.actual_cost,
    -- varianza: positivo = overrun, negativo = ahorro
    round(coalesce(e.actual_cost, 0) - coalesce(e.theoretical_cost, 0), 2),
    -- varianza %
    case when e.theoretical_cost > 0
      then round(100.0 * (coalesce(e.actual_cost, 0) - e.theoretical_cost) / e.theoretical_cost, 1)
      else null
    end,
    -- coste/pax teórico
    case when e.guest_count > 0 and e.theoretical_cost is not null
      then round(e.theoretical_cost / e.guest_count, 2)
      else null
    end,
    -- coste/pax real
    case when e.guest_count > 0 and e.actual_cost is not null
      then round(e.actual_cost / e.guest_count, 2)
      else null
    end
  from public.events e
  where e.hotel_id = p_hotel_id
    and e.event_date between p_from and p_to
    and e.status not in ('cancelled', 'archived')
    and (e.theoretical_cost is not null or e.actual_cost is not null)
  order by e.event_date desc;
end;
$$;

-- 4e. get_food_cost_by_service
-- Food cost agrupado por service_type en un rango de fechas
create or replace function public.get_food_cost_by_service(
  p_hotel_id uuid,
  p_from date default current_date - 30,
  p_to date default current_date
)
returns table (
  service_type public.service_type,
  event_count bigint,
  total_pax bigint,
  total_theoretical_cost numeric,
  total_actual_cost numeric,
  avg_theoretical_per_event numeric,
  avg_cost_per_pax numeric,
  avg_variance_pct numeric
)
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  return query
  select
    e.service_type,
    count(*),
    sum(e.guest_count)::bigint,
    round(sum(coalesce(e.theoretical_cost, 0)), 2),
    round(sum(coalesce(e.actual_cost, 0)), 2),
    round(avg(e.theoretical_cost), 2),
    case when sum(e.guest_count) > 0
      then round(sum(coalesce(e.actual_cost, 0)) / sum(e.guest_count), 2)
      else null
    end,
    case when count(*) filter (where e.theoretical_cost > 0) > 0
      then round(avg(
        case when e.theoretical_cost > 0
          then 100.0 * (coalesce(e.actual_cost, 0) - e.theoretical_cost) / e.theoretical_cost
          else null
        end
      ), 1)
      else null
    end
  from public.events e
  where e.hotel_id = p_hotel_id
    and e.event_date between p_from and p_to
    and e.status not in ('cancelled', 'archived')
  group by e.service_type
  order by count(*) desc;
end;
$$;

-- 4f. get_cost_variance_report
-- Eventos con cost overrun (actual > theoretical): ordenados por varianza absoluta desc
create or replace function public.get_cost_variance_report(
  p_hotel_id uuid,
  p_from date default current_date - 90,
  p_to date default current_date,
  p_min_variance_pct numeric default 5 -- solo overruns > 5%
)
returns table (
  event_id uuid,
  event_name text,
  event_date date,
  service_type public.service_type,
  guest_count integer,
  theoretical_cost numeric,
  actual_cost numeric,
  variance_abs numeric,
  variance_pct numeric,
  cost_per_pax_delta numeric -- diferencia coste real vs teórico por pax
)
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  return query
  select
    e.id,
    e.name,
    e.event_date,
    e.service_type,
    e.guest_count,
    e.theoretical_cost,
    e.actual_cost,
    round(e.actual_cost - e.theoretical_cost, 2),
    round(100.0 * (e.actual_cost - e.theoretical_cost) / nullif(e.theoretical_cost, 0), 1),
    case when e.guest_count > 0
      then round((e.actual_cost - e.theoretical_cost) / e.guest_count, 2)
      else null
    end
  from public.events e
  where e.hotel_id = p_hotel_id
    and e.event_date between p_from and p_to
    and e.actual_cost is not null
    and e.theoretical_cost is not null
    and e.actual_cost > e.theoretical_cost * (1 + p_min_variance_pct / 100.0)
    and e.status not in ('cancelled', 'archived')
  order by (e.actual_cost - e.theoretical_cost) desc;
end;
$$;
