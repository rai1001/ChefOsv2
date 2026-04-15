-- ============================================================================
-- M15 Agentes Autónomos — ChefOS v2
-- Patrón: ASISTIDO, NO AUTÓNOMO — los agentes sugieren, el usuario confirma
-- Tablas: agent_configs, agent_suggestions
-- Enums: agent_type, suggestion_status, suggestion_action
-- RPCs: 10 agentes + get/approve/reject/config RPCs
-- Extend job_type con 'run_agent'
-- ============================================================================

-- ====================
-- 1. EXTENDER job_type
-- ====================

alter type public.job_type add value if not exists 'run_agent';

-- ====================
-- 2. ENUMS
-- ====================

create type public.agent_type as enum (
  -- Grupo A: Automejora (corren periódicamente)
  'price_watcher',        -- detecta variaciones de precio >threshold%
  'waste_analyzer',       -- analiza mermas elevadas por producto
  'stock_optimizer',      -- stock vs reservas próximas → PR sugerida
  'recipe_cost_alert',    -- recetas con food_cost% fuera de target
  'compliance_reminder',  -- APPCC pendientes del día
  -- Grupo B: Coordinación evento (se disparan en transiciones)
  'event_planner',        -- al confirmar evento: workflow+reserva+coste
  'shopping_optimizer',   -- consolida PRs pendientes antes del evento
  'kds_coordinator',      -- crea kitchen_orders por partida
  'post_event',           -- al completar evento: coste real + snapshot
  'forecast_prep'         -- genera kpi_snapshot diario
);

create type public.suggestion_status as enum (
  'pending',   -- esperando revisión del usuario
  'approved',  -- aprobada, acción en cola o aplicada
  'rejected',  -- rechazada por el usuario
  'applied',   -- acción ejecutada correctamente
  'expired'    -- superó expires_at sin revisión
);

create type public.suggestion_action as enum (
  'enqueue_job',          -- encolar un job de automation
  'sync_recipe_costs',    -- sincronizar costes de recetas afectadas
  'create_notification',  -- crear notificación informativa para admins
  'none'                  -- solo informativo, sin acción automatizada
);

-- ====================
-- 3. TABLAS
-- ====================

-- Configuración de cada agente por hotel
create table public.agent_configs (
  id            uuid primary key default gen_random_uuid(),
  hotel_id      uuid not null references public.hotels(id) on delete cascade,
  agent_type    public.agent_type not null,
  is_active     boolean not null default true,
  -- Umbrales y parámetros configurables por hotel:
  -- price_watcher: { price_change_threshold_pct: 5 }
  -- waste_analyzer: { waste_value_threshold_eur: 10, lookback_days: 7 }
  -- stock_optimizer: { safety_days: 2, lookahead_days: 7 }
  -- recipe_cost_alert: { food_cost_target_pct: 35 }
  -- compliance_reminder: { remind_hours_before: 2 }
  config        jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (hotel_id, agent_type)
);

create trigger agent_configs_updated_at
  before update on public.agent_configs
  for each row execute function public.set_updated_at();

-- Sugerencias generadas por los agentes (inmutables hasta revisión)
create table public.agent_suggestions (
  id              uuid primary key default gen_random_uuid(),
  hotel_id        uuid not null references public.hotels(id) on delete cascade,
  agent_type      public.agent_type not null,
  status          public.suggestion_status not null default 'pending',
  title           text not null,
  description     text not null,
  action          public.suggestion_action not null default 'none',
  action_payload  jsonb not null default '{}',  -- params para ejecutar la acción
  evidence        jsonb not null default '{}',  -- datos que dispararon la sugerencia
  context_type    text,       -- 'event', 'recipe', 'product', etc.
  context_id      uuid,       -- ID del objeto de contexto (polimórfico)
  expires_at      timestamptz,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_agent_suggestions_hotel_status
  on public.agent_suggestions (hotel_id, status, created_at desc)
  where status = 'pending';

create index idx_agent_suggestions_agent
  on public.agent_suggestions (hotel_id, agent_type, created_at desc);

create trigger agent_suggestions_updated_at
  before update on public.agent_suggestions
  for each row execute function public.set_updated_at();

-- ====================
-- 4. RLS
-- ====================

alter table public.agent_configs enable row level security;
alter table public.agent_suggestions enable row level security;

-- agent_configs: lectura para miembros, escritura para admin+
create policy "agent_configs_read" on public.agent_configs
  for select using (public.is_member_of(hotel_id));

create policy "agent_configs_write" on public.agent_configs
  for all using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin')
  ) with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin')
  );

-- agent_suggestions: lectura para miembros operativos, escritura SECURITY DEFINER vía RPCs
create policy "agent_suggestions_read" on public.agent_suggestions
  for select using (public.is_member_of(hotel_id));

create policy "agent_suggestions_update" on public.agent_suggestions
  for update using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef')
  );

-- ====================
-- 5. HELPER INTERNO
-- ====================

