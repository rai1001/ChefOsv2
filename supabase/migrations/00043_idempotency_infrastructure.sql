-- ============================================================================
-- Idempotencia — infraestructura idempotency keys
--
-- Añade:
--   1. idempotency_keys: key + hotel_id + response cacheado + status, TTL 24h
--   2. check_idempotency(hotel_id, key): devuelve response cacheado si existe
--   3. store_idempotency(hotel_id, key, response, status): guarda para dedup
--   4. cleanup_idempotency_keys(): borra rows > 24h (llamar desde cron/job)
--
-- Protocolo:
--   Cliente genera UUID v7 antes de POST, lo pasa como header Idempotency-Key.
--   Edge function al inicio:
--     1. check_idempotency(hotel, key) → si found, return cached response
--     2. procesar request normalmente
--     3. store_idempotency(hotel, key, response, status) antes de return
--
-- Alcance:
--   - Edge functions con side-effects (ocr-receipt, notification-dispatcher)
--   - RPCs expuestos vía PostgREST donde el cliente puede reintentar
--
-- NOT aplicable:
--   - GETs puros (siempre idempotentes)
--   - RPCs con unique constraints naturales (mejor ese mecanismo)
-- ============================================================================

create table if not exists public.idempotency_keys (
  key           text not null,
  hotel_id      uuid not null references public.hotels(id) on delete cascade,
  response_body jsonb,
  status_code   int not null default 200,
  created_at    timestamptz not null default now(),
  primary key (hotel_id, key)
);

create index if not exists idx_idempotency_keys_created_at
  on public.idempotency_keys (created_at);

alter table public.idempotency_keys enable row level security;
-- Sin policy: solo SECURITY DEFINER RPCs acceden

comment on table public.idempotency_keys is
  'Cache de respuestas por (hotel_id, idempotency_key). TTL 24h vía cleanup_idempotency_keys.';

create or replace function public.check_idempotency(
  p_hotel_id uuid,
  p_key text
)
returns table (
  found boolean,
  response_body jsonb,
  status_code int
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select true, ik.response_body, ik.status_code
  from public.idempotency_keys ik
  where ik.hotel_id = p_hotel_id
    and ik.key = p_key
    and ik.created_at > now() - interval '24 hours';

  if not found then
    return query select false, null::jsonb, null::int;
  end if;
end;
$$;

comment on function public.check_idempotency(uuid, text) is
  'Consulta cache de idempotency. Devuelve response si fue almacenado <24h atrás.';

create or replace function public.store_idempotency(
  p_hotel_id uuid,
  p_key text,
  p_response jsonb,
  p_status_code int default 200
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.idempotency_keys (hotel_id, key, response_body, status_code)
  values (p_hotel_id, p_key, p_response, p_status_code)
  on conflict (hotel_id, key) do update
    set response_body = excluded.response_body,
        status_code   = excluded.status_code,
        created_at    = now();
end;
$$;

comment on function public.store_idempotency(uuid, text, jsonb, int) is
  'Guarda response_body+status bajo (hotel_id, key). Overwrite si ya existía (reset TTL).';

create or replace function public.cleanup_idempotency_keys()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.idempotency_keys
  where created_at < now() - interval '24 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function public.cleanup_idempotency_keys() is
  'Borra idempotency keys > 24h. Llamar desde cron o automation_jobs periódico.';

revoke execute on function public.check_idempotency(uuid, text) from public;
revoke execute on function public.store_idempotency(uuid, text, jsonb, int) from public;
revoke execute on function public.cleanup_idempotency_keys() from public, authenticated, anon;
grant  execute on function public.check_idempotency(uuid, text) to authenticated, service_role;
grant  execute on function public.store_idempotency(uuid, text, jsonb, int) to authenticated, service_role;
grant  execute on function public.cleanup_idempotency_keys() to service_role;
