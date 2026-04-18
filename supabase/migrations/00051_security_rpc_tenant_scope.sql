-- 00051_security_rpc_tenant_scope.sql
-- Codex adversarial review (2026-04-18) — 3 issues cross-tenant/authz:
--   1. seed_default_categories (00007): SECURITY DEFINER sin check_membership → insert en cualquier hotel
--   2. get_production_summary (00010): join events sin filtro hotel_id → leak metadata cross-tenant
--   3. receive_goods (00008): order_line_id sin validar pertenencia a p_order_id → update arbitrario de líneas
-- Nota: record_waste (00012) ya fue parcheado en sesión previa.

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: seed_default_categories — exigir membership admin+ del hotel
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.seed_default_categories(p_hotel_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin']::public.app_role[]);

  insert into public.categories (hotel_id, name, sort_order) values
    (p_hotel_id, 'Carnes', 1),
    (p_hotel_id, 'Pescados y mariscos', 2),
    (p_hotel_id, 'Verduras y hortalizas', 3),
    (p_hotel_id, 'Frutas', 4),
    (p_hotel_id, 'Lácteos y huevos', 5),
    (p_hotel_id, 'Especias y condimentos', 6),
    (p_hotel_id, 'Aceites y vinagres', 7),
    (p_hotel_id, 'Panadería y harinas', 8),
    (p_hotel_id, 'Conservas y secos', 9),
    (p_hotel_id, 'Congelados', 10),
    (p_hotel_id, 'Bebidas', 11),
    (p_hotel_id, 'Limpieza y desechables', 12)
  on conflict (hotel_id, name) do nothing;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: get_production_summary — scope events join a p_hotel_id
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_production_summary(
  p_hotel_id uuid,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_plan_id uuid;
  v_result jsonb;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select id into v_plan_id
  from public.production_plans
  where hotel_id = p_hotel_id and plan_date = p_date;

  if v_plan_id is null then
    return jsonb_build_object(
      'has_plan', false,
      'date', p_date,
      'events_count', (
        select count(*) from public.events
        where hotel_id = p_hotel_id and event_date = p_date
          and status in ('confirmed', 'in_preparation')
      )
    );
  end if;

  select jsonb_build_object(
    'has_plan', true,
    'plan_id', pp.id,
    'date', pp.plan_date,
    'status', pp.status,
    'total_items', (select count(*) from public.production_plan_items where plan_id = pp.id),
    'pending', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'pending'),
    'in_progress', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'in_progress'),
    'done', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'done'),
    'cancelled', (select count(*) from public.production_plan_items where plan_id = pp.id and status = 'cancelled'),
    'by_department', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'department', dept,
        'total', total,
        'done', done_count
      ) order by dept), '[]')
      from (
        select
          department as dept,
          count(*) as total,
          count(*) filter (where status = 'done') as done_count
        from public.production_plan_items
        where plan_id = pp.id
        group by department
      ) depts
    ),
    'events', (
      select coalesce(jsonb_agg(distinct jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'guest_count', e.guest_count,
        'start_time', e.start_time
      )), '[]')
      from public.production_plan_items ppi
      join public.events e
        on e.id = ppi.event_id
       and e.hotel_id = p_hotel_id         -- ← scope tenant-side
      where ppi.plan_id = pp.id
        and ppi.hotel_id = p_hotel_id      -- ← defensa adicional
    )
  ) into v_result
  from public.production_plans pp
  where pp.id = v_plan_id and pp.hotel_id = p_hotel_id;

  return v_result;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: receive_goods — validar order_line_id.order_id = p_order_id + hotel_id
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.receive_goods(
  p_hotel_id uuid,
  p_order_id uuid,
  p_lines jsonb,
  p_delivery_note_number text default null,
  p_temperature_check boolean default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_po_status public.po_status;
  v_gr_id uuid;
  v_receipt_number text;
  v_line jsonb;
  v_all_received boolean;
  v_line_id uuid;
  v_line_belongs boolean;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','procurement']::public.app_role[]);

  select status into v_po_status
  from public.purchase_orders
  where id = p_order_id and hotel_id = p_hotel_id;

  if v_po_status is null then
    raise exception 'purchase order not found' using errcode = 'P0404';
  end if;

  if v_po_status not in ('confirmed_by_supplier', 'partially_received') then
    raise exception 'order not ready for reception (status: %)', v_po_status using errcode = 'P0016';
  end if;

  -- Validate every order_line_id belongs to this order AND hotel (before inserting anything)
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_line_id := (v_line->>'order_line_id')::uuid;

    if v_line_id is null then
      raise exception 'order_line_id missing in receipt line' using errcode = 'P0001';
    end if;

    select exists (
      select 1 from public.purchase_order_lines
      where id = v_line_id
        and order_id = p_order_id
        and hotel_id = p_hotel_id
    ) into v_line_belongs;

    if not v_line_belongs then
      raise exception 'order line % does not belong to order % in hotel %',
        v_line_id, p_order_id, p_hotel_id using errcode = 'P0403';
    end if;
  end loop;

  -- Generate receipt number: GR-YYYYMMDD-XXXX
  v_receipt_number := 'GR-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((
      select count(*) + 1 from public.goods_receipts
      where hotel_id = p_hotel_id
        and created_at::date = current_date
    )::text, 4, '0');

  insert into public.goods_receipts (
    order_id, hotel_id, receipt_number, delivery_note_number,
    temperature_check, notes, received_by
  ) values (
    p_order_id, p_hotel_id, v_receipt_number, p_delivery_note_number,
    p_temperature_check, p_notes, auth.uid()
  ) returning id into v_gr_id;

  -- Insert receipt lines and update PO line quantities (already validated above)
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.goods_receipt_lines (
      receipt_id, order_line_id, hotel_id, quantity_received,
      lot_number, expiry_date, unit_cost, quality_status, rejection_reason
    ) values (
      v_gr_id,
      (v_line->>'order_line_id')::uuid,
      p_hotel_id,
      (v_line->>'quantity_received')::numeric,
      v_line->>'lot_number',
      (v_line->>'expiry_date')::date,
      (v_line->>'unit_cost')::numeric,
      coalesce((v_line->>'quality_status')::public.quality_status, 'accepted'),
      v_line->>'rejection_reason'
    );

    -- Update received quantity on PO line — extra order_id guard (defense in depth)
    if coalesce((v_line->>'quality_status')::public.quality_status, 'accepted') != 'rejected' then
      update public.purchase_order_lines
      set quantity_received = quantity_received + (v_line->>'quantity_received')::numeric
      where id = (v_line->>'order_line_id')::uuid
        and order_id = p_order_id
        and hotel_id = p_hotel_id;
    end if;
  end loop;

  -- Check if all lines fully received
  select not exists (
    select 1 from public.purchase_order_lines
    where order_id = p_order_id
      and quantity_received < quantity_ordered
  ) into v_all_received;

  -- Transition PO status
  if v_all_received then
    update public.purchase_orders
    set status = 'received'
    where id = p_order_id and hotel_id = p_hotel_id;
  else
    update public.purchase_orders
    set status = 'partially_received'
    where id = p_order_id and hotel_id = p_hotel_id;
  end if;

  perform public.emit_event(
    p_hotel_id, 'goods_receipt', v_gr_id, 'goods_receipt.created',
    jsonb_build_object(
      'number', v_receipt_number,
      'order_id', p_order_id,
      'fully_received', v_all_received
    )
  );

  return v_gr_id;
end;
$$;
