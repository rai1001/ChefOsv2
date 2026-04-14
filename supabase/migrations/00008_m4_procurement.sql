-- ============================================================================
-- M4 Compras — ChefOS v2
-- Solicitudes de compra, ordenes de compra, recepcion de mercancia
-- State machines:
--   PR: draft → pending_approval → approved → consolidated → cancelled
--   PO: draft → pending_approval → approved → sent → confirmed_by_supplier
--       → partially_received → received → cancelled
-- Decisiones:
--   - CRUD via Supabase client + RLS, RPCs solo para logica compleja
--   - OCR de albaranes diferido a fase posterior (storage + edge function)
--   - Consolidacion de PRs en PO via RPC
-- ============================================================================

-- ====================
-- 1. ENUMS
-- ====================
create type public.pr_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'consolidated',
  'cancelled'
);

create type public.po_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'confirmed_by_supplier',
  'partially_received',
  'received',
  'cancelled'
);

create type public.urgency_level as enum (
  'normal',
  'urgent',
  'critical'
);

create type public.quality_status as enum (
  'accepted',
  'rejected',
  'partial'
);

-- ====================
-- 2. TABLES
-- ====================

-- Purchase Requests (solicitudes de compra)
create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  request_number text not null,
  requested_by uuid not null references auth.users(id),
  status public.pr_status not null default 'draft',
  urgency public.urgency_level not null default 'normal',
  notes text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pr_hotel on public.purchase_requests(hotel_id);
create index idx_pr_hotel_status on public.purchase_requests(hotel_id, status);
create index idx_pr_hotel_number on public.purchase_requests(hotel_id, request_number);
create index idx_pr_event on public.purchase_requests(event_id) where event_id is not null;
create index idx_pr_requested_by on public.purchase_requests(requested_by);

-- Purchase Request Lines
create table public.purchase_request_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.purchase_requests(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid references public.units_of_measure(id) on delete set null,
  quantity_requested numeric(10,3) not null check (quantity_requested > 0),
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_prl_request on public.purchase_request_lines(request_id);
create index idx_prl_hotel on public.purchase_request_lines(hotel_id);
create index idx_prl_product on public.purchase_request_lines(product_id);

-- Purchase Orders (ordenes de compra)
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  order_number text not null,
  status public.po_status not null default 'draft',
  expected_delivery_date date,
  total_amount numeric(12,2) not null default 0,
  payment_terms text,
  notes text,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_po_hotel on public.purchase_orders(hotel_id);
create index idx_po_hotel_status on public.purchase_orders(hotel_id, status);
create index idx_po_hotel_number on public.purchase_orders(hotel_id, order_number);
create index idx_po_supplier on public.purchase_orders(supplier_id);
create index idx_po_created_by on public.purchase_orders(created_by);

-- Purchase Order Lines
create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  unit_id uuid references public.units_of_measure(id) on delete set null,
  quantity_ordered numeric(10,3) not null check (quantity_ordered > 0),
  quantity_received numeric(10,3) not null default 0,
  unit_price numeric(12,4) not null check (unit_price >= 0),
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_pol_order on public.purchase_order_lines(order_id);
create index idx_pol_hotel on public.purchase_order_lines(hotel_id);
create index idx_pol_product on public.purchase_order_lines(product_id);

-- Goods Receipts (recepciones de mercancia)
create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.purchase_orders(id) on delete restrict,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  receipt_number text not null,
  delivery_note_number text,
  delivery_note_image text,
  ocr_data jsonb,
  temperature_check boolean,
  notes text,
  received_by uuid not null references auth.users(id),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_gr_hotel on public.goods_receipts(hotel_id);
create index idx_gr_order on public.goods_receipts(order_id);
create index idx_gr_hotel_number on public.goods_receipts(hotel_id, receipt_number);

-- Goods Receipt Lines
create table public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.goods_receipts(id) on delete cascade,
  order_line_id uuid not null references public.purchase_order_lines(id) on delete restrict,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  quantity_received numeric(10,3) not null check (quantity_received >= 0),
  lot_number text,
  expiry_date date,
  unit_cost numeric(12,4),
  quality_status public.quality_status not null default 'accepted',
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index idx_grl_receipt on public.goods_receipt_lines(receipt_id);
create index idx_grl_order_line on public.goods_receipt_lines(order_line_id);
create index idx_grl_hotel on public.goods_receipt_lines(hotel_id);

-- ====================
-- 3. UPDATED_AT TRIGGERS
-- ====================
create trigger set_pr_updated_at
  before update on public.purchase_requests
  for each row execute function public.set_updated_at();

create trigger set_po_updated_at
  before update on public.purchase_orders
  for each row execute function public.set_updated_at();

-- ====================
-- 4. AUDIT TRIGGERS
-- ====================
create trigger audit_purchase_requests
  after insert or update or delete on public.purchase_requests
  for each row execute function public.audit_trigger_fn();

create trigger audit_purchase_orders
  after insert or update or delete on public.purchase_orders
  for each row execute function public.audit_trigger_fn();

create trigger audit_goods_receipts
  after insert or update or delete on public.goods_receipts
  for each row execute function public.audit_trigger_fn();

-- ====================
-- 5. RLS POLICIES
-- ====================

-- Purchase Requests
alter table public.purchase_requests enable row level security;

create policy "pr_read" on public.purchase_requests
  for select using (public.is_member_of(hotel_id));
create policy "pr_insert" on public.purchase_requests
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );
create policy "pr_update" on public.purchase_requests
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );

