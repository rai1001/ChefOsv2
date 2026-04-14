-- Fix: audit trigger falla en tablas sin hotel_id (e.g. hotels donde id ES el hotel)
create or replace function public.audit_trigger_fn()
returns trigger
language plpgsql
security definer
as $$
declare
  v_hotel_id uuid;
  v_user_id uuid;
  v_action text;
  v_row jsonb;
begin
  v_user_id := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  if TG_OP = 'DELETE' then
    v_row := to_jsonb(old);
    v_action := 'DELETE';
  else
    v_row := to_jsonb(new);
    v_action := case when TG_OP = 'INSERT' then 'INSERT' else 'UPDATE' end;
  end if;

  -- Extraer hotel_id: primero busca hotel_id, si no existe usa id (para tabla hotels)
  v_hotel_id := coalesce(
    (v_row ->> 'hotel_id')::uuid,
    case when TG_TABLE_NAME = 'hotels' then (v_row ->> 'id')::uuid else null end
  );

  if v_hotel_id is not null then
    insert into public.audit_logs (hotel_id, user_id, action, entity_type, entity_id, old_values, new_values)
    values (
      v_hotel_id,
      v_user_id,
      v_action,
      TG_TABLE_NAME,
      coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
      case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    );
  end if;

  return coalesce(new, old);
end;
$$;
