-- ============================================================================
-- Fix notifications RLS: add tenant isolation (hotel membership check)
-- Codex audit finding: notif_read_own / notif_update_own only checked
-- user_id = auth.uid() — a former hotel member could still read/update
-- notifications from a hotel they were removed from.
-- ============================================================================

-- notifications: replace with hotel-scoped policies
drop policy if exists "notif_read_own"   on public.notifications;
drop policy if exists "notif_update_own" on public.notifications;

create policy "notif_read_own" on public.notifications
  for select using (
    user_id = auth.uid()
    and is_member_of(hotel_id)
  );

create policy "notif_update_own" on public.notifications
  for update using (
    user_id = auth.uid()
    and is_member_of(hotel_id)
  );

-- notification_preferences: same fix
drop policy if exists "prefs_own" on public.notification_preferences;

create policy "prefs_own" on public.notification_preferences
  for all using (
    user_id = auth.uid()
    and is_member_of(hotel_id)
  )
  with check (
    user_id = auth.uid()
    and is_member_of(hotel_id)
  );
