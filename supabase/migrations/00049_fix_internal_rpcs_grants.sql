-- ============================================================================
-- Fix: REVOKE authenticated de RPCs de infraestructura interna
--
-- consume_rate_limit, get_rate_limit_status, check_idempotency y
-- store_idempotency son SECURITY DEFINER sin membership check. Al estar
-- grantadas a authenticated, cualquier usuario autenticado podía:
--   - Drenar/manipular buckets de rate limit de otro hotel (clave opaca)
--   - Leer/envenenar entradas de idempotency cache de otro hotel
--
-- Estos RPCs solo son llamados desde edge functions con service_role.
-- La edge function ocr-receipt fue actualizada (esta misma sesión) para
-- usar adminClient (service_role) en estos calls, en lugar del user client.
-- ============================================================================

revoke execute on function public.consume_rate_limit(text, int, int)
  from anon, authenticated;

revoke execute on function public.get_rate_limit_status(text)
  from anon, authenticated;

revoke execute on function public.check_idempotency(uuid, text)
  from anon, authenticated;

revoke execute on function public.store_idempotency(uuid, text, jsonb, int)
  from anon, authenticated;

-- service_role mantiene EXECUTE (ya grantado en 00042 y 00043)
