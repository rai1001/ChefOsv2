-- ============================================================================
-- M12 Security Fixes — ChefOS v2
-- Fix: sync_logs insert/update policies demasiado permisivas.
-- Las policies anteriores permitían inserts/updates directos desde cualquier
-- miembro autenticado. Los logs solo deben escribirse via RPCs SECURITY DEFINER
-- (trigger_pms_sync, trigger_pos_sync) y actualizarse solo por service_role
-- via mark_sync_complete.
-- ============================================================================

-- Reemplazar las policies de insert/update en integration_sync_logs
drop policy if exists "sync_logs_insert_service" on public.integration_sync_logs;
drop policy if exists "sync_logs_update_service" on public.integration_sync_logs;

-- Insert: solo via SECURITY DEFINER RPCs (trigger_pms_sync / trigger_pos_sync)
-- Los usuarios autenticados no pueden insertar logs directamente.
create policy "sync_logs_insert_rpc_only" on public.integration_sync_logs
  for insert with check (false);

-- Update: solo via mark_sync_complete (llamado por service_role en el worker)
-- Los usuarios autenticados no pueden modificar logs directamente.
create policy "sync_logs_update_rpc_only" on public.integration_sync_logs
  for update using (false);
