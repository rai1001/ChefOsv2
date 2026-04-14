-- 00013_escandallo_live.sql
-- Live escandallo: fetches latest goods-receipt price per ingredient
-- and a sync function that applies those prices + recalculates recipe cost

-- ─────────────────────────────────────────────────────────────────────────────
-- get_escandallo_live
-- Returns recipe + ingredients with current cost AND latest GR cost side-by-side
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_escandallo_live(
  p_hotel_id uuid,
  p_recipe_id uuid
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
    'recipe_id',               r.id,
    'recipe_name',             r.name,
    'category',                r.category,
    'servings',                r.servings,
    'status',                  r.status,
    'target_price',            r.target_price,
    'stored_total_cost',       r.total_cost,
    'stored_cost_per_serving', r.cost_per_serving,
    'stored_food_cost_pct',    r.food_cost_pct,
    -- flag: any linked ingredient has a different price in GRs
    'has_price_changes', coalesce((
      select bool_or(
        lp.unit_cost is not null
        and abs(lp.unit_cost - ri_c.unit_cost) > 0.001
      )
      from public.recipe_ingredients ri_c
      left join lateral (
        select grl.unit_cost
        from public.goods_receipt_lines grl
        join public.goods_receipts   gr  on gr.id  = grl.receipt_id
        join public.purchase_order_lines pol on pol.id = grl.order_line_id
        where pol.product_id = ri_c.product_id
          and gr.hotel_id    = p_hotel_id
          and grl.quality_status = 'accepted'
          and grl.unit_cost  is not null
        order by gr.received_at desc
        limit 1
      ) lp on ri_c.product_id is not null
      where ri_c.recipe_id = p_recipe_id
        and ri_c.hotel_id  = p_hotel_id
    ), false),
    'ingredients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',                       ri.id,
        'ingredient_name',          ri.ingredient_name,
        'product_id',               ri.product_id,
        'quantity_gross',           ri.quantity_gross,
        'waste_pct',                ri.waste_pct,
        'quantity_net',             ri.quantity_net,
        'unit_abbreviation',        u.abbreviation,
        'unit_cost',                ri.unit_cost,
        'line_cost',                ri.quantity_net * ri.unit_cost,
        -- Latest goods-receipt data
        'latest_gr_cost',           lp.unit_cost,
        'latest_gr_date',           lp.received_at,
        'latest_gr_receipt',        lp.receipt_number,
        'latest_gr_delivery_note',  lp.delivery_note_number,
        'latest_gr_supplier',       lp.supplier_name,
        -- Price change analysis
        'price_changed', (
          lp.unit_cost is not null
          and abs(lp.unit_cost - ri.unit_cost) > 0.001
        ),
        'price_delta',     lp.unit_cost - ri.unit_cost,
        'price_delta_pct', case
          when ri.unit_cost > 0 and lp.unit_cost is not null
          then round(((lp.unit_cost - ri.unit_cost) / ri.unit_cost) * 100, 2)
          else null
        end,
        -- Cost with the new price (for "what-if" column)
        'line_cost_new', case
          when lp.unit_cost is not null
          then ri.quantity_net * lp.unit_cost
          else ri.quantity_net * ri.unit_cost
        end
      ) order by ri.sort_order)
      from public.recipe_ingredients ri
      left join public.units_of_measure u on u.id = ri.unit_id
      left join lateral (
        select
          grl.unit_cost,
          gr.received_at,
          gr.receipt_number,
          gr.delivery_note_number,
          s.name as supplier_name
        from public.goods_receipt_lines  grl
        join public.goods_receipts        gr  on gr.id  = grl.receipt_id
        join public.purchase_order_lines  pol on pol.id = grl.order_line_id
        join public.purchase_orders       po  on po.id  = pol.order_id
        join public.suppliers             s   on s.id   = po.supplier_id
        where pol.product_id = ri.product_id
          and gr.hotel_id    = p_hotel_id
          and grl.quality_status = 'accepted'
          and grl.unit_cost  is not null
        order by gr.received_at desc
        limit 1
      ) lp on ri.product_id is not null
      where ri.recipe_id = p_recipe_id
        and ri.hotel_id  = p_hotel_id
    ), '[]')
  ) into v_result
  from public.recipes r
  where r.id        = p_recipe_id
    and r.hotel_id  = p_hotel_id;

  return v_result;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- sync_escandallo_prices
-- Applies the latest GR unit_cost to each linked ingredient + recalculates totals
-- Returns a summary of what changed
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.sync_escandallo_prices(
  p_hotel_id  uuid,
  p_recipe_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_role         public.app_role;
  v_changes      jsonb := '[]';
  v_rec          record;
  v_new_total    numeric;
  v_servings     integer;
  v_target_price numeric;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef']::public.app_role[]);

  -- Find all linked ingredients whose GR price differs from stored cost
  for v_rec in
    select
      ri.id,
      ri.ingredient_name,
      ri.unit_cost   as old_cost,
      lp.unit_cost   as new_cost
    from public.recipe_ingredients ri
    join lateral (
      select grl.unit_cost
      from public.goods_receipt_lines  grl
      join public.goods_receipts        gr  on gr.id  = grl.receipt_id
      join public.purchase_order_lines  pol on pol.id = grl.order_line_id
      where pol.product_id = ri.product_id
        and gr.hotel_id    = p_hotel_id
        and grl.quality_status = 'accepted'
        and grl.unit_cost  is not null
      order by gr.received_at desc
      limit 1
    ) lp on true
    where ri.recipe_id  = p_recipe_id
      and ri.hotel_id   = p_hotel_id
      and ri.product_id is not null
      and abs(lp.unit_cost - ri.unit_cost) > 0.001
  loop
    update public.recipe_ingredients
    set unit_cost  = v_rec.new_cost
    where id       = v_rec.id;

    v_changes := v_changes || jsonb_build_array(jsonb_build_object(
      'ingredient', v_rec.ingredient_name,
      'old_cost',   v_rec.old_cost,
      'new_cost',   v_rec.new_cost,
      'delta_pct',  case
        when v_rec.old_cost > 0
        then round(((v_rec.new_cost - v_rec.old_cost) / v_rec.old_cost) * 100, 2)
        else null
      end
    ));
  end loop;

  -- Recalculate recipe cost if anything changed
  if jsonb_array_length(v_changes) > 0 then
    select
      coalesce(sum(ri.quantity_net * ri.unit_cost), 0),
      r.servings,
      r.target_price
    into v_new_total, v_servings, v_target_price
    from public.recipe_ingredients ri
    join public.recipes r on r.id = ri.recipe_id
    where ri.recipe_id = p_recipe_id
      and ri.hotel_id  = p_hotel_id
    group by r.servings, r.target_price;

    update public.recipes
    set
      total_cost        = v_new_total,
      cost_per_serving  = case when v_servings > 0 then v_new_total / v_servings else 0 end,
      food_cost_pct     = case
        when v_target_price > 0 and v_servings > 0
        then round((v_new_total / v_servings / v_target_price) * 100, 2)
        else 0
      end,
      updated_at        = now()
    where id           = p_recipe_id
      and hotel_id     = p_hotel_id;

    perform public.emit_event(
      p_hotel_id, 'recipe', p_recipe_id, 'recipe.prices_synced',
      jsonb_build_object(
        'changes_count', jsonb_array_length(v_changes),
        'new_total_cost', v_new_total
      )
    );
  end if;

  return jsonb_build_object(
    'changes_count', jsonb_array_length(v_changes),
    'changes',       v_changes
  );
end;
$$;
