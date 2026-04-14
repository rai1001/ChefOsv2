-- ============================================================================
-- M7 Dashboard — ChefOS v2
-- RPC que agrega KPIs de todos los modulos (read-only, no tablas nuevas MVP)
-- ============================================================================

create or replace function public.get_dashboard_data(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_today date := current_date;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  return jsonb_build_object(
    'date', v_today,

    -- EVENTOS
    'events', jsonb_build_object(
      'upcoming_7d', (
        select count(*) from public.events
        where hotel_id = p_hotel_id
          and event_date between v_today and v_today + 7
          and status not in ('cancelled', 'archived')
      ),
      'confirmed', (
        select count(*) from public.events
        where hotel_id = p_hotel_id
          and status = 'confirmed'
      ),
      'in_preparation', (
        select count(*) from public.events
        where hotel_id = p_hotel_id
          and status = 'in_preparation'
      ),
      'today', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', e.id,
          'name', e.name,
          'guest_count', e.guest_count,
          'status', e.status,
          'start_time', e.start_time
        ) order by e.start_time nulls last), '[]')
        from public.events e
        where e.hotel_id = p_hotel_id
          and e.event_date = v_today
          and e.status not in ('cancelled', 'archived')
      ),
      'total_pax_7d', (
        select coalesce(sum(guest_count), 0) from public.events
        where hotel_id = p_hotel_id
          and event_date between v_today and v_today + 7
          and status in ('confirmed', 'in_preparation', 'in_operation')
      )
    ),

    -- PRODUCCION
    'production', (
      select case when pp.id is not null then
        jsonb_build_object(
          'has_plan', true,
          'plan_id', pp.id,
          'status', pp.status,
          'total', (select count(*) from public.production_plan_items where plan_id = pp.id),
          'pending', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'pending'),
          'in_progress', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'in_progress'),
          'done', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'done')
        )
      else
        jsonb_build_object('has_plan', false)
      end
      from (select null::uuid as id) dummy
      left join public.production_plans pp
        on pp.hotel_id = p_hotel_id and pp.plan_date = v_today
    ),

    -- COMPRAS
    'procurement', jsonb_build_object(
      'pending_orders', (
        select count(*) from public.purchase_orders
        where hotel_id = p_hotel_id
          and status in ('sent', 'confirmed_by_supplier', 'partially_received')
      ),
      'pending_requests', (
        select count(*) from public.purchase_requests
        where hotel_id = p_hotel_id
          and status in ('draft', 'pending_approval')
      ),
      'orders_value', (
        select coalesce(sum(total_amount), 0) from public.purchase_orders
        where hotel_id = p_hotel_id
          and status in ('sent', 'confirmed_by_supplier', 'partially_received')
      )
    ),

    -- INVENTARIO
    'inventory', jsonb_build_object(
      'products_in_stock', (
        select count(distinct product_id) from public.stock_lots
        where hotel_id = p_hotel_id and current_quantity > 0
      ),
      'total_value', (
        select coalesce(sum(current_quantity * coalesce(unit_cost, 0)), 0)
        from public.stock_lots
        where hotel_id = p_hotel_id and current_quantity > 0
      ),
      'low_stock_count', (
        select count(*) from public.products p
        where p.hotel_id = p_hotel_id
          and p.is_active = true
          and p.reorder_point is not null
          and coalesce((
            select sum(sl.current_quantity)
            from public.stock_lots sl
            where sl.product_id = p.id and sl.current_quantity > 0
          ), 0) <= p.reorder_point
      ),
      'expiring_7d', (
        select count(*) from public.stock_lots
        where hotel_id = p_hotel_id
          and current_quantity > 0
          and expiry_date is not null
          and expiry_date <= v_today + 7
      )
    ),

    -- RECETAS
    'recipes', jsonb_build_object(
      'total', (
        select count(*) from public.recipes
        where hotel_id = p_hotel_id and status != 'archived'
      ),
      'approved', (
        select count(*) from public.recipes
        where hotel_id = p_hotel_id and status = 'approved'
      ),
      'draft', (
        select count(*) from public.recipes
        where hotel_id = p_hotel_id and status = 'draft'
      )
    ),

    -- MERMAS (ultimos 7 dias)
    'waste', jsonb_build_object(
      'count_7d', (
        select count(*) from public.waste_records
        where hotel_id = p_hotel_id
          and created_at >= v_today - 7
      ),
      'quantity_7d', (
        select coalesce(sum(quantity), 0) from public.waste_records
        where hotel_id = p_hotel_id
          and created_at >= v_today - 7
      )
    )
  );
end;
$$;