-- Crea una sugerencia deduplicada: si ya existe una pending con mismo hotel+agent+context_id
-- con el mismo title, no la duplica. Función interna (SECURITY DEFINER, sin auth check).
create or replace function public._create_agent_suggestion(
  p_hotel_id      uuid,
  p_agent_type    public.agent_type,
  p_title         text,
  p_description   text,
  p_action        public.suggestion_action,
  p_action_payload jsonb,
  p_evidence      jsonb,
  p_context_type  text default null,
  p_context_id    uuid default null,
  p_expires_hours integer default 48
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_existing_id uuid;
  v_new_id uuid;
begin
  -- Deduplicar: no crear si ya existe una pending reciente (últimas 12h) para el mismo contexto
  select id into v_existing_id
  from public.agent_suggestions
  where hotel_id    = p_hotel_id
    and agent_type  = p_agent_type
    and status      = 'pending'
    and title       = p_title
    and (
      (context_id = p_context_id and p_context_id is not null)
      or
      (context_id is null and p_context_id is null)
    )
    and created_at > now() - interval '12 hours'
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  insert into public.agent_suggestions (
    hotel_id, agent_type, status, title, description,
    action, action_payload, evidence,
    context_type, context_id, expires_at
  ) values (
    p_hotel_id, p_agent_type, 'pending', p_title, p_description,
    p_action, p_action_payload, p_evidence,
    p_context_type, p_context_id,
    now() + (p_expires_hours || ' hours')::interval
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- ====================
-- 6. RPCs GRUPO A — AUTOMEJORA
-- ====================

-- ── run_price_watcher_agent ──────────────────────────────────────────────────
-- Detecta productos con variación de precio > threshold% en los últimos 7 días
-- vs el promedio de los 30 días anteriores. Sugiere sincronizar escandallos.
create or replace function public.run_price_watcher_agent(
  p_hotel_id uuid
)
returns integer  -- número de sugerencias creadas
language plpgsql
security definer
as $$
declare
  v_config       jsonb;
  v_threshold    numeric;
  rec            record;
  v_count        integer := 0;
begin
  -- Verificar agente activo
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'price_watcher' and is_active = true;

  if not found then return 0; end if;

  v_threshold := coalesce((v_config->>'price_change_threshold_pct')::numeric, 5.0);

  -- Detectar variaciones de precio
  for rec in
    select
      p.id        as product_id,
      p.name      as product_name,
      avg_30.avg_price,
      recent.last_price,
      round(((recent.last_price - avg_30.avg_price) / nullif(avg_30.avg_price, 0)) * 100, 1) as change_pct
    from public.products p
    join (
      -- Precio promedio en los 30 días previos a los últimos 7 días
      select product_id, round(avg(new_price)::numeric, 4) as avg_price
      from public.price_history
      where hotel_id = p_hotel_id
        and changed_at between now() - interval '37 days' and now() - interval '7 days'
      group by product_id
    ) avg_30 on avg_30.product_id = p.id
    join (
      -- Último precio en los últimos 7 días
      select distinct on (product_id)
        product_id,
        new_price as last_price
      from public.price_history
      where hotel_id = p_hotel_id
        and changed_at > now() - interval '7 days'
      order by product_id, changed_at desc
    ) recent on recent.product_id = p.id
    where p.hotel_id = p_hotel_id
      and abs((recent.last_price - avg_30.avg_price) / nullif(avg_30.avg_price, 0)) * 100 >= v_threshold
    order by change_pct desc
    limit 10
  loop
    perform public._create_agent_suggestion(
      p_hotel_id,
      'price_watcher',
      'Variación de precio: ' || rec.product_name,
      format(
        'El precio de %s ha cambiado un %s%% (%.4f€ → %.4f€). Considera actualizar los escandallos de recetas que lo usan.',
        rec.product_name,
        rec.change_pct,
        rec.avg_price,
        rec.last_price
      ),
      'sync_recipe_costs',
      jsonb_build_object('product_id', rec.product_id),
      jsonb_build_object(
        'product_id', rec.product_id,
        'avg_price', rec.avg_price,
        'last_price', rec.last_price,
        'change_pct', rec.change_pct
      ),
      'product',
      rec.product_id,
      72
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── run_waste_analyzer_agent ─────────────────────────────────────────────────
-- Analiza mermas de los últimos 7 días. Si el valor total por producto
-- supera el umbral configurado, crea una sugerencia de revisión.
create or replace function public.run_waste_analyzer_agent(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config     jsonb;
  v_threshold  numeric;
  rec          record;
  v_count      integer := 0;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'waste_analyzer' and is_active = true;

  if not found then return 0; end if;

  v_threshold := coalesce((v_config->>'waste_value_threshold_eur')::numeric, 10.0);

  for rec in
    select
      m.product_id,
      p.name as product_name,
      sum(m.quantity) as total_qty,
      p.unit,
      round(sum(m.quantity * coalesce(m.unit_cost, 0))::numeric, 2) as total_value
    from public.stock_movements m
    join public.products p on p.id = m.product_id
    where m.hotel_id = p_hotel_id
      and m.movement_type = 'waste'
      and m.created_at > now() - interval '7 days'
    group by m.product_id, p.name, p.unit
    having sum(m.quantity * coalesce(m.unit_cost, 0)) >= v_threshold
    order by total_value desc
    limit 10
  loop
    perform public._create_agent_suggestion(
      p_hotel_id,
      'waste_analyzer',
      'Merma elevada: ' || rec.product_name,
      format(
        'Se han registrado %.2f %s de %s en mermas esta semana (%.2f€). Revisa las causas y ajusta procesos o pedidos.',
        rec.total_qty, rec.unit, rec.product_name, rec.total_value
      ),
      'none',
      jsonb_build_object('product_id', rec.product_id),
      jsonb_build_object(
        'product_id', rec.product_id,
        'total_qty', rec.total_qty,
        'total_value', rec.total_value,
        'unit', rec.unit
      ),
      'product',
      rec.product_id,
      48
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── run_stock_optimizer_agent ────────────────────────────────────────────────
-- Compara el stock disponible con las reservas de eventos en los próximos N días.
-- Si hay shortfall potencial, sugiere crear una compra.
create or replace function public.run_stock_optimizer_agent(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config       jsonb;
  v_lookahead    integer;
  rec            record;
  v_count        integer := 0;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'stock_optimizer' and is_active = true;

  if not found then return 0; end if;

  v_lookahead := coalesce((v_config->>'lookahead_days')::integer, 7);

  -- Productos con shortfall en reservas de próximos eventos
  for rec in
    select
      sr.product_id,
      p.name as product_name,
      p.unit,
      sum(sr.quantity_needed) as reserved_total,
      coalesce(sl.available_qty, 0) as current_stock,
      sum(sr.quantity_needed) - coalesce(sl.available_qty, 0) as shortfall
    from public.stock_reservations sr
    join public.products p on p.id = sr.product_id
    join public.events e on e.id = sr.event_id
    left join (
      select product_id, sum(quantity) as available_qty
      from public.stock_lots
      where hotel_id = p_hotel_id
        and quantity > 0
        and (expires_at is null or expires_at > now())
      group by product_id
    ) sl on sl.product_id = sr.product_id
    where sr.hotel_id = p_hotel_id
      and sr.status in ('pending', 'partial')
      and e.start_date between now() and now() + (v_lookahead || ' days')::interval
    group by sr.product_id, p.name, p.unit, sl.available_qty
    having sum(sr.quantity_needed) > coalesce(sl.available_qty, 0)
    order by shortfall desc
    limit 10
  loop
    perform public._create_agent_suggestion(
      p_hotel_id,
      'stock_optimizer',
      'Stock insuficiente: ' || rec.product_name,
      format(
        'En los próximos %s días necesitas %.2f %s de %s para eventos, pero solo tienes %.2f %s disponibles (déficit: %.2f %s).',
        v_lookahead, rec.reserved_total, rec.unit, rec.product_name,
        rec.current_stock, rec.unit, rec.shortfall, rec.unit
      ),
      'enqueue_job',
      jsonb_build_object(
        'job_type', 'generate_shopping_list',
        'date', to_char(now() + interval '1 day', 'YYYY-MM-DD')
      ),
      jsonb_build_object(
        'product_id', rec.product_id,
        'reserved_total', rec.reserved_total,
        'current_stock', rec.current_stock,
        'shortfall', rec.shortfall
      ),
      'product',
      rec.product_id,
      24
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── run_recipe_cost_alert_agent ──────────────────────────────────────────────
-- Recetas con food_cost% por encima del target configurado.
create or replace function public.run_recipe_cost_alert_agent(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config     jsonb;
  v_target_pct numeric;
  rec          record;
  v_count      integer := 0;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'recipe_cost_alert' and is_active = true;

  if not found then return 0; end if;

  v_target_pct := coalesce((v_config->>'food_cost_target_pct')::numeric, 35.0);

  for rec in
    select
      r.id as recipe_id,
      r.name as recipe_name,
      r.food_cost_pct,
      r.total_cost,
      r.sale_price
    from public.recipes r
    where r.hotel_id = p_hotel_id
      and r.status = 'approved'
      and r.food_cost_pct is not null
      and r.food_cost_pct > v_target_pct
    order by r.food_cost_pct desc
    limit 15
  loop
    perform public._create_agent_suggestion(
      p_hotel_id,
      'recipe_cost_alert',
      'Food cost elevado: ' || rec.recipe_name,
      format(
        'La receta "%s" tiene un food cost del %.1f%% (objetivo: %.1f%%). Coste: %.4f€. Considera ajustar ingredientes o precio de venta (actual: %.2f€).',
        rec.recipe_name, rec.food_cost_pct, v_target_pct,
        rec.total_cost, coalesce(rec.sale_price, 0)
      ),
      'none',
      jsonb_build_object('recipe_id', rec.recipe_id),
      jsonb_build_object(
        'recipe_id', rec.recipe_id,
        'food_cost_pct', rec.food_cost_pct,
        'target_pct', v_target_pct,
        'total_cost', rec.total_cost,
        'sale_price', rec.sale_price
      ),
      'recipe',
      rec.recipe_id,
      48
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── run_compliance_reminder_agent ────────────────────────────────────────────
-- Plantillas APPCC sin registro para hoy. Crea sugerencia de recordatorio.
create or replace function public.run_compliance_reminder_agent(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config  jsonb;
  v_today   date := current_date;
  rec       record;
  v_count   integer := 0;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'compliance_reminder' and is_active = true;

  if not found then return 0; end if;

  -- Categorías de templates APPCC sin registros para hoy
  for rec in
    select
      at2.category,
      count(*) as pending_count,
      array_agg(at2.name) as template_names
    from public.appcc_templates at2
    where at2.hotel_id = p_hotel_id
      and at2.is_active = true
      and not exists (
        select 1
        from public.appcc_records ar
        where ar.hotel_id = p_hotel_id
          and ar.template_id = at2.id
          and ar.record_date = v_today
          and ar.status in ('completed','corrected')
      )
    group by at2.category
    order by pending_count desc
    limit 5
  loop
    perform public._create_agent_suggestion(
      p_hotel_id,
      'compliance_reminder',
      'APPCC pendiente: ' || rec.category::text,
      format(
        'Tienes %s control(es) APPCC de categoría "%s" sin completar hoy: %s.',
        rec.pending_count,
        rec.category,
        array_to_string(rec.template_names[1:3], ', ') ||
          case when array_length(rec.template_names, 1) > 3 then ' y ' || (array_length(rec.template_names, 1) - 3)::text || ' más' else '' end
      ),
      'create_notification',
      jsonb_build_object('category', rec.category, 'pending_count', rec.pending_count),
      jsonb_build_object(
        'category', rec.category,
        'pending_count', rec.pending_count,
        'template_names', rec.template_names
      ),
      'compliance',
      null,
      12
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ====================
-- 7. RPCs GRUPO B — COORDINACIÓN EVENTO
-- ====================

-- ── run_event_planner_agent ──────────────────────────────────────────────────
-- Al confirmar un evento: sugiere generar workflow + reservar stock + calcular coste.
create or replace function public.run_event_planner_agent(
  p_hotel_id uuid,
  p_event_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config     jsonb;
  v_event      record;
  v_count      integer := 0;
  v_has_workflow boolean;
  v_has_cost   boolean;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'event_planner' and is_active = true;

  if not found then return 0; end if;

  select id, name, pax into v_event
  from public.events
  where id = p_event_id and hotel_id = p_hotel_id;

  if not found then return 0; end if;

  -- Verificar si ya tiene workflow
  select exists(
    select 1 from public.workflows
    where hotel_id = p_hotel_id and event_id = p_event_id
    limit 1
  ) into v_has_workflow;

  -- Verificar si ya tiene coste estimado
  select theoretical_cost is not null into v_has_cost
  from public.events
  where id = p_event_id;

  -- Sugerencia: generar workflow si no existe
  if not v_has_workflow then
    perform public._create_agent_suggestion(
      p_hotel_id,
      'event_planner',
      'Generar workflow: ' || v_event.name,
      format(
        'El evento "%s" (%s pax) está confirmado pero no tiene workflow de producción. Generar automáticamente las tareas de cocina.',
        v_event.name, coalesce(v_event.pax::text, '?')
      ),
      'enqueue_job',
      jsonb_build_object('job_type', 'generate_workflow', 'event_id', p_event_id),
      jsonb_build_object('event_id', p_event_id, 'event_name', v_event.name),
      'event',
      p_event_id,
      48
    );
    v_count := v_count + 1;
  end if;

  -- Sugerencia: reservar stock
  perform public._create_agent_suggestion(
    p_hotel_id,
    'event_planner',
    'Reservar stock: ' || v_event.name,
    format(
      'Reservar automáticamente el stock FIFO necesario para el evento "%s" (%s pax).',
      v_event.name, coalesce(v_event.pax::text, '?')
    ),
    'enqueue_job',
    jsonb_build_object('job_type', 'reserve_stock', 'event_id', p_event_id),
    jsonb_build_object('event_id', p_event_id),
    'event',
    p_event_id,
    48
  );
  v_count := v_count + 1;

  -- Sugerencia: calcular coste estimado si no existe
  if not v_has_cost then
    perform public._create_agent_suggestion(
      p_hotel_id,
      'event_planner',
      'Calcular coste estimado: ' || v_event.name,
      format(
        'Calcular el food cost teórico del evento "%s" a partir de los menús y escandallos.',
        v_event.name
      ),
      'enqueue_job',
      jsonb_build_object('job_type', 'calculate_cost', 'event_id', p_event_id),
      jsonb_build_object('event_id', p_event_id),
      'event',
      p_event_id,
      48
    );
    v_count := v_count + 1;
  end if;

  return v_count;
end;
$$;

-- ── run_shopping_optimizer_agent ─────────────────────────────────────────────
-- PRs pendientes (draft/approved) sin PO asociada → sugiere consolidar.
create or replace function public.run_shopping_optimizer_agent(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config  jsonb;
  rec       record;
  v_count   integer := 0;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'shopping_optimizer' and is_active = true;

  if not found then return 0; end if;

  -- PRs sin PO agrupadas por proveedor
  for rec in
    select
      pr.supplier_id,
      s.name as supplier_name,
      count(*) as pr_count,
      array_agg(pr.id) as pr_ids
    from public.purchase_requests pr
    join public.suppliers s on s.id = pr.supplier_id
    where pr.hotel_id = p_hotel_id
      and pr.status in ('draft','approved')
      and not exists (
        select 1 from public.purchase_order_lines pol
        join public.purchase_orders po on po.id = pol.purchase_order_id
        join public.purchase_request_lines prl on prl.id = pol.request_line_id
        where prl.request_id = pr.id
      )
    group by pr.supplier_id, s.name
    having count(*) >= 2
    order by pr_count desc
    limit 5
  loop
    perform public._create_agent_suggestion(
      p_hotel_id,
      'shopping_optimizer',
      'Consolidar pedidos: ' || rec.supplier_name,
      format(
        'Tienes %s solicitudes de compra aprobadas a %s sin consolidar en pedido. Conviene agruparlas en una sola PO.',
        rec.pr_count, rec.supplier_name
      ),
      'none',
      jsonb_build_object('supplier_id', rec.supplier_id, 'pr_ids', rec.pr_ids),
      jsonb_build_object(
        'supplier_id', rec.supplier_id,
        'supplier_name', rec.supplier_name,
        'pr_count', rec.pr_count
      ),
      'supplier',
      rec.supplier_id,
      24
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── run_kds_coordinator_agent ────────────────────────────────────────────────
-- Planes de producción con tareas sin kitchen_order → sugiere crearlos.
create or replace function public.run_kds_coordinator_agent(
  p_hotel_id uuid,
  p_event_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config   jsonb;
  v_event    record;
  v_count    integer := 0;
  v_has_ko   boolean;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'kds_coordinator' and is_active = true;

  if not found then return 0; end if;

  select id, name into v_event
  from public.events
  where id = p_event_id and hotel_id = p_hotel_id;

  if not found then return 0; end if;

  -- Verificar si ya existen kitchen_orders para este evento
  select exists(
    select 1
    from public.kitchen_orders ko
    join public.workflows w on w.id = ko.workflow_id
    where w.hotel_id = p_hotel_id
      and w.event_id = p_event_id
    limit 1
  ) into v_has_ko;

  if not v_has_ko then
    perform public._create_agent_suggestion(
      p_hotel_id,
      'kds_coordinator',
      'KDS sin activar: ' || v_event.name,
      format(
        'El evento "%s" tiene workflow de producción pero no hay órdenes KDS creadas para las partidas. Crear comandas por estación.',
        v_event.name
      ),
      'none',
      jsonb_build_object('event_id', p_event_id),
      jsonb_build_object('event_id', p_event_id, 'event_name', v_event.name),
      'event',
      p_event_id,
      12
    );
    v_count := 1;
  end if;

  return v_count;
end;
$$;

-- ── run_post_event_agent ─────────────────────────────────────────────────────
-- Evento completado: sugiere calcular coste real y generar snapshot KPI.
create or replace function public.run_post_event_agent(
  p_hotel_id uuid,
  p_event_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config      jsonb;
  v_event       record;
  v_count       integer := 0;
  v_has_actual  boolean;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'post_event' and is_active = true;

  if not found then return 0; end if;

  select id, name, actual_cost into v_event
  from public.events
  where id = p_event_id and hotel_id = p_hotel_id;

  if not found then return 0; end if;

  v_has_actual := v_event.actual_cost is not null;

  -- Sugerencia coste real
  if not v_has_actual then
    perform public._create_agent_suggestion(
      p_hotel_id,
      'post_event',
      'Calcular coste real: ' || v_event.name,
      format(
        'El evento "%s" ha finalizado. Calcula el coste real a partir de los movimientos de stock consumidos.',
        v_event.name
      ),
      'none',
      jsonb_build_object('event_id', p_event_id),
      jsonb_build_object('event_id', p_event_id, 'event_name', v_event.name),
      'event',
      p_event_id,
      72
    );
    v_count := v_count + 1;
  end if;

  -- Sugerencia snapshot KPI
  perform public._create_agent_suggestion(
    p_hotel_id,
    'post_event',
    'Generar snapshot KPI post-evento',
    format(
      'Generar snapshot de KPIs tras el evento "%s" para actualizar el dashboard de food cost.',
      v_event.name
    ),
    'enqueue_job',
    jsonb_build_object('job_type', 'generate_snapshot'),
    jsonb_build_object('event_id', p_event_id, 'event_name', v_event.name),
    'event',
    p_event_id,
    72
  );
  v_count := v_count + 1;

  return v_count;
end;
$$;

-- ── run_forecast_prep_agent ──────────────────────────────────────────────────
-- Verifica si existe snapshot KPI de hoy; si no, sugiere generarlo.
create or replace function public.run_forecast_prep_agent(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_config   jsonb;
  v_has_snap boolean;
begin
  select config into v_config
  from public.agent_configs
  where hotel_id = p_hotel_id and agent_type = 'forecast_prep' and is_active = true;

  if not found then return 0; end if;

  select exists(
    select 1 from public.kpi_snapshots
    where hotel_id = p_hotel_id
      and snapshot_date = current_date
    limit 1
  ) into v_has_snap;

  if v_has_snap then return 0; end if;

  perform public._create_agent_suggestion(
    p_hotel_id,
    'forecast_prep',
    'Snapshot KPI pendiente del día',
    'No se ha generado el snapshot diario de KPIs. Genéralo para mantener el historial de food cost y alertas.',
    'enqueue_job',
    jsonb_build_object('job_type', 'generate_snapshot'),
    jsonb_build_object('snapshot_date', current_date),
    null,
    null,
    24
  );

  return 1;
end;
$$;

-- ====================
-- 8. RPCs DE GESTIÓN
-- ====================

-- ── get_agent_suggestions ────────────────────────────────────────────────────
create or replace function public.get_agent_suggestions(
  p_hotel_id uuid,
  p_status    public.suggestion_status default 'pending',
  p_limit     integer default 50
)
returns table (
  id              uuid,
  agent_type      public.agent_type,
  status          public.suggestion_status,
  title           text,
  description     text,
  action          public.suggestion_action,
  action_payload  jsonb,
  evidence        jsonb,
  context_type    text,
  context_id      uuid,
  expires_at      timestamptz,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  review_note     text,
  created_at      timestamptz
)
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef']::public.app_role[]);

  -- Expirar sugerencias viejas antes de devolver
  update public.agent_suggestions
  set status = 'expired', updated_at = now()
  where hotel_id = p_hotel_id
    and status = 'pending'
    and expires_at < now();

  return query
    select
      s.id, s.agent_type, s.status, s.title, s.description,
      s.action, s.action_payload, s.evidence,
      s.context_type, s.context_id, s.expires_at,
      s.reviewed_by, s.reviewed_at, s.review_note,
      s.created_at
    from public.agent_suggestions s
    where s.hotel_id = p_hotel_id
      and s.status = p_status
    order by s.created_at desc
    limit p_limit;
end;
$$;

-- ── approve_suggestion ───────────────────────────────────────────────────────
-- Aprueba y ejecuta la acción asociada.
create or replace function public.approve_suggestion(
  p_hotel_id      uuid,
  p_suggestion_id uuid
)
returns jsonb  -- resultado de la acción
language plpgsql
security definer
as $$
declare
  v_role    public.app_role;
  v_sug     record;
  v_result  jsonb := '{}'::jsonb;
  v_job_id  uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  select * into v_sug
  from public.agent_suggestions
  where id = p_suggestion_id
    and hotel_id = p_hotel_id
    and status = 'pending';

  if not found then
    raise exception 'Sugerencia no encontrada o ya revisada' using errcode = 'P0010';
  end if;

  -- Ejecutar acción según tipo
  case v_sug.action
    when 'enqueue_job' then
      declare
        v_job_type public.job_type;
        v_payload  jsonb;
      begin
        v_job_type := (v_sug.action_payload->>'job_type')::public.job_type;
        v_payload  := v_sug.action_payload - 'job_type';

        -- Insertar directamente (SECURITY DEFINER, sin check_membership duplicado)
        insert into public.automation_jobs (
          hotel_id, job_type, status, payload, created_by
        ) values (
          p_hotel_id, v_job_type, 'pending', v_payload, auth.uid()
        )
        returning id into v_job_id;

        v_result := jsonb_build_object('job_id', v_job_id, 'job_type', v_job_type);
      end;

    when 'sync_recipe_costs' then
      declare
        v_product_id uuid;
      begin
        v_product_id := (v_sug.action_payload->>'product_id')::uuid;
        -- sync_escandallo_prices actualiza unit_cost en recipe_ingredients desde supplier_offers
        perform public.sync_escandallo_prices(p_hotel_id, v_product_id);
        v_result := jsonb_build_object('synced', true, 'product_id', v_product_id);
      end;

    when 'create_notification' then
      declare
        rec record;
      begin
        for rec in
          select m.user_id
          from public.memberships m
          where m.hotel_id = p_hotel_id
            and m.is_active = true
            and m.role in ('superadmin','direction','admin','head_chef')
        loop
          perform public.create_notification(
            p_hotel_id, rec.user_id,
            'general', 'warning',
            v_sug.title,
            v_sug.description,
            '/compliance/appcc'
          );
        end loop;
        v_result := jsonb_build_object('notifications_sent', true);
      end;

    when 'none' then
      v_result := jsonb_build_object('info', 'Sugerencia informativa aprobada sin acción adicional');

  end case;

  -- Marcar como aplicada
  update public.agent_suggestions
  set status      = 'applied',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at  = now()
  where id = p_suggestion_id;

  perform public.emit_event(
    p_hotel_id, 'agent', p_suggestion_id, 'agent.suggestion_applied',
    jsonb_build_object('agent_type', v_sug.agent_type, 'action', v_sug.action, 'result', v_result)
  );

  return v_result;
end;
$$;

-- ── reject_suggestion ────────────────────────────────────────────────────────
create or replace function public.reject_suggestion(
  p_hotel_id      uuid,
  p_suggestion_id uuid,
  p_note          text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  update public.agent_suggestions
  set status      = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_note,
      updated_at  = now()
  where id        = p_suggestion_id
    and hotel_id  = p_hotel_id
    and status    = 'pending';

  if not found then
    raise exception 'Sugerencia no encontrada o ya revisada' using errcode = 'P0010';
  end if;
end;
$$;

-- ── get_agent_configs ────────────────────────────────────────────────────────
-- Devuelve configuración de todos los agentes (con defaults para los sin fila).
create or replace function public.get_agent_configs(
  p_hotel_id uuid
)
returns table (
  agent_type  public.agent_type,
  is_active   boolean,
  config      jsonb
)
language plpgsql
security definer
as $$
begin
  perform public.check_membership(auth.uid(), p_hotel_id, null);

  return query
    select
      t.agent_type,
      coalesce(c.is_active, true) as is_active,
      coalesce(c.config, '{}'::jsonb) as config
    from (
      select unnest(enum_range(null::public.agent_type)) as agent_type
    ) t
    left join public.agent_configs c
      on c.agent_type = t.agent_type
      and c.hotel_id  = p_hotel_id
    order by t.agent_type;
end;
$$;

-- ── upsert_agent_config ──────────────────────────────────────────────────────
create or replace function public.upsert_agent_config(
  p_hotel_id   uuid,
  p_agent_type public.agent_type,
  p_is_active  boolean,
  p_config     jsonb default '{}'
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin']::public.app_role[]);

  insert into public.agent_configs (hotel_id, agent_type, is_active, config)
  values (p_hotel_id, p_agent_type, p_is_active, p_config)
  on conflict (hotel_id, agent_type)
  do update set
    is_active  = excluded.is_active,
    config     = excluded.config,
    updated_at = now();
end;
$$;

-- ── run_all_automejora_agents ─────────────────────────────────────────────────
-- Ejecuta los 5 agentes de automejora para un hotel. Llamado por el worker.
create or replace function public.run_all_automejora_agents(
  p_hotel_id uuid
)
returns jsonb  -- { price_watcher: N, waste_analyzer: N, ... }
language plpgsql
security definer
as $$
declare
  v_price      integer;
  v_waste      integer;
  v_stock      integer;
  v_recipe     integer;
  v_compliance integer;
begin
  v_price      := public.run_price_watcher_agent(p_hotel_id);
  v_waste      := public.run_waste_analyzer_agent(p_hotel_id);
  v_stock      := public.run_stock_optimizer_agent(p_hotel_id);
  v_recipe     := public.run_recipe_cost_alert_agent(p_hotel_id);
  v_compliance := public.run_compliance_reminder_agent(p_hotel_id);

  return jsonb_build_object(
    'price_watcher',       v_price,
    'waste_analyzer',      v_waste,
    'stock_optimizer',     v_stock,
    'recipe_cost_alert',   v_recipe,
    'compliance_reminder', v_compliance,
    'total',               v_price + v_waste + v_stock + v_recipe + v_compliance
  );
end;
$$;

-- ====================
-- 9. TRIGGER: domain_events → enqueue agentes de evento
-- ====================

-- Reemplazar la función de notify para añadir también enqueue de agentes
create or replace function public.auto_notify_on_domain_event()
returns trigger
language plpgsql
security definer
as $$
declare
  rec          record;
  v_event_name text;
begin
  case new.event_type

    -- ── automation.job_completed ─────────────────────────────────────────────
    when 'automation.job_completed' then
      -- Notificar al creador del job
      for rec in
        select j.created_by as user_id
        from public.automation_jobs j
        where j.id = new.aggregate_id
          and j.created_by is not null
      loop
        perform public.create_notification(
          new.hotel_id, rec.user_id,
          'automation_completed', 'success',
          'Tarea automatizada completada',
          'Una tarea en segundo plano ha finalizado correctamente.',
          null
        );
      end loop;

    -- ── automation.job_failed ────────────────────────────────────────────────
    when 'automation.job_failed' then
      for rec in
        select m.user_id
        from public.memberships m
        where m.hotel_id = new.hotel_id
          and m.is_active = true
          and m.role in ('superadmin','direction','admin','head_chef')
      loop
        perform public.create_notification(
          new.hotel_id, rec.user_id,
          'automation_failed', 'error',
          'Error en tarea automatizada',
          'Una tarea en segundo plano ha fallado. Revisa el log de automatización.',
          '/automation'
        );
      end loop;

    -- ── event.confirmed → Agente event_planner ──────────────────────────────
    when 'event.confirmed' then
      select name into v_event_name
      from public.events
      where id = new.aggregate_id;

      -- Notificaciones
      for rec in
        select m.user_id
        from public.memberships m
        where m.hotel_id = new.hotel_id
          and m.is_active = true
          and m.role in ('superadmin','direction','admin','head_chef')
      loop
        perform public.create_notification(
          new.hotel_id, rec.user_id,
          'event_confirmed', 'info',
          'Evento confirmado: ' || coalesce(v_event_name, 'Sin nombre'),
          'El evento ha sido confirmado y está listo para preparación.',
          '/events/' || new.aggregate_id::text
        );
      end loop;

      -- Encolar agente event_planner (run_agent job)
      insert into public.automation_jobs (
        hotel_id, job_type, status, payload
      ) values (
        new.hotel_id,
        'run_agent',
        'pending',
        jsonb_build_object(
          'agent_type', 'event_planner',
          'event_id', new.aggregate_id
        )
      );

    -- ── event.completed → Agente post_event ─────────────────────────────────
    when 'event.completed' then
      select name into v_event_name
      from public.events
      where id = new.aggregate_id;

      for rec in
        select m.user_id
        from public.memberships m
        where m.hotel_id = new.hotel_id
          and m.is_active = true
          and m.role in ('superadmin','direction','admin')
      loop
        perform public.create_notification(
          new.hotel_id, rec.user_id,
          'event_completed', 'info',
          'Evento completado: ' || coalesce(v_event_name, 'Sin nombre'),
          'El evento ha finalizado. Revisa el food cost real.',
          '/events/' || new.aggregate_id::text
        );
      end loop;

      -- Encolar agente post_event
      insert into public.automation_jobs (
        hotel_id, job_type, status, payload
      ) values (
        new.hotel_id,
        'run_agent',
        'pending',
        jsonb_build_object(
          'agent_type', 'post_event',
          'event_id', new.aggregate_id
        )
      );

    -- ── agent.suggestion_applied ─────────────────────────────────────────────
    when 'agent.suggestion_applied' then
      null; -- No genera notificación por ahora (la UI ya da feedback)

    else
      null;

  end case;

  return new;
end;
$$;

-- ====================
-- 10. GRANTS
-- ====================

grant execute on function public.run_price_watcher_agent(uuid) to service_role;
grant execute on function public.run_waste_analyzer_agent(uuid) to service_role;
grant execute on function public.run_stock_optimizer_agent(uuid) to service_role;
grant execute on function public.run_recipe_cost_alert_agent(uuid) to service_role;
grant execute on function public.run_compliance_reminder_agent(uuid) to service_role;
grant execute on function public.run_event_planner_agent(uuid, uuid) to service_role;
grant execute on function public.run_shopping_optimizer_agent(uuid) to service_role;
grant execute on function public.run_kds_coordinator_agent(uuid, uuid) to service_role;
grant execute on function public.run_post_event_agent(uuid, uuid) to service_role;
grant execute on function public.run_forecast_prep_agent(uuid) to service_role;
grant execute on function public.run_all_automejora_agents(uuid) to service_role;
grant execute on function public.approve_suggestion(uuid, uuid) to authenticated;
grant execute on function public.reject_suggestion(uuid, uuid, text) to authenticated;
grant execute on function public.get_agent_suggestions(uuid, public.suggestion_status, integer) to authenticated;
grant execute on function public.get_agent_configs(uuid) to authenticated;
grant execute on function public.upsert_agent_config(uuid, public.agent_type, boolean, jsonb) to authenticated;

-- ====================
-- 11. SEED — agent_configs para hotel test
-- ====================

do $$
declare
  v_hotel_id uuid := 'ec079cf6-13b1-4be5-9e6f-62c8f604cb1e';
begin
  -- Verificar que el hotel existe
  if not exists (select 1 from public.hotels where id = v_hotel_id) then
    return;
  end if;

  insert into public.agent_configs (hotel_id, agent_type, is_active, config)
  values
    (v_hotel_id, 'price_watcher',       true, '{"price_change_threshold_pct": 5}'::jsonb),
    (v_hotel_id, 'waste_analyzer',      true, '{"waste_value_threshold_eur": 10, "lookback_days": 7}'::jsonb),
    (v_hotel_id, 'stock_optimizer',     true, '{"lookahead_days": 7, "safety_days": 2}'::jsonb),
    (v_hotel_id, 'recipe_cost_alert',   true, '{"food_cost_target_pct": 35}'::jsonb),
    (v_hotel_id, 'compliance_reminder', true, '{"remind_hours_before": 2}'::jsonb),
    (v_hotel_id, 'event_planner',       true, '{}'::jsonb),
    (v_hotel_id, 'shopping_optimizer',  true, '{}'::jsonb),
    (v_hotel_id, 'kds_coordinator',     true, '{}'::jsonb),
    (v_hotel_id, 'post_event',          true, '{}'::jsonb),
    (v_hotel_id, 'forecast_prep',       true, '{}'::jsonb)
  on conflict (hotel_id, agent_type) do nothing;
end;
$$;
