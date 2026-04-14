-- ============================================================================
-- M14 Notificaciones — ChefOS v2
-- In-app + email (Resend) con preferencias por usuario
-- Tablas: notifications, notification_preferences
-- RPCs: create_notification, mark_notification_read, mark_all_notifications_read,
--        get_unread_notifications, get_notification_count,
--        get_notification_preferences, upsert_notification_preference
-- Trigger: auto_notify_on_domain_event → 4 tipos de evento clave
-- ============================================================================

-- ====================
-- 1. ENUM
-- ====================

create type public.notification_type as enum (
  'event_confirmed',    -- evento confirmado
  'event_completed',    -- evento completado
  'task_assigned',      -- tarea asignada a usuario
  'stock_alert',        -- stock bajo / caducidad
  'job_completed',      -- automation job completado
  'job_failed',         -- automation job fallido
  'cost_alert',         -- cost overrun
  'system'              -- mensaje general del sistema
);

-- ====================
-- 2. TABLAS
-- ====================

-- Notificaciones por usuario
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type public.notification_type not null,
  severity public.alert_severity not null default 'info',
  title text not null,
  body text,
  action_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Índice crítico: notificaciones no leídas por usuario (para badge)
create index idx_notif_user_unread
  on public.notifications (user_id, hotel_id, created_at desc)
  where is_read = false;

create index idx_notif_hotel_user
  on public.notifications (hotel_id, user_id, created_at desc);

-- Preferencias por usuario + tipo de notificación
-- Defaults: in_app=true, email=false (email requiere RESEND_API_KEY)
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  notification_type public.notification_type not null,
  in_app boolean not null default true,
  email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, hotel_id, notification_type)
);

create index idx_notif_prefs_user
  on public.notification_preferences (user_id, hotel_id);

-- updated_at trigger
create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ====================
-- 3. RLS
-- ====================

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

-- Notificaciones: cada usuario solo ve las suyas
create policy "notif_read_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notif_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- Preferencias: cada usuario solo ve y modifica las suyas
create policy "prefs_own" on public.notification_preferences
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ====================
-- 4. RPCs
-- ====================

