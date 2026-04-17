-- ============================================================================
-- Fix get_stock_levels (00012) y get_catalog_prices (00014):
--   - u.symbol → u.abbreviation (units_of_measure no tiene "symbol")
--   - supplier_offers.is_active → no existe (la tabla no la tiene)
--
-- Síntomas: /inventory mostraba "No hay stock registrado" pese a tener lotes.
-- /escandallos no cargaba precios. Ambos RPCs devolvían 42703.
-- ============================================================================

-- 1. get_stock_levels
create or replace function public.get_stock_levels(
  p_hotel_id uuid,
  p_location_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
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
      'unit', u.abbreviation,
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

-- 2. get_catalog_prices
create or replace function public.get_catalog_prices(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'product_id',        p.id,
      'product_name',      p.name,
      'sku',               p.sku,
      'category',          c.name,
      'unit_abbreviation', u.abbreviation,
      'unit_id',           p.default_unit_id,
      'latest_gr_cost',    gr_price.unit_cost,
      'latest_gr_date',    gr_price.received_at,
      'latest_gr_supplier', gr_price.supplier_name,
      'offer_price',       offer.unit_price,
      'best_price',        coalesce(gr_price.unit_cost, offer.unit_price)
    ) order by p.name)
    from public.products p
    left join public.categories       c on c.id = p.category_id
    left join public.units_of_measure u on u.id = p.default_unit_id
    left join lateral (
      select
        grl.unit_cost,
        gr.received_at,
        s.name as supplier_name
      from public.goods_receipt_lines  grl
      join public.goods_receipts        gr  on gr.id  = grl.receipt_id
      join public.purchase_order_lines  pol on pol.id = grl.order_line_id
      join public.purchase_orders       po  on po.id  = pol.order_id
      join public.suppliers             s   on s.id   = po.supplier_id
      where pol.product_id   = p.id
        and gr.hotel_id      = p_hotel_id
        and grl.quality_status = 'accepted'
        and grl.unit_cost    is not null
      order by gr.received_at desc
      limit 1
    ) gr_price on true
    -- Best supplier offer: preferred first, then lowest price.
    -- Sin filtro is_active: la tabla supplier_offers no tiene esa columna.
    -- En su lugar filtramos por valid_to (si existe) >= hoy.
    left join lateral (
      select so.unit_price
      from public.supplier_offers so
      where so.product_id  = p.id
        and so.hotel_id    = p_hotel_id
        and (so.valid_to is null or so.valid_to >= current_date)
      order by so.is_preferred desc, so.unit_price asc
      limit 1
    ) offer on true
    where p.hotel_id  = p_hotel_id
      and p.is_active = true
  ), '[]');
end;
$$;
