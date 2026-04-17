-- ============================================================================
-- OCR idempotency — hash SHA-256 del albarán como dedup key
--
-- Problema: si el chef sube la misma foto 2 veces (doble-click, timeout,
-- reintento tras error de red), process_ocr_receipt creaba 2 GRs distintos
-- → stock duplicado, escandallos recalculados 2 veces, alertas dobles.
--
-- Solución:
--   1. Nueva columna goods_receipts.delivery_note_image_hash (SHA-256 hex)
--   2. Unique index parcial (order_id, hash) where hash is not null
--   3. process_ocr_receipt acepta p_image_hash; si existe GR con ese hash
--      para este order_id, devuelve el GR existente con flag already_processed.
--
-- Contrato cliente:
--   - Browser calcula SHA-256 del file ANTES de upload (crypto.subtle.digest)
--   - Lo pasa a la edge function como field en body
--   - Edge function lo propaga a process_ocr_receipt
--   - Si already_processed=true, UI muestra "Este albarán ya estaba procesado"
-- ============================================================================

-- ─── 1. Columna + unique index ──────────────────────────────────────────────

alter table public.goods_receipts
  add column if not exists delivery_note_image_hash text;

comment on column public.goods_receipts.delivery_note_image_hash is
  'SHA-256 hex del file subido. Usado para dedup de albaranes OCR duplicados.';

-- Unique parcial: solo cuando hash existe, dedup por (order_id, hash).
-- Un mismo hash PUEDE repetirse entre distintos orders (p.ej. mismo proveedor
-- manda un albarán que cubre 2 POs, aunque raro), por eso el compuesto.
create unique index if not exists uq_goods_receipts_hash_per_order
  on public.goods_receipts (order_id, delivery_note_image_hash)
  where delivery_note_image_hash is not null;

-- ─── 2. process_ocr_receipt con soporte hash ────────────────────────────────
-- DROP + CREATE porque añadimos nuevo param obligatorio en la firma.

drop function if exists public.process_ocr_receipt(uuid, uuid, jsonb, text);

create or replace function public.process_ocr_receipt(
  p_hotel_id uuid,
  p_order_id uuid,
  p_ocr_data jsonb,
  p_image_url  text default null,
  p_image_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_existing_gr record;
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

  -- ─── IDEMPOTENCIA: si ya hay un GR con este hash+order, devolverlo ──────
  if p_image_hash is not null then
    select gr.id, gr.receipt_number,
           (select count(*) from public.goods_receipt_lines where receipt_id = gr.id) as n_lines,
           (select count(*) from public.goods_receipt_lines
            where receipt_id = gr.id and ocr_review_status = 'pending_review') as n_pending,
           (select count(*) from public.goods_receipt_lines
            where receipt_id = gr.id and ocr_review_status = 'product_unknown') as n_unknown
      into v_existing_gr
      from public.goods_receipts gr
      where gr.order_id = p_order_id
        and gr.delivery_note_image_hash = p_image_hash
      limit 1;

    if v_existing_gr.id is not null then
      return jsonb_build_object(
        'receipt_id', v_existing_gr.id,
        'receipt_number', v_existing_gr.receipt_number,
        'lines_processed', v_existing_gr.n_lines,
        'lines_pending_review', v_existing_gr.n_pending,
        'lines_product_unknown', v_existing_gr.n_unknown,
        'lines_auto_matched', v_existing_gr.n_lines - v_existing_gr.n_pending - v_existing_gr.n_unknown,
        'price_alerts', 0,
        'already_processed', true
      );
    end if;
  end if;

  -- Generar número de recepción
  v_receipt_number := 'GR-' || to_char(now(), 'YYYYMMDD') || '-OCR' ||
    lpad((
      select count(*) + 1 from public.goods_receipts
      where hotel_id = p_hotel_id and created_at::date = current_date
    )::text, 3, '0');

  insert into public.goods_receipts (
    order_id, hotel_id, receipt_number,
    delivery_note_number, delivery_note_image, delivery_note_image_hash, ocr_data,
    received_by, notes
  ) values (
    p_order_id, p_hotel_id, v_receipt_number,
    p_ocr_data->>'delivery_note_number',
    p_image_url,
    p_image_hash,
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

    v_pol_id := null;
    v_pol_unit_price := null;
    if v_product_id is not null then
      select id, unit_price into v_pol_id, v_pol_unit_price
      from public.purchase_order_lines
      where order_id = p_order_id and product_id = v_product_id
      order by sort_order
      limit 1;
    end if;

    insert into public.goods_receipt_lines (
      receipt_id, order_line_id, hotel_id,
      quantity_received, lot_number, expiry_date,
      unit_cost, quality_status,
      ocr_review_status, ocr_match_confidence,
      ocr_raw_text, ocr_product_name_extracted
    ) values (
      v_receipt_id,
      v_pol_id,
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

      insert into public.alerts (
        hotel_id, alert_type, severity, title, message, details,
        related_entity_id, related_entity_type
      ) values (
        p_hotel_id, 'cost_overrun'::public.alert_type,
        (case when abs((v_unit_price_extracted - v_pol_unit_price) / v_pol_unit_price) > 0.15
             then 'critical' else 'warning' end)::public.alert_severity,
        'Cambio de precio detectado en albarán',
        format('%s: %s EUR/ud -> %s EUR/ud (%s%%)',
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
    'price_alerts', v_price_alerts,
    'already_processed', false
  );
end;
$$;

-- Mantener los grants de la versión anterior
revoke execute on function public.process_ocr_receipt(uuid, uuid, jsonb, text, text) from public;
grant  execute on function public.process_ocr_receipt(uuid, uuid, jsonb, text, text) to authenticated, service_role;