-- Purchase Request Lines
alter table public.purchase_request_lines enable row level security;

create policy "prl_read" on public.purchase_request_lines
  for select using (public.is_member_of(hotel_id));
create policy "prl_insert" on public.purchase_request_lines
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );
create policy "prl_update" on public.purchase_request_lines
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );
create policy "prl_delete" on public.purchase_request_lines
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'procurement')
  );

-- Purchase Orders
alter table public.purchase_orders enable row level security;

create policy "po_read" on public.purchase_orders
  for select using (public.is_member_of(hotel_id));
create policy "po_insert" on public.purchase_orders
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );
create policy "po_update" on public.purchase_orders
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );

-- Purchase Order Lines
alter table public.purchase_order_lines enable row level security;

create policy "pol_read" on public.purchase_order_lines
  for select using (public.is_member_of(hotel_id));
create policy "pol_insert" on public.purchase_order_lines
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );
create policy "pol_update" on public.purchase_order_lines
  for update using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );
create policy "pol_delete" on public.purchase_order_lines
  for delete using (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'procurement')
  );

-- Goods Receipts
alter table public.goods_receipts enable row level security;

create policy "gr_read" on public.goods_receipts
  for select using (public.is_member_of(hotel_id));
create policy "gr_insert" on public.goods_receipts
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );

-- Goods Receipt Lines
alter table public.goods_receipt_lines enable row level security;

create policy "grl_read" on public.goods_receipt_lines
  for select using (public.is_member_of(hotel_id));
create policy "grl_insert" on public.goods_receipt_lines
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin', 'direction', 'admin', 'head_chef', 'sous_chef', 'procurement')
  );

-- ====================
-- 6. STATE MACHINE HELPERS
-- ====================

-- 6a. PR transition validator
create or replace function public.validate_pr_transition(
  p_from public.pr_status,
  p_to public.pr_status
)
returns boolean
language plpgsql
as $$
begin
  -- Cancel from any non-terminal
  if p_to = 'cancelled' and p_from not in ('consolidated', 'cancelled') then
    return true;
  end if;

  return (p_from, p_to) in (
    ('draft', 'pending_approval'),
    ('pending_approval', 'approved'),
    ('approved', 'consolidated')
  );
end;
$$;

-- 6b. PO transition validator
create or replace function public.validate_po_transition(
  p_from public.po_status,
  p_to public.po_status
)
returns boolean
language plpgsql
as $$
begin
  -- Cancel from any non-terminal
  if p_to = 'cancelled' and p_from not in ('received', 'cancelled') then
    return true;
  end if;

  return (p_from, p_to) in (
    ('draft', 'pending_approval'),
    ('pending_approval', 'approved'),
    ('approved', 'sent'),
    ('sent', 'confirmed_by_supplier'),
    ('confirmed_by_supplier', 'partially_received'),
    ('confirmed_by_supplier', 'received'),
    ('partially_received', 'received')
  );
