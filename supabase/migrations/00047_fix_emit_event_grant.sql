-- ============================================================================
-- Fix: emit_event grant cross-tenant injection
--
-- 00046_domain_events_dedup.sql añadió firma 6-param (+ p_dedup_window_seconds)
-- y re-grantó EXECUTE a authenticated. Esto revierte el fix de 00034
-- (FIX 2 CRITICAL) que había revocado el grant para prevenir que cualquier
-- usuario autenticado pueda inyectar domain events con hotel_id arbitrario
-- y disparar notifications/automation_jobs cross-tenant.
--
-- Las funciones SECURITY DEFINER internas que llaman emit_event siguen
-- funcionando: ejecutan como el owner (postgres) que siempre tiene EXECUTE.
-- ============================================================================

revoke execute on function public.emit_event(uuid, text, uuid, text, jsonb, int)
  from public, anon, authenticated;

grant execute on function public.emit_event(uuid, text, uuid, text, jsonb, int)
  to service_role;
