-- ============================================================================
-- OCR RPCs: matching de productos + procesado de albarán OCR
--
--   1. match_product_by_alias(hotel_id, query, threshold) → ranking productos
--   2. process_ocr_receipt(hotel_id, receipt_id, ocr_data) → crea GR lines
--   3. _recalc_recipes_using_product(hotel_id, product_id) → cascada coste
--   4. trigger trg_recalc_on_price_change → ejecuta cascada al insertar log
-- ============================================================================

-- ─── 1. match_product_by_alias ──────────────────────────────────────────────
-- Devuelve ranking de productos similares al texto OCR. Estrategia:
--   a) Match exacto en products.name (unaccent + lower) → confidence 1.0
--   b) Match en product_aliases.alias_name (unaccent + lower) → confidence 0.95
--   c) similarity (pg_trgm) sobre nombres + alias, ordenado desc
-- Devuelve top 5 con confidence y producto + categoría.
create or replace function public.match_product_by_alias(
  p_hotel_id uuid,
  p_query text,
  p_limit int default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_q text;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  v_q := lower(unaccent(coalesce(p_query, '')));
  if length(trim(v_q)) = 0 then
    return '[]'::jsonb;
  end if;

  return coalesce((
    with candidates as (
      -- Match exacto nombre producto
      select
        p.id,
        p.name,
        c.name as category,
        u.abbreviation as unit,
        1.000::numeric as confidence,
        'exact_name' as match_type
      from public.products p
      left join public.categories c on c.id = p.category_id
      left join public.units_of_measure u on u.id = p.default_unit_id
      where p.hotel_id = p_hotel_id
        and p.is_active
        and lower(unaccent(p.name)) = v_q

      union all
      -- Match exacto alias
      select
        p.id, p.name, c.name, u.abbreviation,
        0.950::numeric, 'exact_alias'
      from public.product_aliases pa
      join public.products p on p.id = pa.product_id
      left join public.categories c on c.id = p.category_id
      left join public.units_of_measure u on u.id = p.default_unit_id
      where pa.hotel_id = p_hotel_id
        and p.is_active
        and lower(unaccent(pa.alias_name)) = v_q

      union all
      -- Similarity nombre producto (pg_trgm)
      select
        p.id, p.name, c.name, u.abbreviation,
        round(similarity(lower(unaccent(p.name)), v_q)::numeric, 3),
        'similarity_name'
      from public.products p
      left join public.categories c on c.id = p.category_id
      left join public.units_of_measure u on u.id = p.default_unit_id
      where p.hotel_id = p_hotel_id
        and p.is_active
        and similarity(lower(unaccent(p.name)), v_q) > 0.30

      union all
      -- Similarity alias
      select
        p.id, p.name, c.name, u.abbreviation,
        round((similarity(lower(unaccent(pa.alias_name)), v_q) * 0.9)::numeric, 3),
        'similarity_alias'
      from public.product_aliases pa
      join public.products p on p.id = pa.product_id
      left join public.categories c on c.id = p.category_id
      left join public.units_of_measure u on u.id = p.default_unit_id
      where pa.hotel_id = p_hotel_id
        and p.is_active
        and similarity(lower(unaccent(pa.alias_name)), v_q) > 0.30
    ),
    ranked as (
      select distinct on (id)
        id, name, category, unit, confidence, match_type
      from candidates
      order by id, confidence desc
    )
    select jsonb_agg(
      jsonb_build_object(
        'product_id', id,
        'product_name', name,
        'category', category,
        'unit', unit,
        'confidence', confidence,
        'match_type', match_type
      )
      order by confidence desc
    )
    from (
      select * from ranked
      order by confidence desc
      limit p_limit
    ) top
  ), '[]'::jsonb);
end;
$$;

-- ─── 2. _recalc_recipes_using_product (helper interno cascada) ──────────────
-- Recalcula recipe_ingredients.unit_cost para todos los ingredientes que usan
-- este producto, y luego total_cost / cost_per_serving / food_cost_pct de
-- las recetas afectadas.
create or replace function public._recalc_recipes_using_product(
  p_hotel_id uuid,
  p_product_id uuid,
  p_new_unit_price numeric
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  -- 1. Actualizar unit_cost en ingredientes
  update public.recipe_ingredients ri
  set unit_cost = p_new_unit_price
  where ri.hotel_id = p_hotel_id
    and ri.product_id = p_product_id;

  get diagnostics v_count = row_count;

  -- 2. Recalcular costes por receta afectada
  update public.recipes r
  set
    total_cost = sub.tc,
    cost_per_serving = case when r.servings > 0 then round(sub.tc / r.servings, 4) else 0 end,
    food_cost_pct = case
      when r.target_price > 0
      then round((sub.tc / r.servings / r.target_price * 100)::numeric, 2)
      else r.food_cost_pct
    end,
    unit_cost = case when r.servings > 0 then round(sub.tc / r.servings, 4) else 0 end
  from (
    select
      ri.recipe_id,
      coalesce(sum(ri.quantity_net * coalesce(ri.unit_cost, 0)), 0) as tc
    from public.recipe_ingredients ri
    where ri.hotel_id = p_hotel_id
      and ri.recipe_id in (
        select distinct recipe_id from public.recipe_ingredients
        where hotel_id = p_hotel_id and product_id = p_product_id
      )
    group by ri.recipe_id
  ) sub
  where r.id = sub.recipe_id;

  return v_count;
end;
$$;

-- ─── 3. Trigger: cuando llega un price_change_log, ejecutar cascada ────────
create or replace function public.trg_recalc_on_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  v_count := public._recalc_recipes_using_product(
    new.hotel_id, new.product_id, new.new_unit_price
  );

  update public.price_change_log
  set
    applied_to_recipes_at = now(),
    applied_recipe_count = v_count
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_price_change_cascade on public.price_change_log;
create trigger trg_price_change_cascade
  after insert on public.price_change_log
  for each row execute function public.trg_recalc_on_price_change();

-- ─── 4. process_ocr_receipt ─────────────────────────────────────────────────
-- Crea goods_receipt + lines a partir del JSON que extrajo Claude Vision.
-- Detecta cambios de precio vs PO y dispara cascada de escandallos.
--
-- Schema esperado de p_ocr_data:
-- {
--   "supplier_name_detected": "...",
--   "delivery_note_number": "ALB-XXX",
--   "delivery_date": "2026-04-23",
--   "lines": [
--     { "raw_text": "...", "product_name_extracted": "Pulpo congelado",
--       "quantity": 8.0, "unit": "kg", "unit_price": 18.50,
--       "lot_number": "L-...", "expiry_date": "2026-07-23" },
--     ...
--   ],
--   "total": 422.40
-- }
create or replace function public.process_ocr_receipt(
  p_hotel_id uuid,
  p_order_id uuid,
  p_ocr_data jsonb,
  p_image_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_receipt_id uuid;
  v_receipt_number text;
  v_line jsonb;
  v_match jsonb;
  v_top jsonb;
  v_product_id uuid;
  v_confidence numeric;
  v_review_status public.ocr_review_status;
  v_pol_id uuid;
  v_pol_unit_price numeric;
  v_unit_price_extracted numeric;
  v_qty_extracted numeric;
  v_line_count int := 0;
  v_pending_count int := 0;
  v_unknown_count int := 0;
  v_price_alerts int := 0;
  v_grl_id uuid;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','procurement']::public.app_role[]);

  -- Validar que el PO existe y pertenece al hotel
  if not exists (
    select 1 from public.purchase_orders
    where id = p_order_id and hotel_id = p_hotel_id
  ) then
    raise exception 'purchase order not found' using errcode = 'P0404';
  end if;

  -- Generar número de recepción
  v_receipt_number := 'GR-' || to_char(now(), 'YYYYMMDD') || '-OCR' ||
    lpad((
      select count(*) + 1 from public.goods_receipts
      where hotel_id = p_hotel_id and created_at::date = current_date
    )::text, 3, '0');

  insert into public.goods_receipts (
    order_id, hotel_id, receipt_number,
    delivery_note_number, delivery_note_image, ocr_data,
    received_by, notes
  ) values (
    p_order_id, p_hotel_id, v_receipt_number,
    p_ocr_data->>'delivery_note_number',
    p_image_url,
    p_ocr_data,
    auth.uid(),
    'Recepción procesada vía OCR'
  ) returning id into v_receipt_id;

  -- Procesar cada línea del OCR
  for v_line in select * from jsonb_array_elements(coalesce(p_ocr_data->'lines', '[]'::jsonb))
  loop
    v_line_count := v_line_count + 1;

    v_qty_extracted := nullif(v_line->>'quantity', '')::numeric;
    v_unit_price_extracted := nullif(v_line->>'unit_price', '')::numeric;

    -- Match producto por alias
    v_match := public.match_product_by_alias(
      p_hotel_id,
      coalesce(v_line->>'product_name_extracted', v_line->>'raw_text'),
      1
    );

    v_top := v_match->0;

    if v_top is not null then
      v_product_id := (v_top->>'product_id')::uuid;
      v_confidence := (v_top->>'confidence')::numeric;

      if v_confidence >= 0.85 then
        v_review_status := 'auto_matched';
      else
        v_review_status := 'pending_review';
        v_pending_count := v_pending_count + 1;
      end if;
    else
      v_product_id := null;
      v_confidence := 0;
      v_review_status := 'product_unknown';
      v_unknown_count := v_unknown_count + 1;
    end if;

    -- Buscar línea correspondiente en el PO (si match producto)
    v_pol_id := null;
    v_pol_unit_price := null;
    if v_product_id is not null then
      select id, unit_price into v_pol_id, v_pol_unit_price
      from public.purchase_order_lines
      where order_id = p_order_id and product_id = v_product_id
      order by sort_order
      limit 1;
    end if;

    -- Insertar GR line
    insert into public.goods_receipt_lines (
      receipt_id, order_line_id, hotel_id,
      quantity_received, lot_number, expiry_date,
      unit_cost, quality_status,
      ocr_review_status, ocr_match_confidence,
      ocr_raw_text, ocr_product_name_extracted
    ) values (
      v_receipt_id,
      v_pol_id,                        -- puede ser null si producto no coincide con PO
      p_hotel_id,
      coalesce(v_qty_extracted, 0),
      v_line->>'lot_number',
      nullif(v_line->>'expiry_date', '')::date,
      v_unit_price_extracted,
      case when v_review_status = 'auto_matched' then 'accepted'::public.quality_status
           else 'partial'::public.quality_status end,
      v_review_status,
      v_confidence,
      v_line->>'raw_text',
      v_line->>'product_name_extracted'
    ) returning id into v_grl_id;

    -- Detectar cambio de precio si auto_matched + tenemos PO line
    if v_review_status = 'auto_matched'
       and v_pol_id is not null
       and v_pol_unit_price is not null
       and v_unit_price_extracted is not null
       and v_pol_unit_price > 0
       and abs((v_unit_price_extracted - v_pol_unit_price) / v_pol_unit_price) > 0.05
    then
      insert into public.price_change_log (
        hotel_id, product_id, source, source_ref_id,
        old_unit_price, new_unit_price
      ) values (
        p_hotel_id, v_product_id, 'ocr', v_grl_id,
        v_pol_unit_price, v_unit_price_extracted
      );

      -- Crear alerta también
      insert into public.alerts (
        hotel_id, alert_type, severity, title, message, details,
        related_entity_id, related_entity_type
      ) values (
        p_hotel_id, 'cost_overrun'::public.alert_type,
        (case when abs((v_unit_price_extracted - v_pol_unit_price) / v_pol_unit_price) > 0.15
             then 'critical' else 'warning' end)::public.alert_severity,
        'Cambio de precio detectado en albarán',
        format('%s: %s €/ud → %s €/ud (%s%%)',
          v_top->>'product_name',
          v_pol_unit_price::text,
          v_unit_price_extracted::text,
          round(((v_unit_price_extracted - v_pol_unit_price) / v_pol_unit_price * 100)::numeric, 1)::text
        ),
        jsonb_build_object(
          'product_id', v_product_id,
          'old_price', v_pol_unit_price,
          'new_price', v_unit_price_extracted,
          'receipt_id', v_receipt_id,
          'goods_receipt_line_id', v_grl_id
        ),
        v_grl_id, 'goods_receipt_line'
      );

      v_price_alerts := v_price_alerts + 1;
    end if;
  end loop;

  -- Emitir evento de dominio
  perform public.emit_event(
    p_hotel_id, 'goods_receipt', v_receipt_id, 'goods_receipt.ocr_processed',
    jsonb_build_object(
      'receipt_id', v_receipt_id,
      'order_id', p_order_id,
      'lines_total', v_line_count,
      'lines_pending', v_pending_count + v_unknown_count,
      'price_alerts', v_price_alerts
    )
  );

  return jsonb_build_object(
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'lines_processed', v_line_count,
    'lines_auto_matched', v_line_count - v_pending_count - v_unknown_count,
    'lines_pending_review', v_pending_count,
    'lines_product_unknown', v_unknown_count,
    'price_alerts', v_price_alerts
  );
end;
$$;