end;
$$;

-- ====================
-- 7. RPCs
-- ====================

-- 7a. Create purchase request with lines
create or replace function public.create_purchase_request(
  p_hotel_id uuid,
  p_event_id uuid default null,
  p_urgency public.urgency_level default 'normal',
  p_notes text default null,
  p_lines jsonb default '[]'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_pr_id uuid;
  v_request_number text;
  v_line jsonb;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','procurement']::public.app_role[]);

  -- Generate request number: PR-YYYYMMDD-XXXX
  v_request_number := 'PR-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad((
      select count(*) + 1 from public.purchase_requests
      where hotel_id = p_hotel_id
        and created_at::date = current_date
    )::text, 4, '0');

  insert into public.purchase_requests (
    hotel_id, event_id, request_number, requested_by, urgency, notes
  ) values (
    p_hotel_id, p_event_id, v_request_number, auth.uid(), p_urgency, p_notes
  ) returning id into v_pr_id;

  -- Insert lines
  if jsonb_array_length(p_lines) > 0 then
    insert into public.purchase_request_lines (
      request_id, hotel_id, product_id, unit_id, quantity_requested, sort_order, notes
    )
    select
      v_pr_id,
      p_hotel_id,
      (line->>'product_id')::uuid,
      (line->>'unit_id')::uuid,
      (line->>'quantity')::numeric,
      row_number() over () - 1,
      line->>'notes'
    from jsonb_array_elements(p_lines) as line;
  end if;

  -- Emit event
  perform public.emit_event(
    p_hotel_id, 'purchase_request', v_pr_id, 'purchase_request.created',
    jsonb_build_object('number', v_request_number, 'urgency', p_urgency)
  );

  return v_pr_id;
end;
$$;

-- 7b. Approve purchase request
create or replace function public.approve_purchase_request(
  p_hotel_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current public.pr_status;
  v_number text;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','procurement']::public.app_role[]);

  select status, request_number into v_current, v_number
  from public.purchase_requests
  where id = p_request_id and hotel_id = p_hotel_id;

  if v_current is null then
    raise exception 'purchase request not found' using errcode = 'P0404';
  end if;

  if not public.validate_pr_transition(v_current, 'approved') then
    raise exception 'invalid transition: % -> approved', v_current using errcode = 'P0012';
  end if;

  update public.purchase_requests
  set status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  where id = p_request_id and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'purchase_request', p_request_id, 'purchase_request.approved',
    jsonb_build_object('number', v_number, 'approved_by', auth.uid())
  );
end;
$$;

