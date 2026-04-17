-- ============================================================================
-- Rate limiting — infraestructura token bucket
--
-- Añade:
--   1. rate_limit_buckets: tabla token bucket con PK=bucket_key
--   2. consume_rate_limit(key, max, window_s): RPC atómico que intenta
--      consumir 1 token. Devuelve allowed + remaining + reset_at.
--   3. get_rate_limit_status(key): read-only para monitoring
--
-- Algoritmo:
--   - Si el bucket no existe → crear con max-1 tokens, ventana nueva
--   - Si existe y la ventana expiró → reset a max-1 tokens, ventana nueva
--   - Si existe y tokens>0 → decrementar 1 token
--   - Si existe y tokens=0 (en ventana) → NO decrementar, allowed=false
--
-- Concurrencia:
--   - SELECT ... FOR UPDATE serializa llamadas al mismo bucket_key
--   - Para tráfico >100 req/s por bucket, migrar a Redis (Upstash)
--
-- Uso típico:
--   select * from consume_rate_limit('ocr:hotel:22222...:hour', 30, 3600);
--
-- Cleanup:
--   Ejecutar periódicamente (job o cron): delete from rate_limit_buckets
--   where refill_at < now() - interval '1 day';
-- ============================================================================

create table if not exists public.rate_limit_buckets (
  bucket_key  text primary key,
  tokens      int not null check (tokens >= 0),
  refill_at   timestamptz not null,
  updated_at  timestamptz not null default now()
);

-- No tiene hotel_id propio: el bucket_key lo embebe (patrón "ocr:hotel:{uuid}:hour")
-- RLS: tabla interna, solo accedida por SECURITY DEFINER functions
alter table public.rate_limit_buckets enable row level security;

-- Ninguna policy → nadie lee/escribe directo. Solo via las RPCs definer de abajo.

comment on table public.rate_limit_buckets is
  'Token bucket store para rate limiting. bucket_key típico: "{feature}:{scope}:{id}:{window}"';

create or replace function public.consume_rate_limit(
  p_key text,
  p_max_tokens int,
  p_window_seconds int
)
returns table (
  allowed   boolean,
  remaining int,
  reset_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now      timestamptz := now();
  v_bucket   public.rate_limit_buckets%rowtype;
  v_allowed  boolean;
begin
  if p_max_tokens <= 0 or p_window_seconds <= 0 then
    raise exception 'consume_rate_limit: max_tokens y window_seconds deben ser > 0';
  end if;

  -- Lock row si existe (serializa concurrencia por mismo bucket)
  select * into v_bucket
  from public.rate_limit_buckets
  where bucket_key = p_key
  for update;

  if not found then
    -- Bucket nuevo: crear con max-1 tokens (consumimos 1 ahora)
    insert into public.rate_limit_buckets (bucket_key, tokens, refill_at)
    values (p_key, p_max_tokens - 1, v_now + (p_window_seconds || ' seconds')::interval)
    returning * into v_bucket;
    v_allowed := true;

  elsif v_bucket.refill_at <= v_now then
    -- Ventana expiró: reset a max-1 (consumimos 1 en la ventana nueva)
    update public.rate_limit_buckets
    set tokens    = p_max_tokens - 1,
        refill_at = v_now + (p_window_seconds || ' seconds')::interval,
        updated_at = v_now
    where bucket_key = p_key
    returning * into v_bucket;
    v_allowed := true;

  elsif v_bucket.tokens > 0 then
    -- Tokens disponibles: consumir 1
    update public.rate_limit_buckets
    set tokens    = tokens - 1,
        updated_at = v_now
    where bucket_key = p_key
    returning * into v_bucket;
    v_allowed := true;

  else
    -- Tokens agotados en ventana activa: denegado (NO decrementamos)
    v_allowed := false;
  end if;

  return query select v_allowed, v_bucket.tokens, v_bucket.refill_at;
end;
$$;

comment on function public.consume_rate_limit(text, int, int) is
  'Atomic token bucket. Devuelve allowed=true/false tras intentar consumir 1 token. Llamar UNA VEZ por request.';

create or replace function public.get_rate_limit_status(p_key text)
returns table (
  tokens_remaining int,
  reset_at timestamptz,
  exists_ boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select b.tokens, b.refill_at, true
  from public.rate_limit_buckets b
  where b.bucket_key = p_key;

  if not found then
    return query select null::int, null::timestamptz, false;
  end if;
end;
$$;

comment on function public.get_rate_limit_status(text) is
  'Read-only: estado del bucket sin consumir. Útil para mostrar remaining en headers.';

-- RPCs restringidas a usuarios autenticados + service_role (RPCs call desde edge functions)
revoke execute on function public.consume_rate_limit(text, int, int) from public;
revoke execute on function public.get_rate_limit_status(text) from public;
grant execute on function public.consume_rate_limit(text, int, int) to authenticated, service_role;
grant execute on function public.get_rate_limit_status(text) to authenticated, service_role;
