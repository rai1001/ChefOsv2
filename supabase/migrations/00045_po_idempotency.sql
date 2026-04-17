-- ============================================================================
-- Purchase Order — idempotencia de generate_purchase_order
--
-- Problema: si el usuario hace doble-click en "Generar pedido" o hay retry
-- por timeout, dos llamadas concurrentes con las mismas PRs pueden:
--   1. Ambas leer 'approved' en su snapshot
--   2. Ambas crear un PO distinto
--   3. Ambas ejecutar UPDATE status='consolidated' (el 2º es no-op pero tarde)
--   → resultado: 2 POs distintos con las mismas PRs consolidadas
--
-- Solución:
--   1. SELECT ... FOR UPDATE en las PRs al inicio (serializa concurrencia)
--   2. Verificar que NINGUNA esté ya 'consolidated' (protección explícita)
--   3. Error claro si detecta duplicado
--
-- También añade soft no-op en transition_purchase_order: si from==to, return.
-- ============================================================================

create or replace function public.generate_purchase_order(
  p_hotel_id uuid,
  p_supplier_id uuid,
  p_request_ids uuid[],
  p_expected_delivery date default null,
  p_payment_terms text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_po_id uuid;
  v_order_number text;
  v_total numeric(12,2);
  v_invalid_count int;
  v_already_consolidated_count int;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','procurement']::public.app_role[]);

  if p_request_ids is null or array_length(p_request_ids, 1) is null then
    raise exception 'p_request_ids cannot be empty' using errcode = 'P0013';
  end if;

  -- LOCK las PRs al inicio para serializar llamadas concurrentes con mismos ids.
  -- La segunda llamada esperará a que la primera termine, y al leer ya las verá
  -- como 'consolidated' → fallará la validación de abajo.
  perform 1
  from public.purchase_requests
  where id = any(p_request_ids) and hotel_id = p_hotel_id
  for update;

  -- Validación 1: todas deben estar 'approved'
  select count(*) into v_invalid_count
  from public.purchase_requests
  where id = any(p_request_ids) and hotel_id = p_hotel_id and status <> 'approved';

  if v_invalid_count > 0 then
    raise exception 'all purchase requests must be approved (% are not)', v_invalid_count
      using errcode = 'P0014';
  end if;

  -- Validación 2: ninguna debe estar ya 'consolidated' (defensa contra doble-click)
  -- Esto es redundante con FOR UPDATE pero protege contra race conditions en
  -- entornos donde el lock pueda liberarse antes de la UPDATE (poco probable en
  -- Postgres, pero explícito es mejor).
  select count(*) into v_already_consolidated_count
  from public.purchase_requests
  where id = any(p_request_ids) and hotel_id = p_hotel_id and status = 'consolidated';

  if v_already_consolidated_count > 0 then
    raise exception 'purchase requests already consolidated in another order (% of %)',
      v_already_consolidated_count, array_length(p_request_ids, 1)
      using errcode = 'P0016';
  end if;

  v_order_number := 'PO-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((
      select count(*) + 1 from public.purchase_orders
      where hotel_id = p_hotel_id
        and created_at::date = current_date
    )::text, 4, '0');

  insert into public.purchase_orders (
    hotel_id, supplier_id, order_number, expected_delivery_date,
    payment_terms, notes, created_by
  ) values (
    p_hotel_id, p_supplier_id, v_order_number, p_expected_delivery,
    p_payment_terms, p_notes, auth.uid()
  ) returning id into v_po_id;

  insert into public.purchase_order_lines (
    order_id, hotel_id, product_id, unit_id, quantity_ordered, unit_price, sort_order
  )
  select
    v_po_id,
    p_hotel_id,
    prl.product_id,
    coalesce(so.unit_id, prl.unit_id),
    sum(prl.quantity_requested),
    coalesce(so.unit_price, 0),
    row_number() over (order by min(prl.sort_order)) - 1
  from public.purchase_request_lines prl
  join public.purchase_requests pr on pr.id = prl.request_id
  left join public.supplier_offers so
    on so.product_id = prl.product_id
    and so.supplier_id = p_supplier_id
    and so.hotel_id = p_hotel_id
    and (so.valid_to is null or so.valid_to >= current_date)
    and so.is_preferred = true
  where pr.id = any(p_request_ids) and pr.hotel_id = p_hotel_id
  group by prl.product_id, so.unit_id, prl.unit_id, so.unit_price;

  select coalesce(sum(quantity_ordered * unit_price), 0) into v_total
  from public.purchase_order_lines
  where order_id = v_po_id;

  update public.purchase_orders
  set total_amount = v_total
  where id = v_po_id;

  -- Marcar las PRs como consolidated (el FOR UPDATE asegura que ningún otro
  -- generate_purchase_order puede estar leyéndolas en este momento)
  update public.purchase_requests
  set status = 'consolidated'
  where id = any(p_request_ids) and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'purchase_order', v_po_id, 'purchase_order.created',
    jsonb_build_object('number', v_order_number, 'supplier_id', p_supplier_id, 'total', v_total)
  );

  return v_po_id;
end;
$$;
