-- 00014_catalog_prices.sql
-- get_catalog_prices: returns all active products with their latest actual GR price
-- (falls back to best supplier offer if no GR exists)
-- Used by the escandallo simulator

create or replace function public.get_catalog_prices(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
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
      'unit_abbreviation', u.symbol,
      'unit_id',           p.default_unit_id,
      -- Latest actual price paid (goods receipt)
      'latest_gr_cost',    gr_price.unit_cost,
      'latest_gr_date',    gr_price.received_at,
      'latest_gr_supplier', gr_price.supplier_name,
      -- Best offer price (catalogue)
      'offer_price',       offer.unit_price,
      -- Best price to use: GR first, then offer
      'best_price',        coalesce(gr_price.unit_cost, offer.unit_price)
    ) order by p.name)
    from public.products p
    left join public.categories       c on c.id = p.category_id
    left join public.units_of_measure u on u.id = p.default_unit_id
    -- Latest GR price
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
    -- Best supplier offer (preferred supplier first)
    left join lateral (
      select so.unit_price
      from public.supplier_offers so
      join public.suppliers s on s.id = so.supplier_id
      where so.product_id  = p.id
        and so.hotel_id    = p_hotel_id
        and so.is_active   = true
      order by so.is_preferred desc, so.unit_price asc
      limit 1
    ) offer on true
    where p.hotel_id  = p_hotel_id
      and p.is_active = true
  ), '[]');
end;
$$;