-- ── create_notification ──────────────────────────────────────────────────────
-- Crea una notificación para un usuario específico.
-- SECURITY DEFINER sin auth check — llamado desde triggers y workers.
create or replace function public.create_notification(
  p_hotel_id uuid,
  p_user_id uuid,
  p_type public.notification_type,
  p_severity public.alert_severity,
  p_title text,
  p_body text default null,
  p_action_url text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  -- Respetar preferencia in_app del usuario (si existe y está desactivada, skip)
  if exists (
    select 1 from public.notification_preferences
    where user_id = p_user_id
      and hotel_id = p_hotel_id
      and notification_type = p_type
      and in_app = false
  ) then
    return null;
  end if;

  insert into public.notifications (
    hotel_id, user_id, notification_type, severity, title, body, action_url
  ) values (
    p_hotel_id, p_user_id, p_type, p_severity, p_title, p_body, p_action_url
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ── mark_notification_read ────────────────────────────────────────────────────
create or replace function public.mark_notification_read(
  p_hotel_id uuid,
  p_notification_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where id = p_notification_id
    and hotel_id = p_hotel_id
    and user_id = auth.uid()
    and is_read = false;
end;
$$;

-- ── mark_all_notifications_read ───────────────────────────────────────────────
create or replace function public.mark_all_notifications_read(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update public.notifications
  set is_read = true, read_at = now()
  where hotel_id = p_hotel_id
    and user_id = auth.uid()
    and is_read = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── get_unread_notifications ──────────────────────────────────────────────────
-- Últimas N notificaciones del usuario (leídas + no leídas).
create or replace function public.get_unread_notifications(
  p_hotel_id uuid,
  p_limit integer default 20
)
returns table (
  id uuid,
  notification_type public.notification_type,
  severity public.alert_severity,
  title text,
  body text,
  action_url text,
  is_read boolean,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  -- Verificar que el usuario es miembro del hotel
  perform public.check_membership(auth.uid(), p_hotel_id, null);

  return query
    select
      n.id, n.notification_type, n.severity, n.title, n.body,
      n.action_url, n.is_read, n.created_at
    from public.notifications n
    where n.hotel_id = p_hotel_id
      and n.user_id = auth.uid()
    order by n.created_at desc
    limit p_limit;
end;
$$;

-- ── get_notification_count ────────────────────────────────────────────────────
-- Número de notificaciones no leídas (para badge en topbar).
create or replace function public.get_notification_count(
  p_hotel_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.notifications
  where hotel_id = p_hotel_id
    and user_id = auth.uid()
    and is_read = false;

  return coalesce(v_count, 0);
end;
$$;

-- ── get_notification_preferences ─────────────────────────────────────────────
-- Devuelve preferencias del usuario para TODOS los tipos.
-- Los tipos sin fila explícita se devuelven con defaults (in_app=true, email=false).
create or replace function public.get_notification_preferences(
  p_hotel_id uuid
)
returns table (
  notification_type public.notification_type,
  in_app boolean,
  email boolean
)
language plpgsql
security definer
as $$
begin
  perform public.check_membership(auth.uid(), p_hotel_id, null);

  return query
    select
      t.notification_type,
      coalesce(p.in_app, true) as in_app,
      coalesce(p.email, false) as email
    from (
      select unnest(enum_range(null::public.notification_type)) as notification_type
    ) t
    left join public.notification_preferences p
      on p.notification_type = t.notification_type
      and p.user_id = auth.uid()
      and p.hotel_id = p_hotel_id
    order by t.notification_type;
end;
$$;

-- ── upsert_notification_preference ───────────────────────────────────────────
create or replace function public.upsert_notification_preference(
  p_hotel_id uuid,
  p_type public.notification_type,
  p_in_app boolean,
  p_email boolean
)
returns void
language plpgsql
security definer
as $$
begin
  perform public.check_membership(auth.uid(), p_hotel_id, null);

  insert into public.notification_preferences (
    user_id, hotel_id, notification_type, in_app, email
  ) values (
    auth.uid(), p_hotel_id, p_type, p_in_app, p_email
  )
  on conflict (user_id, hotel_id, notification_type)
  do update set
    in_app = excluded.in_app,
    email = excluded.email,
    updated_at = now();
end;
$$;

-- ====================
-- 5. TRIGGER: auto-notificar en domain events clave
-- ====================

create or replace function public.auto_notify_on_domain_event()
returns trigger
language plpgsql
security definer
as $$
declare
  v_job_creator uuid;
  v_job_type text;
  v_job_error text;
  v_event_name text;
  rec record;
begin
  -- Solo procesar eventos de tipos relevantes
  case new.event_type

    -- ── automation.job_completed ─────────────────────────────────────────────
    when 'automation.job_completed' then
      select created_by, job_type::text
      into v_job_creator, v_job_type
      from public.automation_jobs
      where id = new.aggregate_id;

      if v_job_creator is not null then
        perform public.create_notification(
          new.hotel_id, v_job_creator,
          'job_completed', 'info',
          'Job completado: ' || coalesce(v_job_type, 'desconocido'),
          'El job ha finalizado correctamente.',
          '/automation'
        );
      end if;

    -- ── automation.job_failed ────────────────────────────────────────────────
    when 'automation.job_failed' then
      select created_by, job_type::text, error
      into v_job_creator, v_job_type, v_job_error
      from public.automation_jobs
      where id = new.aggregate_id;

      -- Notificar al creador
      if v_job_creator is not null then
        perform public.create_notification(
          new.hotel_id, v_job_creator,
          'job_failed', 'warning',
          'Job fallido: ' || coalesce(v_job_type, 'desconocido'),
          coalesce(v_job_error, 'Error desconocido.'),
          '/automation'
        );
      end if;

      -- También notificar a admins/direction (distintos al creador)
      for rec in
        select m.user_id
        from public.memberships m
        where m.hotel_id = new.hotel_id
          and m.is_active = true
          and m.role in ('superadmin', 'direction', 'admin')
          and (v_job_creator is null or m.user_id <> v_job_creator)
      loop
        perform public.create_notification(
          new.hotel_id, rec.user_id,
          'job_failed', 'warning',
          'Job fallido: ' || coalesce(v_job_type, 'desconocido'),
          coalesce(v_job_error, 'Error desconocido.'),
          '/automation'
        );
      end loop;

    -- ── event.confirmed ──────────────────────────────────────────────────────
    when 'event.confirmed' then
      select name into v_event_name
      from public.events
      where id = new.aggregate_id;

      for rec in
        select m.user_id
        from public.memberships m
        where m.hotel_id = new.hotel_id
          and m.is_active = true
          and m.role in ('superadmin', 'direction', 'admin', 'head_chef')
      loop
        perform public.create_notification(
          new.hotel_id, rec.user_id,
          'event_confirmed', 'info',
          'Evento confirmado: ' || coalesce(v_event_name, 'Sin nombre'),
          'El evento ha sido confirmado y está listo para preparación.',
          '/events/' || new.aggregate_id::text
        );
      end loop;

    -- ── event.completed ──────────────────────────────────────────────────────
    when 'event.completed' then
      select name into v_event_name
      from public.events
      where id = new.aggregate_id;

      for rec in
        select m.user_id
        from public.memberships m
        where m.hotel_id = new.hotel_id
          and m.is_active = true
          and m.role in ('superadmin', 'direction', 'admin')
      loop
        perform public.create_notification(
          new.hotel_id, rec.user_id,
          'event_completed', 'info',
          'Evento completado: ' || coalesce(v_event_name, 'Sin nombre'),
          'El evento ha finalizado. Revisa el food cost real.',
          '/events/' || new.aggregate_id::text
        );
      end loop;

    else
      -- Tipo de evento no relevante para notificaciones — no hacer nada
      null;

  end case;

  return new;
end;
$$;

create trigger trg_auto_notify
  after insert on public.domain_events
  for each row
  execute function public.auto_notify_on_domain_event();