-- 7c. Transition purchase request (generic)
create or replace function public.transition_purchase_request(
  p_hotel_id uuid,
  p_request_id uuid,
  p_new_status public.pr_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current public.pr_status;
  v_required_roles public.app_role[];
begin
  v_required_roles := case p_new_status
    when 'pending_approval' then array['head_chef','sous_chef','procurement','direction','admin','superadmin']::public.app_role[]
    when 'approved' then array['head_chef','procurement','direction','admin','superadmin']::public.app_role[]
    when 'consolidated' then array['procurement','direction','admin','superadmin']::public.app_role[]
    when 'cancelled' then array['head_chef','procurement','direction','admin','superadmin']::public.app_role[]
    else array['superadmin']::public.app_role[]
  end;

  v_role := public.check_membership(auth.uid(), p_hotel_id, v_required_roles);

  select status into v_current
  from public.purchase_requests
  where id = p_request_id and hotel_id = p_hotel_id;

  if v_current is null then
    raise exception 'purchase request not found' using errcode = 'P0404';
  end if;

  if not public.validate_pr_transition(v_current, p_new_status) then
    raise exception 'invalid transition: % -> %', v_current, p_new_status using errcode = 'P0012';
  end if;

  if p_new_status = 'cancelled' and (p_reason is null or p_reason = '') then
    raise exception 'cancel reason required' using errcode = 'P0013';
  end if;

  update public.purchase_requests
  set status = p_new_status,
      cancel_reason = case when p_new_status = 'cancelled' then p_reason else cancel_reason end,
      approved_by = case when p_new_status = 'approved' then auth.uid() else approved_by end,
      approved_at = case when p_new_status = 'approved' then now() else approved_at end
  where id = p_request_id and hotel_id = p_hotel_id;

  perform public.emit_event(
    p_hotel_id, 'purchase_request', p_request_id,
    'purchase_request.' || p_new_status,
    jsonb_build_object('from', v_current, 'to', p_new_status)
  );
end;
$$;

-- 7d. Generate purchase order from approved PRs for a supplier
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
as $$
declare
  v_role public.app_role;
  v_po_id uuid;
  v_order_number text;
  v_total numeric(12,2);
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','procurement']::public.app_role[]);

  -- Validate all requests are approved
  if exists (
    select 1 from public.purchase_requests
    where id = any(p_request_ids) and hotel_id = p_hotel_id and status != 'approved'
  ) then
    raise exception 'all purchase requests must be approved' using errcode = 'P0014';
  end if;

  -- Generate order number: PO-YYYYMMDD-XXXX
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

  -- Consolidate lines from PRs, using preferred offer price for this supplier
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

  -- Calculate total
  select coalesce(sum(quantity_ordered * unit_price), 0) into v_total
  from public.purchase_order_lines
  where order_id = v_po_id;

  update public.purchase_orders
  set total_amount = v_total
  where id = v_po_id;

  -- Mark PRs as consolidated
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

-- 7e. Transition purchase order
create or replace function public.transition_purchase_order(
  p_hotel_id uuid,
  p_order_id uuid,
  p_new_status public.po_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role public.app_role;
  v_current public.po_status;
  v_required_roles public.app_role[];
  v_total numeric(12,2);
begin
  v_required_roles := case p_new_status
    when 'pending_approval' then array['procurement','direction','admin','superadmin']::public.app_role[]
    when 'approved' then array['direction','admin','superadmin']::public.app_role[]
    when 'sent' then array['procurement','direction','admin','superadmin']::public.app_role[]
    when 'confirmed_by_supplier' then array['procurement','direction','admin','superadmin']::public.app_role[]
    when 'cancelled' then array['procurement','direction','admin','superadmin']::public.app_role[]
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

  -- Sent requires lines with prices
  if p_new_status = 'sent' then
    if not exists (
      select 1 from public.purchase_order_lines
      where order_id = p_order_id and unit_price > 0
    ) then
      raise exception 'cannot send order without priced lines' using errcode = 'P0015';
    end if;

    -- Recalculate total before sending
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

-- 7f. Receive goods (partial or full)
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
as $$
declare
  v_role public.app_role;
  v_po_status public.po_status;
  v_gr_id uuid;
  v_receipt_number text;
  v_line jsonb;
  v_all_received boolean;
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

  -- Insert receipt lines and update PO line quantities
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

    -- Update received quantity on PO line (only accepted + partial)
    if coalesce((v_line->>'quality_status')::public.quality_status, 'accepted') != 'rejected' then
      update public.purchase_order_lines
      set quantity_received = quantity_received + (v_line->>'quantity_received')::numeric
      where id = (v_line->>'order_line_id')::uuid
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

-- 7g. Get pending orders by supplier
create or replace function public.get_pending_orders_by_supplier(
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

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'supplier_id', s.id,
      'supplier_name', s.name,
      'orders', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', po.id,
          'order_number', po.order_number,
          'status', po.status,
          'total_amount', po.total_amount,
          'expected_delivery_date', po.expected_delivery_date,
          'line_count', (select count(*) from public.purchase_order_lines where order_id = po.id)
        ) order by po.expected_delivery_date asc nulls last), '[]')
        from public.purchase_orders po
        where po.supplier_id = s.id
          and po.hotel_id = p_hotel_id
          and po.status in ('sent', 'confirmed_by_supplier', 'partially_received')
      )
    ) order by s.name), '[]')
    from public.suppliers s
    where s.hotel_id = p_hotel_id
      and s.is_active = true
      and exists (
        select 1 from public.purchase_orders po
        where po.supplier_id = s.id
          and po.hotel_id = p_hotel_id
          and po.status in ('sent', 'confirmed_by_supplier', 'partially_received')
      )
  );
end;
$$;
