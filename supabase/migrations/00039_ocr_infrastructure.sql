-- ============================================================================
-- OCR de albaranes — infraestructura DB
--
-- Añade:
--   1. Extensiones pg_trgm + unaccent para matching difuso de productos
--   2. price_change_log: histórico de cambios de precio detectados via OCR
--   3. goods_receipts.delivery_note_image: ya existe en 00008, sólo se usa
--   4. ocr_review_status enum + columnas en goods_receipt_lines
--   5. job_type extendido con 'ocr_receipt' (M8 automation)
--
-- Para el flujo:
--   Foto albarán → Edge Function (Claude Vision) → process_ocr_receipt →
--   matches por alias + crea GR lines + detecta cambios precio →
--   trigger cascada recalcula recipe_ingredients.unit_cost y
--   recipes.cost_per_serving.
-- ============================================================================

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ─── 1. ocr_review_status enum ──────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ocr_review_status') then
    create type public.ocr_review_status as enum (
      'auto_matched',     -- match >= 0.85, sin revisión
      'pending_review',   -- match < 0.85 o ambiguo, requiere drag&drop manual
      'product_unknown',  -- ningún producto cercano, requiere alta o asignación
      'reviewed_ok',      -- usuario confirmó la línea
      'reviewed_fixed'    -- usuario reasignó a otro producto
    );
  end if;
end $$;

-- ─── 2. goods_receipt_lines: tracking OCR ───────────────────────────────────
alter table public.goods_receipt_lines
  add column if not exists ocr_review_status public.ocr_review_status,
  add column if not exists ocr_match_confidence numeric(4,3),
  add column if not exists ocr_raw_text text,
  add column if not exists ocr_product_name_extracted text;

-- Permitir order_line_id null: el OCR puede detectar productos que llegan en el
-- albarán pero NO estaban en el pedido original (extras, sustitutos…).
alter table public.goods_receipt_lines
  alter column order_line_id drop not null;

create index if not exists idx_grl_ocr_pending
  on public.goods_receipt_lines(hotel_id, ocr_review_status)
  where ocr_review_status in ('pending_review', 'product_unknown');

-- ─── 3. price_change_log: historial cambios precio via OCR ──────────────────
create table if not exists public.price_change_log (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null,                 -- 'ocr', 'manual', 'supplier_offer_update'
  source_ref_id uuid,                   -- p.ej. goods_receipt_line.id
  old_unit_price numeric(12,4),
  new_unit_price numeric(12,4) not null,
  delta_pct numeric(7,3) generated always as (
    case
      when old_unit_price > 0
      then round(((new_unit_price - old_unit_price) / old_unit_price * 100)::numeric, 3)
      else null
    end
  ) stored,
  detected_at timestamptz not null default now(),
  applied_to_recipes_at timestamptz,
  applied_recipe_count integer
);

create index if not exists idx_price_change_hotel
  on public.price_change_log(hotel_id, detected_at desc);
create index if not exists idx_price_change_product
  on public.price_change_log(product_id, detected_at desc);

alter table public.price_change_log enable row level security;

create policy "price_change_read" on public.price_change_log
  for select using (public.is_member_of(hotel_id));

create policy "price_change_insert" on public.price_change_log
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin','head_chef','procurement')
  );

-- ─── 4. job_type extendido para OCR ─────────────────────────────────────────
-- (M8 automation usa enum job_type; añadimos 'ocr_receipt')
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'job_type' and e.enumlabel = 'ocr_receipt'
  ) then
    alter type public.job_type add value 'ocr_receipt';
  end if;
end $$;

-- ─── 5. Helper: similarity ranking de productos ────────────────────────────
-- Necesario para match_product_by_alias (en 00040)
-- Se basa en: ILIKE > similarity (pg_trgm) > unaccent
-- pg_trgm.similarity devuelve 0..1 — usamos como base de confidence

-- ─── 6. delivery_note_image storage path ─────────────────────────────────────
-- goods_receipts.delivery_note_image YA existe (text). Convención:
-- "{hotel_id}/{receipt_id}.{ext}" en bucket "delivery-notes" (creado aparte)
