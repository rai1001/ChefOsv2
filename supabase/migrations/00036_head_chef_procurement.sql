-- ============================================================================
-- Permite a head_chef generar y gestionar pedidos de compra (PO).
--
-- Contexto: en 00008_m4_procurement.sql, generate_purchase_order y
-- transition_purchase_order restringen a admin/direction/procurement/superadmin.
-- En hoteles pequeños/medianos el jefe de cocina compra directamente. La demo
-- Iago (Eurostars Ourense, sábado 19/abr) usa el rol head_chef y necesita
-- demostrar el ciclo completo PR → PO → GR.
--
-- Cambio: añade 'head_chef' a las listas de roles permitidos.
-- No afecta a hoteles que no quieran ese permiso — head_chef sigue sin tocar
-- credenciales, integraciones, ni transiciones financieras críticas.
-- ============================================================================

-- 1. generate_purchase_order
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
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','procurement']::public.app_role[]);

  if exists (
    select 1 from public.purchase_requests
    where id = any(p_request_ids) and hotel_id = p_hotel_id and status != 'approved'
  ) then
    raise exception 'all purchase requests must be approved' using errcode = 'P0014';
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

-- 2. transition_purchase_order — añade head_chef a transiciones operativas
-- (sent y confirmed_by_supplier para cerrar el ciclo). approved/cancel
-- siguen requiriendo direction/admin para mantener control financiero.
create or replace function public.transition_purchase_order(
  p_hotel_id uuid,
  p_order_id uuid,
  p_new_status public.po_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_current public.po_status;
  v_required_roles public.app_role[];
  v_total numeric(12,2);
begin
  v_required_roles := case p_new_status
    when 'pending_approval' then array['head_chef','procurement','direction','admin','superadmin']::public.app_role[]
    when 'approved'         then array['direction','admin','superadmin']::public.app_role[]
    when 'sent'             then array['head_chef','procurement','direction','admin','superadmin']::public.app_role[]
    when 'confirmed_by_supplier' then array['head_chef','procurement','direction','admin','superadmin']::public.app_role[]
    when 'cancelled'        then array['procurement','direction','admin','superadmin']::public.app_role[]
    else array['superadmin']::public.app_role[]
  end;

  v_role := public.check_membership(auth.uid(), p_hotel_id, v_required_roles);

  select status into v_current
  from public.purchase_orders
  where id = p_order_id and hotel_id = p_hotel_id;

  if v_current is null then
    raise exception 'purchase order not found' using errcode = 'P0404';
  end if;

  if not public.validate_po_transition(v_current, p_new_status) then
    raise exception 'invalid transition: % -> %', v_current, p_new_status using errcode = 'P0012';
  end if;

  if p_new_status = 'sent' then
    if not exists (
      select 1 from public.purchase_order_lines
      where order_id = p_order_id and unit_price > 0
    ) then
      raise exception 'cannot send order without priced lines' using errcode = 'P0015';
    end if;

    select coalesce(sum(quantity_ordered * unit_price), 0) into v_total
    from public.purchase_order_lines where order_id = p_order_id;

    update public.purchase_orders
    set total_amount = v_total, sent_at = now()
    where id = p_order_id;
  end if;

  if p_new_status = 'cancelled' and (p_reason is null or p_reason = '') then
    raise exception 'cancel reason required' using errcode = 'P0013';
  end if;

  update public.purchase_orders
  set status = p_new_status,
      cancel_reason = case when p_new_status = 'cancelled' then p_reason else cancel_reason end,
      approved_by = case when p_new_status = 'approved' then auth.uid() else approved_by end,
      approved_at = case when p_new_status = 'approved' then now() else approved_at end
  where id = p_order_id and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'purchase_order', p_order_id,
    'purchase_order.' || p_new_status,
    jsonb_build_object('from', v_current, 'to', p_new_status)
  );
end;
$$;
