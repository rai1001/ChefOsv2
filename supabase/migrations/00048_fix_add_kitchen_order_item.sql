-- ============================================================================
-- Fix: add_kitchen_order_item cross-tenant UPDATE
--
-- El UPDATE de kitchen_orders en 00017 filtraba solo por `id = p_order_id`,
-- sin incluir `hotel_id = p_hotel_id`. Al ser SECURITY DEFINER (bypass RLS),
-- un usuario de otro tenant podía cambiar el status de una comanda ajena a
-- 'acknowledged' si conocía el UUID de la orden.
--
-- Fix: añadir `and hotel_id = p_hotel_id` al WHERE del UPDATE.
-- Añadido también `set search_path = public` por buenas prácticas SECURITY DEFINER.
-- ============================================================================

create or replace function public.add_kitchen_order_item(
  p_hotel_id uuid,
  p_order_id uuid,
  p_title text,
  p_servings integer default 1,
  p_recipe_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_item_id uuid;
  v_sort integer;
begin
  v_role := public.check_membership(auth.uid(), p_hotel_id, null);

  select coalesce(max(sort_order), 0) + 1 into v_sort
  from public.kitchen_order_items
  where order_id = p_order_id;

  insert into public.kitchen_order_items (
    order_id, hotel_id, recipe_id, title, servings, status, notes, sort_order
  ) values (
    p_order_id, p_hotel_id, p_recipe_id, p_title, p_servings, 'pending', p_notes, v_sort
  )
  returning id into v_item_id;

  -- hotel_id scope prevents cross-tenant status changes via a known order UUID
  update public.kitchen_orders
  set status = 'acknowledged', updated_at = now()
  where id = p_order_id
    and hotel_id = p_hotel_id
    and status = 'pending';

  return v_item_id;
end;
$$;
