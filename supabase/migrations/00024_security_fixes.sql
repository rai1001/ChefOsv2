-- ============================================================================
-- 00023 — Security & correctness fixes (M8 + M14)
-- ============================================================================
-- P0-1 : REVOKE/GRANT worker RPCs → service_role only
-- P1-5 : REVOKE/GRANT create_notification → service_role only
-- P1-3 : fail_job backoff cap a 120 minutos
-- P1-1 : trigger auto_notify_on_domain_event con manejo de excepciones
-- P2-2 : get_notification_count LIMIT 100 (suficiente para badge "99+")
-- P3-3 : PERFORM en lugar de v_role en RPCs de solo lectura
-- ============================================================================

-- ===========================================================================
-- P0-1 + P1-5: Restringir RPCs de worker/trigger a service_role
-- ===========================================================================

-- Worker RPCs — solo invocables con service_role key
revoke execute on function public.claim_next_job(text) from public, anon, authenticated;
grant  execute on function public.claim_next_job(text) to service_role;

revoke execute on function public.complete_job(uuid, jsonb) from public, anon, authenticated;
grant  execute on function public.complete_job(uuid, jsonb) to service_role;

revoke execute on function public.fail_job(uuid, text, boolean) from public, anon, authenticated;
grant  execute on function public.fail_job(uuid, text, boolean) to service_role;

-- create_notification — solo triggers y workers (service_role)
revoke execute on function public.create_notification(
  uuid, uuid, public.notification_type, public.alert_severity, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_notification(
  uuid, uuid, public.notification_type, public.alert_severity, text, text, text
) to service_role;

-- ===========================================================================
-- P1-3: fail_job con cap de backoff (max 120 minutos)
-- ===========================================================================

create or replace function public.fail_job(
  p_job_id  uuid,
  p_error   text,
  p_retry   boolean default true
)
returns void
language plpgsql
security definer
as $$
declare
  v_job           record;
  v_new_status    public.job_status;
  v_reschedule_at timestamptz;
  v_delay_min     numeric;
begin
  select * into v_job
  from public.automation_jobs
  where id = p_job_id;

  if not found then
    raise exception 'job no encontrado' using errcode = 'P0010';
  end if;

  if p_retry and v_job.attempts < v_job.max_attempts then
    v_new_status := 'pending';
    -- Backoff: 5^attempts minutos, cap en 120 min (2 horas)
    v_delay_min     := least(power(5, v_job.attempts), 120);
    v_reschedule_at := now() + (v_delay_min::text || ' minutes')::interval;
  else
    v_new_status    := 'failed';
    v_reschedule_at := null;
  end if;

  update public.automation_jobs
  set status       = v_new_status,
      error        = p_error,
      scheduled_at = coalesce(v_reschedule_at, scheduled_at),
      updated_at   = now()
  where id = p_job_id;

  insert into public.automation_job_logs (job_id, hotel_id, level, message)
  values (p_job_id, v_job.hotel_id, 'error', 'Job fallido: ' || p_error);

  if v_new_status = 'failed' then
    perform public.emit_event(
      v_job.hotel_id, 'automation', p_job_id, 'automation.job_failed',
      jsonb_build_object('error', p_error, 'attempts', v_job.attempts)
    );
  end if;
end;
$$;

-- ===========================================================================
-- P1-1: auto_notify_on_domain_event con bloque EXCEPTION
-- ===========================================================================

create or replace function public.auto_notify_on_domain_event()
returns trigger
language plpgsql
security definer
as $$
declare
  v_job_creator uuid;
  v_job_type    text;
  v_job_error   text;
  v_event_name  text;
  rec           record;
begin
  -- Bloque de excepción: errores internos NO deben abortar la transacción padre
  begin

    case new.event_type

      -- ── automation.job_completed ───────────────────────────────────────────
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

      -- ── automation.job_failed ──────────────────────────────────────────────
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

        -- Notificar a admins (distintos al creador)
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

      -- ── event.confirmed ────────────────────────────────────────────────────
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

      -- ── event.completed ────────────────────────────────────────────────────
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
        -- Tipo no relevante — ignorar silenciosamente
        null;

    end case;

  exception when others then
    -- Loguear el error pero nunca propagar — la transacción padre no debe fallar
    raise warning 'auto_notify_on_domain_event error (event_type=%, aggregate_id=%): %',
      new.event_type, new.aggregate_id, sqlerrm;
  end;

  return new;
end;
$$;

-- ===========================================================================
-- P2-2: get_notification_count con LIMIT 100 (suficiente para "99+")
-- ===========================================================================

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
  from (
    select 1
    from public.notifications
    where hotel_id  = p_hotel_id
      and user_id   = auth.uid()
      and is_read   = false
    limit 100
  ) sub;

  return coalesce(v_count, 0);
end;
$$;

-- ===========================================================================
-- P3-3: PERFORM en lugar de v_role en RPCs de solo lectura
-- ===========================================================================

create or replace function public.get_pending_jobs(
  p_hotel_id uuid,
  p_limit    integer default 50
)
returns table (
  id           uuid,
  job_type     public.job_type,
  status       public.job_status,
  payload      jsonb,
  result       jsonb,
  error        text,
  attempts     integer,
  max_attempts integer,
  scheduled_at timestamptz,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz
)
language plpgsql
security definer
as $$
begin
  perform public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','operations']::public.app_role[]);

  return query
    select
      j.id, j.job_type, j.status, j.payload, j.result, j.error,
      j.attempts, j.max_attempts, j.scheduled_at, j.started_at,
      j.completed_at, j.created_at
    from public.automation_jobs j
    where j.hotel_id = p_hotel_id
    order by j.created_at desc
    limit p_limit;
end;
$$;

create or replace function public.get_job_logs(
  p_hotel_id uuid,
  p_job_id   uuid
)
returns table (
  id         uuid,
  level      public.log_level,
  message    text,
  details    jsonb,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  perform public.check_membership(auth.uid(), p_hotel_id,
    array['superadmin','direction','admin','head_chef','sous_chef','operations']::public.app_role[]);

  return query
    select l.id, l.level, l.message, l.details, l.created_at
    from public.automation_job_logs l
    where l.job_id   = p_job_id
      and l.hotel_id = p_hotel_id
    order by l.created_at asc;
end;
$$;
