-- ============================================================================
-- Fix auto_create_stock_lot (00009) para soportar OCR
--
-- Issue: el trigger crea un stock_lot con product_id derivado de
--   purchase_order_lines.product_id. Pero las líneas OCR pueden:
--     a) tener order_line_id NULL (producto no estaba en PO)
--     b) tener quality_status='partial' (pending_review/product_unknown)
--
-- En ambos casos NO debemos crear stock_lot todavía: hay que esperar revisión.
-- Solo creamos lote si: quality_status='accepted' (auto_matched) Y order_line_id
-- existe Y el producto se puede resolver.
-- ============================================================================

create or replace function public.auto_create_stock_lot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hotel_id uuid;
  v_product_id uuid;
  v_lot_id uuid;
  v_unit_cost numeric(12,4);
  v_received_by uuid;
begin
  -- Solo crear lote si la línea está aceptada
  if new.quality_status <> 'accepted' then
    return new;
  end if;

  -- Necesitamos order_line_id para resolver el producto
  if new.order_line_id is null then
    return new;
  end if;

  select gr.hotel_id, gr.received_by
  into v_hotel_id, v_received_by
  from public.goods_receipts gr
  where gr.id = new.receipt_id;

  select pol.product_id
  into v_product_id
  from public.purchase_order_lines pol
  where pol.id = new.order_line_id;

  -- Si no hay producto resuelto, no crear lote
  if v_product_id is null then
    return new;
  end if;

  v_unit_cost := coalesce(new.unit_cost, (
    select pol.unit_price from public.purchase_order_lines pol
    where pol.id = new.order_line_id
  ));

  insert into public.stock_lots (
    hotel_id, product_id, goods_receipt_line_id,
    lot_number, expiry_date,
    initial_quantity, current_quantity, unit_cost
  ) values (
    v_hotel_id, v_product_id, new.id,
    new.lot_number, new.expiry_date,
    new.quantity_received, new.quantity_received, v_unit_cost
  ) returning id into v_lot_id;

  insert into public.stock_movements (
    hotel_id, product_id, lot_id, movement_type,
    quantity, unit_cost, reference_type, reference_id,
    created_by, notes
  ) values (
    v_hotel_id, v_product_id, v_lot_id, 'reception',
    new.quantity_received, v_unit_cost,
    'goods_receipt_line', new.id,
    v_received_by, 'Recepcion automatica'
  );

  return new;
end;
$$;
